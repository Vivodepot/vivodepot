'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Passwort vor jeder Ableitung auf NFC — Befund LESE-APP-PASSWORT-OHNE-NFC (HOCH, 18.10.2026)
   und die Passwortregeln offline nach BSI (Entscheidung Geschäftsführung, 18.10.2026)
   ────────────────────────────────────────────────────────────────────────
   DER BEFUND: Der Kern legt jedes Passwort vor der Ableitung als NFC an (`normalizePassword`). Die Lese-App leitete beim
   Öffnen von Depot und Sub-Depot mit dem rohen Feldwert ab. Ein Umlaut-Passwort, das dort als NFD ankam (u + U+0308, etwa
   eingefügt), öffnete eine Datei nicht, die der Kern geschrieben hatte. Das bricht die Zusage, dass die Datei aufgeht.

   DIE KLASSE, gezählt am Kanon cf721c425 vor dem Fix (Datei · Funktion · Weg · NFC davor?). Zeilen verschieben sich; der
   Wächter unten findet die Stellen selbst und braucht diese Liste nicht.
     vivodepot.html
       depotAnlegen → VdCrypto.setupSession · Anlegen · ja (password = normalizePassword)
       _fachTuerSchluessel → depotMasterHkdfKey · Fach einrichten/öffnen · ja (im Helfer)
       empfaengerDateiErzeugen → depotMasterHkdfKey · Anlegen · ja
       empfaengerQrPayloadBauen → _empfaengerQrSchluesselVerschluesseln (PBKDF2 raw) · Anlegen · ja
       _zerfallLesen / empfaengerkreisFachEinrichten → _fachTuerSchluessel · Öffnen/Anlegen · ja (im Helfer)
       depotLaden → VdCrypto.setupSession · Öffnen · ja (NFC, einmal NFD-Rückfall)
       whcHuelleWickeln → deriveMasterBits · Wiederherstellungs-Code wickeln · ja
       _whcAuspacken, whcHuelleWickeln → _whcCodeBits → deriveMasterBits · Code (ASCII-Alphabet) · entfällt
       depotMitCodeLaden → VdCrypto.setupSession · neues Passwort nach Code · ja
       _passwortProbeRoundtrip → depotMasterHkdfKey · Prüfen · ja (Aufrufer reichen NFC)
       _passwortSessionZurueckdrehen, passwortWechselDurchfuehren → VdCrypto.setupSession · Wechsel · ja
       subDepotVersiegeln, subDepotEntsiegeln, subDepotEigenerPasswortWechsel → depotMasterHkdfKey · Sub · ja (Öffnen mit NFD-Rückfall)
       antwortJwePasswort → _jwePbes2Schluessel (PBES2) · Antwort schreiben · NEIN → behoben (NFC im Helfer)
     vivodepot-lesen.html
       leseDepotUmschlag → VdCrypto.setupSession · Öffnen · NEIN → behoben
       leseSubUmschlag → depotMasterHkdfKey · Öffnen · NEIN → behoben
       antwortEntschluesselnPasswort → _angDeriveKey (PBKDF2 raw) · Antwort v1 öffnen · NEIN → behoben
       antwortJweOeffnen → _jwePbes2Schluessel (PBES2) · Antwort öffnen · NEIN → behoben (NFC im Helfer)
       _empfaengerQrEntschluesseln → _empfaengerQrSchluesselEntschluesseln · QR öffnen · ja
       schuetzeSchluesselJwk / entschluesseleSchluesselJwk → deriveKey · .vdkey · NEIN → behoben
     vivodepot-studio.html: antwortJweOeffnen → _jwePbes2Schluessel · NEIN → behoben; .vdkey wie oben · NEIN → behoben
     vivodepot-vc-issuer.html: .vdkey schützen und öffnen → deriveKey · NEIN → behoben
     vivodepot-schluessel-teilen.html: .vdkey schützen → deriveKey · NEIN → behoben
     tools/: eigene PBKDF2-Ableitung aus einem Passwort nur in format-pruefen.js (masterHkdf; die Aufrufer nehmen NFC, dann
       NFD) und schluesseluebergabe-messen.js (fester ASCII-Messwert, öffnet keine Datei). Alle übrigen Werkzeuge rufen die
       Kern-Schnittstelle (depotAnlegen, depotLaden …), die selbst normalisiert.
   Im gepinnten Krypto-Block steht keine Stelle, die NFC bräuchte: er leitet nur ab, was die Hülle ihm reicht.

   DIE LESE-APP SPIEGELT DEN KERN (Wort Krypto 2, 18.10.2026): erst NFC, dann genau einmal NFD, wenn sich NFD und NFC
   unterscheiden — sie ist nie strenger als der Kern, der denselben Rückfall für Bestände von vor B1 trägt. Die Proben öffnen
   eine v3- und eine v4-Datei des Kerns mit der NFD-Form, und einen Bestand, der nur mit NFD aufgeht (Kern-Ableitung mit dem
   NFD-Passwort, wie vor B1), mit der NFC-Eingabe. Die Dateien entstehen in der Probe mit dem Kern; eingefrorene Bytes einer
   v3-Datei mit Umlaut-Passwort liegen im Repo nicht.

   .vdkey-HÜLLE (Wort Krypto 2, 18.10.2026): schützen mit NFC; öffnen erst NFC, dann genau einmal die rohe Eingabe, nur wenn sie
   sich von NFC unterscheidet. Proben: eine Hülle wie von vor dem Fix (NFD-Passphrase, geschützt mit einer Kopie ohne NFC) öffnet;
   eine neue Hülle ist unter NFC geschützt; ein falsches Passwort scheitert an beiden Versuchen; ohne Unterschied gibt es keinen
   zweiten (gezählt an den PBKDF2-Ableitungen); Rot-Beweis ohne Rückfall.

   DER WÄCHTER [Passwort-NFC·Klasse] liest die fünf ausgelieferten Seiten statisch, außerhalb des gepinnten Blocks, und je
   Aufruf einer Ableitung (SENKEN) das erste Argument. Es gilt als normalisiert, wenn
     (a) es selbst `normalizePassword(` oder `.normalize('NFC')` trägt,
     (b) es ein Name ist, dem in derselben Top-Level-Funktion VOR dem Aufruf ein solcher Ausdruck zugewiesen wurde,
     (c) der Aufruf an einen Helfer geht, der seinen Parameter selbst normalisiert (sein Rumpf trägt den Ausdruck), oder
     (d) der Aufruf in einer Senke selbst steht (weitergereicht: geprüft wird beim Aufrufer der Senke).
   Dazu: jeder `importKey('raw', …)` mit PBKDF2 in derselben Anweisung muss in einer Senke stehen — ein neuer eigener
   Ableitungsweg fällt so als Abweichung auf und gehört in SENKEN.
   GRENZE, bewusst: kein Tokenizer. Kommentare werden entfernt, Zeichenketten in ' und " enden spätestens am Zeilenende.
   „Top-Level-Funktion" heißt: eine Zeile, die mit `function` bzw. `async function` beginnt. Der Wächter sieht keinen Datenfluss
   über Funktionsgrenzen außer (c)/(d) und keinen Aufruf über einen Alias (`const f = deriveKey; f(pw)`). Fällt eine neue
   Senke hinzu, die nicht in SENKEN steht, sieht er sie nur über die PBKDF2-Regel. Dass er nicht erblindet, hält der
   Mindestbestand: bekannte Stellen müssen gefunden werden.
   AUSNAHMEN nur mit Grund und genau (Datei-unabhängig je `Funktion|Senke|Argument`); eine ohne Gegenstand ist rot.

   DIE PASSWORTREGELN (Entscheidung „Passwortregeln offline nach BSI“, 18.10.2026): Empfänger-Datei und QR verlangen 12 statt 8
   Zeichen beim Anlegen, nie weniger als das eigene Passwort; bestehende Dateien mit 8 bis 11 Zeichen öffnen weiter. „Stark“ nur
   beim Wortvorschlag oder ab 16 Zeichen mit drei Zeichenarten; Hinweis, Umlaute, ß und € zu meiden. Nachtrag (Entscheidung vom
   18.10.2026): auch die .vdkey-Passphrasen in Issuer, Teiler und Studio verlangen 12 statt 8; bestehende
   .vdkey-Dateien mit 8 bis 11 Zeichen gehen weiter auf.

   DER GRENZEN-WÄCHTER [Passwort·Grenzen nie schwächer] liest dieselben fünf Seiten (außerhalb des Blocks, ohne Kommentare) und
   findet zwei Formen: eine Konstante `const NAME = <Zahl>;`, deren Name ein Passwort-Wort (PW, PASSWORT, PASSPHRASE, KENNWORT)
   UND ein Mindest-Wort (MIN, MINDEST) trägt; und eine Prüfung `<name>.length < <Zahl oder Konstante>`, deren Name ein
   Passwort-Wort trägt (pw, passw, passphrase, kennwort; auch über `.value`, `.trim()` oder `String(…)`). Jede muss mindestens
   PW_MIN_EIGEN des Kerns sein. Das Einmalpasswort der Stelle (EINMALPASSWORT_MIN_ZEICHEN, 16, ein Hinweis, keine Sperre) fällt
   unter die Konstanten-Form und besteht ohnehin. GRENZE: `<=`, `>`, umgekehrte Vergleiche (`12 > pw.length`), Prüfungen über
   eine Hilfsfunktion und Namen ohne Passwort-Wort sieht er nicht; eine Konstante, die er nicht auflösen kann, ist rot.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');
const { ladeIssuer } = require('./load-issuer.js');
const { ladeGenerator } = require('./load-generator.js');
const { webcrypto } = require('node:crypto');

const WURZEL = path.join(__dirname, '..');
const lies = (rel) => fs.readFileSync(path.join(WURZEL, rel), 'utf8');
const KERN = lies('vivodepot.html');
const LESEN = lies('vivodepot-lesen.html');

// Das Passwort aus dem Auftrag, als Escape geschrieben, damit die Normalform im Quelltext feststeht: ü, ß, ü, Ö.
const PW_NFC = 'Grüße-Tür-Öl-2026'.normalize('NFC');
const PW_NFD = PW_NFC.normalize('NFD');

/* ══ Teil 1: die Lese-App öffnet, was der Kern mit NFC geschrieben hat ══════════════════════════════ */

/* Eine verschlechterte Lese-App-Kopie: jede Ersetzung muss greifen. */
function leseAppMit(ersetzungen) {
  let html = LESEN;
  for (const [von, nach] of ersetzungen) {
    assert.ok(html.includes(von), 'Vorbedingung Rot-Beweis: „' + von + '“ steht in der Lese-App');
    html = html.split(von).join(nach);
  }
  return ladeLesen({ html }).V;
}
/* OHNE NFC beim Öffnen von Depot, Sub und PBES2 (wie bis 18.10.2026; der NFD-Versuch bringt dann nichts, weil die rohe Form
   schon NFD ist). */
const OHNE_NFC = [
  ['  const nfc = normalizePassword(passwort);\n  try {\n    return await oeffne(nfc);', '  const nfc = passwort;\n  try {\n    return await oeffne(nfc);'],
  ["new TextEncoder().encode(String(passwort).normalize('NFC'));", 'new TextEncoder().encode(String(passwort));'],
];
/* OHNE den NFD-Rückfall beim Öffnen von Depot und Sub. */
const OHNE_NFD_RUECKFALL = [['    if (nfd === nfc) throw e1;', '    throw e1;']];
const leseAppOhneFix = () => leseAppMit(OHNE_NFC);

async function kernDateien() {
  const { V: K } = ladeKern();
  await K.depotAnlegen(PW_NFC);
  K.akteurSelbstErklaeren('Nora Probe');
  K.sektorFeldSetzen('identity', 'givenName', 'Nora');
  const v4 = await K.depotSerialisieren();
  const v3 = await K.depotSerialisierenV3();
  const sub = K.blackboxDateiAusUmschlag(await K.subDepotVersiegeln({ sektoren: { identity: { givenName: 'Sub-Nora' } }, menschen: [] }, PW_NFC)).umschlag;
  const jwe = await K.antwortJwePasswort('{"probe":"nfc"}', PW_NFC, { vorgang: 'NFC-PROBE' });
  return { K, v4, v3, sub, jwe };
}

test('[Passwort-NFC·Lese-App] ein im Kern mit Umlaut-Passwort angelegtes Depot öffnet in der Lese-App mit der NFD-Form', async () => {
  assert.notEqual(PW_NFD, PW_NFC, 'Vorbedingung: die zwei Formen unterscheiden sich');
  assert.equal(PW_NFD.normalize('NFC'), PW_NFC);
  const { v4, v3, sub, jwe } = await kernDateien();
  assert.equal(v3.kryptoVersion, 3, 'Vorbedingung: eine v3-Datei');
  const L = ladeLesen().V;
  const offen4 = await L.leseDepotUmschlag(JSON.parse(JSON.stringify(v4)), PW_NFD);
  assert.equal(offen4.sektoren.identity.givenName, 'Nora', 'v4 öffnet mit NFD');
  const offen3 = await L.leseDepotUmschlag(JSON.parse(JSON.stringify(v3)), PW_NFD);
  assert.equal(offen3.sektoren.identity.givenName, 'Nora', 'v3 öffnet mit NFD');
  const offenSub = await L.leseSubUmschlag(JSON.parse(JSON.stringify(sub)), PW_NFD);
  assert.equal(offenSub.sektoren.identity.givenName, 'Sub-Nora', 'das Sub-Depot öffnet mit NFD');
  const antwort = await L.antwortJweOeffnen(jwe, { passwort: PW_NFD });
  assert.equal(antwort.klartext, '{"probe":"nfc"}', 'die Antwort mit Einmalpasswort öffnet mit NFD');
  // Die NFC-Form öffnet weiter, ein falsches Passwort nicht.
  assert.equal((await L.leseDepotUmschlag(JSON.parse(JSON.stringify(v4)), PW_NFC)).sektoren.identity.givenName, 'Nora');
  await assert.rejects(() => L.leseDepotUmschlag(JSON.parse(JSON.stringify(v4)), 'Grüße-Tür-Öl-2027'));
});

test('[Passwort-NFC·Lese-App·Rot-Beweis] ohne den Fix öffnet die Lese-App dieselben Dateien mit der NFD-Form nicht', async () => {
  const { v4, v3, sub, jwe } = await kernDateien();
  const alt = leseAppOhneFix();
  await assert.rejects(() => alt.leseDepotUmschlag(JSON.parse(JSON.stringify(v4)), PW_NFD), 'v4 ohne NFC');
  await assert.rejects(() => alt.leseDepotUmschlag(JSON.parse(JSON.stringify(v3)), PW_NFD), 'v3 ohne NFC');
  await assert.rejects(() => alt.leseSubUmschlag(JSON.parse(JSON.stringify(sub)), PW_NFD), 'Sub ohne NFC');
  await assert.rejects(() => alt.antwortJweOeffnen(jwe, { passwort: PW_NFD }), 'PBES2 ohne NFC');
  // Gegenprobe: mit der NFC-Form öffnet auch die alte Fassung — der Unterschied liegt allein an der Normalform.
  assert.equal((await alt.leseDepotUmschlag(JSON.parse(JSON.stringify(v4)), PW_NFC)).sektoren.identity.givenName, 'Nora');
});

/* Ein Bestand von vor B1: mit dem NFD-Passwort abgeleitet, über die Block-Primitiven des Kerns (wie tests/nfc-passwort.test.js). */
async function nfdBestand(inhalt) {
  const { V } = ladeKern();
  const zufall = (n) => Buffer.from(webcrypto.getRandomValues(new Uint8Array(n))).toString('base64');
  const pbkdf2SaltB64 = zufall(16), depotSaltB64 = zufall(32);
  const depotUUID = V.uuidV4();
  const bits = await V.deriveMasterBits(PW_NFD, V.base64ToBytes(pbkdf2SaltB64));   // roh NFD, keine Normalisierung
  const master = await V.importMasterHkdfKey(bits);
  const subKey = await V.deriveDepotKeyV2(master, V.base64ToBytes(depotSaltB64), depotUUID);
  const { iv, ct } = await V.VdCrypto.encryptDepot(inhalt || { sektoren: { identity: { givenName: 'Alt' } }, menschen: [] }, subKey, V._AAD_DEPOT_V2);
  return { kryptoVersion: 3, depotUUID, pbkdf2: { salt: pbkdf2SaltB64 }, depotSalt: depotSaltB64, iv, ct };
}

test('[Passwort-NFC·Lese-App·NFD-Bestand] ein Bestand, der nur mit NFD aufgeht, öffnet in der Lese-App auch mit der NFC-Eingabe', async () => {
  const u = await nfdBestand();
  const L = ladeLesen().V;
  for (const pw of [PW_NFC, PW_NFD]) {
    assert.equal((await L.leseDepotUmschlag(JSON.parse(JSON.stringify(u)), pw)).sektoren.identity.givenName, 'Alt', 'Depot');
    assert.equal((await L.leseSubUmschlag(JSON.parse(JSON.stringify(u)), pw)).sektoren.identity.givenName, 'Alt', 'Sub');
  }
  await assert.rejects(() => L.leseDepotUmschlag(JSON.parse(JSON.stringify(u)), 'falsch-aber-ascii'), 'ein falsches Passwort öffnet nicht');
});

test('[Passwort-NFC·Lese-App·NFD-Bestand·Rot-Beweis] ohne den NFD-Rückfall bleibt der Bestand zu', async () => {
  const u = await nfdBestand();
  const alt = leseAppMit(OHNE_NFD_RUECKFALL);
  await assert.rejects(() => alt.leseDepotUmschlag(JSON.parse(JSON.stringify(u)), PW_NFC), 'Depot ohne Rückfall');
  await assert.rejects(() => alt.leseSubUmschlag(JSON.parse(JSON.stringify(u)), PW_NFC), 'Sub ohne Rückfall');
});

/* Der Kern zieht gleich (Wort Krypto 2, 18.10.2026): erst NFC, dann genau einmal NFD, wenn NFD ≠ NFC — gleich, wie getippt wurde. */
const KERN_ALTE_BEDINGUNG = [
  ["    if (typeof password !== 'string') throw e1;\n", "    if (typeof password !== 'string' || password === nfc) throw e1;\n"],
  ["    if (typeof subPasswort !== 'string') throw e1;\n", "    if (typeof subPasswort !== 'string' || subPasswort === nfc) throw e1;\n"],
];
function kernMitAlterBedingung() {
  let html = KERN;
  for (const [von, nach] of KERN_ALTE_BEDINGUNG) {
    assert.equal(html.split(von).length, 2, 'Vorbedingung Rot-Beweis: „' + von.trim() + '“ steht genau einmal im Kern');
    html = html.split(von).join(nach);
  }
  return kernKopieLaden(html).V;
}
const kernBestandInhalt = () => Object.assign(ladeKern().V.leeresDepot(), { _marker: 'nfd-bestand' });

test('[Passwort-NFC·Kern·NFD-Bestand] ein Bestand, der nur mit NFD aufgeht, öffnet im Kern mit NFC- und mit NFD-Eingabe', async () => {
  for (const pw of [PW_NFC, PW_NFD]) {
    const u = await nfdBestand(kernBestandInhalt());
    const { V } = ladeKern();
    assert.equal((await V.depotLaden(JSON.parse(JSON.stringify(u)), pw))._marker, 'nfd-bestand', 'depotLaden');
    // Danach unter NFC neu verschlüsselt, wie bisher: der nächste Umschlag öffnet mit NFC im ersten Versuch.
    const neu = await V.depotSerialisieren();
    assert.equal((await ladeKern().V.depotLaden(neu, PW_NFC))._marker, 'nfd-bestand', 'nach dem Öffnen unter NFC');
    const { V: A } = ladeKern();
    await A.depotAnlegen('anker-passwort-nfd-bestand');
    const sub = await nfdBestand(Object.assign(A.leeresDepot(), { _marker: 'nfd-sub', verwaltungsTyp: 'verwaltet' }));
    const r = await A.subDepotEntsiegeln(JSON.parse(JSON.stringify(sub)), pw);
    assert.equal(r.inhalt._marker, 'nfd-sub', 'subDepotEntsiegeln');
    assert.ok(r.reEncryptUmschlag, 'nach Erfolg über NFD wird das Sub unter NFC neu versiegelt');
  }
});

test('[Passwort-NFC·Kern·NFD-Bestand·Rot-Beweis] mit der alten Bedingung bleibt der Bestand bei NFC-Eingabe zu', async () => {
  const u = await nfdBestand(kernBestandInhalt());
  await assert.rejects(() => kernMitAlterBedingung().depotLaden(JSON.parse(JSON.stringify(u)), PW_NFC), 'depotLaden mit alter Bedingung');
  const A = kernMitAlterBedingung();
  await A.depotAnlegen('anker-passwort-nfd-bestand');
  const sub = await nfdBestand(Object.assign(A.leeresDepot(), { _marker: 'nfd-sub', verwaltungsTyp: 'verwaltet' }));
  await assert.rejects(() => A.subDepotEntsiegeln(JSON.parse(JSON.stringify(sub)), PW_NFC), 'subDepotEntsiegeln mit alter Bedingung');
  // Gegenprobe: mit der NFD-Eingabe öffnet auch die alte Fassung — der Unterschied liegt allein an der Bedingung.
  assert.equal((await kernMitAlterBedingung().depotLaden(JSON.parse(JSON.stringify(u)), PW_NFD))._marker, 'nfd-bestand');
});

/* ══ Teil 1b: die .vdkey-Hülle ══════════════════════════════════════════════════════════════════════ */

const JWK_PROBE = Object.freeze({ kty: 'OKP', crv: 'Ed25519', x: 'probe-x-nur-hier', d: 'probe-d-nur-hier' });
const SCHUETZEN_MIT_NFC = ["deriveKey(String(passphrase).normalize('NFC'), salt)", 'deriveKey(passphrase, salt)'];
const OEFFNEN_NUR_ROH = ["  const nfc = String(passphrase).normalize('NFC');", '  const nfc = passphrase;'];
const OEFFNEN_OHNE_RUECKFALL = ['  for (const p of (nfc === passphrase ? [nfc] : [nfc, passphrase])) {', '  for (const p of [nfc]) {'];

/* Zählt die PBKDF2-Ableitungen (deriveMasterBits → subtle.deriveBits mit PBKDF2) während `lauf`. */
async function pbkdf2Zaehlen(lauf) {
  const proto = Object.getPrototypeOf(webcrypto.subtle);
  const echt = proto.deriveBits;
  let n = 0;
  proto.deriveBits = function (alg, ...rest) { if (alg && alg.name === 'PBKDF2') n++; return echt.call(this, alg, ...rest); };
  try { await lauf(); } finally { proto.deriveBits = echt; }
  return n;
}

test('[Passwort-NFC·vdkey] eine Hülle von vor dem Fix (NFD-Passphrase) öffnet in Lese-App, Issuer und Studio', async () => {
  const alteHuelle = await leseAppMit([SCHUETZEN_MIT_NFC]).schuetzeSchluesselJwk(JWK_PROBE, PW_NFD);
  for (const [name, V] of [['Lese-App', ladeLesen().V], ['Issuer', ladeIssuer().V], ['Studio', ladeGenerator().V]]) {
    assert.deepEqual(JSON.parse(JSON.stringify(await V.entschluesseleSchluesselJwk(JSON.parse(JSON.stringify(alteHuelle)), PW_NFD))),
      JSON.parse(JSON.stringify(JWK_PROBE)), name + ' öffnet die alte Hülle');
  }
});

test('[Passwort-NFC·vdkey] eine neue Hülle ist unter NFC geschützt, und die Versuche sind genau gezählt', async () => {
  const L = ladeLesen().V;
  const neu = await L.schuetzeSchluesselJwk(JWK_PROBE, PW_NFD);
  // Unter NFC geschützt: eine Kopie, die nur roh ableitet, öffnet sie mit der NFC-Eingabe.
  const nurRoh = leseAppMit([OEFFNEN_NUR_ROH]);
  assert.equal((await nurRoh.entschluesseleSchluesselJwk(JSON.parse(JSON.stringify(neu)), PW_NFC)).d, JWK_PROBE.d);
  // Richtiges Passwort in NFD: der erste Versuch (NFC) trägt, kein zweiter.
  assert.equal(await pbkdf2Zaehlen(() => L.entschluesseleSchluesselJwk(JSON.parse(JSON.stringify(neu)), PW_NFD)), 1);
  // Falsches Passwort mit zerlegbaren Zeichen in NFD: beide Versuche, beide scheitern.
  const falschNfd = 'Gr\u00fc\u00dfe-falsch-2026'.normalize('NFD');
  let n = await pbkdf2Zaehlen(() => assert.rejects(() => L.entschluesseleSchluesselJwk(JSON.parse(JSON.stringify(neu)), falschNfd), /Falsche Passphrase/));
  assert.equal(n, 2, 'zwei Versuche, wenn roh und NFC sich unterscheiden');
  // Ohne Unterschied (ASCII, oder schon NFC): genau ein Versuch.
  n = await pbkdf2Zaehlen(() => assert.rejects(() => L.entschluesseleSchluesselJwk(JSON.parse(JSON.stringify(neu)), 'falsch-ascii-2026'), /Falsche Passphrase/));
  assert.equal(n, 1, 'ASCII: ein Versuch');
  n = await pbkdf2Zaehlen(() => assert.rejects(() => L.entschluesseleSchluesselJwk(JSON.parse(JSON.stringify(neu)), falschNfd.normalize('NFC')), /Falsche Passphrase/));
  assert.equal(n, 1, 'schon NFC: ein Versuch');
});

test('[Passwort-NFC·vdkey·Rot-Beweis] ohne den Rückfall bleibt die alte Hülle zu, ohne NFC beim Schützen die neue offen nur roh', async () => {
  const alteHuelle = await leseAppMit([SCHUETZEN_MIT_NFC]).schuetzeSchluesselJwk(JWK_PROBE, PW_NFD);
  await assert.rejects(() => leseAppMit([OEFFNEN_OHNE_RUECKFALL]).entschluesseleSchluesselJwk(JSON.parse(JSON.stringify(alteHuelle)), PW_NFD),
    /Falsche Passphrase/, 'ohne Rückfall öffnet die alte Hülle nicht');
  // Die alte Hülle ist NICHT unter NFC geschützt: die Roh-Kopie öffnet sie mit der NFC-Eingabe nicht. (Gegenstück zur Probe oben.)
  await assert.rejects(() => leseAppMit([OEFFNEN_NUR_ROH]).entschluesseleSchluesselJwk(JSON.parse(JSON.stringify(alteHuelle)), PW_NFC));
});

/* ══ Teil 2: der Klassenwächter ═══════════════════════════════════════════════════════════════════ */

const DATEIEN = ['vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-studio.html', 'vivodepot-vc-issuer.html', 'vivodepot-schluessel-teilen.html'];
const BLOCK_SIGNATUR = 'const VdCrypto = ' + '(function';   // geteilt, sonst zählt die Block-Propagation diese Datei als Träger

/* Senken: Funktionen, deren erstes Argument ein Passwort oder eine Passphrase ist und in eine Ableitung geht. */
const SENKEN = Object.freeze([
  'VdCrypto.setupSession', 'deriveMasterBits', 'depotMasterHkdfKey', 'deriveKey', '_jwePbes2Schluessel', '_angDeriveKey',
  '_empfaengerQrSchluesselVerschluesseln', '_empfaengerQrSchluesselEntschluesseln', '_fachTuerSchluessel', '_whcCodeBits',
]);

/* Ausnahmen je `Funktion|Senke|Argument`, jede mit Grund. */
const AUSNAHMEN = Object.freeze({
  'depotLaden|VdCrypto.setupSession|pw': 'Die Hilfsfunktion entschluessleMit(pw) wird mit nfc (normalizePassword) und genau einmal mit '
    + 'der NFD-Form aufgerufen: der bewusste Rückfall des Kerns für Bestände von vor B1. Danach schlüsselt der Kern auf NFC um.',
  'subDepotEntsiegeln|depotMasterHkdfKey|pw': 'Wie depotLaden: entsiegleMit(pw) bekommt nfc und einmal die NFD-Form (B1 L4); nach Erfolg '
    + 'über NFD wird unter NFC neu versiegelt.',
  '_whcAuspacken|_whcCodeBits|stellen': 'Wiederherstellungs-Code, kein Passwort: whcCodeLesen lässt nur Zeichen aus WHC_ALPHABET '
    + '(ASCII, Großbuchstaben und Ziffern) durch, NFC ändert sie nicht.',
  'whcHuelleWickeln|_whcCodeBits|stellen': 'Wie _whcAuspacken: die Stellen des Wiederherstellungs-Codes sind ASCII aus WHC_ALPHABET.',
  '_passwortProbeRoundtrip|depotMasterHkdfKey|pwNfc': 'Parameter; beide Aufrufer reichen NFC (whcHuelleWickeln: pwNfc = normalizePassword, '
    + 'passwortWechselDurchfuehren: altNfc = normalizePassword).',
  '_passwortSessionZurueckdrehen|VdCrypto.setupSession|pwAltNfc': 'Parameter; der einzige Aufrufer (passwortWechselDurchfuehren) reicht '
    + 'altNfc = normalizePassword(pwAlt).',
  'leseDepotUmschlag|VdCrypto.setupSession|pw': 'Lese-App, Spiegel von depotLaden: pw kommt aus _mitNfcDannNfd (erst NFC, dann genau einmal '
    + 'NFD, wenn sie sich unterscheiden; Wort Krypto 2, 18.10.2026).',
  'leseSubUmschlag|depotMasterHkdfKey|pw': 'Lese-App, Spiegel von subDepotEntsiegeln: pw kommt aus _mitNfcDannNfd (erst NFC, dann genau einmal NFD).',
  'entschluesseleSchluesselJwk|deriveKey|p': 'Die Schleife versucht erst NFC, dann genau einmal die rohe Eingabe, wenn sie sich unterscheidet: '
    + 'eine .vdkey-Hülle von vor dem 18.10.2026 trägt die Passphrase so, wie sie getippt war.',
});

/* Bekannte Stellen, die der Wächter finden MUSS — sonst ist er blind geworden (Positivkontrolle gegen die Näherung). */
const MINDESTBESTAND = Object.freeze([
  'vivodepot.html|depotAnlegen|VdCrypto.setupSession',
  'vivodepot.html|subDepotEntsiegeln|depotMasterHkdfKey',
  'vivodepot.html|antwortJwePasswort|_jwePbes2Schluessel',
  'vivodepot.html|empfaengerQrPayloadBauen|_empfaengerQrSchluesselVerschluesseln',
  'vivodepot-lesen.html|leseDepotUmschlag|VdCrypto.setupSession',
  'vivodepot-lesen.html|leseSubUmschlag|depotMasterHkdfKey',
  'vivodepot-lesen.html|antwortEntschluesselnPasswort|_angDeriveKey',
  'vivodepot-lesen.html|antwortJweOeffnen|_jwePbes2Schluessel',
  'vivodepot-lesen.html|_empfaengerQrEntschluesseln|_empfaengerQrSchluesselEntschluesseln',
  'vivodepot-studio.html|antwortJweOeffnen|_jwePbes2Schluessel',
  'vivodepot-studio.html|entschluesseleSchluesselJwk|deriveKey',
  'vivodepot-vc-issuer.html|schuetzeSchluesselJwk|deriveKey',
  'vivodepot-schluessel-teilen.html|schuetzeSchluesselJwk|deriveKey',
]);
const MINDESTBESTAND_PBKDF2 = Object.freeze([
  'vivodepot.html|_empfaengerQrSchluesselVerschluesseln', 'vivodepot.html|_jwePbes2Schluessel',
  'vivodepot-lesen.html|_angDeriveKey', 'vivodepot-lesen.html|_empfaengerQrSchluesselEntschluesseln',
]);

const NORMALISIERT = /normalizePassword\(|\.normalize\(\s*['"]NFC['"]\s*\)/;

/* Nur die Skript-Inhalte, ohne den gepinnten Block, ohne Kommentare; alles andere wird zu Leerzeichen, Zeilen bleiben stehen. */
function codeAusserhalbDesBlocks(html) {
  const leer = (s) => s.replace(/[^\n]/g, ' ');
  const teile = [];
  let bisher = 0;
  const re = /<script\b[^>]*>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const anfang = m.index + m[0].length;
    const ende = html.indexOf('</script>', anfang);
    if (ende < 0) break;
    const inhalt = html.slice(anfang, ende);
    teile.push(leer(html.slice(bisher, anfang)));
    teile.push(inhalt.includes(BLOCK_SIGNATUR) ? leer(inhalt) : ohneKommentare(inhalt));
    bisher = ende;
    re.lastIndex = ende;
  }
  teile.push(leer(html.slice(bisher)));
  return teile.join('');
}
function ohneKommentare(s) {
  let o = '';
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === '\\') { o += c + (d === undefined ? '' : d); i += 2; continue; }
    if (c === '/' && d === '/') { while (i < n && s[i] !== '\n') { o += ' '; i++; } continue; }
    if (c === '/' && d === '*') {
      const e = s.indexOf('*/', i + 2);
      const bis = e < 0 ? n : e + 2;
      o += s.slice(i, bis).replace(/[^\n]/g, ' ');
      i = bis;
      continue;
    }
    if (c === '\'' || c === '"' || c === '`') {
      o += c; i++;
      while (i < n && s[i] !== c && !(c !== '`' && s[i] === '\n')) {
        if (s[i] === '\\') { o += s[i] + (s[i + 1] === undefined ? '' : s[i + 1]); i += 2; continue; }
        o += s[i]; i++;
      }
      if (i < n && s[i] === c) { o += c; i++; }
      continue;
    }
    o += c; i++;
  }
  return o;
}

/* Top-Level-Funktionen: Name und Bereich [von, bis) im bereinigten Text. */
function topFunktionen(code) {
  const raus = [];
  const re = /^(?:async )?function ([\w$]+)\s*\(([^)]*)\)/gm;
  let m;
  while ((m = re.exec(code)) !== null) raus.push({ name: m[1], von: m.index });
  for (let i = 0; i < raus.length; i++) raus[i].bis = i + 1 < raus.length ? raus[i + 1].von : code.length;
  return raus;
}
function umgebendeFunktion(funktionen, at) {
  let f = null;
  for (const x of funktionen) { if (x.von <= at && at < x.bis) f = x; }
  return f;
}
function erstesArgument(code, ab) {
  let tiefe = 0, i = ab;
  for (; i < code.length; i++) {
    const c = code[i];
    if (c === '(' || c === '[' || c === '{') tiefe++;
    else if (c === ')' || c === ']' || c === '}') { if (tiefe === 0) break; tiefe--; }
    else if (c === ',' && tiefe === 0) break;
  }
  return code.slice(ab, i).trim();
}
const senkenMuster = (name) => name === 'VdCrypto.setupSession'
  ? /VdCrypto\.setupSession\(/g
  : new RegExp('(?<![\\w$.])' + name.replace(/\$/g, '\\$') + '\\(', 'g');

/* Der Wächter selbst, rein: Quelltexte rein, Funde raus. */
function ableitungenPruefen(quellen, ausnahmen) {
  ausnahmen = ausnahmen || AUSNAHMEN;
  const funde = [], gesehen = new Set(), gesehenPbkdf2 = new Set(), genutzt = new Set();
  for (const [datei, html] of Object.entries(quellen)) {
    const code = codeAusserhalbDesBlocks(html);
    const funktionen = topFunktionen(code);
    const helferNormalisiert = new Set(funktionen.filter((f) => SENKEN.includes(f.name) && NORMALISIERT.test(code.slice(f.von, f.bis))).map((f) => f.name));
    const zeile = (at) => code.slice(0, at).split('\n').length;
    for (const senke of SENKEN) {
      const re = senkenMuster(senke);
      let m;
      while ((m = re.exec(code)) !== null) {
        if (/function\s+$/.test(code.slice(Math.max(0, m.index - 16), m.index))) continue;   // die Definition selbst
        const f = umgebendeFunktion(funktionen, m.index);
        const fname = f ? f.name : '(oberste Ebene)';
        gesehen.add(datei + '|' + fname + '|' + senke);
        const arg = erstesArgument(code, m.index + m[0].length);
        if (NORMALISIERT.test(arg)) continue;                                                  // (a)
        if (/^[\w$]+$/.test(arg) && f) {
          const davor = code.slice(f.von, m.index);
          if (new RegExp('(?<![\\w$.])' + arg.replace(/\$/g, '\\$') + '\\s*=(?!=)[^;]*?(?:' + NORMALISIERT.source + ')').test(davor)) continue;   // (b)
        }
        if (helferNormalisiert.has(senke)) continue;                                           // (c)
        if (f && SENKEN.includes(f.name)) continue;                                            // (d)
        const schluessel = fname + '|' + senke + '|' + arg;
        if (Object.prototype.hasOwnProperty.call(ausnahmen, schluessel)) { genutzt.add(schluessel); continue; }
        funde.push(datei + ':' + zeile(m.index) + ' ' + schluessel);
      }
    }
    // Ein eigener PBKDF2-Weg aus einem Passwort steht nur in einer Senke.
    const raw = /\.importKey\(\s*['"]raw['"]/g;
    let r;
    while ((r = raw.exec(code)) !== null) {
      const anweisung = code.slice(r.index, code.indexOf(';', r.index) < 0 ? code.length : code.indexOf(';', r.index));
      if (!/PBKDF2/.test(anweisung)) continue;
      const f = umgebendeFunktion(funktionen, r.index);
      const fname = f ? f.name : '(oberste Ebene)';
      gesehenPbkdf2.add(datei + '|' + fname);
      if (!SENKEN.includes(fname)) funde.push(datei + ':' + zeile(r.index) + ' PBKDF2 aus einem Rohwert in ' + fname + ' — kein bekannter Ableitungsweg; in SENKEN aufnehmen und die Aufrufer prüfen');
    }
  }
  const ohneGegenstand = Object.keys(ausnahmen).filter((k) => !genutzt.has(k));
  return { funde, gesehen, gesehenPbkdf2, ohneGegenstand };
}
const QUELLEN = () => Object.fromEntries(DATEIEN.map((d) => [d, lies(d)]));

test('[Passwort-NFC·Klasse] jede Passwort-Ableitung außerhalb des Krypto-Blocks steht hinter NFC', () => {
  const r = ableitungenPruefen(QUELLEN());
  assert.deepEqual(r.funde, [], 'Ableitung ohne vorherige NFC-Normalisierung:\n  ' + r.funde.join('\n  '));
  assert.deepEqual(r.ohneGegenstand, [], 'Ausnahme ohne Gegenstand — streichen: ' + r.ohneGegenstand.join(', '));
  const fehlt = MINDESTBESTAND.filter((k) => !r.gesehen.has(k));
  assert.deepEqual(fehlt, [], 'der Wächter sieht bekannte Stellen nicht mehr — die Näherung ist blind geworden');
  const fehltPbkdf2 = MINDESTBESTAND_PBKDF2.filter((k) => !r.gesehenPbkdf2.has(k));
  assert.deepEqual(fehltPbkdf2, [], 'die PBKDF2-Regel sieht bekannte Stellen nicht mehr');
  for (const [k, grund] of Object.entries(AUSNAHMEN)) assert.ok(grund.length > 40, 'jede Ausnahme trägt einen Grund: ' + k);
});

test('[Passwort-NFC·Klasse·Rot-Beweis] ein eingepflanzter Aufruf ohne NFC wird gefunden, ebenso ein neuer PBKDF2-Weg', () => {
  const q = QUELLEN();
  const ende = q['vivodepot-lesen.html'].lastIndexOf('</script>');
  const pflanze = '\nasync function _probeOhneNfc(umschlag, pw) {\n  await VdCrypto.setupSession(pw, base64ToBytes(umschlag.pbkdf2.salt));\n}\n'
    + 'async function _probeEigenesPbkdf2(pw) {\n  return crypto.subtle.importKey(\'raw\', new TextEncoder().encode(pw), { name: \'PBKDF2\' }, false, [\'deriveKey\']);\n}\n';
  q['vivodepot-lesen.html'] = q['vivodepot-lesen.html'].slice(0, ende) + pflanze + q['vivodepot-lesen.html'].slice(ende);
  const r = ableitungenPruefen(q);
  assert.ok(r.funde.some((f) => f.includes('_probeOhneNfc|VdCrypto.setupSession|pw')), 'der Aufruf ohne NFC: ' + r.funde.join(' / '));
  assert.ok(r.funde.some((f) => f.includes('PBKDF2 aus einem Rohwert in _probeEigenesPbkdf2')), 'der neue PBKDF2-Weg: ' + r.funde.join(' / '));
  // Dieselbe Pflanze mit NFC davor ist sauber (Regel b).
  const q2 = QUELLEN();
  q2['vivodepot-lesen.html'] = q2['vivodepot-lesen.html'].slice(0, ende)
    + '\nasync function _probeMitNfc(umschlag, pw) {\n  const pwNfc = normalizePassword(pw);\n  await VdCrypto.setupSession(pwNfc, base64ToBytes(umschlag.pbkdf2.salt));\n}\n'
    + q2['vivodepot-lesen.html'].slice(ende);
  assert.deepEqual(ableitungenPruefen(q2).funde, []);
  // Und die Lese-App von vor dem Fix wäre rot gewesen.
  const vorher = QUELLEN();
  // Der Öffnen-Weg ohne den NFC-Helfer: dieselbe Ableitung, aber direkt mit dem rohen Feldwert (statisch gelesen, nicht ausgeführt).
  const alt = 'return _mitNfcDannNfd(password, async (pw) => {\n    await VdCrypto.setupSession(pw, pbkdf2Salt);';
  assert.equal(vorher['vivodepot-lesen.html'].split(alt).length, 2, 'Vorbedingung: der Öffnen-Weg steht genau einmal so in der Lese-App');
  vorher['vivodepot-lesen.html'] = vorher['vivodepot-lesen.html']
    .split(alt).join('return (async () => {\n    await VdCrypto.setupSession(password, pbkdf2Salt);');
  assert.ok(ableitungenPruefen(vorher).funde.some((f) => f.includes('leseDepotUmschlag|VdCrypto.setupSession|password')));
  // Eine Ausnahme ohne Gegenstand fällt auf.
  const mehr = Object.assign({}, AUSNAHMEN, { 'gibtEsNicht|deriveKey|pw': 'eine Ausnahme ohne Gegenstand, nur für den Rot-Beweis dieser Probe' });
  assert.deepEqual(ableitungenPruefen(QUELLEN(), mehr).ohneGegenstand, ['gibtEsNicht|deriveKey|pw']);
});

/* ══ Teil 3: Passwortregeln offline nach BSI ══════════════════════════════════════════════════════ */

function kernZahl(quelltext, name) {
  const m = new RegExp('^const ' + name + ' = (\\d+);', 'm').exec(quelltext);
  assert.ok(m, name + ' steht als Zahl im Kern');
  return Number(m[1]);
}
function empfaengerNieSchwaecher(quelltext) {
  const e = kernZahl(quelltext, 'EMPFAENGER_PW_MIN');
  const p = kernZahl(quelltext, 'PW_MIN_EIGEN');
  return { e, p, ok: e >= p };
}

test('[Passwort·Empfänger nie schwächer] EMPFAENGER_PW_MIN ist mindestens PW_MIN_EIGEN, gelesen aus dem Kern', () => {
  const r = empfaengerNieSchwaecher(KERN);
  assert.ok(r.ok, 'Empfänger-Datei, QR und PDF-Kopie tragen Inhalt des Depots: ' + r.e + ' < ' + r.p);
  assert.equal(ladeKern().V.EMPFAENGER_PW_MIN, r.e, 'der geladene Kern trägt dieselbe Zahl');
});

test('[Passwort·Empfänger nie schwächer·Rot-Beweis] ein Kern mit EMPFAENGER_PW_MIN = 8 fällt auf', () => {
  const kopie = KERN.replace(/^const EMPFAENGER_PW_MIN = \d+;/m, 'const EMPFAENGER_PW_MIN = 8;');
  assert.notEqual(kopie, KERN, 'Vorbedingung: die Ersetzung greift');
  assert.equal(empfaengerNieSchwaecher(kopie).ok, false);
});

/* Eine frühere Fassung nachstellen, wie in tests/passwort-min12.test.js. */
function kernKopieLaden(quelltext) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-nfc-kopie-'));
  try {
    const datei = path.join(ordner, 'vivodepot.html');
    fs.writeFileSync(datei, quelltext);
    return ladeKern({ htmlPfad: datei, backen: true });
  } finally {
    fs.rmSync(ordner, { recursive: true, force: true });
  }
}

test('[Passwort·Empfänger 12] beim Anlegen 11 Zeichen abgewiesen, 12 angenommen; Datei und QR', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('anker-passwort-empf-12');
  V.akteurSelbstErklaeren('Testerin');
  await V.empfaengerkreisSetzen({ id: 'k1', name: 'Tochter', bausteine: ['notfall'] });
  const kreis = V.empfaengerkreisFinden('k1');
  await assert.rejects(() => V.empfaengerDateiErzeugen(kreis, 'elf-zeichen'), /mindestens 12 Zeichen/);
  await assert.rejects(() => V.empfaengerQrPayloadBauen(kreis, 'elf-zeichen'), /mindestens 12 Zeichen/);
  await assert.doesNotReject(() => V.empfaengerDateiErzeugen(kreis, 'zwoelf-zeich'));
  await assert.doesNotReject(() => V.empfaengerQrPayloadBauen(kreis, 'zwoelf-zeich'));
  assert.ok(/12/.test(V.STRINGS.kreiseFehlerPwKurz), 'der Fehlertext nennt 12: ' + V.STRINGS.kreiseFehlerPwKurz);
  assert.ok(/12/.test(V.STRINGS.kreisePwPlaceholder), 'der Platzhalter nennt 12: ' + V.STRINGS.kreisePwPlaceholder);
});

test('[Passwort·Empfänger·Öffnen] eine Empfänger-Datei und ein QR mit 8 Zeichen aus einer früheren Fassung öffnen weiter', async () => {
  const ALT = 'acht-zch';
  assert.equal(ALT.length, 8);
  const alt = kernKopieLaden(KERN.replace(/^const EMPFAENGER_PW_MIN = \d+;/m, 'const EMPFAENGER_PW_MIN = 8;')).V;
  await alt.depotAnlegen('anker-passwort-empf-alt');
  alt.akteurSelbstErklaeren('Testerin');
  alt.sektorFeldSetzen('identity', 'givenName', 'Anna');
  await alt.empfaengerkreisSetzen({ id: 'k1', name: 'Tochter', bausteine: ['notfall'] });
  const kreis = alt.empfaengerkreisFinden('k1');
  const datei = (await alt.empfaengerDateiErzeugen(kreis, ALT)).umschlag;
  const { payloadB64 } = await alt.empfaengerQrPayloadBauen(kreis, ALT);

  const L = ladeLesen().V;
  const offen = await L.leseDepotUmschlag(JSON.parse(JSON.stringify(datei)), ALT);
  assert.equal(offen.sektoren.identity.givenName, 'Anna', 'die Lese-App öffnet die alte Empfänger-Datei');
  const qr = await L._empfaengerQrEntschluesseln(payloadB64, ALT);
  assert.equal(qr.inhalt.sektoren.identity.givenName, 'Anna', 'die Lese-App öffnet den alten QR');
  const { V: neu } = ladeKern();
  await neu.depotLaden(JSON.parse(JSON.stringify(datei)), ALT);
  assert.equal(neu.getData().sektoren.identity.givenName, 'Anna', 'der heutige Kern öffnet die alte Empfänger-Datei');
  // Die Lese-App kennt keine Mindestlänge: keine der beiden Zahlen steht in ihr.
  assert.equal(/EMPFAENGER_PW_MIN|PW_MIN_EIGEN/.test(LESEN), false, 'die Lese-App prüft beim Öffnen keine Länge');
});

test('[Passwort·Stärke offline] „stark“ nur beim Wortvorschlag oder ab 16 Zeichen mit drei Zeichenarten', () => {
  const { V } = ladeKern();
  assert.equal(V.passwortStaerke('Ab3$efgh9!kLmn5').stufe, 'mittel', '15 Zeichen mit vier Arten bleiben mittel');
  assert.equal(V.passwortStaerke('abcdefghij123456').stufe, 'mittel', '16 Zeichen mit zwei Arten bleiben mittel');
  assert.equal(V.passwortStaerke('abcdefgh-1234567').stufe, 'stark', '16 Zeichen mit drei Arten: stark');
  const vorschlag = V.passwortVorschlag();
  assert.ok(vorschlag, 'Vorbedingung: ein Wortvorschlag entsteht');
  assert.equal(V.passwortStaerke(vorschlag).stufe, 'stark', 'der Wortvorschlag ist stark');
});

test('[Passwort·Stärke·Umlaute] der BSI-Hinweis erscheint bei Umlauten, ß und €, nie beim Wortvorschlag', () => {
  const { V } = ladeKern();
  assert.equal(V.pwHatWechselndeZeichen(PW_NFC), true, 'Umlaute und ß');
  assert.equal(V.pwHatWechselndeZeichen('Probe-€-Zeichen'), true, 'Eurozeichen');
  assert.equal(V.pwHatWechselndeZeichen('ascii-only-Probe-2026!'), false, 'ASCII');
  for (let i = 0; i < 20; i++) assert.equal(V.pwHatWechselndeZeichen(V.passwortVorschlag()), false, 'der Wortvorschlag trägt nur ASCII');
  assert.ok(/ß/.test(V.STRINGS.pwStaerkeUmlaute) && /€/.test(V.STRINGS.pwStaerkeUmlaute), 'der Hinweis nennt ß und €: ' + V.STRINGS.pwStaerkeUmlaute);
  // Sichtbar unter dem Feld, wie in tests/sicherheit-block-b.test.js (der Stub hält je id ein Element).
  const { V: W, document } = ladeKern();
  document.getElementById('id-pw').value = PW_NFC;
  W.pwStaerkeAnzeigeVerdrahten('id-pw', 'id-pw-staerke');
  assert.ok(document.getElementById('id-pw-staerke').innerHTML.includes(W.STRINGS.pwStaerkeUmlaute), 'mit Umlauten steht der Hinweis unter dem Feld');
  document.getElementById('id-pw').value = 'ascii-only-Probe-2026!';
  W.pwStaerkeAnzeigeVerdrahten('id-pw', 'id-pw-staerke');
  assert.equal(document.getElementById('id-pw-staerke').innerHTML.includes(W.STRINGS.pwStaerkeUmlaute), false, 'ohne Umlaute kein Hinweis');
  const en = JSON.parse(lies('tools/textsatz-en-modul.json')).texte['strings:pwStaerkeUmlaute.text'];
  assert.equal(typeof en, 'string', 'der Hinweis steht im englischen Sprachmodul');
});

/* ══ Teil 4: .vdkey 12 und der Grenzen-Wächter über alle Träger (Nachtrag 18.10.2026) ══════════════ */

const PASSWORT_WORT_KONSTANTE = /(PW|PASSWORT|PASSPHRASE|KENNWORT)/;
const MINDEST_WORT = /(MIN|MINDEST)/;
const PASSWORT_WORT_NAME = /pw|passw|passphrase|kennwort/i;

/* Der Wächter selbst, rein: Quelltexte rein, Funde und Gesehenes raus. */
function grenzenPruefen(quellen) {
  const pwMin = kernZahl(quellen['vivodepot.html'], 'PW_MIN_EIGEN');
  const funde = [], gesehen = new Set();
  for (const [datei, html] of Object.entries(quellen)) {
    const code = codeAusserhalbDesBlocks(html);
    const zeile = (at) => code.slice(0, at).split('\n').length;
    const konstanten = {};
    const reK = /^\s*const ([A-Z][A-Z0-9_]*)\s*=\s*(\d+)\s*;/gm;
    let m;
    while ((m = reK.exec(code)) !== null) {
      konstanten[m[1]] = Number(m[2]);
      if (PASSWORT_WORT_KONSTANTE.test(m[1]) && MINDEST_WORT.test(m[1])) {
        gesehen.add(datei + '|const ' + m[1]);
        if (Number(m[2]) < pwMin) funde.push(datei + ':' + zeile(m.index) + ' const ' + m[1] + ' = ' + m[2] + ' < PW_MIN_EIGEN ' + pwMin);
      }
    }
    const reV = /(?:String\(\s*)?([A-Za-z_$][\w$]*)\s*\)?(?:\.value)?(?:\.trim\(\))?\.length\s*<\s*([A-Za-z_$][\w$]*|\d+)/g;
    while ((m = reV.exec(code)) !== null) {
      if (!PASSWORT_WORT_NAME.test(m[1])) continue;
      const grenze = m[2];
      const wert = /^\d+$/.test(grenze) ? Number(grenze)
        : (Object.prototype.hasOwnProperty.call(konstanten, grenze) ? konstanten[grenze] : null);
      gesehen.add(datei + '|' + m[1] + '.length < ' + grenze);
      if (wert === null) funde.push(datei + ':' + zeile(m.index) + ' ' + m[1] + '.length < ' + grenze + ' — Grenze nicht als Zahl auflösbar');
      else if (wert < pwMin) funde.push(datei + ':' + zeile(m.index) + ' ' + m[1] + '.length < ' + grenze + ' (' + wert + ') < PW_MIN_EIGEN ' + pwMin);
    }
  }
  return { funde, gesehen, pwMin };
}
const GRENZEN_MINDESTBESTAND = Object.freeze([
  'vivodepot.html|const PW_MIN_EIGEN', 'vivodepot.html|const EMPFAENGER_PW_MIN', 'vivodepot.html|const EINMALPASSWORT_MIN_ZEICHEN',
  'vivodepot.html|passwort.length < EMPFAENGER_PW_MIN', 'vivodepot.html|pw.length < PW_MIN_EIGEN',
  'vivodepot-vc-issuer.html|const SCHLUESSEL_PASSWORT_MINDESTLAENGE', 'vivodepot-vc-issuer.html|pw1.length < SCHLUESSEL_PASSWORT_MINDESTLAENGE',
  'vivodepot-schluessel-teilen.html|const SCHLUESSEL_PASSWORT_MINDESTLAENGE', 'vivodepot-schluessel-teilen.html|pw1.length < SCHLUESSEL_PASSWORT_MINDESTLAENGE',
  'vivodepot-studio.html|const SCHLUESSEL_PASSWORT_MINDESTLAENGE', 'vivodepot-studio.html|pw1.length < SCHLUESSEL_PASSWORT_MINDESTLAENGE',
  'vivodepot-studio.html|passwort.length < SCHLUESSEL_PASSWORT_MINDESTLAENGE',
]);

test('[Passwort·Grenzen nie schwächer] jede Mindestlänge beim Setzen eines Passworts in allen fünf Trägern ist mindestens PW_MIN_EIGEN', () => {
  const r = grenzenPruefen(QUELLEN());
  assert.equal(r.pwMin, 12, 'Vorbedingung: das eigene Passwort verlangt 12');
  assert.deepEqual(r.funde, [], 'schwächer als das Depot:\n  ' + r.funde.join('\n  '));
  const fehlt = GRENZEN_MINDESTBESTAND.filter((k) => !r.gesehen.has(k));
  assert.deepEqual(fehlt, [], 'der Wächter sieht bekannte Grenzen nicht mehr — die Näherung ist blind geworden');
});

test('[Passwort·Grenzen nie schwächer·Rot-Beweis] eine eingepflanzte 8 fällt auf, als Prüfung und als Konstante', () => {
  const q = QUELLEN();
  const ende = q['vivodepot-schluessel-teilen.html'].lastIndexOf('</script>');
  q['vivodepot-schluessel-teilen.html'] = q['vivodepot-schluessel-teilen.html'].slice(0, ende)
    + '\nconst PROBE_PASSWORT_MIN = 8;\nfunction _probeGrenze(pw1) {\n  if (pw1.length < 8) return false;\n  return true;\n}\n'
    + q['vivodepot-schluessel-teilen.html'].slice(ende);
  const r = grenzenPruefen(q);
  assert.ok(r.funde.some((f) => f.includes('const PROBE_PASSWORT_MIN = 8')), 'die Konstante: ' + r.funde.join(' / '));
  assert.ok(r.funde.some((f) => f.includes('pw1.length < 8 (8)')), 'die Prüfung: ' + r.funde.join(' / '));
  // Und die Fassung von vor dem Nachtrag wäre rot gewesen.
  const vorher = QUELLEN();
  vorher['vivodepot-studio.html'] = vorher['vivodepot-studio.html'].replace(/^const SCHLUESSEL_PASSWORT_MINDESTLAENGE = 12;/m, 'const SCHLUESSEL_PASSWORT_MINDESTLAENGE = 8;');
  assert.ok(grenzenPruefen(vorher).funde.some((f) => f.startsWith('vivodepot-studio.html:') && f.includes('SCHLUESSEL_PASSWORT_MINDESTLAENGE')));
});

test('[Passwort·vdkey 12] das Studio weist beim Setzen 11 Zeichen ab und nimmt 12; die Meldung nennt 12', () => {
  const G = ladeGenerator();
  const feld = (id) => G.document.getElementById(id);
  feld('sk-pw1').value = 'elf-zeichen'; feld('sk-pw2').value = 'elf-zeichen';
  assert.equal(G.V.passwortAusFeldern('sk-pw1', 'sk-pw2', 'sk-pw-meldung'), null, '11 Zeichen abgewiesen');
  assert.ok(/12/.test(String(feld('sk-pw-meldung').textContent)), 'die Meldung nennt 12: ' + feld('sk-pw-meldung').textContent);
  feld('sk-pw1').value = 'zwoelf-zeich'; feld('sk-pw2').value = 'zwoelf-zeich';
  assert.equal(G.V.passwortAusFeldern('sk-pw1', 'sk-pw2', 'sk-pw-meldung'), 'zwoelf-zeich', '12 Zeichen angenommen');
  const studio = lies('vivodepot-studio.html');
  assert.equal(/mindestens 8 Zeichen|at least 8 characters/i.test(studio), false, 'kein Studio-Text nennt mehr 8');
  for (const d of ['vivodepot-vc-issuer.html', 'vivodepot-schluessel-teilen.html']) {
    assert.equal(/mindestens 8 Zeichen/.test(lies(d)), false, d + ' nennt nicht mehr 8');
  }
});

test('[Passwort·vdkey·Öffnen] eine .vdkey-Datei mit 8 Zeichen aus einer früheren Fassung geht in Lese-App, Issuer und Studio auf', async () => {
  const ALT = 'acht-zch';
  assert.equal(ALT.length, 8);
  // Schützen prüft keine Länge (die Grenze steht am Feld), so entsteht die Hülle wie in einer früheren Fassung.
  const huelle = await ladeIssuer().V.schuetzeSchluesselJwk(JWK_PROBE, ALT);
  for (const [name, V] of [['Lese-App', ladeLesen().V], ['Issuer', ladeIssuer().V], ['Studio', ladeGenerator().V]]) {
    assert.equal((await V.entschluesseleSchluesselJwk(JSON.parse(JSON.stringify(huelle)), ALT)).d, JWK_PROBE.d, name);
  }
  // Das Öffnen kennt keine Mindestlänge: der Rumpf nennt weder die Konstante noch eine Längenprüfung.
  for (const d of ['vivodepot-lesen.html', 'vivodepot-vc-issuer.html', 'vivodepot-studio.html']) {
    const t = lies(d);
    const von = t.indexOf('async function entschluesseleSchluesselJwk(');
    const rumpf = t.slice(von, t.indexOf('\n}\n', von));
    assert.equal(/MINDESTLAENGE|\.length\s*</.test(rumpf), false, d + ': das Öffnen prüft keine Länge');
  }
});
