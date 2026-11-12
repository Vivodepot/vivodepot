'use strict';
/* Die Sicherung wird zur Probe geöffnet (11.10.2026, Befund SICHERUNG-NIE-ZUR-PROBE-GEOEFFNET)
   Die Anwendung schreibt die Sicherungsdatei und liest sie nie zurück: `depotInDateiSichern` und `sicherungskopieErstellen`
   enthalten kein Öffnen der geschriebenen Datei, der Zustand „unbestätigt“ bleibt stehen (U2-ADR-031: „Bewusst nicht gebaut,
   offen zur Abnahme“). Eine abgeschnittene oder nicht angekommene Datei fällt erst beim Wiederherstellen auf.

   Gebaut am 17.10.2026 (S1): `sicherungPruefen(text)` öffnet NUR im Speicher mit dem Schlüssel der offenen Sitzung und schreibt
   nie; nach dem Schreiben liest die Anwendung die Datei still zurück, wo sie es kann; sonst bietet „Sicherung prüfen“ das Öffnen an.
   Der Vertrag unten war die erwartete Röte des Befunds; das `todo` ist gefallen. Die Bedingungen der Krypto-Prüfung (17.10.2026)
   stehen in eigenen Proben darunter. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const { ladeKern, HTML_PATH } = require('./load-kern.js');

const PW = 'sicherung-probe-pw';
async function depotMit(name) {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren(name);
  V.sektorFeldSetzen('identity', 'givenName', name);
  return V;
}

/* Der Text einer Sicherung in der Form, die depotHerunterladen schreibt: Dateikopf, Umschlag und der Klartext-Stempel daneben
   (ältere Form `gespeichert_am`; heute steht dort `stand_marke`). Der Inhalt selbst trägt keinen Zeitstempel — den Stand nennt
   allein dieser Stempel. Bis zum Bau stand hier der nackte Umschlag; den schreibt die Anwendung nie. */
async function sicherungsText(V, stand = new Date().toISOString()) {
  return 'VIVODEPOT\u0001' + JSON.stringify(Object.assign({}, await V.depotSerialisieren(), { gespeichert_am: stand }), null, 2);
}

/* Der Vertrag als Funktion: `pruefen(text)` ist die Rücklese-Funktion, `V` das offene Depot. So misst der Rot-Beweis unten
   dieselben Aussagen an einer Attrappe, die nichts prüft. */
async function vertragPruefen(V, pruefen) {
  const alt = await sicherungsText(V);
  V.sektorFeldSetzen('identity', 'familyName', 'Beispiel');
  const heil = await sicherungsText(V);
  const vorher = await sicherungsText(V);

  const gut = await pruefen(heil);
  assert.equal(gut.gehtAuf, true, 'eine heile Sicherung des offenen Depots geht auf');
  assert.ok(gut.stand, 'und nennt ihren Stand');
  assert.equal(gut.aelter, false);

  const mitte = Math.floor(heil.length / 2);
  const veraendert = heil.slice(0, mitte) + (heil[mitte] === 'A' ? 'B' : 'A') + heil.slice(mitte + 1);
  assert.equal((await pruefen(veraendert)).gehtAuf, false, 'ein verändertes Zeichen: geht nicht auf');
  assert.equal((await pruefen(heil.slice(0, mitte))).gehtAuf, false, 'abgeschnitten: geht nicht auf');
  assert.equal((await pruefen('')).gehtAuf, false, 'leer: geht nicht auf');

  const fremd = await sicherungsText(await depotMit('Fremd'));
  const f = await pruefen(fremd);
  assert.equal(f.gehtAuf, false, 'die Datei eines anderen Depots ist nicht die Sicherung dieses Depots');
  assert.equal(f.grund, 'anderes-depot', 'und das wird gesagt, nicht als Schaden gemeldet');

  const a = await pruefen(alt);
  assert.equal(a.gehtAuf, true, 'eine ältere Sicherung desselben Depots geht auf');
  assert.equal(a.aelter, true, 'und sagt, dass sie einen älteren Stand trägt; das ist kein Fehler');

  assert.equal((await sicherungsText(V)).length, vorher.length, 'das Prüfen hat am offenen Depot nichts geändert');
  assert.equal(V.getData().sektoren.identity.familyName, 'Beispiel', 'und der offene Stand ist derselbe wie vorher');
}

test('[Sicherung·Probe-Öffnen] heil geht auf und nennt den Stand; verändert, abgeschnitten und fremd gehen nicht auf; eine ältere Sicherung nennt ihren Stand',
  async () => {
    const V = await depotMit('Erna');
    assert.equal(typeof V.sicherungPruefen, 'function', 'der Kern bietet das Zurücklesen einer geschriebenen Sicherung an');
    await vertragPruefen(V, (text) => V.sicherungPruefen(text));
  });

test('[Sicherung·Probe-Öffnen·Rot-Beweis] eine Funktion, die jede Datei für heil erklärt, besteht den Vertrag nicht', async () => {
  const V = await depotMit('Erna');
  const immerHeil = async () => ({ gehtAuf: true, grund: null, stand: '2026-10-11T00:00:00.000Z', aelter: false });
  await assert.rejects(() => vertragPruefen(V, immerHeil), /geht nicht auf/, 'die Attrappe fällt am ersten beschädigten Fall');
});

/* ── Bedingungen der Krypto-Prüfung (Wort 17.10.2026) ─────────────────────── */
const ERGEBNIS_SCHLUESSEL = ['aelter', 'gehtAuf', 'grund', 'stand'];

test('[Sicherung·Probe-Öffnen·Zugang] dasselbe Depot mit anderem Salz: gehtAuf null, Grund „anderer-zugang“, nie ein Schaden', async () => {
  const V = await depotMit('Erna');
  const u = JSON.parse((await sicherungsText(V)).slice('VIVODEPOT\u0001'.length));
  // Ein anderes PBKDF2-Salz steht für einen früheren Zugang (Passwortwechsel oder Code-Weg); der Inhalt bleibt unangetastet.
  u.pbkdf2 = Object.assign({}, u.pbkdf2, { salt: Buffer.alloc(16, 7).toString('base64') });
  const e = await V.sicherungPruefen('VIVODEPOT\u0001' + JSON.stringify(u));
  assert.equal(e.gehtAuf, null);
  assert.equal(e.grund, 'anderer-zugang');
  const satz = V.sicherungPruefenErgebnisText(e);
  assert.notEqual(satz, V.sicherungPruefenErgebnisText({ gehtAuf: true, aelter: false }), 'sieht nicht aus wie „geht auf“');
  assert.notEqual(satz, V.sicherungPruefenErgebnisText({ gehtAuf: false, grund: 'beschaedigt' }), 'und nicht wie ein Schaden');
});

test('[Sicherung·Probe-Öffnen·Fassung] eine Kryptofassung, die hier nicht geöffnet wird: gehtAuf null, Grund „fassung“, nie „beschaedigt“', async () => {
  const V = await depotMit('Erna');
  const u = JSON.parse((await sicherungsText(V)).slice('VIVODEPOT\u0001'.length));
  u.kryptoVersion = 2;
  const e = await V.sicherungPruefen('VIVODEPOT\u0001' + JSON.stringify(u));
  assert.equal(e.gehtAuf, null);
  assert.equal(e.grund, 'fassung');
  // Eine eingefrorene Sicherung einer älteren Kryptofassung gibt es im Repo nicht: ausgeliefert wurden nur 3 und 4, und beide
  // öffnet diese Funktion (KRYPTO_VERSION_ALLOWLIST). Die Fassungsprobe je Registerzeile ist S3.
  assert.deepStrictEqual(Array.from(V.KRYPTO_VERSION_ALLOWLIST), [3, 4]);
});

/* Reihenfolge der Prüfungen (Gegenlesung Krypto, 09.11.2026): die Fassung vor der Form der Kennung. Eine fremde Fassung ohne
   Kennung ist kein Schaden, ohne ganzzahlige Fassung oder ohne Kennung ist die Datei keine Sicherung. */
test('[Sicherung·Probe-Öffnen·Reihenfolge] fremde Fassung ohne Kennung heißt „fassung“; ohne Fassungszahl oder Kennung „beschaedigt“', async () => {
  const V = await depotMit('Erna');
  const mit = (u) => V.sicherungPruefen('VIVODEPOT\u0001' + JSON.stringify(u));
  const f = await mit({ kryptoVersion: 2 });
  assert.deepEqual([f.gehtAuf, f.grund], [null, 'fassung'], 'fremde Fassung ohne Kennung');
  for (const [name, u] of [['ohne alles', {}], ['Fassung als Text', { kryptoVersion: '3' }], ['Fassung keine ganze Zahl', { kryptoVersion: 2.5 }]]) {
    const e = await mit(u);
    assert.deepEqual([e.gehtAuf, e.grund], [false, 'beschaedigt'], name);
  }
  const zwei = await sicherungsText(V);
  const u = JSON.parse(zwei.slice('VIVODEPOT\u0001'.length));
  delete u.depotUUID;
  const ohne = await mit(u);
  assert.deepEqual([ohne.gehtAuf, ohne.grund], [false, 'beschaedigt'], 'bekannte Fassung ohne Kennung');
  const a = await mit({ kryptoVersion: 2, depotUUID: 'eine-andere-kennung' });
  assert.deepEqual([a.gehtAuf, a.grund], [false, 'anderes-depot'], 'eine abweichende Kennung geht der Fassung vor');
});

/* Sub-Depots haben keine eigene Datei: im Sub-Kontext schreibt der Speicherweg die Datei des Ankers. Verglichen wird darum mit dem
   Anker, nicht mit dem offenen Sub-Inhalt (Gegenlesung Krypto, 09.11.2026). */
test('[Sicherung·Probe-Öffnen·Sub-Depot] die eben geschriebene Anker-Datei trägt auch im Sub-Kontext den offenen Stand', async () => {
  const V = await depotMit('Erna');
  const e = await V.subDepotAnlegen({ bezeichnung: 'Kind', inhaberin: 'Kind', verwaltungsTyp: 'verwaltet' }, 'Sub-Probe-Passwort-2026!');
  await V.subDepotVertrauenOeffnen(e.depotUUID, 'Sub-Probe-Passwort-2026!');
  V.subKontextBetreten(e.depotUUID);
  await V.subDepotNeuVersiegeln(e.depotUUID);
  const text = 'VIVODEPOT\u0001' + JSON.stringify(Object.assign({}, await V.depotSerialisieren(V.ankerDaten()), { gespeichert_am: new Date().toISOString() }));
  const r = await V.sicherungPruefen(text);
  assert.deepEqual([r.gehtAuf, r.aelter], [true, false], 'im Sub-Kontext');
  V.sektorFeldSetzen('identity', 'givenName', 'Sub-Änderung');
  await V.subDepotNeuVersiegeln(e.depotUUID);
  assert.equal((await V.sicherungPruefen(text)).aelter, true, 'eine spätere Änderung am Sub-Depot macht die Datei zur älteren');
});

/* Der Salz-Vergleich belegt den Schlüssel nicht, wenn die Sitzung über ein Fach oder über den NFD-Rückfall geöffnet wurde: Dann
   scheitert das Entschlüsseln an einer unversehrten Datei, und „beschädigt“ wäre falsch (Gegenlesung Krypto, 09.11.2026). */
const { webcrypto } = require('node:crypto');
const PW_FACH = 'Renate-Probe-2026!';
const PW_NFC = 'Größe-Möhre-2026!'.normalize('NFC');
const PW_NFD = PW_NFC.normalize('NFD');
const alsText = (u) => 'VIVODEPOT\u0001' + JSON.stringify(Object.assign({}, u, { gespeichert_am: new Date().toISOString() }));
function verdorben(text) { const i = text.indexOf('"depotSalt"') - 40; return text.slice(0, i) + (text[i] === 'A' ? 'B' : 'A') + text.slice(i + 1); }

async function dateiMitFach() {
  const V = await depotMit('Erna');
  await V.empfaengerkreisSetzen({ name: 'Tante', bausteine: ['notfall'] });
  await V.empfaengerkreisFachEinrichten(V.empfaengerkreiseListe()[0], PW_FACH);
  return V.depotSerialisierenV4();
}
async function nfdDatei() {
  const { V } = ladeKern();
  const zufall = (n) => Buffer.from(webcrypto.getRandomValues(new Uint8Array(n))).toString('base64');
  const pbkdf2SaltB64 = zufall(16), depotSaltB64 = zufall(32), depotUUID = V.uuidV4();
  const master = await V.importMasterHkdfKey(await V.deriveMasterBits(PW_NFD, V.base64ToBytes(pbkdf2SaltB64)));
  const subKey = await V.deriveDepotKeyV2(master, V.base64ToBytes(depotSaltB64), depotUUID);
  const { iv, ct } = await V.VdCrypto.encryptDepot(Object.assign(V.leeresDepot(), { _marker: 'nfd' }), subKey, V._AAD_DEPOT_V2);
  return { kryptoVersion: 3, depotUUID, pbkdf2: { salt: pbkdf2SaltB64 }, depotSalt: depotSaltB64, iv, ct };
}

test('[Sicherung·Probe-Öffnen·Schlüssel] Sitzung über ein Fach: eine unversehrte Datei heißt „anderer-zugang“, nie „beschaedigt“', async () => {
  const u = await dateiMitFach();
  const { V } = ladeKern();
  await V.depotLaden(JSON.parse(JSON.stringify(u)), PW_FACH);
  const e = await V.sicherungPruefen(alsText(u));
  assert.deepEqual([e.gehtAuf, e.grund], [null, 'anderer-zugang']);
});

test('[Sicherung·Probe-Öffnen·Schlüssel] Sitzung über den NFD-Rückfall: eine unversehrte Datei heißt „anderer-zugang“, nie „beschaedigt“', async () => {
  const u = await nfdDatei();
  const { V } = ladeKern();
  await V.depotLaden(JSON.parse(JSON.stringify(u)), PW_NFC);
  const e = await V.sicherungPruefen(alsText(u));
  assert.deepEqual([e.gehtAuf, e.grund], [null, 'anderer-zugang']);
});

test('[Sicherung·Probe-Öffnen·Schlüssel·Rot-Beweis] die Marke gilt nur für diese Sitzung: mit dem Passwort der Inhaberin ist eine veränderte Datei wieder beschädigt', async () => {
  const u = await dateiMitFach();
  const { V } = ladeKern();
  await V.depotLaden(JSON.parse(JSON.stringify(u)), PW_FACH);
  await V.depotLaden(JSON.parse(JSON.stringify(u)), PW);
  const heil = await V.sicherungPruefen(alsText(u));
  assert.equal(heil.gehtAuf, true, 'die heile Datei geht mit der Sitzung der Inhaberin auf');
  const e = await V.sicherungPruefen(verdorben(alsText(u)));
  assert.equal(e.gehtAuf, false, 'die veränderte Datei geht nicht auf');
  assert.equal(e.grund, 'beschaedigt');
});

test('[Sicherung·Probe-Öffnen·Grenze] das Ergebnis trägt nur gehtAuf, grund, stand und aelter — nie Inhalt', async () => {
  const V = await depotMit('Erna');
  const heil = await sicherungsText(V);
  const faelle = [heil, heil.slice(0, 200), '', await sicherungsText(await depotMit('Fremd'))];
  for (const t of faelle) {
    const e = await V.sicherungPruefen(t);
    assert.deepStrictEqual(Object.keys(e).sort(), ERGEBNIS_SCHLUESSEL);
    assert.ok(!JSON.stringify(e).includes('Erna'), 'kein Inhalt im Ergebnis');
  }
});

/* ── (a) Stilles Zurücklesen nach dem Schreiben ───────────────────────────── */
function ablageort({ abschneiden = false } = {}) {
  let inhalt = '';
  const handle = {
    name: 'probe.vivodepot',
    createWritable: async () => {
      let puffer = '';
      return {
        write: async (b) => { puffer += (typeof b === 'string') ? b : await b.text(); },
        close: async () => { inhalt = abschneiden ? puffer.slice(0, Math.floor(puffer.length / 2)) : puffer; },
      };
    },
    getFile: async () => ({ text: async () => inhalt }),
  };
  // Der echte Blob: ohne ihn setzt der Testlader eine leere Attrappe ein, und geschrieben würde nichts.
  return { showSaveFilePicker: async () => handle, Blob, geschrieben: () => inhalt };
}

test('[Sicherung·Zurücklesen] eine heile Datei gilt als geschrieben', async () => {
  const { V } = ladeKern(ablageort());
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Erna');
  V.sektorFeldSetzen('identity', 'givenName', 'Erna');
  assert.equal(await V.depotHerunterladen(), 'datei');
});

test('[Sicherung·Zurücklesen] eine eben geschriebene Sicherung trägt den Stand des geöffneten Depots, nicht einen älteren', async () => {
  // Gemessen im Browser beim Bau: markiereAlsDateiGesichert bucht sicherungsStand erst nach dem Schreiben ins Depot. Ohne
  // Ausnahme dafür hieß jede frische Sicherung „älter“. Darum hier der echte Speicherweg, nicht depotSerialisieren.
  const ort = ablageort();
  const { V } = ladeKern(ort);
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Erna');
  V.sektorFeldSetzen('identity', 'givenName', 'Erna');
  assert.equal(await V.depotHerunterladen(), 'datei');
  const e = await V.sicherungPruefen(ort.geschrieben());
  assert.equal(e.gehtAuf, true);
  assert.equal(e.aelter, false);
  V.sektorFeldSetzen('identity', 'familyName', 'Beispiel');
  assert.equal((await V.sicherungPruefen(ort.geschrieben())).aelter, true, 'nach einer Änderung ist sie älter');
});

test('[Sicherung·Zurücklesen·Rot-Beweis] eine beim Schreiben abgeschnittene Datei gilt nicht als geschrieben', async () => {
  const { V } = ladeKern(ablageort({ abschneiden: true }));
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Erna');
  V.sektorFeldSetzen('identity', 'givenName', 'Erna');
  assert.equal(await V.depotHerunterladen(), 'zielverlust', 'close() allein ist kein Beleg mehr');
});

/* ── Wächter: jeder Schreibweg einer .vivodepot-Datei ─────────────────────── */
const fs = require('node:fs');
const path = require('node:path');
// Erhoben am Quelltext: jede Funktion, die den Dateikopf schreibt (dateiMitMagic) oder eine Blackbox-Datei baut. Wer eine Sicherung
// DIESES Depots schreibt, liest sie zurück; die übrigen schreiben Dateien mit fremdem Zugang und stehen hier mit Grund.
const KEINE_SICHERUNG_DIESES_DEPOTS = {
  empfaengerDateiHerausgeben: 'Empfängerdatei für einen Kreis, mit eigenem Passwort — die Sitzung öffnet sie nicht',
  blackboxHerunterladen: 'Übergabe eines verwalteten Sub-Depots, Umschlag verbatim mit dessen Schlüssel',
  _kindDateiInHandleSchreiben: 'Übergabe-Datei eines Sub-Depots an dessen Kind, verbatim mit dessen Schlüssel — die Sitzung öffnet sie nicht',
  _kindDateiPodText: 'dieselbe Übergabe-Datei, im Pod abgelegt',
  _subSelbstAktionenZeigen: 'eigenständiger Umschlag eines Sub-Depots, außerhalb der Sitzung des Ankers',
  _subSelbstPasswortAendernZeigen: 'eigenständiger Umschlag eines Sub-Depots, außerhalb der Sitzung des Ankers',
};
function schreibwegeErheben(kern) {
  const zeilen = kern.split('\n');
  const wege = new Set();
  let fn = null;
  let imKommentar = false;   // Kommentare nennen Schreibwege, schreiben aber nicht (gemessen: eine Zeile in istGueltigerUmschlag)
  for (const z of zeilen) {
    const t = z.trim();
    if (imKommentar) { if (t.includes('*/')) imKommentar = false; continue; }
    if (t.startsWith('/*')) { if (!t.includes('*/')) imKommentar = true; continue; }
    if (t.startsWith('//') || t.startsWith('*')) continue;
    const m = /^(?:async )?function ([A-Za-z_$][\w$]*)\(/.exec(z);
    if (m) fn = m[1];
    if (fn && fn !== 'dateiMitMagic' && (z.includes('dateiMitMagic(') || z.includes("dateiTyp: 'vivodepot-blackbox-export'"))) wege.add(fn);
  }
  return wege;
}
function funktionsText(kern, name) {
  const i = kern.search(new RegExp('^(?:async )?function ' + name + '\\(', 'm'));
  const j = kern.slice(i + 1).search(/^(?:async )?function /m);
  return kern.slice(i, j < 0 ? undefined : i + 1 + j);
}
/* Ein Weg, der eine Sicherung dieses Depots schreibt und noch nicht zurückliest, steht hier nur mit offenem Befund und roter Probe
   (unten). Liest er zurück, ist die Zeile zu streichen: Die Schreibwege-Probe wird dann rot. */
const liestZurueck = (t) => t.includes('_sicherungZuruecklesen(') || /podAblegenMitHinweis\('eigen',[^\n]*\{ zurueck: true \}\)/.test(t);
function schreibwegeOhneProbe(kern) {
  return [...schreibwegeErheben(kern)].filter((fn) => !KEINE_SICHERUNG_DIESES_DEPOTS[fn] && !liestZurueck(funktionsText(kern, fn)));
}

test('[Sicherung·Schreibwege] jeder Schreibweg einer Sicherung dieses Depots liest zurück; die übrigen stehen mit Grund', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const wege = schreibwegeErheben(kern);
  assert.ok(wege.has('depotHerunterladen'), 'die Erhebung findet den Sicherungsweg');
  for (const fn of Object.keys(KEINE_SICHERUNG_DIESES_DEPOTS)) assert.ok(wege.has(fn), fn + ' steht noch im Kern (sonst Eintrag streichen)');
  assert.ok(wege.has('podSicherungAblegen'), 'die Erhebung findet den Weg in den Pod');
  assert.deepStrictEqual(schreibwegeOhneProbe(kern), []);
});

/* Abnahme des Befunds POD-SICHERUNG-NIE-ZURUECKGELESEN (Nachtrag zu U2-ADR-512, Rückprobe): Nach dem Ablegen kommt der Erfolg nur, wenn
   die zurückgelesene Kopie aufgeht und byte-gleich mit dem Gesendeten ist. Ein Fehler auf dem Rückweg heißt nie „beschädigt“.
   Die Brücke ist hier gestellt, die Hülle ist die echte; die Brücke selbst hält tests/pod-bruecke-stufe2.test.js. */
const POD_HERKUNFT = 'https://pod.vivodepot.de';
const POD_ADRESSE = 'https://pod.example/vivodepot/d/abc';
async function podBuehne(ladeOpt) {
  const { V } = ladeKern(Object.assign({ zusatzBindungen: ['podAblegenMitHinweis'] }, ladeOpt || {}));
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Pod');
  V.sektorFeldSetzen('identity', 'givenName', 'Pod');
  const huelle = async () => V.dateiMitMagic(JSON.stringify(V._huelleFuerAussenablage(await V.depotSerialisieren()), null, 2));
  const gesendet = [];
  const w = { postMessage: (n) => gesendet.push(n) };
  const fremd = { postMessage: () => {} };
  const hoerer = new Set();
  const ziel = { addEventListener: (t, f) => { if (t === 'message') hoerer.add(f); }, removeEventListener: (t, f) => hoerer.delete(f) };
  const uhren = [], toasts = [], modale = [];
  V.ui.toast = (text, art) => toasts.push({ text: String(text), art });
  V.ui.modal = (m) => modale.push(m);
  const o = { zurueck: true, oeffnen: () => w, ziel, uhr: (f, ms) => { uhren.push({ f, ms }); return uhren.length; }, uhrAus: () => {}, jetzt: () => 1000000 };
  const senden = (data, source = w, origin = POD_HERKUNFT) => { for (const f of [...hoerer]) f({ source, origin, data }); };
  const bytes = (s) => { const u = new TextEncoder().encode(s); return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength); };
  const ablegen = async (text) => {
    const p = V.__zusatz.podAblegenMitHinweis('eigen', text, o);
    senden({ typ: 'vd-pod-bereit', fassung: 1 });
    const id = gesendet[0].id;
    senden({ typ: 'vd-pod-abgelegt', fassung: 1, id, adresse: POD_ADRESSE });
    return { p, id, zurueck: (daten) => senden({ typ: 'vd-pod-zurueck', fassung: 1, id, daten }), fehler: (fehler) => senden({ typ: 'vd-pod-zurueck', fassung: 1, id, fehler }) };
  };
  const STR = V.STRINGS;
  const erfolg = () => toasts.some((x) => x.art === 'ok');
  const neutral = () => toasts.some((x) => x.text === String(STR.podRueckprobeOffen).replace('{host}', 'pod.example') && x.art === 'info');
  return { V, huelle, gesendet, w, fremd, hoerer, uhren, toasts, modale, o, senden, bytes, ablegen, STR, erfolg, neutral };
}
function neutralGeprueft(b) {
  assert.ok(String(b.STR.podRueckprobeOffen).includes('{host}'), 'der Satz steht im Textsatz');
  assert.equal(b.erfolg(), false, 'kein Erfolgstoast');
  assert.equal(b.neutral(), true, 'der neutrale Satz');
  assert.equal(b.modale.length, 0, 'kein Modal');
  assert.ok(!b.toasts.some((x) => x.text === b.STR.sicherungPruefenBeschaedigt), 'nie „beschädigt“');
}
/* Ein Byte der Hülle anders, und sie geht weiter auf: Der Weißraum von JSON trägt keine Bedeutung, die Fassung 4 keine Felder iv/ct. */
const weissraumGekippt = (text) => { const i = text.indexOf('\n  "') + 1; assert.ok(i > 0); return text.slice(0, i) + '\t' + text.slice(i + 1); };

test('[POD-SICHERUNG-NIE-ZURUECKGELESEN] die echte Kopie kommt byte-gleich zurück: Erfolg erst danach', async () => {
  const b = await podBuehne();
  const text = await b.huelle();
  assert.equal((await b.V.sicherungPruefen(text)).gehtAuf, true, 'die Hülle für den Pod öffnet sich zur Probe');
  const a = await b.ablegen(text);
  assert.equal(b.erfolg(), false, 'nach „abgelegt“ noch kein Erfolg');
  assert.equal(b.hoerer.size, 1, 'der Hörer wartet auf die Rückprobe');
  a.zurueck(b.bytes(text));
  await a.p;
  assert.equal(b.erfolg(), true);
  assert.equal(b.modale.length, 0);
  assert.equal(b.hoerer.size, 0, 'nach der ersten Antwort hört niemand mehr zu');
});
test('[POD-SICHERUNG-NIE-ZURUECKGELESEN] verändertes Zeichen: kein Erfolg, Modal „öffnet sich nicht“, nichts wird gelöscht', async () => {
  const b = await podBuehne();
  const text = await b.huelle();
  const a = await b.ablegen(text);
  a.zurueck(b.bytes(verdorben(text)));
  await a.p;
  assert.equal(b.erfolg(), false);
  assert.equal(b.modale.length, 1);
  assert.ok(b.modale[0].koerperHTML.includes('pod-rueckprobe-nicht-geoeffnet'));
  assert.ok(b.modale[0].koerperHTML.includes(b.STR.podRueckprobeNichtGeoeffnet));
  assert.equal(b.gesendet.length, 1, 'kein weiterer Auftrag, nichts wird gelöscht');
});
test('[POD-SICHERUNG-NIE-ZURUECKGELESEN] v4-Umschlag mit einem geänderten Byte, der aufgeht: kein Erfolg', async () => {
  const b = await podBuehne();
  const text = await b.huelle();
  assert.equal(JSON.parse(text.slice(text.indexOf('{'))).kryptoVersion, 4, 'die heutige Fassung ohne iv/ct');
  const anders = weissraumGekippt(text);
  assert.equal((await b.V.sicherungPruefen(anders)).gehtAuf, true, 'sie geht weiter auf');
  const a = await b.ablegen(text);
  a.zurueck(b.bytes(anders));
  await a.p;
  neutralGeprueft(b);
});
test('[POD-SICHERUNG-NIE-ZURUECKGELESEN·Rot-Beweis] ohne den Vergleich der Bytes hieße dasselbe Erfolg', async () => {
  const roh = fs.readFileSync(HTML_PATH, 'utf8');
  const stelle = "return a.length === b.length && a.every((x, i) => x === b[i]) ? 'ok' : 'offen';";
  assert.equal(roh.split(stelle).length, 2, 'der Vergleich steht genau einmal');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pod-rueck-rot-'));
  try {
    const kopie = path.join(dir, 'vivodepot.html');
    fs.writeFileSync(kopie, roh.replace(stelle, "return 'ok';"));
    const b = await podBuehne({ htmlPfad: kopie });
    const text = await b.huelle();
    const a = await b.ablegen(text);
    a.zurueck(b.bytes(weissraumGekippt(text)));
    await a.p;
    assert.equal(b.erfolg(), true, 'ROT ohne Vergleich: ein geändertes Byte gälte als Erfolg');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test('[POD-SICHERUNG-NIE-ZURUECKGELESEN] ein alter Stand unter derselben Adresse öffnet sich: kein Erfolg', async () => {
  const b = await podBuehne();
  const alt = await b.huelle();
  b.V.sektorFeldSetzen('identity', 'familyName', 'B'.repeat(4000));
  const neu = await b.huelle();
  assert.ok(alt.length <= neu.length, 'der neue Stand ist nicht kürzer');
  const gleichLang = alt.replace(/\}\s*$/, ' '.repeat(neu.length - alt.length) + '}');
  assert.equal(gleichLang.length, neu.length);
  assert.equal((await b.V.sicherungPruefen(gleichLang)).gehtAuf, true, 'der alte Stand geht auf');
  const a = await b.ablegen(neu);
  a.zurueck(b.bytes(gleichLang));
  await a.p;
  neutralGeprueft(b);
});
test('[POD-SICHERUNG-NIE-ZURUECKGELESEN] der Inhalt ändert sich beim Warten, die Bytes bleiben gleich: Erfolg', async () => {
  const b = await podBuehne();
  const text = await b.huelle();
  const a = await b.ablegen(text);
  b.V.sektorFeldSetzen('identity', 'familyName', 'Danach');
  a.zurueck(b.bytes(text));
  await a.p;
  assert.equal(b.erfolg(), true, 'älter als das offene Depot ist keine Bedingung');
});
for (const fehler of ['netz', 'status', 'form', 'groesse']) {
  test('[POD-SICHERUNG-NIE-ZURUECKGELESEN] Rückweg „' + fehler + '“: neutral, nie „beschädigt“', async () => {
    const b = await podBuehne();
    const a = await b.ablegen(await b.huelle());
    a.fehler(fehler);
    await a.p;
    neutralGeprueft(b);
  });
}
test('[POD-SICHERUNG-NIE-ZURUECKGELESEN] andere Länge und ungültiges UTF-8: neutral, geöffnet wird nicht', async () => {
  for (const mach of [(t, b) => b.bytes(t + ' '), (t) => { const u = new Uint8Array(new TextEncoder().encode(t)); u[20] = 0xFF; return u.buffer; }]) {
    const b = await podBuehne();
    const text = await b.huelle();
    const a = await b.ablegen(text);
    a.zurueck(mach(text, b));
    await a.p;
    neutralGeprueft(b);
  }
});
test('[POD-SICHERUNG-NIE-ZURUECKGELESEN] keine Antwort bis zur Frist: neutral; die Frist beginnt nach „abgelegt“ neu', async () => {
  const b = await podBuehne();
  const text = await b.huelle();
  const a = await b.ablegen(text);
  const f = b.uhren[b.uhren.length - 1];
  assert.equal(f.ms, 60000 + Math.ceil(new TextEncoder().encode(text).length / (1024 * 1024)) * 5000);
  f.f();
  await a.p;
  neutralGeprueft(b);
});
test('[POD-SICHERUNG-NIE-ZURUECKGELESEN] fremdes Fenster, fremde Herkunft, fremde id, Zusatzfeld und unbekannter Fehler zählen nicht', async () => {
  const b = await podBuehne();
  const text = await b.huelle();
  const a = await b.ablegen(text);
  const daten = b.bytes(text);
  b.senden({ typ: 'vd-pod-zurueck', fassung: 1, id: a.id, daten }, b.fremd);
  b.senden({ typ: 'vd-pod-zurueck', fassung: 1, id: a.id, daten }, b.w, 'https://boese.example');
  b.senden({ typ: 'vd-pod-zurueck', fassung: 1, id: 'x'.repeat(22), daten });
  b.senden({ typ: 'vd-pod-zurueck', fassung: 2, id: a.id, daten });
  b.senden({ typ: 'vd-pod-zurueck', fassung: 1, id: a.id, daten, zusatz: 1 });
  b.senden({ typ: 'vd-pod-zurueck', fassung: 1, id: a.id, daten, fehler: 'netz' });
  b.senden({ typ: 'vd-pod-zurueck', fassung: 1, id: a.id, fehler: 'unbekannt' });
  b.senden({ typ: 'vd-pod-zurueck', fassung: 1, id: a.id, daten: 'kein Puffer' });
  assert.equal(b.hoerer.size, 1, 'alles übergangen, der Hörer wartet weiter');
  a.zurueck(daten);
  await a.p;
  assert.equal(b.erfolg(), true);
});
test('[POD-SICHERUNG-NIE-ZURUECKGELESEN] eine Antwort vor „abgelegt“ zählt nicht; ohne Rückprobe endet der Auftrag mit „abgelegt“', async () => {
  const b = await podBuehne();
  const text = await b.huelle();
  const p = b.V.podAblegen('eigen', text, b.o);
  b.senden({ typ: 'vd-pod-bereit', fassung: 1 });
  const id = b.gesendet[0].id;
  b.senden({ typ: 'vd-pod-zurueck', fassung: 1, id, daten: b.bytes(text) });
  assert.equal(b.hoerer.size, 1);
  b.senden({ typ: 'vd-pod-abgelegt', fassung: 1, id, adresse: POD_ADRESSE });
  b.senden({ typ: 'vd-pod-zurueck', fassung: 1, id, fehler: 'netz' });
  assert.equal((await p).rueckFehler, 'netz');
  for (const opt of [{ zurueck: undefined }, {}]) {
    const c = await podBuehne();
    const q = c.V.podAblegen('eigen', text, Object.assign({}, c.o, opt, { zurueck: false }));
    c.senden({ typ: 'vd-pod-bereit', fassung: 1 });
    c.senden({ typ: 'vd-pod-abgelegt', fassung: 1, id: c.gesendet[0].id, adresse: POD_ADRESSE });
    assert.deepEqual(Object.keys(await q).sort(), ['adresse', 'host']);
  }
});

/* Der Dateiwähler hängt im Dokument, bis die Antwort da ist; die Probe mit erzwungener Speicherbereinigung steht in
   tests/e2e/sicherung-pruefen-dateiwahl.spec.js. */
function waehlerLose(text) {
  const anlegen = text.indexOf("createElement('input')"), klick = text.indexOf('wahl.click()');
  return anlegen < 0 || klick < 0 || !text.slice(anlegen, klick).includes('document.body.appendChild(wahl)');
}
test('[Sicherung·Dateiwahl] der Wähler der Probe hängt vor dem Klick im Dokument und wird danach entfernt', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const flow = funktionsText(kern, 'flowSicherungPruefen');
  assert.equal(waehlerLose(flow), false);
  assert.ok(flow.indexOf('wahl.remove()') > flow.indexOf('wahl.click()'), 'der Wähler wird nach der Antwort entfernt');
  assert.ok(flow.includes('wahl.oncancel'), 'ein Abbruch beendet das Warten');
});
test('[Sicherung·Dateiwahl·Rot-Beweis] ein gepflanzter loser Wähler fällt', () => {
  assert.equal(waehlerLose("const wahl = document.createElement('input');\n wahl.type = 'file';\n wahl.click();\n"), true);
});

test('[Sicherung·Schreibwege·Rot-Beweis] ein neuer Schreibweg ohne Zurücklesen ist rot', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8')
    + "\nasync function neueSicherungAufDenStick() {\n  const t = dateiMitMagic('{}');\n  return t;\n}\n";
  assert.deepStrictEqual(schreibwegeOhneProbe(kern), ['neueSicherungAufDenStick']);
});

/* Die Größengrenze vor dem Einlesen: Eine Datei über der Grenze wird nicht gelesen; die größte zulässige Depot-Datei liegt darunter. */
const { stellenIn } = require('../tools/lib/datei-lesen-stellen.js');
const MIB = 1024 * 1024;
const mappeGrenze = (kern) => { const m = /const MAPPE_GESAMT_HARTE_GRENZE_BYTES = (\d+) \* 1024 \* 1024;/.exec(kern); assert.ok(m, 'die Grenze steht im Kern'); return Number(m[1]) * MIB; };

test('[Sicherung·Probe·Größe] die größte zulässige Depot-Datei geht durch, eine Datei über der Grenze nicht', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const { V } = ladeKern();
  const mappe = mappeGrenze(kern);
  // Schlimmster Fall: Base64 für den Anhang im Inhalt, noch einmal Base64 für das Chiffrat im Umschlag, dazu die Hülle (Textdepot rund 80 KB).
  const groessteDatei = Math.ceil(Math.ceil(mappe * 4 / 3) * 4 / 3) + MIB;
  const grenze = mappe * 2;
  assert.ok(groessteDatei < grenze, 'die Grenze liegt über der größten zulässigen Depot-Datei: ' + groessteDatei + ' < ' + grenze);
  assert.equal(V.sicherungDateiZuGross({ size: groessteDatei }), false);
  assert.equal(V.sicherungDateiZuGross({ size: grenze }), false);
  assert.equal(V.sicherungDateiZuGross({ size: grenze + 1 }), true);
  assert.equal(V.sicherungPruefenErgebnisText(null), V.sicherungPruefenErgebnisText({ gehtAuf: false, grund: 'beschaedigt' }), 'zu groß sagt dasselbe wie unlesbar');
});

test('[Sicherung·Probe·Größe·Rot-Beweis] ohne den Größenvergleich ist die Lesestelle eine Stelle ohne Grenze', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const stelle = (text) => stellenIn(text).filter((s) => s.text.includes('sicherungPruefen(await datei.text())'));
  assert.deepEqual(stelle(kern).map((s) => s.mitGrenze), [true]);
  const ohne = kern.replace('return datei.size > MAPPE_GESAMT_HARTE_GRENZE_BYTES * 2;', 'return false;');
  assert.notEqual(ohne, kern, 'der Vergleich steht im Kern');
  assert.deepEqual(stelle(ohne).map((s) => s.mitGrenze), [false]);
});
