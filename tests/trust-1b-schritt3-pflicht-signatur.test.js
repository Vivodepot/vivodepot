'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Trust-1B Schritt 3: Anbieter-Template-Signatur ist Pflicht (U2-ADR-039)
   ────────────────────────────────────────────────────────────────────────
   Ende der additiven Toleranz. Ein Anbieter-Template wird nur noch gerendert,
   wenn es separat anbieter-signiert ist (templateJws, geprüft gegen den im
   TA-zertifizierten Cert hinterlegten publicKeyJwk). Drei Fälle:

     1. Cert mit eingebettetem Plain-Template, OHNE templateJws → das (sogar
        wohlgeformte) Template wird VERWORFEN; die unabhängig cert-attestierten
        Werte (cs.felder) laufen weiter (Variante A: strippen, nicht ablehnen).
     2. Gegenprobe: dasselbe Template MIT gültiger templateJws → übernommen.
     3. Vorhandene, aber FALSCH signierte templateJws → harter Abbruch (ganzer
        Import ungültig). Eine falsche Signatur ist ein Manipulations-Signal,
        nicht bloß „unsigniert" — sie wird NICHT zu „strippen" abgeschwächt.

   KEY tabu: ausschließlich Test-Sentinel / Wegwerf-Schlüssel, nie der Produktiv-Key.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

// ⚠ TEST-ONLY: Private-Key zum eingebetteten TEST_SENTINEL_PUBLIC_JWK (wie sicherheit-block-c).
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-06-19T00:00:00Z';   // innerhalb der Cert-Gültigkeit
const OPTS = { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK };

async function anbieterKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
// Cert mit attestierten Werten; optional ein eingebettetes Plain-Template und/oder publicKeyJwk.
function baueCert({ publicKeyJwk, template } = {}) {
  const cs = { anbieterId: 'x', felder: [{ sektor: 'health', feld: 'bloodType', wert: 'A+' }] };
  if (publicKeyJwk) cs.publicKeyJwk = publicKeyJwk;
  if (template) cs.template = template;
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: cs,
  };
}
const GUTES_TEMPLATE = { felder: [{ feldname: 'Zählpunkt', feldtyp: 'text', bereich: 'housing', gruppe: 'Energie & Erzeugung' }] };

// ── Fall 1: eingebettetes Plain-Template, KEINE templateJws → verworfen ──────
test('Schritt 3: Cert mit eingebettetem Plain-Template OHNE templateJws → Template verworfen, Werte laufen weiter', async () => {
  const { V } = ladeKern();
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const certJws = await V._signJWS(baueCert({ template: GUTES_TEMPLATE }), sentinelSign, {});
  // KEIN templateJws → Schritt 3: das ungeprüfte (sogar wohlgeformte) Template wird verworfen.
  const plan = await V.importPlanGeprueft('provider-credential', certJws, OPTS);
  assert.equal(plan.ungueltig, false, 'Cert gültig → Import läuft (Werte sind cert-attestiert)');
  assert.equal(plan.zeilen.length, 1, 'attestierte Werte (blutgruppe) laufen weiter');
  assert.equal(plan.feldDefinitionen.length, 0, 'unsigniertes Template → KEINE Definitionen übernommen');
  assert.ok(plan.verworfeneFelder.some(v => v.grund === 'template-ungueltig'), 'Template namentlich verworfen');
  assert.ok(plan.verworfeneFelder.some(v => /Signatur/.test(v.detail || '')), 'Grund nennt die fehlende Signatur');
});

// ── Fall 2: Gegenprobe — dasselbe Template MIT gültiger templateJws → übernommen
test('Schritt 3 Gegenprobe: wohlgeformtes Template MIT gültiger templateJws → Definitionen übernommen', async () => {
  const { V } = ladeKern();
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueCert({ publicKeyJwk: pubJwk }), sentinelSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const templateJws = await V._signJWS(GUTES_TEMPLATE, anbieterSign, {});
  const plan = await V.importPlanGeprueft('provider-credential', certJws, Object.assign({}, OPTS, { templateJws }));
  assert.equal(plan.ungueltig, false);
  assert.equal(plan.feldDefinitionen.length, 1, 'anbieter-signiertes Template → übernommen');
  assert.ok(!plan.verworfeneFelder.some(v => v.grund === 'template-ungueltig'), 'kein template-ungueltig');
});

// ── Fall 3: vorhandene, aber FALSCH signierte templateJws → harter Abbruch ───
test('Schritt 3: falsch signierte templateJws (Fremd-Key) → ganzer Import abgelehnt (Manipulations-Signal)', async () => {
  const { V } = ladeKern();
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk } = await anbieterKeypair();             // Anbieter-Key steht im Cert
  const { privJwk: fremdPriv } = await anbieterKeypair(); // ein ANDERER Key signiert das Template
  const certJws = await V._signJWS(baueCert({ publicKeyJwk: pubJwk }), sentinelSign, {});
  const fremdSign = await V._jwsImportSignKey(fremdPriv);
  const templateJws = await V._signJWS(GUTES_TEMPLATE, fremdSign, {});
  const plan = await V.importPlanGeprueft('provider-credential', certJws, Object.assign({}, OPTS, { templateJws }));
  assert.equal(plan.ungueltig, true, 'falsche Template-Signatur → ganzer Import abgelehnt (nicht nur strippen)');
  assert.equal(plan.zeilen.length, 0, 'keine Claims bei Manipulations-Signal');
  assert.match(plan.grund, /Template-Signatur ungültig/);
});
