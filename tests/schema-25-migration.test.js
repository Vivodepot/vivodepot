'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Schema 25 — E1–E3 (Datenmodell-Konzept v1.2 §3) + Verwaisungs-Regel
   ────────────────────────────────────────────────────────────────────────
   E2: impfungen/implantate verloren ihre Stub-Code-Slots; ein je entstandener
   codierter Wert (praktisch unmöglich — leere Stub-Listen) wird defensiv auf
   seinen anzeigeName-Klartext geflacht. E3: laborwerte/labor-Sektion entfallen;
   Altbestand bleibt nach der VERWAISUNGS-REGEL unsichtbar im Depot erhalten
   (Bürgerdaten werden durch Migration nie gelöscht; Rendern ist definitions-
   getrieben, ein Orphan-Anzeige-Feature ist ausdrücklich NICHT verordnet).
   Struktur-Pins E1–E3 an der Sektor-Definition: tests/sektoren-spec.test.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Schema 25 / E2] Defensiv-Flachlegung: codierter Alt-Wert auf impfungen/implantate → anzeigeName-Klartext', () => {
  const { V } = ladeKern();
  const alt = V.leeresDepot();
  alt.schemaVersion = 24;
  alt.sektoren.gesundheit = {
    impfungen:  { code: '871751006', system: 'http://snomed.info/sct', anzeigeName: 'Tetanus-Impfstoff' },
    implantate: { code: '304120007', system: 'http://snomed.info/sct', anzeigeName: 'Hüft-Totalendoprothese' },
    // Lebender Slot (Generator liest ihn, IPS-Pflichtsektion) — darf NICHT flachen:
    krankheiten: { code: 'E11', system: 'ICD-10-GM', anzeigeName: 'Diabetes mellitus Typ 2' },
  };
  V.depotNormalisieren(alt);
  assert.equal(alt.schemaVersion, V.SCHEMA_VERSION_AKTUELL, '24 -> 39 gehoben (durch 25, 37->38 Chip-Mechanik, 38->39 Vorsorge-Instrument-Liste hindurch)');
  assert.equal(alt.sektoren.health.vaccinations, 'Tetanus-Impfstoff', 'verlustfrei geflacht (Klartext bleibt)');
  assert.equal(alt.sektoren.health.implantsProsthesesPacemakers, 'Hüft-Totalendoprothese', 'verlustfrei geflacht (Klartext bleibt)');
  // Chip-Mechanik (E1 Option C, Schema 37->38): krankheiten ist ein lebender Slot — der codierte
  // Alt-Wert bleibt codiert, wandert aber (wie jeder Alt-Wert) in EINEN Chip, nicht mehr ins alte
  // Singular-Objekt-Format. Nur die zwei Stub-Felder (impfungen/implantate) flachen auf Klartext.
  assert.ok(Array.isArray(alt.sektoren.health.chronicConditionsDiagnoses), 'krankheiten ist ein Chip-Array');
  assert.equal(alt.sektoren.health.chronicConditionsDiagnoses.length, 1);
  assert.equal(alt.sektoren.health.chronicConditionsDiagnoses[0].text, 'Diabetes mellitus Typ 2');
  assert.equal(alt.sektoren.health.chronicConditionsDiagnoses[0].code.code, 'E11', 'Code bleibt erhalten — nur die zwei Stub-Felder flachen');
});

test('[Schema 25 / E3] Verwaisungs-Regel: laborwerte-Altbestand bleibt unsichtbar erhalten — kein Löschen, idempotent', () => {
  const { V } = ladeKern();
  const alt = V.leeresDepot();
  alt.schemaVersion = 24;
  const messungen = [{ analyt: 'hb', wert: '14,2', einheit: 'g/dL', ref_low: '12', ref_high: '16', datum: '2026-05-01' }];
  alt.sektoren.gesundheit = { laborwerte: messungen.map(m => Object.assign({}, m)) };
  V.depotNormalisieren(alt);
  assert.equal(alt.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
  assert.deepEqual(alt.sektoren.health.laborwerte, messungen, 'Bürgerdaten werden durch Migration nie gelöscht');
  // „unsichtbar": keine Felddefinition mehr → keine Anzeige (definitions-getriebenes Rendern).
  const felder = V.SEKTOR_BY_ID.health.sektionen.reduce((a, s) => a.concat(s.felder), []);
  assert.ok(!felder.find(f => f.id === 'laborwerte'), 'keine Felddefinition -> Verwaisung, kein Orphan-Render-Feature');
  // Idempotenz: zweiter Lauf ändert nichts.
  V.depotNormalisieren(alt);
  assert.deepEqual(alt.sektoren.health.laborwerte, messungen, 'zweiter Lauf ändert nichts');
  assert.equal(alt.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
});

test('[Schema 25 / E3] Export-Format fhir-lab abgewickelt — der IMPORT-Weg fhir-lab (Klasse-4-Erkennung) lebt', () => {
  const { V } = ladeKern();
  assert.equal(V.EXPORT_FORMAT_BY_ID['fhir-lab'], undefined, 'E3: kein self-erzeugter Laborbericht-Export mehr');
  assert.ok(!V.EXPORT_FORMATE.find(f => f.id === 'fhir-lab'), 'auch nicht in der Registry-Liste');
  assert.ok(V.IMPORT_FORMAT_BY_ID['fhir-lab'], 'Kollisions-Warnung beachtet: autoritative Klasse-4-Erkennung (U2-ADR-045/048) unberührt');
  // E2 traf BEIDE Orte des Markers: Sektor-Feld (sektoren-spec) UND anamwiz-Wizard-Schritt (hier).
  const anam = V.WIZARD_BY_ID.anamwiz;
  const schritt = (anam.schritte || []).find(s => s.feld && s.feld.id === 'vaccinations');
  assert.ok(schritt && !schritt.feld.codeListe, 'anamwiz-impfungen-Schritt ohne codeListe-Stub');
});
