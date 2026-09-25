'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Trust-1B Schritt 2b: ISSUER reicht templateJws durch (Bundle, additiv)
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-037 / Trust-1B: Der Issuer nimmt das anbieter-signierte templateJws aus
   der Submission entgegen und liefert es als SEPARATES Artefakt in einem Bundle
   { providerCredentialJws, templateJws } aus — NICHT in den TA-signierten Cert
   eingebettet. Der Cert trägt das Plain-template additiv weiter (bis Schritt 3).

   End-to-end: die zweistufige Kette steht — der ausgelieferte templateJws
   verifiziert gegen den publicKeyJwk des ausgestellten Certs; der Cert gegen die TA.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeIssuer, webcrypto } = require('./load-issuer.js');

// ⚠ TEST-ONLY: Private-Key zum eingebetteten Sentinel — signiert den Cert (TA-Rolle) im Test.
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});

function templateObjekt() {
  return { felder: [{ feldname: 'Zählpunkt', feldtyp: 'text', bereich: 'wohnen', gruppe: 'Energie & Erzeugung' }], ankerTauglich: true, subTauglich: false, sorgerechtTauglich: false };
}
async function anbieterKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
// Eine 2a-artige Submission: anbieter-signiertes templateJws + reduzierter publicKeyJwk.
async function baue2aSubmission(V, withJws) {
  const { pubJwk, privJwk } = await anbieterKeypair();
  const tpl = templateObjekt();
  const pubRed = { kty: pubJwk.kty, crv: pubJwk.crv, x: pubJwk.x };
  const sub = {
    submissionId: '11111111-1111-4111-8111-111111111111', submissionTimestamp: '2026-06-19T00:00:00Z',
    generatorVersion: 'test', anbieter: { anbieterId: 'institution/x', anbieterName: 'X', anbieterTyp: 'institution/sparkasse-de' },
    publicKeyJwk: pubRed, template: tpl,
  };
  if (withJws) {
    const sk = await V._jwsImportSignKey(privJwk);
    sub.templateJws = await V._signJWS(tpl, sk, {});
  }
  return sub;
}
// Issuer-Logik durchlaufen (DOM-frei): Submission -> d -> VC -> Cert(JWS) -> Bundle.
async function durchIssuer(V, sub) {
  const d = V.submissionZuAnbieterDaten(sub);
  const vc = V.baueProviderVC({
    anbieterId: d.anbieterId, anbieterName: d.anbieterName, anbieterTyp: d.anbieterTyp,
    publicKeyJwk: d.publicKeyJwk, templates: d.templates,
    issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
  });
  const taKey = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const certJws = await V.stelleProviderCredentialAus(vc, taKey);
  const bundle = V.baueAuslieferungsBundle(certJws, d.templatesJws[0]);
  return { d, vc, certJws, bundle };
}

test('2b-1 Submission-Mapping: submissionZuAnbieterDaten reicht templateJws durch', async () => {
  const { V } = ladeIssuer();
  const sub = await baue2aSubmission(V, true);
  const d = V.submissionZuAnbieterDaten(sub);
  assert.equal(d.templatesJws[0], sub.templateJws, 'templateJws wird durchgereicht');
  assert.ok(d.templates[0], 'Plain-template weiterhin durchgereicht (additiv)');
});

test('2b-2 Bundle: Cert als JWS-Compact + separat templateJws (NICHT im Cert signiert)', async () => {
  const { V } = ladeIssuer();
  const sub = await baue2aSubmission(V, true);
  const { certJws, bundle, vc } = await durchIssuer(V, sub);
  assert.equal(bundle.providerCredentialJws, certJws, 'Cert als JWS-Compact im Bundle');
  assert.equal(bundle.templateJws, sub.templateJws, 'templateJws separat im Bundle');
  // Schritt 3 (U2-ADR-039): der Cert trägt KEIN Plain-template mehr — es reist nur als templateJws-Bundle.
  assert.ok(!('template' in vc.credentialSubject), 'Schritt 3: kein Plain-template im Cert');
  assert.ok(!('templateJws' in vc.credentialSubject), 'templateJws NICHT in den Cert signiert');
});

test('2b-3 End-to-end: ausgeliefertes templateJws verifiziert gegen publicKeyJwk des Certs; Cert gegen TA', async () => {
  const { V } = ladeIssuer();
  const sub = await baue2aSubmission(V, true);
  const { certJws, bundle } = await durchIssuer(V, sub);
  // Stufe 1: Cert gegen die TA (Sentinel) gültig.
  const taVerify = await V._jwsImportVerifyKey(V.TEST_SENTINEL_PUBLIC_JWK);
  const certRes = await V._verifyJWS(certJws, taVerify, { jetzt: '2026-06-19T00:00:00Z' });
  assert.equal(certRes.gueltig, true, 'Cert gegen TA gültig: ' + certRes.grund);
  // Stufe 2: publicKeyJwk AUS dem geprüften Cert ziehen → templateJws dagegen verifizieren.
  const anbieterJwk = certRes.nutzlast.credentialSubject.publicKeyJwk;
  const abVerify = await V._jwsImportVerifyKey(anbieterJwk);
  const tplRes = await V._verifyJWS(bundle.templateJws, abVerify, {});
  assert.equal(tplRes.gueltig, true, 'templateJws gegen Cert-publicKeyJwk gültig: ' + tplRes.grund);
  assert.equal(JSON.stringify(tplRes.nutzlast.felder), JSON.stringify(sub.template.felder), 'Template-Nutzlast intakt');
});

test('2b-4 Additiv: Submission OHNE templateJws → Bundle ohne templateJws (nur Cert)', async () => {
  const { V } = ladeIssuer();
  const sub = await baue2aSubmission(V, false);
  const { bundle } = await durchIssuer(V, sub);
  assert.ok(bundle.providerCredentialJws, 'Cert im Bundle');
  assert.ok(!('templateJws' in bundle), 'ohne Submission-templateJws kein Bundle-templateJws');
});
