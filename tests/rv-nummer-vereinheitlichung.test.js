'use strict';
/* ════════════════════════════════════════════════════════════════════════
   rv-nummer-vereinheitlichung.test.js — „Die Rentenversicherungs-
   nummer wird aufgelöst" (14.08.2026)
   ────────────────────────────────────────────────────────────────────────
   finanzen.dt_rentenversicherungsnr und sozialversicherung.rentenversicherungsnummer
   waren zwei Felder für denselben Sachverhalt (beide auf social_insurance_number
   gemappt, in zwei verschiedenen VCs — Auftrag „Die W-8-Klassifikation richtigstellen",
   13.08.2026). sozialversicherung.rentenversicherungsnummer bleibt das einzige Feld;
   finanzen zeigt es fortan als Cross-Sektor-Lese-Sicht (CROSS_SEKTOR_FELDER).

   Vier Fälle, Schema 62 -> 63:
   - nur finanzen befüllt          -> Wert wandert nach sozialversicherung
   - nur sozialversicherung befüllt -> unverändert
   - beide befüllt, GLEICHER Wert  -> zusammengeführt, KEIN Rettungsfeld
   - beide befüllt, VERSCHIEDENER Wert -> sozialversicherung behält ihren Wert,
     der finanzen-Wert geht ins Rettungsfeld dt_rentenversicherungsnr_frueher
     (Verwaisungs-Regel, U2-ADR-050) — nicht stillschweigend überschrieben.

   Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `sozialversicherung.rentenversicherungsnummer`
   ist seither die mehrwertige Liste `pensionInsuranceNumbers` (Unterfeld `pensionInsuranceNumber`, vor dem Kennungs-Umbau `nr`) — dieselbe Migration
   (Schema 62->63) läuft weiterhin zuerst und schreibt noch den alten Skalar-Feldnamen; die neue,
   unbedingt laufende `_korb1MehrwertigMigrieren` greift IM SELBEN `depotNormalisieren`-Aufruf
   danach und hebt ihn in die Liste. Die Proben unten prüfen darum den Endzustand NACH beiden
   Migrationen (die Liste), nicht den Zwischenstand.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[RV-Vereinheitlichung] nur finanzen befüllt — Wert wandert nach sozialversicherung', () => {
  const { V } = ladeKern();
  const alt = V.leeresDepot();
  alt.schemaVersion = 62;
  alt.sektoren.finanzen = { dt_rentenversicherungsnr: '12 345678 A 123' };
  V.depotNormalisieren(alt);
  assert.equal(alt.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
  assert.equal(alt.sektoren.socialInsurance.pensionInsuranceNumbers[0].pensionInsuranceNumber, '12 345678 A 123');
  assert.equal(alt.sektoren.finance.dt_rentenversicherungsnr, '', 'finanzen führt das Feld nicht mehr eigenständig');
  assert.ok(!alt.sektoren.finance.dt_rentenversicherungsnr_frueher, 'kein Widerspruch — kein Rettungsfeld nötig');
});

test('[RV-Vereinheitlichung] nur sozialversicherung befüllt — unverändert', () => {
  const { V } = ladeKern();
  const alt = V.leeresDepot();
  alt.schemaVersion = 62;
  alt.sektoren.sozialversicherung = { rentenversicherungsnummer: '65 120358 A 456' };
  V.depotNormalisieren(alt);
  assert.equal(alt.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
  assert.equal(alt.sektoren.socialInsurance.pensionInsuranceNumbers[0].pensionInsuranceNumber, '65 120358 A 456');
  assert.ok(!alt.sektoren.finance || !alt.sektoren.finance.dt_rentenversicherungsnr_frueher);
});

test('[RV-Vereinheitlichung] beide befüllt, GLEICHER Wert (nur Formatierung anders) — zusammengeführt, kein Rettungsfeld', () => {
  const { V } = ladeKern();
  const alt = V.leeresDepot();
  alt.schemaVersion = 62;
  alt.sektoren.finanzen = { dt_rentenversicherungsnr: '12 345678 A 123' };
  alt.sektoren.sozialversicherung = { rentenversicherungsnummer: '12345678a123' };
  V.depotNormalisieren(alt);
  assert.equal(alt.sektoren.socialInsurance.pensionInsuranceNumbers[0].pensionInsuranceNumber, '12345678a123', 'sozialversicherung behält ihren eigenen Wert');
  assert.equal(alt.sektoren.finance.dt_rentenversicherungsnr, '');
  assert.ok(!alt.sektoren.finance.dt_rentenversicherungsnr_frueher, 'gleicher Wert ist kein Widerspruch — kein Rettungsfeld');
});

test('[RV-Vereinheitlichung·Rotmachbarkeit] beide befüllt, VERSCHIEDENER Wert — sozialversicherung bleibt, finanzen-Wert wird gerettet', () => {
  const { V } = ladeKern();
  const alt = V.leeresDepot();
  alt.schemaVersion = 62;
  alt.sektoren.finanzen = { dt_rentenversicherungsnr: '12 345678 A 123' };
  alt.sektoren.sozialversicherung = { rentenversicherungsnummer: '65 120358 A 456' };
  V.depotNormalisieren(alt);
  assert.equal(alt.sektoren.socialInsurance.pensionInsuranceNumbers[0].pensionInsuranceNumber, '65 120358 A 456',
    'ROT ERWARTET, wenn falsch: der sozialversicherung-Wert darf nicht überschrieben werden');
  assert.equal(alt.sektoren.finance.dt_rentenversicherungsnr, '');
  assert.equal(alt.sektoren.finance.dt_rentenversicherungsnr_frueher, '12 345678 A 123',
    'ROT ERWARTET, wenn falsch: der abweichende finanzen-Wert darf nicht kommentarlos verschwinden');
});

test('[RV-Vereinheitlichung] weder Feld befüllt — no-op', () => {
  const { V } = ladeKern();
  const alt = V.leeresDepot();
  alt.schemaVersion = 62;
  V.depotNormalisieren(alt);
  assert.equal(alt.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
  assert.ok(!alt.sektoren.socialInsurance || !alt.sektoren.socialInsurance.pensionInsuranceNumberssnummer);
});

test('[RV-Vereinheitlichung] idempotent — zweiter Lauf verändert nichts mehr', () => {
  const { V } = ladeKern();
  const alt = V.leeresDepot();
  alt.schemaVersion = 62;
  alt.sektoren.finanzen = { dt_rentenversicherungsnr: '12 345678 A 123' };
  alt.sektoren.sozialversicherung = { rentenversicherungsnummer: '65 120358 A 456' };
  V.depotNormalisieren(alt);
  const nachErstemLauf = JSON.stringify(alt.sektoren);
  V.depotNormalisieren(alt);
  assert.equal(JSON.stringify(alt.sektoren), nachErstemLauf, 'zweiter Lauf darf das Rettungsfeld nicht erneut befüllen oder verwerfen');
});

test('[RV-Vereinheitlichung] Cross-Sektor-Anzeige: finanzen zeigt den Wert aus sozialversicherung als Lese-Sicht', () => {
  const { V } = ladeKern();
  // Schnitt Glied 3 (U2-ADR-161): das Feld heißt seither `pensionInsuranceNumbers` (Liste).
  const eintrag = V.CROSS_SEKTOR_FELDER.find((e) =>
    e.quelle === 'socialInsurance' && e.feld === 'pensionInsuranceNumbers' && e.ziel === 'finance');
  assert.ok(eintrag, 'crossSektorAnmelden fehlt für rentenversicherung -> finanzen');
});
