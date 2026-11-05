'use strict';
/* aussenablage-klartext-positivliste.test.js — bei einem Dritten neben dem Chiffrat nur, was U2-ADR-520 Nr. 3 aufzählt (04.11.2026)
   ────────────────────────────────────────────────────────────────────────────
   Befund KLARTEXT-NEBEN-CHIFFRAT: die Depot-Datei ging mit dem Ort-Hinweis für Angehörige (angehoerigenOrt, Freitext) und den
   Zeitpunkten des Stands in den Pod, und die Antwort-JWE nannte die Stelle im lesbaren Kopf. Den Grant-Eintrag im Pod nimmt die
   Anpassung der Brücke heraus (eigener Wagen).
   Hier: der Kern schreibt die Hülle aus der Positivliste AUSSENABLAGE_HUELLE_FELDER, pod/chiffrat-pruefen.js hält dieselbe Liste,
   jeder Pod-Aufruf des Kerns mit einer Depot-Datei geht durch _huelleFuerAussenablage, der Kopf der Antwort trägt kein anbieter.
   ROT-BEWEISE: ein zusätzliches Feld in der Hülle und anbieter im Kopf werden vor dem Netz abgewiesen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');
const C = require('../pod/chiffrat-pruefen.js');
const W = require('../pod/aussenablage.js');   // W.pruefen: dieselbe Tür im Schreibweg

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const ERLAUBT = ['kryptoVersion', 'depotUUID', 'pbkdf2', 'depotSalt', 'iv', 'ct', 'einheiten', 'umschlagTabelle', 'wiederherstellung'];

async function depot() {
  const { V } = ladeKern();
  await V.depotAnlegen('Klartext-Positivliste-2026!');
  V.akteurSelbstErklaeren('Hedwig Brandt');
  V.sektorFeldSetzen('identity', 'givenName', 'Hedwig');
  return V;
}
const kopfVon = (jwe) => JSON.parse(Buffer.from(jwe.split('.')[0], 'base64url').toString('utf8'));
function mitKopf(jwe, aendern) {
  const t = jwe.split('.'); const k = kopfVon(jwe); aendern(k);
  t[0] = Buffer.from(JSON.stringify(k)).toString('base64url');
  return t.join('.');
}
async function antwortJwe(V, anbieterId) {
  const kp = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const a = { modulTyp: 'anfrage', anfrageVersion: 1, von: 'Probe-Heim', zweck: 'Aufnahme', grundlage: 'Heimvertrag', vorgang: 'AUF-2026-1104',
    gestelltAm: '2026-11-04', gueltigBis: '2099-12-31', felder: [{ kennung: 'identity.givenName', zweck: 'Anrede', pflicht: true }],
    antwort: { art: 'schluesselpaar', an: 'x@probe.example', publicKeyJwk: pub } };
  return V.antwortVerschluesseln(V.anfrageAntwortDatensatz(a, { sensibel: false }), a, { anbieterId });
}

test('[Außenablage·Klartext] die Hülle im Pod trägt genau die Felder der Positivliste, Kern und Brücke halten dieselbe Liste', async () => {
  const V = await depot();
  assert.deepEqual([...V.AUSSENABLAGE_HUELLE_FELDER], ERLAUBT, 'Positivliste im Kern');
  assert.deepEqual([...C.HUELLE], ERLAUBT, 'dieselbe Liste in pod/chiffrat-pruefen.js');
  const umschlag = Object.assign(await V.depotSerialisieren(), { angehoerigenOrt: 'Ordner im Flur, links', stand_marke: 'm', gespeichert_am: '2026-11-04T01:00:00Z' });
  const h = V._huelleFuerAussenablage(umschlag);
  for (const k of Object.keys(h)) assert.ok(ERLAUBT.includes(k), 'Feld außerhalb der Liste: ' + k);
  for (const k of ['angehoerigenOrt', 'stand_marke', 'gespeichert_am']) assert.ok(!(k in h), k + ' bleibt auf dem Gerät');
  assert.deepEqual(C.pruefen(V.dateiMitMagic(JSON.stringify(h))), { art: 'depot' }, 'die Hülle besteht die Tür der Brücke');
  // Jeder Pod-Aufruf des Kerns mit einer Depot-Datei geht durch die Positivliste.
  const aufrufe = KERN.match(/podAblegenMitHinweis\('(?:eigen|stelle)',[^\n]*/g) || [];
  assert.ok(aufrufe.length >= 2, 'Positivkontrolle: eigene Sicherung und Ausschnitt gefunden (' + aufrufe.length + ')');
  for (const z of aufrufe) assert.match(z, /_huelleFuerAussenablage\(/, z);
  const jwe = await antwortJwe(V, 'heim/sonnenhof');
  assert.ok(!('anbieter' in kopfVon(jwe)), 'der Kopf der Antwort nennt die Stelle nicht');
  assert.deepEqual(C.pruefen(jwe), { art: 'antwort' });
});

test('[Außenablage·Klartext·Rot-Beweis] ein zusätzliches Feld in der Hülle und anbieter im Kopf der Antwort werden vor dem Netz abgewiesen', async () => {
  const V = await depot();
  const h = V._huelleFuerAussenablage(await V.depotSerialisieren());
  for (const feld of ['angehoerigenOrt', 'stand_marke', 'gespeichert_am', 'notiz']) {
    const mehr = V.dateiMitMagic(JSON.stringify(Object.assign({}, h, { [feld]: 'x' })));
    assert.equal(C.pruefen(mehr).fehler, 'keine-depot-huelle', feld);
    assert.equal(W.pruefen('chiffrat', mehr), 'chiffrat-keine-depot-huelle', feld);
  }
  const jwe = await antwortJwe(V, '');
  assert.equal(C.pruefen(mitKopf(jwe, (k) => { k.anbieter = 'heim/sonnenhof'; })).fehler, 'kopf-fremdes-feld');
  assert.equal(C.pruefen(mitKopf(jwe, (k) => { k.pad = 'Hedwig Brandt'; })).fehler, 'kopf-fremdes-feld', 'pad trägt nur Punkte');
});

/* Befund ANTWORT-PAD-ABGEWIESEN (04.11.2026): der Kern legt jeder Antwort-JWE `pad` in den Kopf (Auffüllung, _jweVersiegeln); die
   Tür kannte das Feld nicht, und die Brücke wies jede echte Antwort für eine Stelle ab (Datei-Weg). */
test('[Brücke·Antwort·pad·Rot-Beweis] eine echte Antwort-JWE des Kerns geht als Ablage für eine Stelle durch; ohne pad in der Tür nicht', async () => {
  const V = await depot();
  for (const anbieterId of ['', 'heim/sonnenhof']) {
    const jwe = await antwortJwe(V, anbieterId);
    const kopf = kopfVon(jwe);
    assert.ok('pad' in kopf && /^\.*$/.test(kopf.pad), 'Vorbedingung: der Kern füllt mit pad auf');
    assert.equal(C.passtZurArt(jwe, 'stelle', Buffer.byteLength(jwe)), true, 'die Brücke nimmt die Antwort für eine Stelle an');
    const ohnePad = C.KOPF[kopf.alg].filter((f) => f !== 'pad');
    assert.ok(Object.keys(kopf).some((k) => !ohnePad.includes(k)), 'Rot-Beweis: eine Tür ohne pad wiese genau diese Antwort ab');
  }
});
