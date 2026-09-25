'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — FHIR-IPS-Export: Geburtsdatum-Pflicht am EXPORT (nicht am Eintritt)
   ────────────────────────────────────────────────────────────────────────
   `Patient.birthDate` ist IPS-Pflicht (1..1) — ohne sie validiert das Bundle
   nicht gegen hl7.fhir.uv.ips#2.0.0 (Folge-Errors + Bundle-Slice). Statt das
   Geburtsdatum am Onboarding zu erzwingen (Niedrigschwelligkeit bliebe nicht
   erhalten), greift die Pflicht erst beim FHIR-IPS-Export: fehlt sie, kommt ein
   freundlicher, nicht-blockierender Hinweis (ui.modal) mit „Jetzt ergänzen" →
   Bereich Identität (gleiche Brücke wie D37 „Name ergänzen", gleiche Stelle wie
   die Provenienz-Namens-Brücke U2-ADR-017). Builder (fhirIpsBundle) bleibt rein.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'geb-test-pw';

test('[T3-GEB] depotHatGeburtsdatum: leer → false, ungültig → false, ISO-Datum → true', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  assert.equal(V.depotHatGeburtsdatum(), false, 'frisch ohne Geburtsdatum');
  V.sektorFeldSetzen('identity', 'birthDate', '1965');           // unvollständig
  assert.equal(V.depotHatGeburtsdatum(), false, 'kein valides ISO-Datum');
  V.sektorFeldSetzen('identity', 'birthDate', '1965-04-23');     // valide
  assert.equal(V.depotHatGeburtsdatum(), true, 'valides ISO-Datum');
});

test('[T3-GEB] „Jetzt ergänzen" führt in den Bereich Identität (Brücke wie D37)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.flowFhirGeburtsdatumErgaenzen();
  const vs = V.getViewState();
  assert.equal(vs.aktiverSektorId, 'identity', 'navigiert in den Identitäts-Bereich');
  assert.equal(vs.aktiveAnsicht, 'sektor', 'Bereichs-Sicht');
});

test('[T3-GEB] Export-Guard: ohne Geburtsdatum Hinweis-Modal, mit Geburtsdatum kein Hinweis', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('B');
  V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
  const modalInhalt = () => document.getElementById('modal-inhalt').innerHTML;

  // ohne Geburtsdatum → der Guard zeigt das Hinweis-Modal (kein Übersichts-/Download-Pfad).
  V.flowGesundheitFhirExport({});                          // optionen-Pfad (überspringt Übersicht)
  assert.ok(modalInhalt().includes('Geburtsdatum benötigt'), 'ohne Geburtsdatum: Hinweis-Modal erscheint');

  // Modal-Inhalt zurücksetzen; mit Geburtsdatum darf KEIN Hinweis mehr kommen (Export läuft).
  document.getElementById('modal-inhalt').innerHTML = '';
  V.sektorFeldSetzen('identity', 'birthDate', '1965-04-23');
  V.flowGesundheitFhirExport({});
  assert.ok(!modalInhalt().includes('Geburtsdatum benötigt'), 'mit Geburtsdatum: kein Hinweis, Export-Pfad läuft');
});

test('[T3-GEB] Guard ist im Export-Flow verdrahtet (vor der Übersicht)', () => {
  const { src } = ladeKern();
  // Der Guard muss in flowGesundheitFhirExport stehen: Prädikat + Hinweis + früher return.
  assert.ok(/!depotHatGeburtsdatum\(\)[\s\S]{0,160}?ui\.modal/.test(src), 'fehlendes Geburtsdatum → ui.modal-Hinweis');
  assert.ok(/onPrimaer:[\s\S]{0,80}?flowFhirGeburtsdatumErgaenzen\(\)/.test(src), '„Jetzt ergänzen" → Identitäts-Brücke');
});
