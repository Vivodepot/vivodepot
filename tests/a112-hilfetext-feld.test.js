'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — A112/Z32: Hilfetext-/Erläuterungs-Feld im Template-Generator
   ────────────────────────────────────────────────────────────────────────
   institutionen.html verspricht Anbietern, „Erläuterungen, Eingabe-Hilfen" je
   Feld definieren zu können. Deckt die volle Kette: Generator-Editor/CSV →
   Submission-Schema (Generator + VC-Issuer, byte-identisch, s. T-CROSS-08) →
   Kern-Übersetzung (_templateFeldZuModell → def.hint) → Render (feldZeileHTML
   → .feld-hint, escaped). Rotmachbarkeit: ohne hilfetext kein .feld-hint.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { ladeGenerator } = require('./load-generator.js');

// ── Generator: normalisiereFeld / csvZuFelder ───────────────────────────────
test('[A112] normalisiereFeld übernimmt hilfetext (getrimmt), lässt es bei Leerstring weg', () => {
  const { V } = ladeGenerator();
  const mit = V.normalisiereFeld({ feldname: 'X', feldtyp: 'text', bereich: 'housing', hilfetext: '  Bitte genau angeben.  ' });
  assert.equal(mit.hilfetext, 'Bitte genau angeben.');
  const ohne = V.normalisiereFeld({ feldname: 'X', feldtyp: 'text', bereich: 'housing', hilfetext: '   ' });
  assert.equal('hilfetext' in ohne, false, 'reiner Leerstring wird nicht als Feld übernommen');
  const fehlend = V.normalisiereFeld({ feldname: 'X', feldtyp: 'text', bereich: 'housing' });
  assert.equal('hilfetext' in fehlend, false);
});

test('[A112] csvZuFelder liest die Spalte hilfetext', () => {
  const { V } = ladeGenerator();
  const csv = [
    'feldname,feldtyp,pflicht,bereich,code_system,code_werte,hilfetext',
    'Körpergewicht,Zahl,nein,Gesundheit,,,Bitte in kg angeben',
  ].join('\n');
  const felder = V.csvZuFelder(csv);
  assert.equal(felder.length, 1);
  assert.equal(felder[0].hilfetext, 'Bitte in kg angeben');
});

test('[A112] csvZuFelder ohne hilfetext-Spalte: kein Feld gesetzt (rückwärtskompatibel)', () => {
  const { V } = ladeGenerator();
  const csv = ['feldname,feldtyp,pflicht,bereich', 'X,Text,nein,Wohnen'].join('\n');
  const felder = V.csvZuFelder(csv);
  assert.equal('hilfetext' in felder[0], false);
});

// ── Kern: Übersetzung Generator-Feld → Feld-Modell-Definition ──────────────
test('[A112] _templateFeldZuModell setzt def.hint aus g.hilfetext (getrimmt)', () => {
  const { V } = ladeKern();
  const { def } = V._templateFeldZuModell({ feldname: 'Gewicht', feldtyp: 'zahl', bereich: 'health', hilfetext: '  In kg.  ' }, 26, {});
  assert.equal(def.hint, 'In kg.');
});

test('[A112] _templateFeldZuModell ohne hilfetext: kein def.hint', () => {
  const { V } = ladeKern();
  const { def } = V._templateFeldZuModell({ feldname: 'Gewicht', feldtyp: 'zahl', bereich: 'health' }, 26, {});
  assert.equal('hint' in def, false);
});

test('[A112] _templateFeldZuModell: reiner Leerstring-hilfetext setzt kein def.hint', () => {
  const { V } = ladeKern();
  const { def } = V._templateFeldZuModell({ feldname: 'Gewicht', feldtyp: 'zahl', bereich: 'health', hilfetext: '   ' }, 26, {});
  assert.equal('hint' in def, false);
});

// ── Kern: Render (Kern-Look, .feld-hint, escaped) ───────────────────────────
test('[A112] _templateDefAlsFeld reicht def.hint an f.hint durch, feldZeileHTML rendert .feld-hint', () => {
  const { V } = ladeKern();
  const def = { feldId: 'tpl_gewicht', typ: 'zahl', label: 'Gewicht', hint: 'In kg angeben.' };
  const f = V._templateDefAlsFeld(def);
  assert.equal(f.hint, 'In kg angeben.');
  const html = V.feldZeileHTML(f, undefined, 'health', true);
  assert.match(html, /class="feld-hint"/);
  assert.match(html, /In kg angeben\./);
});

test('[A112] Rotmachbarkeit: ohne hint erscheint kein .feld-hint', () => {
  const { V } = ladeKern();
  const def = { feldId: 'tpl_gewicht', typ: 'zahl', label: 'Gewicht' };
  const f = V._templateDefAlsFeld(def);
  assert.equal('hint' in f, false);
  const html = V.feldZeileHTML(f, undefined, 'health', true);
  assert.doesNotMatch(html, /class="feld-hint"/);
});

test('[A112] Hilfetext wird escaped gerendert (kein HTML-Einbruch)', () => {
  const { V } = ladeKern();
  const def = { feldId: 'tpl_x', typ: 'text', label: 'X', hint: '<img src=x onerror=alert(1)>' };
  const f = V._templateDefAlsFeld(def);
  const html = V.feldZeileHTML(f, undefined, 'health', true);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});

// ── Kern: validateTemplate (Empfänger-seitiges Gate) ────────────────────────
test('[A112] validateTemplate akzeptiert hilfetext als String', () => {
  const { V } = ladeKern();
  assert.equal(V.validateTemplate({ felder: [{ feldname: 'X', feldtyp: 'text', bereich: 'housing', hilfetext: 'Hinweis' }] }), null);
});

test('[A112] validateTemplate lehnt hilfetext ab, das kein String ist', () => {
  const { V } = ladeKern();
  assert.match(V.validateTemplate({ felder: [{ feldname: 'X', feldtyp: 'text', bereich: 'housing', hilfetext: 42 }] }), /hilfetext/);
});

test('[A112] validateTemplate lehnt übergroßen hilfetext ab', () => {
  const { V } = ladeKern();
  const lang = 'x'.repeat(2001);
  assert.match(V.validateTemplate({ felder: [{ feldname: 'X', feldtyp: 'text', bereich: 'housing', hilfetext: lang }] }), /hilfetext/);
  assert.equal(V.validateTemplate({ felder: [{ feldname: 'X', feldtyp: 'text', bereich: 'housing', hilfetext: 'x'.repeat(2000) }] }), null, 'Grenzwert 2000 besteht noch');
});

// ── E2E: durch die volle Vertrauenskette (importPlanGeprueft) ──────────────
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-06-19T00:00:00Z';

async function anbieterKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function baueCert(publicKeyJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: { anbieterId: 'x', publicKeyJwk, felder: [] },
  };
}

test('[A112] E2E: Generator-Feld mit hilfetext kommt als def.hint bei den Feld-Definitionen an', async () => {
  const { V } = ladeKern();
  const sentinelSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueCert(pubJwk), sentinelSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const templateObj = { felder: [{ feldname: 'Körpergewicht', feldtyp: 'zahl', bereich: 'health', hilfetext: 'Bitte in kg angeben.' }] };
  const templateJws = await V._signJWS(templateObj, anbieterSign, {});
  const plan = await V.importPlanGeprueft('provider-credential', certJws, { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK, templateJws });
  assert.equal(plan.ungueltig, false);
  assert.equal(plan.feldDefinitionen.length, 1);
  assert.equal(plan.feldDefinitionen[0].hint, 'Bitte in kg angeben.');
});
