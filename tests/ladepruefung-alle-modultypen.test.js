'use strict';
/* Ladeprüfung für alle Modultypen (Schutz-Wagen S1, 04.10.2026). Beim Öffnen wird für jedes Modul mit `beleg` die Kette erneut gegen
   den Anker geprüft (`_depotModuleBelegPruefen` → `modulBelegGeprueft`), für jedes Fach von EINLASS_REGISTER, nicht nur für
   Sprachmodule. Vertrauen entsteht nur, wenn die signierte Nutzlast zum Fach passt und inhaltsgleich mit dem gespeicherten Modul ist.
   Reine Kern-Prüfung, kein Schlüsselmaterial: Wegwerf-Sentinel-Anker und Wegwerf-Anbieter-Schlüssel (dasselbe Muster wie
   tests/c1-beleg-im-depot-logikmodul.test.js). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-08-23T12:00:00Z';
const OPTS = { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT };

async function wegwerfKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function anbieterCert(anbieterId, publicKeyJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId, anbieterTyp: 'institution/test', anbieterName: 'Test-Anbieter', publicKeyJwk },
  };
}
async function signieren(V, payload, privJwk) { return V._signJWS(payload, await V._jwsImportSignKey(privJwk), {}); }
const logikModul = (u) => Object.assign({
  modulTyp: 'logikModul', id: 'probe-ladepruefung', titel: 'Probe', sektor: 'advanceCare', herkunft: 'test-anbieter',
  datenSchema: { x: { typ: 'feld', sektor: 'identity', feld: 'maritalStatus' } },
  abschnitte: [{ titel: 'Abschnitt', bloecke: [{ typ: 'frageAntwortOderLuecke', feldId: 'x', frage: 'Frage?', luecke: '—' }] }],
  dokAusgabe: { h1: 'Probe', unterschrift: false, unterschriftErsatzHinweis: 'Ersatz.' },
}, u || {});
const textsatzModul = () => ({ modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1, texte: { 'strings:fussQuellcode.text': 'Code source' } });
/* Ein Format-Modul, wie es eine Institution signiert ausgibt (FIM-Vorführung): genau der Fall, den die Ladeprüfung tragen muss. */
const formatModul = () => ({ modulTyp: 'format', sprache: 'de', moduleVersion: 1, format: 'probe-ladepruefung-format', richtung: 'import',
  sektor: 'health', label: 'Probe-Format', leser: 'json', zuordnung: [{ feld: 'medicationOngoing', ziel: 'meds' }] });

async function eingelassen(V, nutzlast) {
  const anbieter = await wegwerfKeypair();
  const providerCredentialJws = await signieren(V, anbieterCert('institution/test-anbieter', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  const modulSignaturJws = await signieren(V, nutzlast, anbieter.privJwk);
  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(JSON.stringify({ providerCredentialJws, modulSignaturJws }), d, OPTS);
  assert.equal(r.angenommen, true, 'Vorbedingung: das signierte Modul wird eingelassen: ' + r.grund);
  return { d, anbieter };
}
const kopie = (x) => JSON.parse(JSON.stringify(x));

for (const [fach, bau] of [['logikModule', logikModul], ['textsatzModule', textsatzModul], ['formatModule', formatModul]]) {
  test('[Ladeprüfung·' + fach + '] ein echter Beleg wirkt nach dem Wiederöffnen — gemessen, nicht aus einem Feld', async () => {
    const { V } = ladeKern();
    const { d } = await eingelassen(V, bau());
    const geoeffnet = kopie(d);   // wie aus der Datei: neue Objekte, Felder wie gespeichert
    await V._depotModuleBelegPruefen(geoeffnet, true, OPTS);
    const r = V.modulBelegGeprueft(geoeffnet[fach][0]);
    assert.ok(r && typeof r.stufe === 'string', 'Ladeprüfung erkennt die Kette');
    assert.equal(r.anbieterId, 'institution/test-anbieter');
  });

  test('[Ladeprüfung·' + fach + '·Rot-Beweis] echter Beleg, ein Feld des gespeicherten Moduls geändert: kein Vertrauen', async () => {
    const { V } = ladeKern();
    const { d } = await eingelassen(V, bau());
    const geoeffnet = kopie(d);
    const m = geoeffnet[fach][0];
    if (fach === 'logikModule') m.titel = 'GEÄNDERT'; else if (fach === 'formatModule') m.label = 'GEÄNDERT'; else m.texte['strings:fussQuellcode.text'] = 'GEÄNDERT';
    await V._depotModuleBelegPruefen(geoeffnet, true, OPTS);
    assert.equal(V.modulBelegGeprueft(m), null);
  });
}

test('[Ladeprüfung·Rot-Beweis] selbst gesetztes ungeprueft:false, pruefstufe, anbieterIdGeprueft ohne Beleg: kein Vertrauen', async () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.logikModule = [Object.assign(logikModul(), { ungeprueft: false, pruefstufe: 'intern', anbieterIdGeprueft: 'vivodepot', signiert: true })];
  await V._depotModuleBelegPruefen(d, true, OPTS);
  assert.equal(V.modulBelegGeprueft(d.logikModule[0]), null);
});

test('[Ladeprüfung·Rot-Beweis] ein echter Beleg im falschen Fach (signiertes Sprachmodul im Fach der Logikmodule): kein Vertrauen', async () => {
  const { V } = ladeKern();
  const { d } = await eingelassen(V, textsatzModul());
  const geoeffnet = kopie(d);
  geoeffnet.logikModule = [geoeffnet.textsatzModule[0]];   // inhaltsgleich, aber das Fach passt nicht zum modulTyp der Nutzlast
  geoeffnet.textsatzModule = [];
  await V._depotModuleBelegPruefen(geoeffnet, true, OPTS);
  assert.equal(V.modulBelegGeprueft(geoeffnet.logikModule[0]), null);
});

test('[Ladeprüfung·Rot-Beweis] ein widerrufener Anbieter: kein Vertrauen, auch mit sonst echtem Beleg', async () => {
  const { V } = ladeKern();
  const { d, anbieter } = await eingelassen(V, logikModul());
  const geoeffnet = kopie(d);
  const tp = await V._jwkThumbprint(anbieter.pubJwk);
  await V._depotModuleBelegPruefen(geoeffnet, true, Object.assign({ widerrufsListe: [tp] }, OPTS));
  assert.equal(V.modulBelegGeprueft(geoeffnet.logikModule[0]), null);
  await V._depotModuleBelegPruefen(geoeffnet, true, OPTS);
  assert.ok(V.modulBelegGeprueft(geoeffnet.logikModule[0]), 'Gegenprobe: ohne Widerruf wirkt derselbe Beleg');
});

test('[Ladeprüfung·Klasse] die Ladeprüfung läuft über EINLASS_REGISTER, nicht über eine eigene Fachliste, und der Textsatz-Weg nutzt dieselbe Kette', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const koerper = (name) => { const i = html.indexOf('async function ' + name + '('); assert.ok(i >= 0, name); return html.slice(i, html.indexOf('\n}\n', i)); };
  assert.match(koerper('_depotModuleBelegPruefen'), /for \(const reg of EINLASS_REGISTER\)/);
  assert.match(koerper('_textsatzModuleBelegPruefen'), /_belegKettePruefen\(/);
  assert.doesNotMatch(koerper('_textsatzModuleBelegPruefen'), /verifiziereProviderCredential\(/, 'kein zweiter Prüfweg');
});
