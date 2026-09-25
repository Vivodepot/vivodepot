'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — „Prüfung vor Verteilung einhängen" (25.08.2026)
   ────────────────────────────────────────────────────────────────────────
   Rot-Beweis wie im Auftrag verlangt: ein Modul mit unbekanntem Feld, eines
   mit Namensraum-Kollision, eines ohne gültige Signatur — jeweils VORHER
   durchgehend (s. Zug-0-Befund im Kopfkommentar von vivodepot-vc-issuer.html
   bei validiereSubmission), NACHHER abgewiesen. Plus Größen-Disziplin und
   reservierte Kennungen (dieselben vier Zusatzprüfungen aus dem Auftrag).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeIssuer, webcrypto } = require('./load-issuer.js');

const REPO = path.join(__dirname, '..');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  kid: 'vivodepot-test-sentinel-do-not-use-in-production',
});
// Zweites Schlüsselpaar (Ed25519), NUR für den Tampering-Test: ein Template,
// das mit DIESEM Schlüssel signiert ist, aber gegen SENTINEL_PUBLIC_JWK
// verifiziert wird, muss als ungültig auffallen (falscher Schlüssel = eine
// Form von "ohne gültige Signatur").
const FREMD_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: 'yiuW6k6BfP7IfqwtAWhQZFRP9reT_YYoc7nh7oxQi_s',
  x: '34iMB-eFLWViEL713R-9wrxGUpEaTwRl_q1kRit7KMA',
  key_ops: ['sign'], ext: true,
});

function beispielPaket() {
  return JSON.parse(fs.readFileSync(path.join(REPO, 'docs/template-generator/beispiel-submission.json'), 'utf8'));
}

async function signiertesTemplateJws(V, template, privateJwk) {
  const key = await webcrypto.subtle.importKey('jwk', privateJwk, { name: 'Ed25519' }, false, ['sign']);
  return V._signJWS(template, key);
}

/* ── 1 · Schema (bereits vorhanden, Zug-0-Befund) — Kontrollprobe ────────── */
test('[Rot-Beweis 1/3] unbekanntes Feld im Submission-Paket wird abgewiesen (Schema, bereits verdrahtet)', () => {
  const { V } = ladeIssuer();
  const p = beispielPaket();
  p.einUnbekanntesFeld = 'darf nicht durch';
  const fehler = V.validiereSubmission(p);
  assert.ok(fehler.length, 'muss abgelehnt werden');
  assert.match(fehler.join(' '), /unerlaubtes Feld/);
});

/* ── 2 · Namensraum-Kollision ─────────────────────────────────────────────── */
test('[Rot-Beweis 2/3] Namensraum-Kollision — vorher durchgehend (kein Katalog), nachher abgewiesen (mit Katalog)', () => {
  const { V } = ladeIssuer();
  const p = beispielPaket();
  p.anbieter.anbieterId = 'institution/anderer-anbieter-de';
  // "Pflegegrad" (aus der Fixture) ist im Katalog bereits unter einem ANDEREN Anbieter bekannt.
  const katalog = { felder: [{ kennung: 'tpl_pflegegrad', feldSlug: 'pflegegrad', anbieterId: 'institution/pflegeheim-musterstadt-de', anbieterIdSlug: 'institution_pflegeheim_musterstadt_de' }] };

  const vorher = V._pruefeNamensraumKollision(p, null);
  assert.equal(vorher.length, 0, 'ohne geladenen Katalog: sichtbar übersprungen, kein Fehler');

  const nachher = V._pruefeNamensraumKollision(p, katalog);
  assert.equal(nachher.length, 1);
  assert.match(nachher[0], /Namensraum-Kollision/);
  assert.match(nachher[0], /tpl_pflegegrad/);

  // Derselbe Anbieter, der die Kennung selbst hält, ist KEINE Kollision (Update-Fall).
  const eigenerKatalog = { felder: [{ kennung: 'tpl_pflegegrad', feldSlug: 'pflegegrad', anbieterId: p.anbieter.anbieterId, anbieterIdSlug: V._tplSlugVc(p.anbieter.anbieterId) }] };
  assert.equal(V._pruefeNamensraumKollision(p, eigenerKatalog).length, 0);
});

test('[Integration] stapelPruefen weist eine Namensraum-Kollision ab, wenn ein Katalog übergeben wird', () => {
  const { V } = ladeIssuer();
  const p = beispielPaket();
  p.submissionId = '3f2504e0-4f89-41d3-9a0c-030500000099';
  p.anbieter.anbieterId = 'institution/anderer-anbieter-de';
  const katalog = { felder: [{ kennung: 'tpl_pflegegrad', feldSlug: 'pflegegrad', anbieterId: 'institution/pflegeheim-musterstadt-de', anbieterIdSlug: 'institution_pflegeheim_musterstadt_de' }] };

  const ohneKatalog = V.stapelPruefen([p]);
  assert.equal(ohneKatalog[0].gueltig, true, 'ohne Katalog: geht durch (vorher-Zustand)');

  const mitKatalog = V.stapelPruefen([p], katalog);
  assert.equal(mitKatalog[0].gueltig, false, 'mit Katalog: wird abgewiesen (nachher-Zustand)');
  assert.match(mitKatalog[0].grund, /Namensraum-Kollision/);
});

/* ── 3 · Signatur ─────────────────────────────────────────────────────────── */
test('[Rot-Beweis 3/3] Template-Signatur — vorher (unverifiziert) durchgehend, nachher mit falschem Schlüssel abgewiesen', async () => {
  const { V } = ladeIssuer();
  const template = { felder: [{ feldname: 'Testfeld', feldtyp: 'text', pflicht: false, bereich: 'gesundheit' }] };
  const jwsFalscherSchluessel = await signiertesTemplateJws(V, template, FREMD_PRIVATE_JWK);

  const daten = { templates: [template], templatesJws: [jwsFalscherSchluessel], publicKeyJwk: SENTINEL_PUBLIC_JWK };
  const fehler = await V._pruefeTemplateSignaturen(daten);
  assert.equal(fehler.length, 1);
  assert.match(fehler[0], /Signatur/);
});

test('[Kontrollprobe] Template-Signatur — gültige Signatur mit dem RICHTIGEN Schlüssel wird angenommen', async () => {
  const { V } = ladeIssuer();
  const template = { felder: [{ feldname: 'Testfeld', feldtyp: 'text', pflicht: false, bereich: 'gesundheit' }] };
  const jwsRichtigerSchluessel = await signiertesTemplateJws(V, template, SENTINEL_PRIVATE_JWK);
  const daten = { templates: [template], templatesJws: [jwsRichtigerSchluessel], publicKeyJwk: SENTINEL_PUBLIC_JWK };
  assert.equal((await V._pruefeTemplateSignaturen(daten)).length, 0);
});

test('[Kontrollprobe] Template-Signatur — FEHLENDES JWS ist kein Fehler (PLAIN, wie im Kern toleriert)', async () => {
  const { V } = ladeIssuer();
  const template = { felder: [{ feldname: 'Testfeld', feldtyp: 'text', pflicht: false, bereich: 'gesundheit' }] };
  const daten = { templates: [template], templatesJws: [], publicKeyJwk: SENTINEL_PUBLIC_JWK };
  assert.equal((await V._pruefeTemplateSignaturen(daten)).length, 0,
    'Schema verlangt templatesJws nicht (optional) — Abwesenheit darf keine Regression zum Kern sein');
});

test('[Integration] stapelAusstellen weist eine Zeile mit ungültiger Template-Signatur ab, stellt die übrigen aus', async () => {
  const { V } = ladeIssuer();
  const gutesTemplate = { felder: [{ feldname: 'Gutes Feld', feldtyp: 'text', pflicht: false, bereich: 'gesundheit' }] };
  const boesesTemplate = { felder: [{ feldname: 'Böses Feld', feldtyp: 'text', pflicht: false, bereich: 'gesundheit' }] };
  const gutesJws = await signiertesTemplateJws(V, gutesTemplate, SENTINEL_PRIVATE_JWK);
  const boesesJws = await signiertesTemplateJws(V, boesesTemplate, FREMD_PRIVATE_JWK);   // falscher Schlüssel

  const zeilen = [
    { nr: 1, gueltig: true, bestaetigt: true, daten: { anbieterId: 'institution/gut-de', anbieterName: 'Gut', anbieterTyp: 'institution/x-de', publicKeyJwk: SENTINEL_PUBLIC_JWK, templates: [gutesTemplate], templatesJws: [gutesJws], submissionId: 's1' } },
    { nr: 2, gueltig: true, bestaetigt: true, daten: { anbieterId: 'institution/boese-de', anbieterName: 'Böse', anbieterTyp: 'institution/x-de', publicKeyJwk: SENTINEL_PUBLIC_JWK, templates: [boesesTemplate], templatesJws: [boesesJws], submissionId: 's2' } },
  ];
  const key = await webcrypto.subtle.importKey('jwk', SENTINEL_PRIVATE_JWK, { name: 'Ed25519' }, false, ['sign']);
  const lauf = await V.stapelAusstellen(zeilen, (vc) => V.stelleProviderCredentialAus(vc, key), {});
  assert.equal(lauf.ausgestellt, 1);
  assert.equal(lauf.uebersprungen, 1);
  assert.equal(lauf.zeilen[0].ausgestellt, true);
  assert.equal(lauf.zeilen[1].ausgestellt, false);
  assert.match(lauf.zeilen[1].grund, /Signatur/);
});

/* ── 4 · Größen-Disziplin ─────────────────────────────────────────────────── */
test('Größen-Disziplin — zu viele Vorlagen wird abgewiesen, die Fixture selbst bleibt unbeanstandet', () => {
  const { V } = ladeIssuer();
  assert.equal(V._pruefeGroessenDisziplin(beispielPaket()).length, 0);
  const p = beispielPaket();
  const einzelTemplate = p.templates[0];
  p.templates = new Array(V.SUBMISSION_MAX_TEMPLATES + 1).fill(einzelTemplate);
  const fehler = V._pruefeGroessenDisziplin(p);
  assert.equal(fehler.length, 1);
  assert.match(fehler[0], /zu viele Vorlagen/);
});

test('Größen-Disziplin — zu viele Unterfelder in einer Liste wird abgewiesen', () => {
  const { V } = ladeIssuer();
  const p = beispielPaket();
  p.templates[0].felder.push({
    feldname: 'Eine Liste', feldtyp: 'liste', pflicht: false, bereich: 'gesundheit',
    unterFelder: new Array(V.SUBMISSION_MAX_UNTERFELDER + 1).fill(0).map((_, i) => ({ feldname: 'u' + i, feldtyp: 'text' })),
  });
  const fehler = V._pruefeGroessenDisziplin(p);
  assert.equal(fehler.length, 1);
  assert.match(fehler[0], /zu viele Unterfelder/);
});

/* ── 5 · Reservierte Kennungen ────────────────────────────────────────────── */
test('Reservierte Kennungen — anbieterTyp darf nicht "vivodepot/ausgabestelle" beanspruchen', () => {
  const { V } = ladeIssuer();
  const p = beispielPaket();
  p.anbieter.anbieterTyp = V.AUSGABESTELLE_ANBIETERTYP;
  const fehler = V._pruefeReservierteKennungen(p);
  assert.equal(fehler.length, 1);
  assert.match(fehler[0], /Vivodepot selbst vorbehalten/);
});

test('Reservierte Kennungen — eine anbieterId, die zu nichts sluggt, wird abgewiesen', () => {
  const { V } = ladeIssuer();
  const p = beispielPaket();
  p.anbieter.anbieterId = '!!!';   // slugged zu '' — Namensraum-Härtung im Kern würde nie greifen
  const fehler = V._pruefeReservierteKennungen(p);
  assert.equal(fehler.length, 1);
  assert.match(fehler[0], /keinen brauchbaren Namensraum-Slug/);
});

test('Reservierte Kennungen — die Fixture selbst bleibt unbeanstandet', () => {
  const { V } = ladeIssuer();
  assert.equal(V._pruefeReservierteKennungen(beispielPaket()).length, 0);
});
