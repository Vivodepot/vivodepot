'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Test — modulpruefung-ampel.js, das fehlende Verdikt der automatisierten
   Modulprüfung (Auftrag, 04.09.2026, über 2).
   ────────────────────────────────────────────────────────────────────────────
   Fünf Auflagen, alle mit eigener Probe:
   1) der Exit-Code selbst wird geprüft, in beiden Richtungen (echter Subprozess).
   2) konservativ im Zweifel, ausnahmslos — jeder ungeklärte Fall landet bei mensch-noetig.
   3) Fassungsvergleich, drei Fälle (keine Vorgängerfassung / echt höher / gleich-oder-niedriger).
   4) Anbieterwechsel ist nie automatisch sicher.
   5) zwei Fixturen (sauber + auffällig) — nicht eine, sonst verrottet der rote Zweig unbemerkt.

   Wegwerf-Anbieter-Schlüssel je Test, KEY tabu — dieselbe Bauart wie
   tests/modul-einlassen-geprueft.test.js.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ladeKern, webcrypto } = require('./load-kern.js');
const {
  pruefeEinreichung, fixturen, GRENZEN, SENTINEL_PUBLIC_JWK, FIXTUR_OPTS,
} = require('../tools/modulpruefung-ampel.js');

const WERKZEUG = path.join(__dirname, '..', 'tools', 'modulpruefung-ampel.js');
const REGISTER = 'ampel-test-register';

async function neuerAnbieter() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return {
    pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey),
    privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey),
  };
}

async function signiertesBuendel(V, anbieter, anbieterId, modul) {
  const cert = {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId, anbieterTyp: 'institution/test', anbieterName: 'Test-Anbieter', publicKeyJwk: anbieter.pubJwk },
  };
  const ankerKey = await V._jwsImportSignKey({
    kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
    d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE', x: SENTINEL_PUBLIC_JWK.x,
    key_ops: ['sign'], ext: true,
  });
  const providerCredentialJws = await V._signJWS(cert, ankerKey, {});
  const anbieterKey = await V._jwsImportSignKey(anbieter.privJwk);
  const modulSignaturJws = await V._signJWS(modul, anbieterKey, {});
  return JSON.stringify({ providerCredentialJws, modulSignaturJws });
}

function bereichsModul(moduleVersion, herkunft, extra) {
  return Object.assign({ modulTyp: 'bereich', moduleVersion, herkunft, sprache: 'de',
    bereiche: { 'ampel-test-rubrik': { label: 'Ampel-Test-Rubrik' } } }, extra || {});
}

test('[Ampel] sauberes Update (v1 → v2, gleicher Anbieter) ergibt automatisch-sicher', async () => {
  const { V } = ladeKern();
  const anbieter = await neuerAnbieter();
  const v1 = await signiertesBuendel(V, anbieter, 'anbieter-a', bereichsModul(1, REGISTER));
  const v2 = await signiertesBuendel(V, anbieter, 'anbieter-a', bereichsModul(2, REGISTER));
  const verdikt = await pruefeEinreichung(v2, v1, FIXTUR_OPTS);
  assert.equal(verdikt.verdikt, 'automatisch-sicher', JSON.stringify(verdikt));
});

test('[Ampel · Auflage 2, konservativ] unbekannter Schlüssel im Modul ergibt mensch-noetig, nie automatisch-sicher', async () => {
  const { V } = ladeKern();
  const anbieter = await neuerAnbieter();
  const v1 = await signiertesBuendel(V, anbieter, 'anbieter-a', bereichsModul(1, REGISTER));
  const v2mitFremdschluessel = await signiertesBuendel(V, anbieter, 'anbieter-a',
    bereichsModul(2, REGISTER, { boeserSchluessel: 'x' }));
  const verdikt = await pruefeEinreichung(v2mitFremdschluessel, v1, FIXTUR_OPTS);
  assert.equal(verdikt.verdikt, 'mensch-noetig');
  assert.ok(verdikt.gruende.some((g) => g.includes('boeserSchluessel')), JSON.stringify(verdikt));
});

test('[Ampel · Auflage 2, konservativ] kaputtes JSON ergibt mensch-noetig, wirft nie unabgefangen', async () => {
  const verdikt = await pruefeEinreichung('{das ist kein json', null, {});
  assert.equal(verdikt.verdikt, 'mensch-noetig');
  assert.ok(verdikt.gruende.length > 0);
});

test('[Ampel · Auflage 2, konservativ] unsigniertes Bündel ergibt mensch-noetig', async () => {
  const verdikt = await pruefeEinreichung(JSON.stringify(bereichsModul(1, REGISTER)), null, {});
  assert.equal(verdikt.verdikt, 'mensch-noetig');
});

test('[Ampel · Auflage 3a] keine Vorgängerfassung ⇒ Erstprüfung, ausdrücklich benannt, mensch-noetig', async () => {
  const { V } = ladeKern();
  const anbieter = await neuerAnbieter();
  const v1 = await signiertesBuendel(V, anbieter, 'anbieter-a', bereichsModul(1, REGISTER));
  const verdikt = await pruefeEinreichung(v1, null, FIXTUR_OPTS);
  assert.equal(verdikt.verdikt, 'mensch-noetig');
  assert.ok(verdikt.gruende.some((g) => g.includes('Erstprüfung')), JSON.stringify(verdikt));
});

test('[Ampel · Auflage 3c] moduleVersion gleich ⇒ Befund (Verwechslung), nicht automatisch-sicher', async () => {
  const { V } = ladeKern();
  const anbieter = await neuerAnbieter();
  const v1a = await signiertesBuendel(V, anbieter, 'anbieter-a', bereichsModul(1, REGISTER));
  const v1b = await signiertesBuendel(V, anbieter, 'anbieter-a', bereichsModul(1, REGISTER));
  const verdikt = await pruefeEinreichung(v1b, v1a, FIXTUR_OPTS);
  assert.equal(verdikt.verdikt, 'mensch-noetig');
  assert.ok(verdikt.gruende.some((g) => g.includes('Rücknahme') || g.includes('Verwechslung')), JSON.stringify(verdikt));
});

test('[Ampel · Auflage 3c] moduleVersion niedriger ⇒ Befund (Rücknahme), nicht automatisch-sicher', async () => {
  const { V } = ladeKern();
  const anbieter = await neuerAnbieter();
  const v2 = await signiertesBuendel(V, anbieter, 'anbieter-a', bereichsModul(2, REGISTER));
  const v1 = await signiertesBuendel(V, anbieter, 'anbieter-a', bereichsModul(1, REGISTER));
  const verdikt = await pruefeEinreichung(v1, v2, FIXTUR_OPTS);
  assert.equal(verdikt.verdikt, 'mensch-noetig');
});

test('[Ampel · Auflage 4] Anbieterwechsel zwischen den Fassungen ist NIE automatisch-sicher', async () => {
  const { V } = ladeKern();
  const anbieterA = await neuerAnbieter();
  const anbieterB = await neuerAnbieter();
  const v1 = await signiertesBuendel(V, anbieterA, 'anbieter-a', bereichsModul(1, REGISTER));
  const v2AndererAnbieter = await signiertesBuendel(V, anbieterB, 'anbieter-b', bereichsModul(2, REGISTER));
  const verdikt = await pruefeEinreichung(v2AndererAnbieter, v1, FIXTUR_OPTS);
  assert.equal(verdikt.verdikt, 'mensch-noetig');
  assert.ok(verdikt.gruende.some((g) => g.includes('Herausgeberwechsel') || g.includes('Übernahme') || g.includes('anbieter-a')),
    JSON.stringify(verdikt));
});

test('[Ampel · Auflage 4] Kennungswechsel (andere Herkunft) zwischen den Fassungen ist NIE automatisch-sicher', async () => {
  const { V } = ladeKern();
  const anbieter = await neuerAnbieter();
  const v1 = await signiertesBuendel(V, anbieter, 'anbieter-a', bereichsModul(1, REGISTER));
  const v2AndereHerkunft = await signiertesBuendel(V, anbieter, 'anbieter-a', bereichsModul(2, REGISTER + '-anders'));
  const verdikt = await pruefeEinreichung(v2AndereHerkunft, v1, FIXTUR_OPTS);
  assert.equal(verdikt.verdikt, 'mensch-noetig');
});

test('[Ampel] jedes Verdikt trägt dieselben, wörtlichen Grenzen — nicht nur Dokumentation', async () => {
  const verdikt = await pruefeEinreichung('kaputt', null, {});
  assert.deepEqual(verdikt.grenzen, GRENZEN);
  assert.ok(GRENZEN.some((g) => g.includes('fachliche')));
  assert.ok(GRENZEN.some((g) => g.includes('Anbieter-Identitaet')));
});

test('[Ampel · Auflage 5] die eingebauten Fixturen sind zwei, nicht eine — eine sauber, eine auffällig', async () => {
  const laeufe = await fixturen();
  assert.equal(laeufe.length, 2, 'Auflage 5: zwei Fixturen, sonst verrottet der rote Zweig unbemerkt');
  const ergebnisse = [];
  for (const lauf of laeufe) ergebnisse.push((await pruefeEinreichung(lauf.neu, lauf.vorherige, lauf.opts)).verdikt);
  assert.ok(ergebnisse.includes('automatisch-sicher'), 'mindestens eine Fixtur muss sauber durchgehen');
  assert.ok(ergebnisse.includes('mensch-noetig'), 'mindestens eine Fixtur muss auffallen');
});

/* Auflage 1 — der Exit-Code IST das Produkt. Echter Subprozess, echte Fixtur-Dateien, in
   BEIDEN Richtungen — eine Rot-Probe, die nur den Text der Gründe läse, hätte den einzigen
   Fehler des Vorgänger-Werkzeugs (main() läuft immer mit 0 durch) nicht gefangen. */
test('[Ampel · Auflage 1] Exit-Code 0 bei automatisch-sicher, echter Subprozess', async () => {
  const { V } = ladeKern();
  const anbieter = await neuerAnbieter();
  const v1 = await signiertesBuendel(V, anbieter, 'anbieter-a', bereichsModul(1, REGISTER));
  const v2 = await signiertesBuendel(V, anbieter, 'anbieter-a', bereichsModul(2, REGISTER));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ampel-exit-'));
  const neuDatei = path.join(tmp, 'neu.json'), altDatei = path.join(tmp, 'alt.json');
  fs.writeFileSync(neuDatei, v2); fs.writeFileSync(altDatei, v1);
  let exitCode = null;
  try {
    execFileSync('node', [WERKZEUG, '--vorlage', neuDatei, '--vorherige', altDatei], {
      env: Object.assign({}, process.env, { MODULPRUEFUNG_AMPEL_TEST_SENTINEL_ANKER: '1' }),
      stdio: 'pipe',
    });
    exitCode = 0;
  } catch (e) { exitCode = e.status; }
  assert.equal(exitCode, 0, 'ROT ERWARTET, wenn falsch: ein sauberes Update muss den Prozess mit Exit 0 beenden');
});

test('[Ampel · Auflage 1] Exit-Code ungleich 0 bei mensch-noetig, echter Subprozess', async () => {
  const { V } = ladeKern();
  const anbieter = await neuerAnbieter();
  const v1 = await signiertesBuendel(V, anbieter, 'anbieter-a', bereichsModul(1, REGISTER));
  const v2mitFremdschluessel = await signiertesBuendel(V, anbieter, 'anbieter-a',
    bereichsModul(2, REGISTER, { boeserSchluessel: 'x' }));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ampel-exit-'));
  const neuDatei = path.join(tmp, 'neu.json'), altDatei = path.join(tmp, 'alt.json');
  fs.writeFileSync(neuDatei, v2mitFremdschluessel); fs.writeFileSync(altDatei, v1);
  let exitCode = null;
  try {
    execFileSync('node', [WERKZEUG, '--vorlage', neuDatei, '--vorherige', altDatei], {
      env: Object.assign({}, process.env, { MODULPRUEFUNG_AMPEL_TEST_SENTINEL_ANKER: '1' }),
      stdio: 'pipe',
    });
    exitCode = 0;
  } catch (e) { exitCode = e.status; }
  assert.notEqual(exitCode, 0, 'ROT ERWARTET, wenn falsch: eine Auffälligkeit darf den Prozess NIE mit Exit 0 beenden');
});

test('[Ampel · Auflage 1, Gegenprobe] das ersetzte Werkzeug hätte diese Probe nicht bestanden', () => {
  // Dokumentiert den Fehler, den dieses Werkzeug schließt — kein Test des alten Werkzeugs
  // selbst (das bleibt unverändert für seinen eigenen, unveränderten Zweck bestehen).
  const alterQuelltext = fs.readFileSync(path.join(__dirname, '..', 'tools', 'einreichung-auffaelligkeiten-sammeln.js'), 'utf8');
  assert.ok(!/process\.exit/.test(alterQuelltext),
    'Beleg für den Auftrag: das bestehende Sammel-Werkzeug kennt bis heute keinen process.exit-Zweig — genau die Lücke, die modulpruefung-ampel.js schließt, nicht dupliziert.');
});
