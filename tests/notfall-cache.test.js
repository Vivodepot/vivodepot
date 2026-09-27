'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Rücknahme des passwortlosen Stufe-1-Cache (U2-ADR-078)
   ────────────────────────────────────────────────────────────────────────
   Der passwortlose `notfallCache` ist ERSATZLOS entfernt. Diese Datei pinnt die
   Rücknahme: der Umschlag trägt KEIN Klartext-Geschwister mehr, KEIN Art-9-Feld
   liegt im Klartext, die Cache-Funktionen sind weg, und ein Alt-Umschlag mit
   Cache wird beim Laden als ungespeichert markiert (Migrations-Nudge). Die
   Bürger-Live-Notfallsicht (renderNotfall, hinter dem Passwort) bleibt.
   Historie: ADR-099/109 (Stufe-1-Plain-Cache), zurückgenommen U2-ADR-078.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

test('1) [U2-ADR-078] Umschlag trägt KEIN notfallCache-Klartext-Geschwister mehr', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
  const u = await V.depotSerialisieren();
  assert.equal('notfallCache' in u, false, 'kein notfallCache-Sibling im Umschlag');
});

test('2) [U2-ADR-078] KEIN Art-9-Feld liegt im Klartext der gespeicherten Datei (Kernzusage)', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
  V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: 'Ramipril 5 mg' }]);
  V.sektorFeldSetzen('health', 'chronicConditionsDiagnoses', [{ text: 'Diabetes mellitus Typ 2' }]);
  const u = await V.depotSerialisieren();
  const ohneCt = JSON.stringify({ ...u, ct: '' });   // alles AUSSER dem Ciphertext
  assert.ok(!ohneCt.includes('Penicillin'), 'Allergien nicht im Klartext');
  assert.ok(!ohneCt.includes('Ramipril'), 'Medikamente nicht im Klartext');
  assert.ok(!ohneCt.includes('Diabetes'), 'Diagnosen nicht im Klartext');
  // „Ohne Passwort ist die Datei nicht lesbar" ist damit wieder wahr.
});

test('3) [U2-ADR-078] die Cache-Funktionen sind entfernt (nicht mehr exportiert)', async () => {
  const { V } = await frischMitDepot();
  assert.equal(typeof V.notfallCacheBauen, 'undefined', 'notfallCacheBauen entfernt');
  assert.equal(typeof V.notfallCacheAusUmschlag, 'undefined', 'notfallCacheAusUmschlag entfernt');
  assert.equal(typeof V.flowNotfallAusDatei, 'undefined', 'passwortlose Tür entfernt');
});

test('4) [U2-ADR-078] Migrations-Nudge: ein Alt-Umschlag MIT notfallCache wird beim Laden ungespeichert markiert', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  const u = await V.depotSerialisieren();
  // simuliere einen VOR-078-Umschlag: klebe ein Alt-Cache-Geschwister an
  const alt = { ...u, notfallCache: { stand: '2026-01-01T00:00:00.000Z', zeilen: [{ label: 'Vorname', wert: 'Maria' }] } };
  V.markiereGespeichert();                              // Zähler zunächst auf 0
  assert.equal(V.istUngespeichert(), false);
  const wieder = await V.depotLaden(alt, PW);
  assert.equal(wieder.sektoren.identity.givenName, 'Maria', 'Daten laden normal');
  assert.equal(V.istUngespeichert(), true, 'Alt-Cache erkannt → als ungespeichert markiert (nächster Save schreibt sauber)');
});

test('5) [U2-ADR-078] ein SAUBERER Umschlag (ohne Cache) markiert NICHT ungespeichert', async () => {
  const { V } = await frischMitDepot();
  const u = await V.depotSerialisieren();               // schon ohne notfallCache
  V.markiereGespeichert();
  await V.depotLaden(u, PW);
  assert.equal(V.istUngespeichert(), false, 'sauberer Umschlag → kein Nudge');
});

test('6) renderNotfall zeigt die Felder LIVE aus dem offenen Depot (hinter dem Passwort)', async () => {
  const { V, document } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  V.renderNotfall();
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes(V.STRINGS.notfallCacheTitel), 'Notfall-Titel');
  assert.ok(html.includes('Maria'), 'Wert sichtbar');
  assert.ok(html.includes('A +'), 'Blutgruppe sichtbar');
});

test('7) renderNotfall ohne Daten → klarer Leer-Hinweis, kein Crash', async () => {
  const { V, document } = await frischMitDepot();
  V.renderNotfall();
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes(V.STRINGS.notfallCacheLeer));
});

test('8) renderNotfall bietet Notfallkarte + QR (Live-Sicht, immer)', async () => {
  const { V, document } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.renderNotfall();
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('id="n-karte"'), 'Notfallkarten-Knopf da');
  // (QR-Knopf nur, wenn die qrcode-Lib im Kontext vorhanden ist — im Headless ggf. nicht.)
});

test('9) Roundtrip unberührt: depotLaden liefert die vollen Daten zurück', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('finance', 'companyPensionPolicyNumber', 'DE123');
  const u = await V.depotSerialisieren();
  const wieder = await V.depotLaden(u, PW);
  assert.equal(wieder.sektoren.identity.givenName, 'Maria');
  assert.equal(wieder.sektoren.finance.companyPensionPolicyNumber, 'DE123');
});
