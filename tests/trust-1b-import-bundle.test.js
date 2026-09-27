'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Trust-1B: Bürger-App-Import-UI fürs Bundle (_importEingabeAufteilen)
   ────────────────────────────────────────────────────────────────────────
   Das 2b-Ausliefer-Bundle { providerCredentialJws, templateJws } wird VOR der
   Format-Erkennung aufgeteilt: providerCredentialJws → der bestehende Import-Text,
   templateJws → opts.templateJws. STRIKT auf das String-Feld providerCredentialJws —
   eine .vivodepot-Depotdatei (auch JSON) darf NICHT als Bundle missdeutet werden.
   Additiv: ein altes Plain-Cert (roher JWS-Compact) läuft unverändert durch.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-06-19T00:00:00Z';

function templateObjekt() { return { felder: [{ feldname: 'Zählpunkt', feldtyp: 'text', bereich: 'housing', gruppe: 'Energie & Erzeugung' }] }; }
async function anbieterKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function baueCert(publicKeyJwk, plainTemplate) {
  const cs = { anbieterId: 'institution/x', anbieterName: 'X', anbieterTyp: 'institution/sparkasse-de', publicKeyJwk };
  if (plainTemplate) cs.template = plainTemplate;
  return { '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'], issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z', credentialSubject: cs };
}

// ── Aufteilung (rein) ───────────────────────────────────────────────────────
test('UI-1 Bundle aufgeteilt: providerCredentialJws → text, templateJws → opts', () => {
  const { V } = ladeKern();
  const teil = V._importEingabeAufteilen(JSON.stringify({ providerCredentialJws: 'aa.bb.cc', templateJws: 'dd.ee.ff' }));
  assert.equal(teil.text, 'aa.bb.cc');
  assert.equal(teil.opts.templateJws, 'dd.ee.ff');
});

test('UI-2 Plain-Cert (roher JWS-Compact) → unverändert, opts leer', () => {
  const { V } = ladeKern();
  const teil = V._importEingabeAufteilen('aa.bb.cc');
  assert.equal(teil.text, 'aa.bb.cc');
  assert.deepEqual(Array.from(Object.keys(teil.opts)), []);
});

test('UI-3 Depot-JSON (ohne providerCredentialJws) → NICHT als Bundle missdeutet', () => {
  const { V } = ladeKern();
  const depot = JSON.stringify({ schemaVersion: 23, sektoren: {}, kryptoVersion: 3 });
  const teil = V._importEingabeAufteilen(depot);
  assert.equal(teil.text, depot, 'unverändert durchgereicht');
  assert.deepEqual(Array.from(Object.keys(teil.opts)), []);
});

test('UI-4 Bundle ohne templateJws (additiv) → text gesetzt, opts ohne templateJws', () => {
  const { V } = ladeKern();
  const teil = V._importEingabeAufteilen(JSON.stringify({ providerCredentialJws: 'aa.bb.cc' }));
  assert.equal(teil.text, 'aa.bb.cc');
  assert.ok(!('templateJws' in teil.opts));
});

// ── End-to-end durch importPlanGeprueft ─────────────────────────────────────
test('UI-5 End-to-end: Bundle aufteilen → importPlanGeprueft → zweistufige Kette im Plan', async () => {
  const { V } = ladeKern();
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueCert(pubJwk), sentinelSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const templateJws = await V._signJWS(templateObjekt(), anbieterSign, {});

  const teil = V._importEingabeAufteilen(JSON.stringify({ providerCredentialJws: certJws, templateJws }));
  const opts = Object.assign({}, teil.opts, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK });
  const plan = await V.importPlanGeprueft('provider-credential', teil.text, opts);
  assert.equal(plan.ungueltig, false, 'gültige Kette aus dem Bundle: ' + (plan.grund || ''));
  assert.ok(Array.isArray(plan.feldDefinitionen) && plan.feldDefinitionen.length === 1, 'Template-Definition aus dem Bundle übernommen');
  assert.equal(plan.feldDefinitionen[0].feldId, 'tpl_zaehlpunkt');
});

test('UI-6 End-to-end Schritt 3 (U2-ADR-039): Plain-Cert OHNE Bundle bleibt importierbar, aber Template verworfen', async () => {
  const { V } = ladeKern();
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueCert(pubJwk, templateObjekt()), sentinelSign, {});   // Plain-template im Cert
  const teil = V._importEingabeAufteilen(certJws);   // kein Bundle → keine templateJws
  const opts = Object.assign({}, teil.opts, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK });
  const plan = await V.importPlanGeprueft('provider-credential', teil.text, opts);
  assert.equal(plan.ungueltig, false, 'Cert gültig → Import läuft (attestierte Werte)');
  assert.equal(plan.feldDefinitionen.length, 0, 'Schritt 3: unsigniertes Plain-template wird verworfen');
});
