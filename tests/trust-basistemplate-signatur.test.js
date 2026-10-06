'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — 1E Basistemplate-Signatur (U2-ADR-040, Schritt 1)
   ────────────────────────────────────────────────────────────────────────
   Die Basistemplates laufen durch DIESELBE zweistufige Kette wie externe
   Templates (Option 1, geteilter Helfer): Behörden-Cert gegen den TA-Anker
   (Stufe 1) + templateJws gegen den Anbieter-Key aus dem Cert (Stufe 2).
   Treuhänderisch (A): Vivodepot signiert für die öffentliche Stelle — der TA
   signiert das Behörden-Cert, ein separater Treuhand-Anbieter-Key das Template.

   Hier ausschließlich Test-Sentinel (TA) + Wegwerf-Treuhand-Keys — KEY tabu.
   Der Render-Guard ist in Schritt 1 tolerant; getestet wird die Guard-LOGIK
   (`_basisVorlageSichtbar`) für beide Phasen, ohne die Produktiv-Konstante zu mutieren.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { ladeGenerator } = require('./load-generator.js');
const fs = require('node:fs');
const path = require('node:path');

// ⚠ TEST-ONLY: Sentinel = die Test-Trust-Authority (eingebetteter Test-Anker via opts.ankerJwk).
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-06-19T00:00:00Z';
const OPTS = { jetzt: JETZT, ankerJwk: SENTINEL_PUBLIC_JWK };   // Test-Anker statt Produktiv-TA

async function treuhandKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
// Behörden-Provider-Cert (TA-signiert): nennt die Stelle als Anbieter (behoerde), trägt den Treuhand-Key.
function baueBehoerdeCert(treuhandPubJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-05-31T12:00:00Z', expirationDate: '2027-11-30T12:00:00Z',
    credentialSubject: { anbieterId: 'behoerde/bmj', anbieterTyp: 'behoerde', anbieterName: 'Bundesministerium der Justiz (BMJ)', publicKeyJwk: treuhandPubJwk },
  };
}
const TPL = { felder: [{ feldname: 'Dokument vorhanden?', feldtyp: 'jaNein', pflicht: false, bereich: 'Vorsorge' }] };

async function signierteKette(V) {
  const taSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk, privJwk } = await treuhandKeypair();
  const certJws = await V._signJWS(baueBehoerdeCert(pubJwk), taSign, {});
  const treuhandSign = await V._jwsImportSignKey(privJwk);
  const templateJws = await V._signJWS(TPL, treuhandSign, {});
  return { certJws, templateJws, pubJwk };
}

// ── Stufe 1+2 als geteilte Kette ─────────────────────────────────────────────
test('Basis: TA-signiertes Behörden-Cert + treuhand-signiertes templateJws → Kette gültig', async () => {
  const { V } = ladeKern();
  const { certJws, templateJws } = await signierteKette(V);
  const r = await V.verifiziereTemplateKette(certJws, templateJws, OPTS);
  assert.equal(r.gueltig, true, 'Kette gültig: ' + (r.grund || ''));
  assert.equal(JSON.stringify(r.nutzlast.felder), JSON.stringify(TPL.felder), 'verifizierte Template-Nutzlast intakt');
});

test('Basis: templateJws von einem FREMDEN Key → Kette ungültig (Stufe 2 schlägt fehl)', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk } = await treuhandKeypair();              // Treuhand-Key steht im Cert
  const { privJwk: fremdPriv } = await treuhandKeypair();  // ein ANDERER Key signiert das Template
  const certJws = await V._signJWS(baueBehoerdeCert(pubJwk), taSign, {});
  const fremdSign = await V._jwsImportSignKey(fremdPriv);
  const templateJws = await V._signJWS(TPL, fremdSign, {});
  const r = await V.verifiziereTemplateKette(certJws, templateJws, OPTS);
  assert.equal(r.gueltig, false);
  assert.match(r.grund, /Template-Signatur ungültig/);
});

// ── basisVorlagenVerifizieren füllt den Cache ────────────────────────────────
test('Basis: basisVorlagenVerifizieren cached die verifizierten IDs, überspringt leere Platzhalter', async () => {
  const { V } = ladeKern();
  const { certJws, templateJws } = await signierteKette(V);
  const vorlage   = { id: 'test-pv',         behoerde: 'bmj', templateJws, felder: TPL.felder };
  const platzhalter = { id: 'test-unsigniert', behoerde: 'bmj', templateJws: '' };   // leer → übersprungen
  const set = await V.basisVorlagenVerifizieren([vorlage, platzhalter], { bmj: certJws }, OPTS);
  assert.ok(set.has('test-pv'), 'verifizierte Vorlage im Cache');
  assert.ok(!set.has('test-unsigniert'), 'leerer Platzhalter NICHT im Cache');
});

// ── Guard-Logik: tolerant vs. scharf, ohne die Produktiv-Konstante zu mutieren ──
test('Basis: _basisVorlageSichtbar — tolerant zeigt alle, scharf nur den Cache', async () => {
  const { V } = ladeKern();
  const { certJws, templateJws } = await signierteKette(V);
  await V.basisVorlagenVerifizieren([{ id: 'test-pv', behoerde: 'bmj', templateJws, felder: TPL.felder }], { bmj: certJws }, OPTS);
  // tolerant (Schritt-1-Default): alles sichtbar, auch Unverifizierte
  assert.equal(V._basisVorlageSichtbar('test-pv', false), true);
  assert.equal(V._basisVorlageSichtbar('gibt-es-nicht', false), true);
  // scharf (nach Embed-Flip): nur was im Cache steht
  assert.equal(V._basisVorlageSichtbar('test-pv', true), true);
  assert.equal(V._basisVorlageSichtbar('gibt-es-nicht', true), false);
});

// ════════════════════════════════════════════════════════════════════════
// Schritt 1b — Inhalts-Bindung (U2-ADR-040): die geprüfte templateJws-Nutzlast MUSS den
// eingebetteten Vorlage-Inhalt abdecken, sonst beweist die Signatur nichts über den Text.
// ════════════════════════════════════════════════════════════════════════
const INHALT = {
  felder: TPL.felder,
  wortlaut: 'Amtlicher Text — Eingangsformel …',
  wortlautQuelle: { behoerde: 'Bundesministerium der Justiz (BMJ)', titel: 'Formular', lizenz: 'amtliches Werk § 5 UrhG' },
  wortlautQuelleBroschuere: { behoerde: 'BMJ', titel: 'Broschüre', url: 'https://www.bmj.de/x' },
};

test('1b Wächter: basistemplate-inhalte.json === STANDARD_VORLAGEN (kanonisch, pro id)', () => {
  const { V } = ladeKern();
  const json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs/template-generator/basistemplate-inhalte.json'), 'utf8'));
  const byId = {}; for (const e of json) byId[e.id] = e;
  assert.equal(json.length, V.STANDARD_VORLAGEN.length, 'gleiche Anzahl');
  for (const v of V.STANDARD_VORLAGEN) {
    assert.ok(byId[v.id], 'JSON enthält ' + v.id);
    assert.ok(V._basisInhaltMatcht(v, byId[v.id]), 'Inhalt von ' + v.id + ' identisch (JSON ↔ STANDARD_VORLAGEN)');
  }
});

test('1b Kern-Schutz: Signatur über ANDEREN Inhalt → trotz gültiger Signatur NICHT verifiziert', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk, privJwk } = await treuhandKeypair();
  const certJws = await V._signJWS(baueBehoerdeCert(pubJwk), taSign, {});
  const treuhandSign = await V._jwsImportSignKey(privJwk);
  const templateJws = await V._signJWS(INHALT, treuhandSign, {});                   // signiert INHALT
  const manipuliert = Object.assign({}, INHALT, { wortlaut: 'MANIPULIERTER Text' });
  const v = Object.assign({ id: 'x', behoerde: 'bmj', templateJws }, manipuliert);  // eingebettet ≠ signiert
  const set = await V.basisVorlagenVerifizieren([v], { bmj: certJws }, OPTS);
  assert.ok(!set.has('x'), 'manipulierter Wortlaut ≠ signierter Inhalt → NICHT verifiziert (Kern-Schutz)');
});

test('1b: exakter Inhalt → verifiziert', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk, privJwk } = await treuhandKeypair();
  const certJws = await V._signJWS(baueBehoerdeCert(pubJwk), taSign, {});
  const treuhandSign = await V._jwsImportSignKey(privJwk);
  const templateJws = await V._signJWS(INHALT, treuhandSign, {});
  const v = Object.assign({ id: 'x', behoerde: 'bmj', templateJws }, INHALT);       // eingebettet == signiert
  const set = await V.basisVorlagenVerifizieren([v], { bmj: certJws }, OPTS);
  assert.ok(set.has('x'), 'identischer Inhalt → verifiziert');
});

test('1b kanonisch: umsortierte Schlüssel matchen, veränderte felder-Reihenfolge NICHT, Metadaten ignoriert', () => {
  const { V } = ladeKern();
  const a = { felder: [{ feldname: 'A' }, { feldname: 'B' }], wortlaut: 'x', wortlautQuelle: { behoerde: 'b', titel: 't', lizenz: 'l' } };
  const umsortiert = { wortlautQuelle: { lizenz: 'l', titel: 't', behoerde: 'b' }, wortlaut: 'x', felder: [{ feldname: 'A' }, { feldname: 'B' }] };
  assert.equal(V._basisInhaltMatcht(a, umsortiert), true, 'umsortierte Objekt-Schlüssel → match');
  const felderVertauscht = { felder: [{ feldname: 'B' }, { feldname: 'A' }], wortlaut: 'x', wortlautQuelle: a.wortlautQuelle };
  assert.equal(V._basisInhaltMatcht(a, felderVertauscht), false, 'veränderte felder-Reihenfolge → KEIN match');
  assert.equal(V._basisInhaltMatcht(Object.assign({ id: 'X', name: 'N', sektor: 's' }, a), a), true, 'Metadaten ignoriert');
});

test('1b Generator-Round-Trip: basistemplateTreuhandSignieren → Bürger-App verifiziert + inhaltsgebunden', async () => {
  const { V } = ladeKern();
  const G = ladeGenerator().V;
  const { pubJwk, privJwk } = await treuhandKeypair();
  const vorlage = Object.assign({ id: 'pv', behoerde: 'bmj' }, INHALT);
  const out = await G.basistemplateTreuhandSignieren([vorlage], privJwk);           // Generator signiert (Treuhand-Key)
  assert.equal(out.length, 1); assert.ok(out[0].templateJws, 'templateJws erzeugt');
  const taSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const certJws = await V._signJWS(baueBehoerdeCert(pubJwk), taSign, {});
  const eingebettet = Object.assign({ id: 'pv', behoerde: 'bmj', templateJws: out[0].templateJws }, INHALT);
  const set = await V.basisVorlagenVerifizieren([eingebettet], { bmj: certJws }, OPTS);
  assert.ok(set.has('pv'), 'Generator-signiertes Template → in der Bürger-App verifiziert + inhaltsgebunden');
});

test('1b Generator: Key ohne d → Fehler (Vorbedingung Treuhand-Private-Key)', async () => {
  const G = ladeGenerator().V;
  const { pubJwk } = await treuhandKeypair();
  await assert.rejects(() => G.basistemplateTreuhandSignieren([{ id: 'x', felder: [] }], pubJwk), /Private-Key/);
});

// ════════════════════════════════════════════════════════════════════════
// 1F — Cert-Trennung (U2-ADR-038-Nachtrag / U2-ADR-040): (a) Laufzeit im Issuer (s. vc-issuer.test.js),
// b1 Ablauf-Vorwarnung, b2 Schonfrist-mit-Marker (nur Basis), b3 Widerrufs-Sperrliste (Thumbprint).
// ════════════════════════════════════════════════════════════════════════
const certMitAblauf = (pubJwk, exp) => Object.assign(baueBehoerdeCert(pubJwk), { expirationDate: exp });
const ABGELAUFEN = '2026-01-01T00:00:00Z';   // vor JETZT (2026-06-19) → abgelaufen

// ── b3: Thumbprint + Widerruf ────────────────────────────────────────────────
test('1F b3: _jwkThumbprint ist deterministisch + nur RFC-7638-Pflichtmember zählen', async () => {
  const { V } = ladeKern();
  const { pubJwk } = await treuhandKeypair();
  const a = await V._jwkThumbprint(pubJwk);
  const b = await V._jwkThumbprint({ alg: 'egal', ext: true, key_ops: ['verify'], kty: pubJwk.kty, crv: pubJwk.crv, x: pubJwk.x });
  assert.equal(a, b, 'Zusatz-Member (alg/ext/key_ops) ändern den Thumbprint NICHT');
  const { pubJwk: anders } = await treuhandKeypair();
  assert.notEqual(a, await V._jwkThumbprint(anders), 'anderer Key → anderer Thumbprint');
  assert.ok(a.length >= 43, 'base64url-SHA-256');
});

test('1F b3: Thumbprint in (injizierter) Sperrliste → widerrufen; leere Liste → gültig', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk } = await treuhandKeypair();
  const certJws = await V._signJWS(baueBehoerdeCert(pubJwk), taSign, {});
  const tp = await V._jwkThumbprint(pubJwk);
  const ok = await V.verifiziereProviderCredential(certJws, OPTS);
  assert.equal(ok.gueltig, true, 'leere Produktiv-Liste → gültig');
  const w = await V.verifiziereProviderCredential(certJws, Object.assign({}, OPTS, { widerrufsListe: [tp] }));
  assert.equal(w.gueltig, false, 'gelistet → ungültig');
  assert.equal(w.widerrufen, true);
});

// ── b2: Schonfrist mit Marker (nur Basis) ────────────────────────────────────
test('1F b2: abgelaufenes Basis-Cert, sonst gültig + inhaltsgebunden → veraltet (Marker), NICHT entfernt', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk, privJwk } = await treuhandKeypair();
  const certJws = await V._signJWS(certMitAblauf(pubJwk, ABGELAUFEN), taSign, {});
  const templateJws = await V._signJWS(INHALT, await V._jwsImportSignKey(privJwk), {});
  const v = Object.assign({ id: 'pv', behoerde: 'bmj', templateJws }, INHALT);
  const set = await V.basisVorlagenVerifizieren([v], { bmj: certJws }, OPTS);
  assert.ok(!set.has('pv'), 'abgelaufen → NICHT im gepruefte-Cache');
  assert.ok(V._veralteteBasisVorlagen.has('pv'), 'aber im veraltete-Set');
  assert.equal(V._basisVorlageSichtbar('pv', true), true, 'scharf: trotzdem sichtbar (mit Marker)');
});

test('1F b2: externe bleiben hart — abgelaufenes Cert über den gemeinsamen Trichter → gueltig:false', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk } = await treuhandKeypair();
  const certJws = await V._signJWS(certMitAblauf(pubJwk, ABGELAUFEN), taSign, {});
  const r = await V.verifiziereProviderCredential(certJws, OPTS);   // genau der Pfad, den importPlanGeprueft nutzt
  assert.equal(r.gueltig, false, 'extern: abgelaufen bleibt hart ungültig');
  assert.equal(r.abgelaufen, true);
});

test('1F b2: abgelaufen + FALSCHE Template-Signatur → keine Schonfrist (raus)', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk } = await treuhandKeypair();
  const { privJwk: fremd } = await treuhandKeypair();
  const certJws = await V._signJWS(certMitAblauf(pubJwk, ABGELAUFEN), taSign, {});
  const templateJws = await V._signJWS(INHALT, await V._jwsImportSignKey(fremd), {});   // fremd signiert
  const v = Object.assign({ id: 'pv', behoerde: 'bmj', templateJws }, INHALT);
  await V.basisVorlagenVerifizieren([v], { bmj: certJws }, OPTS);
  assert.ok(!V._veralteteBasisVorlagen.has('pv'), 'falsche Template-Signatur → keine Schonfrist');
  assert.equal(V._basisVorlageSichtbar('pv', true), false);
});

// ── b2 × b3: Widerruf schlägt Schonfrist ─────────────────────────────────────
test('1F b2×b3: abgelaufen UND widerrufen → versteckt trotz Schonfrist', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk, privJwk } = await treuhandKeypair();
  const certJws = await V._signJWS(certMitAblauf(pubJwk, ABGELAUFEN), taSign, {});
  const templateJws = await V._signJWS(INHALT, await V._jwsImportSignKey(privJwk), {});
  const tp = await V._jwkThumbprint(pubJwk);
  const v = Object.assign({ id: 'pv', behoerde: 'bmj', templateJws }, INHALT);
  await V.basisVorlagenVerifizieren([v], { bmj: certJws }, Object.assign({}, OPTS, { widerrufsListe: [tp] }));
  assert.ok(!V._gepruefteBasisVorlagen.has('pv'));
  assert.ok(!V._veralteteBasisVorlagen.has('pv'), 'Widerruf → KEINE Schonfrist');
  assert.equal(V._basisVorlageSichtbar('pv', true), false);
});

// ── b1: Ablauf-Vorwarnung ────────────────────────────────────────────────────
test('1F b1: _basisAblaufFaellig feuert < 90 Tage, nicht darüber', () => {
  const { V } = ladeKern();
  const jetzt = '2026-06-19T00:00:00Z';
  assert.ok(V._basisAblaufFaellig('2026-07-15T00:00:00Z', jetzt), '~26 Tage → Warnung');
  assert.equal(V._basisAblaufFaellig('2027-06-19T00:00:00Z', jetzt), null, '1 Jahr → keine Warnung');
  assert.equal(V._basisAblaufFaellig(null, jetzt), null, 'kein Datum → keine Warnung');
});

test('1F b1: basisVorlagenVerifizieren merkt das früheste (gültige) Cert-Ablaufdatum', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const { pubJwk, privJwk } = await treuhandKeypair();
  const certJws = await V._signJWS(baueBehoerdeCert(pubJwk), taSign, {});   // expiry 2027-11-30
  const templateJws = await V._signJWS(INHALT, await V._jwsImportSignKey(privJwk), {});
  const v = Object.assign({ id: 'pv', behoerde: 'bmj', templateJws }, INHALT);
  await V.basisVorlagenVerifizieren([v], { bmj: certJws }, OPTS);
  assert.equal(V._basisAblaufFruehWert(), '2027-11-30T12:00:00Z');
});
