'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Auftrag „Drei Entscheidungsfreie", Zug 1 (17.08.2026, gebaut 26.08.2026)
   ────────────────────────────────────────────────────────────────────────
   BEFUND (A284 Zug 1): `res.grund = 'JWS: Anbieter widerrufen'` wurde nie
   angezeigt — jeder ungültige Import meldete denselben Satz ("Diese Datei
   konnte nicht gelesen werden. Bitte prüfen, ob es die richtige Datei ist.").
   Eine Bürgerin, deren Vorlagen-Anbieter widerrufen wurde, bekam dieselbe
   Meldung wie bei einer kaputten Datei — obwohl sie nichts falsch gemacht hat
   und nichts reparieren kann.

   ROT-BEWEIS, real gesehen vor dem Bau (nicht behauptet): `plan.widerrufen`
   existierte nicht, `importUngueltigNachricht` gab es nicht — Test 1 schlug mit
   `undefined !== true` fehl, Test 4 warf `V.importUngueltigNachricht is not a
   function`. Erst danach `res.widerrufen`/`plan.widerrufen` durchgereicht und
   die Lese-Stelle gebaut; seither grün.

   Die drei Randfälle aus A284 (noch-nicht-gültiges Cert, signatur-kaputtes
   Cert, Cert ohne credentialSubject.publicKeyJwk) setzen `res.widerrufen`
   NICHT — sie bleiben bewusst bei der generischen Meldung (im Bericht
   vermerkt, kein Bau, wie beauftragt).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

// ⚠ TEST-ONLY: Sentinel = die Test-Trust-Authority (eingebetteter Test-Anker via opts.ankerJwk).
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const OPTS_BASIS = { ankerJwk: SENTINEL_PUBLIC_JWK };

async function anbieterKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return {
    pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey),
    privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey),
  };
}

function baueCert(pubJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'],
    type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: { anbieterId: 'anbieter/test', anbieterTyp: 'institution', anbieterName: 'Test-Anbieter', publicKeyJwk: pubJwk },
  };
}

test('[Widerruf-Meldung] eine widerrufene Anbieter-Vorlage trägt plan.widerrufen', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk } = await anbieterKeypair();
  const thumb = await V._jwkThumbprint(pubJwk);
  const jws = await V._signJWS(baueCert(pubJwk), taSign, {});

  const plan = await V.importPlanGeprueft('provider-credential', jws,
    Object.assign({}, OPTS_BASIS, { widerrufsListe: [thumb] }));

  assert.equal(plan.ungueltig, true, 'ein widerrufenes Zertifikat bleibt ungültig');
  assert.equal(plan.widerrufen, true, 'der Plan trägt das Widerruf-Flag — das fehlte vor dem Bau');
  assert.equal(plan.grund, 'JWS: Anbieter widerrufen');
});

test('[Widerruf-Meldung] eine kaputte Datei trägt KEIN Widerruf-Flag', async () => {
  const { V } = ladeKern();
  const plan = await V.importPlanGeprueft('provider-credential', 'nicht-mal-ein-jws', OPTS_BASIS);
  assert.equal(plan.ungueltig, true);
  assert.equal(!!plan.widerrufen, false, 'eine schlicht kaputte Datei ist kein Widerruf');
});

test('[Widerruf-Meldung] ein gültiges Zertifikat, das NICHT auf der Sperrliste steht, bleibt unbetroffen', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk } = await anbieterKeypair();
  const jws = await V._signJWS(baueCert(pubJwk), taSign, {});
  const plan = await V.importPlanGeprueft('provider-credential', jws,
    Object.assign({}, OPTS_BASIS, { widerrufsListe: [] }));
  assert.equal(!!plan.widerrufen, false);
});

test('[Widerruf-Meldung] importUngueltigNachricht wählt eine ANDERE Meldung für Widerruf als für eine kaputte Datei', () => {
  const { V } = ladeKern();
  const kaputt = V.importUngueltigNachricht({ ungueltig: true });
  const widerrufen = V.importUngueltigNachricht({ ungueltig: true, widerrufen: true });

  assert.notEqual(widerrufen, kaputt,
    'Widerruf und kaputte Datei dürfen nicht denselben Satz zeigen — das war der Kern-Befund');
  assert.equal(kaputt, V.STRINGS.importUngueltig);
  assert.equal(widerrufen, V.STRINGS.importWiderrufen);
  assert.ok(typeof widerrufen === 'string' && widerrufen.length > 0, 'die Widerruf-Meldung ist kein Platzhalter');

  // Kein Vorwurf an die Bürgerin, keine Anleitung, die sie nicht ausführen kann (Auftragstext).
  assert.ok(!/prüfen|richtige Datei/i.test(widerrufen),
    'die Widerruf-Meldung darf nicht wie ein Bürgerfehler klingen');
});
