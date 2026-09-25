'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Trust-1B Stufe 1: zweistufige Signatur-Kette, EMPFÄNGER (additiv-tolerant)
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-037 / Trust-1B: Das Template reist als SEPARATES, anbieter-signiertes
   JWS-Artefakt (opts.templateJws) neben dem TA-signierten Provider-Zertifikat.
   importPlanGeprueft prüft nach der TA-Verifikation das Template-JWS gegen den
   im Zertifikat TA-zertifizierten Anbieter-Key (credentialSubject.publicKeyJwk).
   Additiv-tolerant: ohne templateJws bleibt das Plain-Data-cs.template gültig.

   Test-Anker: der Sentinel wird wie in 1A über opts.ankerJwk injiziert (Cert gegen
   Sentinel signiert). Der Anbieter-Key wird pro Test frisch erzeugt (Ed25519).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

// ⚠ TEST-ONLY: Private-Key zum eingebetteten Sentinel — signiert das TA-Zertifikat im Test.
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-06-19T00:00:00Z';

// Template-Objekt in Stufe-2-Form ({felder:[...]}) — das, was der Anbieter signiert.
function templateObjekt() {
  return { felder: [{ feldname: 'Zählpunkt', feldtyp: 'text', bereich: 'housing', gruppe: 'Energie & Erzeugung' }] };
}

// Frischer Anbieter-Keypair (Ed25519) → exportierte JWKs.
async function anbieterKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return {
    pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey),
    privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey),
  };
}

// TA-Zertifikat (wird im Test gegen den Sentinel signiert). publicKeyJwk = Anbieter-Key.
function baueCert(publicKeyJwk, plainTemplate) {
  const cs = { anbieterId: 'institution/x', anbieterName: 'X', anbieterTyp: 'institution/sparkasse-de' };
  if (publicKeyJwk) cs.publicKeyJwk = publicKeyJwk;
  if (plainTemplate) cs.template = plainTemplate;
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2', 'https://vivodepot.de/credentials/v1'],
    type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: cs,
  };
}

async function setup() {
  const { V } = ladeKern();
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  return { V, sentinelSign };
}

test('1B-1 Positiv: anbieter-signiertes Template-JWS gegen publicKeyJwk geprüft → Definition landet', async () => {
  const { V, sentinelSign } = await setup();
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueCert(pubJwk), sentinelSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const templateJws = await V._signJWS(templateObjekt(), anbieterSign, {});

  const plan = await V.importPlanGeprueft('provider-credential', certJws, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws });
  assert.equal(plan.ungueltig, false, 'gültige zweistufige Kette → Plan gültig: ' + (plan.grund || ''));
  assert.ok(Array.isArray(plan.feldDefinitionen) && plan.feldDefinitionen.length === 1, 'geprüfte Template-Definition übernommen');
  assert.equal(plan.feldDefinitionen[0].feldId, 'tpl_zaehlpunkt');
});

test('1B-2 Negativ: verfälschtes Template-JWS → abgewiesen', async () => {
  const { V, sentinelSign } = await setup();
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueCert(pubJwk), sentinelSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const t = (await V._signJWS(templateObjekt(), anbieterSign, {})).split('.');
  t[2] = t[2].slice(0, -2) + (t[2].slice(-2) === 'AA' ? 'BB' : 'AA');   // Signatur kippen
  const plan = await V.importPlanGeprueft('provider-credential', certJws, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws: t.join('.') });
  assert.equal(plan.ungueltig, true, 'verfälschtes Template → ungültig');
  assert.match(plan.grund, /Template-Signatur ungültig/);
});

test('1B-3 Negativ: Template-JWS aber kein publicKeyJwk im Zertifikat → abgewiesen', async () => {
  const { V, sentinelSign } = await setup();
  const { privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueCert(null), sentinelSign, {});   // Cert ohne publicKeyJwk
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const templateJws = await V._signJWS(templateObjekt(), anbieterSign, {});
  const plan = await V.importPlanGeprueft('provider-credential', certJws, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws });
  assert.equal(plan.ungueltig, true, 'kein Anbieter-Key → kann nicht geprüft werden → abgewiesen');
  assert.match(plan.grund, /kein Anbieter-Key/);
});

test('1B-4 Negativ: Template mit FREMDEM Key signiert (≠ zertifizierter publicKeyJwk) → abgewiesen', async () => {
  const { V, sentinelSign } = await setup();
  const { pubJwk } = await anbieterKeypair();     // Cert zertifiziert DIESEN Key
  const fremd = await anbieterKeypair();          // Template aber mit FREMDEM Key signiert
  const certJws = await V._signJWS(baueCert(pubJwk), sentinelSign, {});
  const fremdSign = await V._jwsImportSignKey(fremd.privJwk);
  const templateJws = await V._signJWS(templateObjekt(), fremdSign, {});
  const plan = await V.importPlanGeprueft('provider-credential', certJws, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws });
  assert.equal(plan.ungueltig, true, 'Template-Signatur passt nicht zum zertifizierten Anbieter-Key');
  assert.match(plan.grund, /Template-Signatur ungültig/);
});

test('1B-5 Schritt 3 (U2-ADR-039): ohne templateJws wird das Plain-Data-cs.template verworfen', async () => {
  const { V, sentinelSign } = await setup();
  const { pubJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueCert(pubJwk, templateObjekt()), sentinelSign, {});
  const plan = await V.importPlanGeprueft('provider-credential', certJws, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(plan.ungueltig, false, 'Cert gültig → Import läuft (attestierte Werte)');
  assert.equal(plan.feldDefinitionen.length, 0, 'Schritt 3: unsigniertes Plain-Data-Template wird verworfen');
  assert.ok(plan.verworfeneFelder.some(v => v.grund === 'template-ungueltig'), 'Template namentlich verworfen');
});
