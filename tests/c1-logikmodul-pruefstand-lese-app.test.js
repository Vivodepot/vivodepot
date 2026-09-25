'use strict';
/* ════════════════════════════════════════════════════════════════════════
   C1 — "Der Beleg bleibt im Depot" (Auftrag, 06.09.2026)
   Der zweite Weg: die Lese-App PRÜFT einen mitreisenden logikModul-Beleg
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-335 verlangt ausdrücklich: `modulHerkunftStand` bleibt für immer
   dabei, aus `ungeprueft`/`pruefstufe` niemals „geprüft" abzuleiten — das
   ist eine Behauptung des Absenders, keine Prüfung. Der Beleg, den der Kern
   seit diesem Zug ins Depot legt (`modulEinlassen`/`modulEinlassenGeprueft`,
   vivodepot.html), eröffnet einen ZWEITEN, unabhängigen Weg: eine echte
   Signaturkette gegen den eingebetteten Anker, wörtlicher Nachbau von
   `vorlagenPruefstandBerechnen`/`vorlagenMarkeHTML` (A318 Zug 2), nur für
   `data.logikModule` statt `data.importierteVorlagen`.

   VIER ZUSTÄNDE, dieselben wie bei der Vorlagen-Marke — 'gueltig',
   'abgelaufen', 'ungueltig', 'nicht-pruefbar'. Reine Kern-Prüfung, kein
   Schlüsselmaterial (Wegwerf-Sentinel-Anker, Wegwerf-Anbieter-Schlüssel —
   dasselbe Muster wie tests/lese-app-zertifikate.test.js).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeLesen, webcrypto } = require('./load-lesen.js');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-08-20T12:00:00Z';

async function anbieterKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return {
    pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey),
    privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey),
  };
}

function baueCert(publicKeyJwk, opt) {
  const cs = { anbieterId: 'institution/test-anbieter', anbieterName: 'Test-Anbieter GmbH',
    anbieterTyp: 'institution/test' };
  if (publicKeyJwk) cs.publicKeyJwk = publicKeyJwk;
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2', 'https://vivodepot.de/credentials/v1'],
    type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de',
    issuanceDate: '2026-05-31T12:00:00Z',
    expirationDate: (opt && opt.bis) || '2027-11-30T12:00:00Z',
    credentialSubject: cs,
  };
}

function logikModulInhalt() {
  return {
    modulTyp: 'logikModul', id: 'test-logik-modul', titel: 'Test-Logik-Modul', sektor: 'advanceCare',
    herkunft: 'test-anbieter',
    datenSchema: { x: { typ: 'feld', sektor: 'identity', feld: 'maritalStatus' } },
    abschnitte: [{ titel: 'Abschnitt', bloecke: [
      { typ: 'frageAntwortOderLuecke', feldId: 'x', frage: 'Frage?', luecke: '— nicht erfasst —' },
    ] }],
    dokAusgabe: { h1: 'Test-Dokument' },
  };
}

async function belegBauen(opt) {
  const { V } = ladeLesen();
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const providerCredentialJws = await V._signJWS(baueCert(pubJwk, opt), sentinelSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const modulSignaturJws = await V._signJWS(logikModulInhalt(), anbieterSign, {});
  return { V, beleg: { providerCredentialJws, modulSignaturJws } };
}

function depotMit(beleg) {
  return { schemaVersion: 69, sektoren: {}, feldDefinitionen: [],
    logikModule: [Object.assign({}, logikModulInhalt(), { ungeprueft: false, beleg: beleg })] };
}

/* ══ Die vier Zustände ══════════════════════════════════════════════════ */

test('[C1·gueltig] gültiges Zertifikat, gültige Modul-Signatur → geprüft und gültig', async () => {
  const { V, beleg } = await belegBauen();
  const karte = await V.logikModulPruefstandBerechnen(depotMit(beleg), { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(karte['test-logik-modul'].zustand, 'gueltig', JSON.stringify(karte['test-logik-modul']));
  assert.equal(karte['test-logik-modul'].anbieter, 'Test-Anbieter GmbH');
});

test('[C1·abgelaufen] abgelaufenes Zertifikat, Signatur trägt → abgelaufen, NICHT ungültig', async () => {
  const { V, beleg } = await belegBauen({ bis: '2026-01-01T00:00:00Z' });
  const karte = await V.logikModulPruefstandBerechnen(depotMit(beleg), { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(karte['test-logik-modul'].zustand, 'abgelaufen', JSON.stringify(karte['test-logik-modul']));
});

test('[C1·ungueltig·Rot-Beleg] manipulierte Modul-Signatur → ungültig, und zwar benannt', async () => {
  const { V, beleg } = await belegBauen();
  const t = beleg.modulSignaturJws.split('.');
  t[2] = t[2].slice(0, -2) + (t[2].slice(-2) === 'AA' ? 'BB' : 'AA');
  const kaputt = { providerCredentialJws: beleg.providerCredentialJws, modulSignaturJws: t.join('.') };
  const karte = await V.logikModulPruefstandBerechnen(depotMit(kaputt), { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(karte['test-logik-modul'].zustand, 'ungueltig', JSON.stringify(karte['test-logik-modul']));
});

test('[C1·ungueltig·Rot-Beleg] manipuliertes Zertifikat → ungültig (die erste Stufe trägt schon nicht)', async () => {
  const { V, beleg } = await belegBauen();
  const c = beleg.providerCredentialJws.split('.');
  c[2] = c[2].slice(0, -2) + (c[2].slice(-2) === 'AA' ? 'BB' : 'AA');
  const kaputt = { providerCredentialJws: c.join('.'), modulSignaturJws: beleg.modulSignaturJws };
  const karte = await V.logikModulPruefstandBerechnen(depotMit(kaputt), { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(karte['test-logik-modul'].zustand, 'ungueltig');
});

test('[C1·nicht-pruefbar] ein Bestandseintrag ohne Beleg → nicht prüfbar, kein Verdacht', async () => {
  const { V } = ladeLesen();
  const karte = await V.logikModulPruefstandBerechnen(depotMit(null), { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(karte['test-logik-modul'].zustand, 'nicht-pruefbar');
  assert.equal(karte['test-logik-modul'].grund, 'kein-beleg');
});

test('[C1·nicht-pruefbar·Gegenprobe] ein halber Beleg ist keiner', async () => {
  const { V, beleg } = await belegBauen();
  const karte = await V.logikModulPruefstandBerechnen(
    depotMit({ providerCredentialJws: beleg.providerCredentialJws }),
    { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(karte['test-logik-modul'].zustand, 'nicht-pruefbar',
    'ohne Modul-Signatur gibt es nichts zu prüfen — das ist keine gescheiterte Prüfung');
});

/* ══ Die Marke: vier Zustände, vier Sätze, eigene Klasse ═════════════════ */

test('[C1] die vier Sätze sind verschieden und benennen ihren Zustand im Text', () => {
  const { V } = ladeLesen();
  const s = V.STRINGS;
  const saetze = [s.logikmodulGeprueft, s.logikmodulAbgelaufen, s.logikmodulUngueltig, s.logikmodulNichtPruefbar];
  assert.equal(new Set(saetze).size, 4, 'kein Satz doppelt — sonst unterscheidet nur die Farbe (WCAG 1.4.1)');
  assert.match(s.logikmodulNichtPruefbar, /kein Fehler/, 'ein fehlender Beleg ist kein Verdacht');
  assert.match(s.logikmodulGeprueft, /\{anbieter\}/, 'der Anbieter wird genannt, nicht behauptet');
  for (const t of saetze) assert.ok(t.length > 20, 'ein Zustandssatz, kein Etikett');
});

test('[C1] die Marke steht am logikModul-Eintrag, eigene Klasse (nicht vorlage-marke)', () => {
  const { V } = ladeLesen();
  assert.equal(V.logikModulMarkeHTML({ id: 'x' }), '', 'ohne gerechneten Stand steht dort NICHTS');
  V._logikModulStandSetzen({ x: { zustand: 'gueltig', anbieter: 'Kammer X' } });
  const h = V.logikModulMarkeHTML({ id: 'x' });
  assert.match(h, /logikmodul-marke--gueltig/);
  assert.match(h, /Kammer X/);
  V._logikModulStandSetzen({ x: { zustand: 'ungueltig' } });
  assert.match(V.logikModulMarkeHTML({ id: 'x' }), /logikmodul-marke--ungueltig/);
  V._logikModulStandSetzen({ x: { zustand: 'nicht-pruefbar' } });
  assert.match(V.logikModulMarkeHTML({ id: 'x' }), /logikmodul-marke--nicht-pruefbar/);
  V._logikModulStandSetzen(null);
  assert.equal(V.logikModulMarkeHTML({ id: 'unbekannt' }), '',
    'ein Eintrag ohne Beleg-Bezug bekommt keine Marke');
});

test('[C1·Verdrahtung] die Marke erscheint im gerenderten Sektor, am eingelassenen logikModul', () => {
  const { V } = ladeLesen();
  V.setData({ schemaVersion: 80, menschen: [], urheberschaft: {}, mappe: [],
    sektoren: {}, feldDefinitionen: [], sensibelFelder: {},
    logikModule: [logikModulInhalt()] });
  V._logikModulStandSetzen({ 'test-logik-modul': { zustand: 'gueltig', anbieter: 'Kammer X' } });
  const html = V.sektorHTML('advanceCare');
  assert.match(html, /logikmodul-marke--gueltig/, 'die Marke steht im echten Render-Pfad, nicht nur isoliert');
  assert.match(html, /Kammer X/);
  assert.match(html, /Test-Dokument/, 'der Auszug selbst rendert weiterhin — die Marke fügt sich an, ersetzt nichts');
});

/* ══ U2-ADR-335 bleibt: modulHerkunftStand sagt weiterhin nie „geprüft" ═══
   Diese Probe darf FALLEN, wenn ein gültiger Beleg mitreist — ihr Fallen ist
   dann ein Ereignis und kein Rätsel (U2-ADR-335 §Entscheidung). Sie prüft
   NICHT den Beleg-Weg, sondern dass der ERSTE Weg (modulHerkunftStand) davon
   unberührt bleibt: er liest weiterhin nur `ungeprueft`/`pruefstufe`, nie den
   Beleg — der zweite Weg liegt DANEBEN, er ersetzt den ersten nicht. */
test('[C1·U2-ADR-335 unberührt] modulHerkunftStand sagt zu einem logikModul mit gültigem Beleg weiterhin ungeprueft', async () => {
  const { V, beleg } = await belegBauen();
  const d = depotMit(beleg);   // ungeprueft: false, echter Beleg — trotzdem
  assert.equal(V.modulHerkunftStand(d.logikModule[0]), 'ungeprueft',
    'modulHerkunftStand liest nur ungeprueft/pruefstufe — ein Beleg ändert daran nichts, das ist der zweite, eigene Weg');
});
