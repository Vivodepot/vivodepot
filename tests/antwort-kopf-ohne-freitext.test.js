'use strict';
/* antwort-kopf-ohne-freitext.test.js — im lesbaren Kopf einer Antwort-JWE steht kein Wert aus der Anfrage (U2-ADR-520 Nr. 3, 04.11.2026)
   ────────────────────────────────────────────────────────────────────────────
   Befund VORGANG-IM-KOPF: das Aktenzeichen der Stelle (`vorgang`, Freitext) stand lesbar im JWE-Kopf und in `apv`. Jetzt trägt der
   Kopf eine zufällige `kennung` (16 Bytes, in `apv` gebunden, im Chiffrat als `anfrage.kennung`); das Aktenzeichen steht nur im
   Chiffrat. Die Lese-App liest beide Formen, auch Antworten älterer Kerne, die schon unterwegs sind.
   Befund SHL-CTY-LESBAR (entschieden): der SHL-JWE trägt `cty`, weil SMART Health Links es als Teil des Verfahrens beschreibt und das
   Manifest `contentType` ohnehin lesbar führt. Gehalten wird, daß es genau ein Wert ist: application/fhir+json, nie ein feinerer.
   ROT-BEWEISE: ein Kern mit dem alten Kopf legt das Aktenzeichen in den Kopf; eine fremde Kennung in der Signatur wird abgewiesen;
   ein sprechenderer cty fällt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, webcrypto, HTML_PATH } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

const VORGANG = 'AZ 2026/1104-Brandt';
const kopfVon = (jwe) => JSON.parse(Buffer.from(jwe.split('.')[0], 'base64url').toString('utf8'));

/* Alle Freitextwerte der Anfrage, die im lesbaren Kopf (samt dekodiertem apu/apv) stehen. Leer heißt: kein Freitext im Kopf. */
function freitextImKopf(jwe, anfrage) {
  const k = kopfVon(jwe);
  const lesbar = [JSON.stringify(k)];
  for (const f of ['apu', 'apv']) if (typeof k[f] === 'string') lesbar.push(Buffer.from(k[f], 'base64url').toString('utf8'));
  const text = lesbar.join('\n');
  const werte = [anfrage.von, anfrage.zweck, anfrage.grundlage, anfrage.vorgang, anfrage.antwort.an, anfrage.anbieterId]
    .concat(anfrage.felder.map((f) => f.zweck)).filter((w) => typeof w === 'string' && w.length >= 3);
  return werte.filter((w) => text.includes(w));
}

/* Das Einmal-Passwort entsteht je Lauf, damit kein Passwort-Wert im Quelltext steht (der Geheimnis-Scan des pre-push
   wertet eine feste Zuweisung an ein Passwort-Feld als möglichen Fund). */
function einmalPasswort() {
  return 'p' + Buffer.from(webcrypto.getRandomValues(new Uint8Array(12))).toString('hex');
}
async function anfrageFuer(art) {
  const kp = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const anfrage = { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Pflegeheim Sonnenhof', zweck: 'Heimaufnahme Frau Brandt',
    grundlage: 'Heimvertrag § 3', vorgang: VORGANG, anbieterId: 'heim/sonnenhof', gestelltAm: '2026-11-04', gueltigBis: '2099-12-31',
    felder: [{ kennung: 'identity.givenName', zweck: 'Anrede im Schreiben', pflicht: true }],
    antwort: art === 'schluesselpaar'
      ? { art: 'schluesselpaar', an: 'aufnahme@sonnenhof.example', publicKeyJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey) }
      : { art: 'einmalpasswort', an: 'aufnahme@sonnenhof.example' } };
  return { anfrage, schluessel: art === 'schluesselpaar' ? { privateJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) } : { passwort: einmalPasswort() } };
}
async function antwortVon(V, anfrage, schluessel) {
  await V.depotAnlegen('Antwort-Kopf-2026-11-04!');
  V.akteurSelbstErklaeren('Hedwig Brandt');
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  return V.antwortVerschluesseln(V.anfrageAntwortDatensatz(anfrage, { sensibel: false }), anfrage,
    { anbieterId: anfrage.anbieterId, passwort: schluessel.passwort });
}
/* Ein Kern in der Form vor U2-ADR-520 Nr. 3 (vorgang in Kopf und apv), für die Rückwärts-Probe der Lese-App und den Rot-Beweis. */
function alterKern() {
  let roh = fs.readFileSync(HTML_PATH, 'utf8');
  const ersetzen = (alt, neu) => { assert.equal(roh.split(alt).length, 2, 'Stelle genau einmal: ' + alt.slice(0, 50)); roh = roh.replace(alt, neu); };
  ersetzen("enc: 'A256GCM', kennung: String(m.kennung || '') };", "enc: 'A256GCM', vorgang: String(m.vorgang || '') };");
  ersetzen('const apv = new TextEncoder().encode(kopf.kennung);', 'const apv = new TextEncoder().encode(kopf.vorgang);');
  ersetzen("const meta = { kennung, anbieterId:", "const meta = { vorgang: a.vorgang, anbieterId:");
  ersetzen("datensatz = Object.assign({}, datensatz, { anfrage: Object.assign({}, datensatz && datensatz.anfrage, { kennung }) });", '');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alter-kern-'));
  const kopie = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(kopie, roh);
  return { V: ladeKern({ htmlPfad: kopie }).V, weg: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

for (const art of ['schluesselpaar', 'einmalpasswort']) {
  test(`[Antwort·Kopf] ${art}: im lesbaren Kopf steht kein Wert aus der Anfrage, nur eine zufällige Kennung`, async () => {
    const { anfrage, schluessel } = await anfrageFuer(art);
    const { V } = ladeKern();
    const jwe = await antwortVon(V, anfrage, schluessel);
    assert.deepEqual(freitextImKopf(jwe, anfrage), []);
    const k = kopfVon(jwe);
    assert.equal(k.vorgang, undefined);
    assert.equal(k.anbieter, undefined);
    assert.match(k.kennung, /^[A-Za-z0-9_-]{22}$/);
    if (art === 'schluesselpaar') assert.equal(Buffer.from(k.apv, 'base64url').toString('utf8'), k.kennung, 'apv ist die Kennung');
    const zweite = kopfVon(await antwortVon(ladeKern().V, anfrage, schluessel));
    assert.notEqual(zweite.kennung, k.kennung, 'je Antwort neu');
  });

  test(`[Antwort·Kopf] ${art}: die Lese-App öffnet die neue Form; Aktenzeichen und Kennung stehen im Datensatz`, async () => {
    const { anfrage, schluessel } = await anfrageFuer(art);
    const jwe = await antwortVon(ladeKern().V, anfrage, schluessel);
    const L = ladeLesen().V;
    const offen = await L.antwortJweOeffnen(jwe, schluessel);
    assert.equal(L.antwortJweTraegtJws(offen.kopf), true, 'signiert');
    const erg = await L.antwortSignaturPruefen(offen.klartext, L._antwortErwartetAusKopf(offen.kopf));
    assert.equal(erg.datensatz.anfrage.vorgang, VORGANG);
    assert.equal(erg.datensatz.anfrage.kennung, offen.kopf.kennung);
    assert.equal(L.antwortJweAlsUmschlag(jwe).vorgang, '', 'vor dem Öffnen kein Aktenzeichen');
  });
}

test('[Antwort·Kopf·alte Form] die Lese-App öffnet weiter eine Antwort älterer Kerne (vorgang in Kopf und apv) und prüft sie gegen den Vorgang', async () => {
  const alt = alterKern();
  try {
    const { anfrage, schluessel } = await anfrageFuer('schluesselpaar');
    const jwe = await antwortVon(alt.V, anfrage, schluessel);
    assert.equal(kopfVon(jwe).vorgang, VORGANG, 'das ist die alte Form');
    const L = ladeLesen().V;
    const offen = await L.antwortJweOeffnen(jwe, schluessel);
    const erwartet = L._antwortErwartetAusKopf(offen.kopf);
    assert.equal(erwartet.vorgang, VORGANG);
    const erg = await L.antwortSignaturPruefen(offen.klartext, erwartet);
    assert.equal(erg.datensatz.anfrage.vorgang, VORGANG);
    assert.equal(L.antwortJweAlsUmschlag(jwe).vorgang, VORGANG);
  } finally { alt.weg(); }
});

test('[Antwort·Kopf·Rot-Beweis] mit dem alten Kopf stünde das Aktenzeichen lesbar im Kopf und in apv; die Tür der Brücke weist ihn ab', async () => {
  const alt = alterKern();
  try {
    const { anfrage, schluessel } = await anfrageFuer('schluesselpaar');
    const jwe = await antwortVon(alt.V, anfrage, schluessel);
    assert.deepEqual(freitextImKopf(jwe, anfrage), [VORGANG]);
    const C = require('../pod/chiffrat-pruefen.js');
    assert.equal(C.pruefen(jwe).fehler, 'kopf-kennung', 'ohne zufällige Kennung keine Ablage');
    const neu = await antwortVon(ladeKern().V, anfrage, schluessel);
    assert.equal(C.pruefen(neu).art, 'antwort');
    // Freitext in apv bei sonst neuer Form: abgewiesen.
    const t = neu.split('.'); const k = kopfVon(neu); k.apv = Buffer.from(VORGANG).toString('base64url');
    t[0] = Buffer.from(JSON.stringify(k)).toString('base64url');
    assert.equal(C.pruefen(t.join('.')).fehler, 'kopf-kennung');
  } finally { alt.weg(); }
});

test('[Antwort·Kopf·Rot-Beweis] eine signierte Antwort mit fremder Kennung im Kopf wird abgewiesen', async () => {
  const { anfrage, schluessel } = await anfrageFuer('einmalpasswort');
  const jwe = await antwortVon(ladeKern().V, anfrage, schluessel);
  const L = ladeLesen().V;
  const offen = await L.antwortJweOeffnen(jwe, schluessel);
  await assert.rejects(L.antwortSignaturPruefen(offen.klartext, { anbieterId: '', kennung: 'AAAAAAAAAAAAAAAAAAAAAA' }), /antwort-signatur-kennung/);
});

/* SHL-CTY-LESBAR, entschieden: genau ein cty-Wert. */
const SHL_CTY = 'application/fhir+json';
const shlKopfGilt = (k) => Object.keys(k).sort().join(',') === 'alg,cty,enc' && k.alg === 'dir' && k.enc === 'A256GCM' && k.cty === SHL_CTY;

test('[SHL·Kopf] der SHL-JWE trägt genau alg, enc und cty application/fhir+json, für Text und für Bytes', async () => {
  const { V } = ladeKern();
  const schl = webcrypto.getRandomValues(new Uint8Array(32));
  for (const inhalt of ['{"resourceType":"Bundle"}', new TextEncoder().encode('{"resourceType":"Bundle"}')]) {
    assert.ok(shlKopfGilt(kopfVon(await V._jweCompactDir(inhalt, schl))));
  }
  const quelle = fs.readFileSync(HTML_PATH, 'utf8');
  assert.equal(quelle.split("{ cty: 'application/fhir+json' }").length, 2, 'der Kern setzt cty an genau einer Stelle');
  assert.ok(!/cty:\s*'application\/(smart-health-card|smart-api-access)/.test(quelle), 'kein feinerer Inhaltstyp');
});

test('[SHL·Kopf·Rot-Beweis] ein sprechenderer cty fiele', () => {
  assert.equal(shlKopfGilt({ alg: 'dir', enc: 'A256GCM', cty: 'application/smart-health-card' }), false);
  assert.equal(shlKopfGilt({ alg: 'dir', enc: 'A256GCM', cty: SHL_CTY, zweck: 'Pflege' }), false);
  assert.equal(shlKopfGilt({ alg: 'dir', enc: 'A256GCM', cty: SHL_CTY }), true);
});
