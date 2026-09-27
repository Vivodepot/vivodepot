'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Anamnese-Wizard (Welle 2, anamwiz)
   ────────────────────────────────────────────────────────────────────────
   anamwiz hat Ziel Sektor 'gesundheit' (B5). Er nutzt die Paket-3-Code-Listen
   (icd10/snomedAllergen/atc; der impfungen-Schritt ist seit E2 reiner Freitext —
   Stub-Slot entfernt, Datenmodell-Konzept v1.2 par.3). Coded UND Freitext landen
   in denselben Feldern wie die manuelle Eingabe.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw', ANKER = 'anker-pw', SUB = 'sub-pw';
async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

test('1) anamwiz registriert; Ziel gesundheit; Felder existieren; Code-Listen-Schritte markiert', async () => {
  const { V } = await frischMitDepot();
  const def = V.WIZARD_BY_ID.anamwiz;
  assert.ok(def, 'anamwiz registriert');
  assert.equal(def.ziel.sektor, 'health');
  const ids = V.SEKTOR_BY_ID.health.sektionen.flatMap(s => s.felder).map(f => f.id);
  for (const s of def.schritte) assert.ok(ids.includes(s.feld.id), 'B5-Feld vorhanden: ' + s.feld.id);
  // Code-Listen sind angedockt
  const mitCode = def.schritte.filter(s => s.feld.codeListe).map(s => s.feld.codeListe);
  assert.ok(mitCode.includes('icd10') && mitCode.includes('snomedAllergen') && mitCode.includes('atc'),
    'icd10/snomedAllergen/atc als Code-Listen-Schritte');
});

test('2) Roundtrip: Freitext landet im Feld; codierter Wert (exakter Treffer) wird als Code gespeichert', async () => {
  const { V } = await frischMitDepot();
  // Freitext-Eingabe
  V.wizardSchrittSetzen('anamwiz', 3, 'Blinddarm 2008');                 // voroperationen
  V.wizardSchrittSetzen('anamwiz', 5, 'Vater Herzinfarkt');             // familienanamnese
  // Codierter Chip: exakter Treffer in icd10 → { text, code:{system,code} } (Chip-Mechanik E1 Option C)
  const chip = V.chipAusEingabe('icd10', 'Essentielle (primäre) Hypertonie');
  assert.ok(chip.code, 'chipAusEingabe liefert einen Chip mit Code');
  V.wizardSchrittSetzen('anamwiz', 0, [chip]);                          // krankheiten (icd10) — Chip-Array
  const d = V.getData();
  // U2-ADR-104: beide Felder sind LISTEN. Der Wizard-Schritt trägt ein eigenes Ziel
  // ({sektor, liste, unterfeld}) und schreibt in die erste Zeile — vorher schrieb er über
  // `sektorFeldSetzen` einen String, der die Liste überschrieben hätte.
  // Vergleich über eine Zeichenkette, NICHT deepEqual: der Kern läuft in einem eigenen
  // VM-Kontext, seine Arrays tragen einen fremden Prototyp — deepStrictEqual vergleicht den mit
  // und schlägt fehl, obwohl der Inhalt stimmt (Diff zeigt dann zwei identisch aussehende Arrays).
  assert.equal((d.sektoren.health.operationsProcedures || []).map(z => z.procedure).join('|'),
    'Blinddarm 2008', 'Wizard-Antwort landet als Listen-Eintrag im Unterfeld `procedure`');
  assert.equal((d.sektoren.health.familyMedicalHistory || []).map(z => z.condition).join('|'),
    'Vater Herzinfarkt', 'dito für `condition`');
  assert.ok(Array.isArray(d.sektoren.health.chronicConditionsDiagnoses), 'krankheiten als Chip-Array gespeichert');
  assert.equal(d.sektoren.health.chronicConditionsDiagnoses[0].code.code, 'I10');
  assert.equal(d.urheberschaft.health.operationsProcedures.length, 1, 'gestempelt');
});

test('3) Wiedereintritt: nach Eingabe trägt B5 die Werte; Startknopf in B5 adaptiv', async () => {
  const { V, document } = await frischMitDepot();
  assert.equal(V.wizardHatDaten('anamwiz'), false);
  V.wizardSchrittSetzen('anamwiz', 0, [{ text: 'Diabetes Typ 2' }]);   // Freitext-Chip (kein exakter Treffer → kein Code)
  assert.equal(V.wizardHatDaten('anamwiz'), true);
  V.betreteApp();
  V.oeffneSektor('health');
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('data-wizard-start="anamwiz"'), 'Startknopf vorhanden');
  assert.ok(html.includes(V.STRINGS.wizStartBearbeiten), 'vorhanden → bearbeiten');
});

test('4) Sub-Modus: anamwiz schreibt in den Sub-Inhalt, nicht in den Anker', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(ANKER);
  const e = await V.subDepotAnlegen({ bezeichnung: 'Depot Oma', inhaberin: 'Oma Erna', verwaltungsTyp: 'verwaltet' }, SUB);
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB);
  V.akteurSelbstErklaeren('Verwalterin');
  const anker = V.getData();
  V.subKontextBetreten(e.depotUUID);
  V.wizardSchrittSetzen('anamwiz', 3, 'Hüft-OP 2019');
  // U2-ADR-104: Liste statt Skalar — die Trennung Sub-Inhalt/Anker gilt unverändert.
  assert.equal((V.getData().sektoren.health.operationsProcedures || []).map(z => z.procedure).join('|'),
    'Hüft-OP 2019', 'die Wizard-Antwort steht im SUB-Inhalt');
  assert.ok(!(anker.sektoren.health && anker.sektoren.health.operationsProcedures), 'Anker leer');
  await V.subKontextVerlassen();
});

test('5) Bürger-Sprache: keine Paragrafen in den Fragen', async () => {
  const { V } = await frischMitDepot();
  for (const s of V.WIZARD_BY_ID.anamwiz.schritte) {
    assert.ok(!/§|\bBGB\b/.test(s.frage), 'keine Paragrafen in: ' + s.frage);
  }
});
