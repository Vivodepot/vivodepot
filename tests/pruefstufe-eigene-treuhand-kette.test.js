'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Vivodepots eigene Treuhand-Kette ist intern — und nur sie (16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Vivodepots eigene Sprachmodule werden je Version über die Treuhand signiert (Anker →
   vivodepot-ausgabestelle → Herausgeber vivodepot/* → Modul), nicht mehr mit dem Anker direkt.
   Bis hierher bekam jedes Bündel über eine Zwischenstufe `extern-geprueft` und zählte als fremd.

   Die Proben halten die Grenze von beiden Seiten, mit Wegwerf-Anker und Wegwerf-Schlüsseln:
     - vivodepot/anbieter unter der eigenen Ausgabestelle → intern
     - ein fremdes Blatt unter derselben Ausgabestelle → extern-geprueft:herausgeber
     - vivodepot/* unter einer Ausgabestelle, die nicht in EIGENE_AUSGABESTELLEN steht → extern
     - vivodepot/* unter einer Prüfstelle → extern-geprueft:pruefer
     - vivodepot/kern direkt gegen den Anker → intern, wie bisher
     - ein vivodepot/*-Blatt, das sich als Zwischenstufe ausgibt → nicht intern

   ROT-BEWEIS, GEMESSEN (16.09.2026): gegen den Kern von vorher ist die erste Probe rot
   (`extern-geprueft:herausgeber`); zwei weitere werfen, weil es EIGENE_AUSGABESTELLEN und den
   Helfer dort nicht gibt. Die Grenzproben auf der Kette bleiben grün. Und je eine Mutation an den
   Bedingungen (Liste, Rolle, `vivodepot/`-Präfix, Zwischenstufen-Ausschluss) macht eine Probe rot.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const OPTS = Object.freeze({ ankerJwk: Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x }), jetzt: '2026-09-16T12:00:00Z' });
const MODUL = Object.freeze({ modulTyp: 'textsatz', sprache: 'hu', moduleVersion: 1, texte: { 'identity.givenName.label': 'Keresztnév' } });

async function paar() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pub: await webcrypto.subtle.exportKey('jwk', kp.publicKey), priv: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function zert(anbieterId, anbieterTyp, publicKeyJwk, extra) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: Object.assign({ anbieterId, anbieterTyp, anbieterName: anbieterId, publicKeyJwk }, extra || {}),
  };
}
const signieren = async (V, nutzlast, jwk) => V._signJWS(nutzlast, await V._jwsImportSignKey(jwk), {});

async function pruefstufe({ zwischenId, zwischenTyp, zwischenExtra, blattId, blattTyp }) {
  const { V } = ladeKern();
  const zw = await paar(); const blatt = await paar();
  const ausstellerZertifikatJws = await signieren(V, zert(zwischenId, zwischenTyp(V), zw.pub, zwischenExtra), SENTINEL_PRIVATE_JWK);
  const providerCredentialJws = await signieren(V, zert(blattId, blattTyp, blatt.pub), zw.priv);
  const modulSignaturJws = await signieren(V, MODUL, blatt.priv);
  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(JSON.stringify({ providerCredentialJws, modulSignaturJws, ausstellerZertifikatJws }), d, OPTS);
  assert.equal(r.angenommen, true, r.grund);
  return d.textsatzModule[0].pruefstufe;
}
const AUSGABE = (V) => V.AUSGABESTELLE_ANBIETERTYP;

test('[Treuhand·intern] vivodepot/anbieter unter der eigenen Ausgabestelle ist intern', async () => {
  assert.equal(await pruefstufe({ zwischenId: 'vivodepot-ausgabestelle', zwischenTyp: AUSGABE, blattId: 'vivodepot', blattTyp: 'vivodepot/anbieter' }), 'intern');
});

test('[Treuhand·Grenze] ein fremdes Blatt unter der eigenen Ausgabestelle bleibt extern', async () => {
  assert.equal(await pruefstufe({ zwischenId: 'vivodepot-ausgabestelle', zwischenTyp: AUSGABE, blattId: 'institution/kunde', blattTyp: 'institution/test' }), 'extern-geprueft:herausgeber');
});

test('[Treuhand·Grenze] vivodepot/* unter einer Ausgabestelle außerhalb der Liste bleibt extern', async () => {
  const { V } = ladeKern();
  assert.ok(!V.EIGENE_AUSGABESTELLEN.includes('fremde-ausgabestelle'));
  assert.equal(await pruefstufe({ zwischenId: 'fremde-ausgabestelle', zwischenTyp: AUSGABE, blattId: 'vivodepot', blattTyp: 'vivodepot/anbieter' }), 'extern-geprueft:herausgeber');
});

test('[Treuhand·Grenze] vivodepot/* unter einer Prüfstelle bleibt extern', async () => {
  assert.equal(await pruefstufe({ zwischenId: 'vivodepot-ausgabestelle', zwischenTyp: (V) => V.VIVODEPOT_PRUEFSTELLE_ANBIETERTYP, zwischenExtra: { rolle: 'pruefer' }, blattId: 'vivodepot', blattTyp: 'vivodepot/anbieter' }), 'extern-geprueft:pruefer');
});

test('[Treuhand·Grenze] eine eigene Ausgabestelle mit fremder Rolle macht nichts intern', async () => {
  assert.equal(await pruefstufe({ zwischenId: 'vivodepot-ausgabestelle', zwischenTyp: AUSGABE, zwischenExtra: { rolle: 'pruefer' }, blattId: 'vivodepot', blattTyp: 'vivodepot/anbieter' }), 'extern-geprueft:pruefer');
});

test('[Treuhand·Grenze] ein Blatt, das sich als Zwischenstufe ausgibt, ist nicht intern', () => {
  const { V } = ladeKern();
  const cert = { ausstellerAnbieterTyp: V.AUSGABESTELLE_ANBIETERTYP, ausstellerAnbieterId: 'vivodepot-ausgabestelle', ausstellerRolle: null };
  assert.equal(V._istEigeneTreuhandKette(cert, { anbieterTyp: 'vivodepot/anbieter' }), true, 'Vorbedingung');
  assert.equal(V._istEigeneTreuhandKette(cert, { anbieterTyp: V.AUSGABESTELLE_ANBIETERTYP }), false);
  assert.equal(V._istEigeneTreuhandKette(cert, null), false);
});
