'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — 1C Multi-Typ-Validator (validateTemplate), Empfänger-seitig, additiv
   ────────────────────────────────────────────────────────────────────────
   Dünnes Gate in importPlanGeprueft (nach Template-JWS-Prüfung, vor Übersetzen):
   L1 Struktur (felder nicht-leeres Array, Grundform), L3 per-typ (Erzeuger-Regeln
   gespiegelt: feldtyp-Enum, auswahl/mehrfachauswahl → codeWerte), Gesamt-Größen-Cap.
   Additiv: ein heutiges {felder}-Template ohne templateType läuft durch. Ein
   fehlgeformtes Template wird verworfen (Definitionen weg), die Werte laufen weiter.
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

// ── L1 / L3 / Größe (rein) ──────────────────────────────────────────────────
test('1C ok: einfaches {felder}-Template OHNE templateType → gültig (additiv)', () => {
  const { V } = ladeKern();
  assert.equal(V.validateTemplate({ felder: [{ feldname: 'Zählpunkt', feldtyp: 'text', bereich: 'wohnen' }] }), null);
});

test('1C ok: auswahl MIT codeWerte → gültig', () => {
  const { V } = ladeKern();
  assert.equal(V.validateTemplate({ felder: [{ feldname: 'Pflegegrad', feldtyp: 'auswahl', bereich: 'gesundheit', codeWerte: [{ code: '1', anzeige: 'PG 1' }] }] }), null);
});

test('1C L1: felder fehlt / leer / kein Array / kein Objekt → Grund', () => {
  const { V } = ladeKern();
  assert.match(V.validateTemplate({}), /felder/);
  assert.match(V.validateTemplate({ felder: [] }), /leer/);
  assert.match(V.validateTemplate({ felder: 'x' }), /felder/);
  assert.match(V.validateTemplate(null), /kein Template/);
});

test('1C L3: unbekannter feldtyp → Grund', () => {
  const { V } = ladeKern();
  assert.match(V.validateTemplate({ felder: [{ feldname: 'X', feldtyp: 'raumschiff', bereich: 'wohnen' }] }), /feldtyp/);
});

test('1C L3: auswahl/mehrfachauswahl ohne (vollständige) codeWerte → Grund', () => {
  const { V } = ladeKern();
  assert.match(V.validateTemplate({ felder: [{ feldname: 'X', feldtyp: 'auswahl', bereich: 'wohnen' }] }), /codeWerte/);
  assert.match(V.validateTemplate({ felder: [{ feldname: 'X', feldtyp: 'auswahl', bereich: 'wohnen', codeWerte: [] }] }), /codeWerte/);
  assert.match(V.validateTemplate({ felder: [{ feldname: 'X', feldtyp: 'mehrfachauswahl', bereich: 'wohnen', codeWerte: [{ code: '1' }] }] }), /codeWerte/);
});

test('1C L1: feldname fehlt / zu lang → Grund', () => {
  const { V } = ladeKern();
  assert.match(V.validateTemplate({ felder: [{ feldtyp: 'text', bereich: 'wohnen' }] }), /feldname/);
  assert.match(V.validateTemplate({ felder: [{ feldname: 'x'.repeat(400), feldtyp: 'text', bereich: 'wohnen' }] }), /zu lang/);
});

test('1C Größe: übergroßes Template → Grund', () => {
  const { V } = ladeKern();
  const felder = [];
  for (let i = 0; i < 3000; i++) felder.push({ feldname: 'Feld_' + i + '_' + 'x'.repeat(40), feldtyp: 'text', bereich: 'wohnen' });
  assert.match(V.validateTemplate({ felder }), /zu groß/);
});

// ── End-to-end durch importPlanGeprueft ─────────────────────────────────────
async function anbieterKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function baueCert(publicKeyJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: { anbieterId: 'x', publicKeyJwk, felder: [{ sektor: 'gesundheit', feld: 'bloodType', wert: 'A+' }] },
  };
}
async function planAus(V, templateObj) {
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueCert(pubJwk), sentinelSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const templateJws = await V._signJWS(templateObj, anbieterSign, {});
  return V.importPlanGeprueft('provider-credential', certJws, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws });
}

test('1C E2E: fehlgeformtes Template → verworfen (keine Definitionen), Werte laufen weiter', async () => {
  const { V } = ladeKern();
  const plan = await planAus(V, { felder: [{ feldname: 'X', feldtyp: 'raumschiff', bereich: 'wohnen' }] });
  assert.equal(plan.ungueltig, false, 'Import läuft (Werte sind gültig)');
  assert.equal(plan.feldDefinitionen.length, 0, 'fehlgeformtes Template → keine Definitionen übernommen');
  assert.equal(plan.zeilen.length, 1, 'attestierte Werte (blutgruppe) laufen weiter');
  assert.ok(plan.verworfeneFelder.some(v => v.grund === 'template-ungueltig'), 'Template namentlich als fehlgeformt verworfen');
});

test('1C E2E: wohlgeformtes Template → Definitionen übernommen, kein template-ungueltig', async () => {
  const { V } = ladeKern();
  const plan = await planAus(V, { felder: [{ feldname: 'Zählpunkt', feldtyp: 'text', bereich: 'housing', gruppe: 'Energie & Erzeugung' }] });
  assert.equal(plan.ungueltig, false);
  assert.equal(plan.feldDefinitionen.length, 1, 'gültiges Template übernommen');
  assert.equal(plan.feldDefinitionen[0].feldId, 'tpl_zaehlpunkt');
  assert.ok(!plan.verworfeneFelder.some(v => v.grund === 'template-ungueltig'), 'kein template-ungueltig');
});
