'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Sicherheit Block C: eingehende Verifikation Ebene 3a (Krypto-Gutachten/Trust-Ebenen)
   ────────────────────────────────────────────────────────────────────────
   Negativ-Tests im Muster „Angriff konstruieren → ausführen → beweisen, dass er
   scheitert". Der „Angriff" ist jeweils ein gefälschtes/manipuliertes Anbieter-
   Zertifikat, das versucht, seine Claims OHNE gültige Signatur in das Depot zu
   bringen. Erwartung: importPlanGeprueft lehnt ab (ungueltig, 0 Zeilen) — Claims
   werden NICHT übernommen. Nur ein gegen den eingebetteten Trust-Authority-Key
   (Test-Sentinel) gültig signiertes Zertifikat wird akzeptiert.

   Abgrenzung: Ebene 3a = EIGENE Anbieter-Zertifikate (signiert:true). Ebene 3b =
   Fremd-Credentials (EAA / externe Aussteller, z. B. die sd-jwt-vc-Formate) — die
   bleiben unberührt (eigene Trust-Liste/Governance, nicht im Scope dieses Blocks).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// ⚠ TEST-ONLY: Private-Key zum eingebetteten TEST_SENTINEL_PUBLIC_JWK (wie in vc-issuer.test.js).
// Der produktive Trust-Authority-Private-Key liegt NICHT im Code; dieser existiert nur in der Suite.
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
// Public-Teil des Sentinels — als Test-Anker über opts.ankerJwk injiziert (Laufzeit nutzt den Produktiv-Anker).
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = { jetzt: '2026-06-19T00:00:00Z', ankerJwk: SENTINEL_PUBLIC_JWK };   // fixer Prüfzeitpunkt + Test-Anker-Injektion

// Ein VivodepotProviderCredential (W3C VC) mit zwei attestierten Feldern im credentialSubject.
function providerVC(expirationDate) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2', 'https://vivodepot.de/credentials/v1'],
    type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de',
    issuanceDate: '2026-05-31T12:00:00Z',
    expirationDate: expirationDate || '2027-11-30T12:00:00Z',
    credentialSubject: { felder: [
      { sektor: 'health', feld: 'bloodType', wert: '0+' },
      { sektor: 'identity', feld: 'givenName', wert: 'GepruefteQuelle' },
    ] },
  };
}
async function frischMitSignKey() {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  const signKey = await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  return { V, signKey };
}

// Ebene 3a — POSITIV-Anker: nur ein gültig signiertes Zertifikat wird akzeptiert,
// erst danach werden Claims zu Plan-Zeilen.
test('C-Positiv: gültig gegen den Test-Sentinel signiertes Zertifikat wird akzeptiert (Claims übernommen)', async () => {
  const { V, signKey } = await frischMitSignKey();
  const jws = await V._signJWS(providerVC(), signKey, {});
  // Gegenprobe: die Inhalts-Erkennung findet das signierte Format am JWS-Compact.
  assert.equal(V.importFormatErkennen(jws, null), 'provider-credential', 'JWS-Compact wird als signiertes Anbieter-Zertifikat erkannt');
  const plan = await V.importPlanGeprueft('provider-credential', jws, JETZT);
  assert.equal(plan.ungueltig, false, 'gültiges Zertifikat → Plan ist gültig');
  assert.equal(plan.zeilen.length, 2, 'beide attestierten Felder sind im Plan');
  // End-to-end: die geprüften Claims landen tatsächlich im Depot.
  const z = V.importAnwenden(plan, { alleKonflikte: true });
  assert.equal(z.gesetzt, 2, 'genau die zwei geprüften Felder werden gesetzt');
});

// Befund 3a-1 — defekte Signatur: ein Bit der Signatur gekippt → Verifikation MUSS scheitern.
test('C-Negativ-1: gekippte Signatur → abgelehnt, keine Claims übernommen', async () => {
  const { V, signKey } = await frischMitSignKey();
  const jws = await V._signJWS(providerVC(), signKey, {});
  const teile = jws.split('.');
  teile[2] = teile[2].slice(0, -2) + (teile[2].slice(-2) === 'AA' ? 'BB' : 'AA');   // Signatur verfälschen
  const plan = await V.importPlanGeprueft('provider-credential', teile.join('.'), JETZT);
  assert.equal(plan.ungueltig, true, 'defekte Signatur → ungültig (Angriff scheitert)');
  assert.equal(plan.zeilen.length, 0, 'keine Claims übernommen');
  assert.match(plan.grund, /Signatur ungültig/);
});

// Befund 3a-2 — alg:none / Algorithmus-Confusion: Header behauptet „none", keine Signatur.
test('C-Negativ-2: alg:none → abgelehnt (alg-Mismatch, keine Confusion)', async () => {
  const { V, signKey } = await frischMitSignKey();
  const jws = await V._signJWS(providerVC(), signKey, {});
  const payloadTeil = jws.split('.')[1];
  const headerNone = V._jwsB64uFromString(JSON.stringify({ alg: 'none', typ: 'vc+jwt' }));
  const gefaelscht = headerNone + '.' + payloadTeil + '.';   // leere Signatur, alg=none
  const plan = await V.importPlanGeprueft('provider-credential', gefaelscht, JETZT);
  assert.equal(plan.ungueltig, true, 'alg:none → ungültig (Angriff scheitert)');
  assert.equal(plan.zeilen.length, 0, 'keine Claims übernommen');
  assert.match(plan.grund, /alg-Mismatch|none/);
});

// Befund 3a-3 — manipulierte Nutzlast: Feldwert nachträglich geändert, alte Signatur behalten.
test('C-Negativ-3: manipulierte Nutzlast → abgelehnt, gefälschter Wert nicht übernommen', async () => {
  const { V, signKey } = await frischMitSignKey();
  const jws = await V._signJWS(providerVC(), signKey, {});
  const teile = jws.split('.');
  const payload = JSON.parse(V._jwsB64uToString(teile[1]));
  payload.credentialSubject.felder[0].wert = 'AB-';            // Blutgruppe fälschen
  teile[1] = V._jwsB64uFromString(JSON.stringify(payload));    // neue Nutzlast, Signatur unverändert
  const plan = await V.importPlanGeprueft('provider-credential', teile.join('.'), JETZT);
  assert.equal(plan.ungueltig, true, 'manipulierte Nutzlast → ungültig (Angriff scheitert)');
  assert.equal(plan.zeilen.length, 0, 'gefälschter Wert wird NICHT übernommen');
  assert.match(plan.grund, /Signatur ungültig/);
});

// Befund 3a-4 — abgelaufenes Zertifikat: gültig signiert, aber expirationDate in der Vergangenheit.
test('C-Negativ-4: abgelaufenes Zertifikat → abgelehnt', async () => {
  const { V, signKey } = await frischMitSignKey();
  const jws = await V._signJWS(providerVC('2026-01-01T00:00:00Z'), signKey, {});   // gültig signiert, aber abgelaufen
  const plan = await V.importPlanGeprueft('provider-credential', jws, JETZT);
  assert.equal(plan.ungueltig, true, 'abgelaufen → ungültig (Angriff scheitert)');
  assert.equal(plan.zeilen.length, 0, 'keine Claims übernommen');
  assert.match(plan.grund, /abgelaufen/);
});

// Befund 3a-5 — blanke JSON-Claims statt signiertem Compact: dürfen nicht durchrutschen.
test('C-Negativ-5: blanke JSON-Claims (kein signierter Compact) → abgelehnt', async () => {
  const { V } = await frischMitSignKey();
  const plan = await V.importPlanGeprueft('provider-credential', JSON.stringify(providerVC()), JETZT);
  assert.equal(plan.ungueltig, true, 'unsignierte JSON-Claims → ungültig (Angriff scheitert)');
  assert.equal(plan.zeilen.length, 0, 'keine Claims übernommen');
  assert.match(plan.grund, /Compact/);
});

// Fail-closed — der synchrone importPlan darf signierte Formate NIE roh nehmen (Bypass-Schutz).
test('C-Negativ-6: synchroner importPlan verweigert signierte Formate (fail-closed)', async () => {
  const { V, signKey } = await frischMitSignKey();
  const jws = await V._signJWS(providerVC(), signKey, {});
  const plan = V.importPlan('provider-credential', jws);   // direkter, ungeprüfter Pfad
  assert.equal(plan.ungueltig, true, 'sync importPlan nimmt signierte Formate nicht roh an');
  assert.equal(plan.zeilen.length, 0, 'kein Claim ohne Prüfpfad');
  assert.match(plan.grund, /signiert/);
});
