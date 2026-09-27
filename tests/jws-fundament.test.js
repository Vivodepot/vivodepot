'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — JWS-Fundament (Klasse-A) — Krypto-Fundament der drei Säulen
   ────────────────────────────────────────────────────────────────────────
   Prüft den GEMEINSAMEN JWS-Block (_signJWS/_verifyJWS) und den TEST-SENTINEL
   im Bürger-Code. Dieser Block ist verbatim-fähig (BEGIN/END-Marker) und wird
   später byte-identisch in den VC-Issuer (zuerst) und Template-Generator kopiert.

   Geprüfte Invarianten:
     1) Sign→Verify-Roundtrip Ed25519 (primär) — gültig.
     2) Sign→Verify-Roundtrip ES256 (Fallback) — gültig.
     3) Tampering: Payload manipuliert → Verify schlägt fehl.
     4) Ablauf: VC mit expirationDate in der Vergangenheit → Verify lehnt ab.
     4b) Vorgültigkeit: VC vor validFrom/nbf (Gültigkeitsbeginn) → Verify lehnt ab.
     5) alg-/Schlüssel-Mismatch → Verify lehnt ab (Algorithmus-Confusion).
     6) Sentinel-Erkennung: VC gegen den eingebetteten Test-Sentinel
        verifizierbar; istTestSentinelKey erkennt den Sentinel.
     7) Submission-Schema: Beispiel-Paket validiert; defektes Paket abgelehnt.

   Der zum eingebetteten Test-Sentinel-PUBLIC-Key gehörende PRIVATE-Key liegt
   AUSSCHLIESSLICH hier (TEST-Material). Im Auslieferungscode ist nur der
   Public-Key (TEST_SENTINEL_PUBLIC_JWK). Vor Produktiv → eigene Strecke.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');

// ⚠ TEST-ONLY: Private-Key zum eingebetteten TEST_SENTINEL_PUBLIC_JWK.
// NIEMALS produktiv verwenden. Existiert nur, um Test-VCs zu signieren.
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});

// Ein VivodepotProviderCredential (W3C VC) für Tests bauen.
function baueProviderVC(opts) {
  opts = opts || {};
  const ausstellung = opts.issuanceDate || '2026-05-31T12:00:00Z';
  const ablauf = opts.expirationDate || '2027-11-30T12:00:00Z';
  return {
    '@context': [
      'https://www.w3.org/ns/credentials/v2',
      'https://vivodepot.de/credentials/v1',
    ],
    type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de',
    issuanceDate: ausstellung,
    expirationDate: ablauf,
    credentialSubject: {
      anbieterId: opts.anbieterId || 'institution/sparkasse-musterstadt-de',
      anbieterName: 'Sparkasse Musterstadt',
      anbieterTyp: 'institution/sparkasse-de',
      publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: 'AAAA' },
    },
  };
}

test('[Klasse-A] T-A-01 Roundtrip Ed25519: Sign→Verify ergibt gültig', async () => {
  const { V } = ladeKern();
  const signKey = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const verifyKey = await V._jwsImportVerifyKey(V.TEST_SENTINEL_PUBLIC_JWK);
  const vc = baueProviderVC();
  const jws = await V._signJWS(vc, signKey);

  // Compact-Form: drei base64url-Teile.
  const teile = jws.split('.');
  assert.equal(teile.length, 3, 'JWS Compact muss drei Teile haben');

  // JOSE-Header korrekt.
  const header = JSON.parse(Buffer.from(teile[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  assert.equal(header.typ, 'vc+jwt');
  assert.equal(header.alg, 'EdDSA');

  const res = await V._verifyJWS(jws, verifyKey, { jetzt: '2026-06-01T00:00:00Z' });
  assert.equal(res.gueltig, true, 'Roundtrip muss gültig sein: ' + res.grund);
  assert.equal(res.nutzlast.issuer, 'did:web:vivodepot.de');
});

test('[Klasse-A] Roundtrip ES256 (Fallback): Sign→Verify ergibt gültig', async () => {
  const { V } = ladeKern();
  const kp = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const privJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const pubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const signKey = await V._jwsImportSignKey(privJwk);
  const verifyKey = await V._jwsImportVerifyKey(pubJwk);

  const jws = await V._signJWS(baueProviderVC(), signKey);
  const header = JSON.parse(Buffer.from(jws.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  assert.equal(header.alg, 'ES256', 'Fallback-Algorithmus muss ES256 sein');

  const res = await V._verifyJWS(jws, verifyKey, { jetzt: '2026-06-01T00:00:00Z' });
  assert.equal(res.gueltig, true, 'ES256-Roundtrip muss gültig sein: ' + res.grund);
});

test('[Klasse-A] T-A-02 Tampering: manipulierter Payload → Verify schlägt fehl', async () => {
  const { V } = ladeKern();
  const signKey = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const verifyKey = await V._jwsImportVerifyKey(V.TEST_SENTINEL_PUBLIC_JWK);
  const jws = await V._signJWS(baueProviderVC(), signKey);

  // Payload-Teil austauschen: anbieterId ändern, neu kodieren, Signatur belassen.
  const teile = jws.split('.');
  const payload = JSON.parse(V._jwsB64uToString(teile[1]));
  payload.credentialSubject.anbieterId = 'institution/boeser-faelscher-de';
  teile[1] = V._jwsB64uFromString(JSON.stringify(payload));
  const manipuliert = teile.join('.');

  const res = await V._verifyJWS(manipuliert, verifyKey, { jetzt: '2026-06-01T00:00:00Z' });
  assert.equal(res.gueltig, false, 'manipulierter Payload darf NICHT gültig sein');
  assert.match(res.grund, /Signatur ungültig/);
});

test('[Klasse-A] T-A-03 Ablauf: abgelaufenes VC → Verify lehnt ab', async () => {
  const { V } = ladeKern();
  const signKey = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const verifyKey = await V._jwsImportVerifyKey(V.TEST_SENTINEL_PUBLIC_JWK);
  const vc = baueProviderVC({ issuanceDate: '2024-01-01T00:00:00Z', expirationDate: '2025-01-01T00:00:00Z' });
  const jws = await V._signJWS(vc, signKey);

  const res = await V._verifyJWS(jws, verifyKey, { jetzt: '2026-05-31T00:00:00Z' });
  assert.equal(res.gueltig, false, 'abgelaufenes VC darf NICHT gültig sein');
  assert.equal(res.abgelaufen, true);
  assert.match(res.grund, /abgelaufen/);
});

test('[Klasse-A] T-A-03b Vorgültigkeit: VC vor validFrom/nbf → Verify lehnt ab', async () => {
  const { V } = ladeKern();
  const signKey = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const verifyKey = await V._jwsImportVerifyKey(V.TEST_SENTINEL_PUBLIC_JWK);

  // validFrom (VC 2.0) in der Zukunft → noch nicht gültig.
  const vcFuture = baueProviderVC(); vcFuture.validFrom = '2027-01-01T00:00:00Z';
  const resF = await V._verifyJWS(await V._signJWS(vcFuture, signKey), verifyKey, { jetzt: '2026-05-31T00:00:00Z' });
  assert.equal(resF.gueltig, false, 'VC vor Gültigkeitsbeginn darf NICHT gültig sein');
  assert.equal(resF.vorGueltigkeit, true);
  assert.match(resF.grund, /noch nicht gültig/);

  // nbf (JWT, Sekunden) in der Zukunft → noch nicht gültig.
  const vcNbf = baueProviderVC(); vcNbf.nbf = Math.floor(new Date('2027-01-01T00:00:00Z').getTime() / 1000);
  const resN = await V._verifyJWS(await V._signJWS(vcNbf, signKey), verifyKey, { jetzt: '2026-05-31T00:00:00Z' });
  assert.equal(resN.gueltig, false, 'nbf in der Zukunft → nicht gültig');
  assert.equal(resN.vorGueltigkeit, true);

  // Positiv: validFrom in der Vergangenheit → gültig (innerhalb des Fensters).
  const vcPast = baueProviderVC(); vcPast.validFrom = '2026-01-01T00:00:00Z';
  const resP = await V._verifyJWS(await V._signJWS(vcPast, signKey), verifyKey, { jetzt: '2026-05-31T00:00:00Z' });
  assert.equal(resP.gueltig, true, 'validFrom in der Vergangenheit → gültig');
});

test('[Klasse-A] alg-/Schlüssel-Mismatch: falscher Schlüssel → Verify lehnt ab', async () => {
  const { V } = ladeKern();
  const signKey = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const jws = await V._signJWS(baueProviderVC(), signKey);

  // Mit einem FREMDEN Ed25519-Public-Key prüfen → Signatur ungültig.
  const fremd = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const fremdPub = await V._jwsImportVerifyKey(await webcrypto.subtle.exportKey('jwk', fremd.publicKey));
  const res1 = await V._verifyJWS(jws, fremdPub, { jetzt: '2026-06-01T00:00:00Z' });
  assert.equal(res1.gueltig, false, 'fremder Schlüssel darf nicht verifizieren');

  // alg-Confusion: EdDSA-JWS gegen P-256-Schlüssel → alg-Mismatch.
  const ec = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const ecPub = await V._jwsImportVerifyKey(await webcrypto.subtle.exportKey('jwk', ec.publicKey));
  const res2 = await V._verifyJWS(jws, ecPub, { jetzt: '2026-06-01T00:00:00Z' });
  assert.equal(res2.gueltig, false, 'alg-Mismatch muss abgelehnt werden');
  assert.match(res2.grund, /alg-Mismatch/);
});

test('[Klasse-A] T-A-04 Anker-Naht: Laufzeit prüft gegen Produktiv-Anker, Tests injizieren den Sentinel', async () => {
  const { V } = ladeKern();
  const signKey = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const jws = await V._signJWS(baueProviderVC(), signKey);

  // Test-Injektion: gegen den über opts.ankerJwk eingeschleusten Sentinel verifizieren.
  const res = await V.verifiziereProviderCredential(jws, { jetzt: '2026-06-01T00:00:00Z', ankerJwk: V.TEST_SENTINEL_PUBLIC_JWK });
  assert.equal(res.gueltig, true, 'Test-VC muss gegen den injizierten Sentinel gültig sein: ' + res.grund);
  assert.equal(res.istTestAnker, true, 'injizierter Test-Anker wird als solcher markiert');

  // Anker-Naht-Beweis: OHNE Injektion verifiziert die LAUFZEIT gegen den Produktiv-Trust-Authority-Key —
  // das Sentinel-signierte Test-VC ist dort NICHT gültig (anderer Schlüssel).
  const resProd = await V.verifiziereProviderCredential(jws, { jetzt: '2026-06-01T00:00:00Z' });
  assert.equal(resProd.gueltig, false, 'gegen den Produktiv-Anker ist das Sentinel-VC ungültig');
  assert.equal(resProd.istTestAnker, false, 'kein injizierter Test-Anker → Produktiv-Anker aktiv');
});

/* ── Mini-JSON-Schema-Validator (dependency-frei) ──────────────────────────
   Deckt die im submission-schema.json benutzten Keywords ab: type, required,
   properties, additionalProperties:false, items, enum, const, minLength,
   maxLength, minItems, pattern, allOf, if/then, not. format ist advisory. */
function validate(schema, data, pfad, fehler) {
  pfad = pfad || '$';
  fehler = fehler || [];
  if (schema.type) {
    const t = Array.isArray(data) ? 'array' : (data === null ? 'null' : typeof data);
    const erwartet = t === 'number' && Number.isInteger(data) ? ['number', 'integer'] : [t];
    if (!erwartet.includes(schema.type)) { fehler.push(pfad + ': Typ ' + t + ' ≠ ' + schema.type); return fehler; }
  }
  if (schema.enum && !schema.enum.includes(data)) fehler.push(pfad + ': Wert nicht im enum');
  if (schema.const !== undefined && data !== schema.const) fehler.push(pfad + ': Wert ≠ const ' + schema.const);
  if (typeof data === 'string') {
    if (schema.minLength != null && data.length < schema.minLength) fehler.push(pfad + ': zu kurz');
    if (schema.maxLength != null && data.length > schema.maxLength) fehler.push(pfad + ': zu lang');
    if (schema.pattern && !new RegExp(schema.pattern).test(data)) fehler.push(pfad + ': pattern verletzt');
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    (schema.required || []).forEach(k => { if (!(k in data)) fehler.push(pfad + ': Pflichtfeld fehlt: ' + k); });
    if (schema.additionalProperties === false && schema.properties) {
      Object.keys(data).forEach(k => { if (!(k in schema.properties)) fehler.push(pfad + ': unerlaubtes Feld: ' + k); });
    }
    if (schema.properties) {
      Object.keys(schema.properties).forEach(k => {
        if (k in data) validate(schema.properties[k], data[k], pfad + '.' + k, fehler);
      });
    }
  }
  if (Array.isArray(data)) {
    if (schema.minItems != null && data.length < schema.minItems) fehler.push(pfad + ': zu wenige Items');
    if (schema.items) data.forEach((it, i) => validate(schema.items, it, pfad + '[' + i + ']', fehler));
  }
  if (schema.not) {
    const sub = validate(schema.not, data, pfad, []);
    if (sub.length === 0) fehler.push(pfad + ': not-Constraint verletzt');
  }
  (schema.allOf || []).forEach(s => validate(s, data, pfad, fehler));
  if (schema.if) {
    const ok = validate(schema.if, data, pfad, []).length === 0;
    if (ok && schema.then) validate(schema.then, data, pfad, fehler);
    if (!ok && schema.else) validate(schema.else, data, pfad, fehler);
  }
  return fehler;
}

test('[Klasse-A] T-A-05 Submission-Schema validiert ein Beispiel-Paket', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(REPO, 'docs/template-generator/submission-schema.json'), 'utf8'));
  const beispiel = JSON.parse(fs.readFileSync(path.join(REPO, 'docs/template-generator/beispiel-submission.json'), 'utf8'));

  // Selbsttest des Mini-Validators: ein offensichtlich kaputtes Paket MUSS Fehler liefern.
  const kaputt = JSON.parse(JSON.stringify(beispiel));
  delete kaputt.submissionId;                 // Pflichtfeld fehlt
  kaputt.publicKeyJwk.d = 'geheim';           // Private-Key in Submission → not-Constraint
  kaputt.templates[0].felder = [];            // minItems 1 verletzt
  const fehlerKaputt = validate(schema, kaputt);
  assert.ok(fehlerKaputt.length >= 3, 'kaputtes Paket muss mehrere Fehler liefern, hatte: ' + fehlerKaputt.length);

  // Das Beispiel-Paket validiert sauber.
  const fehler = validate(schema, beispiel);
  assert.deepEqual(fehler, [], 'Beispiel-Paket muss valide sein, Fehler: ' + JSON.stringify(fehler));
});
