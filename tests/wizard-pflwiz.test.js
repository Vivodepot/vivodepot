'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Pflege-Übernahme-Wizard (Welle 2, pflwiz)
   ────────────────────────────────────────────────────────────────────────
   pflwiz ist eine Lebenssituation, die über DREI Bereiche schreibt: Standardziel
   Sektor 'sozialversicherung' (B7: Pflegegrad, Pflegedienst, Pflegegeld — seit U2-ADR-018/019
   alle dort, gesundheit/pflegegrad-sek aufgelöst); Schritte mit eigenem Ziel nach
   'meine-menschen' (B2) und 'vorsorge' (B8). Dieselben Felder wie die manuelle Eingabe.
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

test('1) pflwiz registriert; Standardziel sozialversicherung; B2/B8 mit eigenem Ziel; Felder existieren', async () => {
  const { V } = await frischMitDepot();
  const def = V.WIZARD_BY_ID.pflwiz;
  assert.ok(def, 'pflwiz registriert');
  assert.equal(def.ziel.sektor, 'socialInsurance');   // Standardziel (Pflegegrad/Pflegedienst/Pflegegeld → B7, U2-ADR-018/019)
  const ziele = def.schritte.map(s => V.wizardSchrittZiel(def, s).sektor);
  // Schritte 0–3 (Pflegegrad/Pflegedienst/Pflegegeld-Leistungsart/-Betrag, F4 Zug 3, 11.08.2026:
  // Leistungsart und Betrag sind seither getrennt) erben das Standardziel; B2/B8 setzen ihr eigenes.
  assert.equal(ziele.join(','), 'socialInsurance,socialInsurance,socialInsurance,socialInsurance,people,people,advanceCare');
  for (const s of def.schritte) {
    const z = V.wizardSchrittZiel(def, s).sektor;
    const ids = V.SEKTOR_BY_ID[z].sektionen.flatMap(x => x.felder).map(f => f.id);
    assert.ok(ids.includes(s.feld.id), 'Feld ' + s.feld.id + ' existiert in ' + z);
  }
});

test('2) Roundtrip über drei Bereiche: B7 (Pflegegrad/Pflegedienst/Geld), B2 (Hauptpflege/Pflegezeit), B8 (Vorsorge)', async () => {
  const { V } = await frischMitDepot();
  V.wizardSchrittSetzen('pflwiz', 0, '3');                                  // pflegegrad (B7, U2-ADR-018)
  V.wizardSchrittSetzen('pflwiz', 2, 'kombinationsleistung');               // pflegegeld-Leistungsart (F4 Zug 3)
  V.wizardSchrittSetzen('pflwiz', 3, '599 EUR/Monat');                      // pflegegeld_betrag (F4 Zug 3)
  V.wizardSchrittSetzen('pflwiz', 4, { ref: '', override: 'Tochter Anna' });// pflege_hauptperson (B2)
  V.wizardSchrittSetzen('pflwiz', 5, 'Pflegezeit 3 Monate');               // pflegezeit (B2)
  V.wizardSchrittSetzen('pflwiz', 6, 'ja');                                 // pflege_vorsorge_geprueft (B8)
  const d = V.getData();
  assert.equal(d.sektoren.socialInsurance.careLevel, '3');
  assert.equal(d.sektoren.socialInsurance.longTermCareAllowanceTypeOf, 'kombinationsleistung');
  assert.equal(d.sektoren.socialInsurance.longTermCareAllowanceAmount, '599 EUR/Monat');
  assert.equal(d.sektoren['people'].whoProvidesThePrimaryCare.override, 'Tochter Anna');
  assert.equal(d.sektoren['people'].careLeaveFamilyCareLeave, 'Pflegezeit 3 Monate');
  assert.equal(d.sektoren.advanceCare.provisionDocumentsCheckedIn, 'ja');
  assert.equal(d.urheberschaft['people'].careLeaveFamilyCareLeave.length, 1, 'B2 gestempelt');
  assert.equal(d.urheberschaft.advanceCare.provisionDocumentsCheckedIn.length, 1, 'B8 gestempelt');
});

test('3) Wiedereintritt: B8-Datum allein genügt; Startknopf in B5, B2 und B8', async () => {
  const { V, document } = await frischMitDepot();
  assert.equal(V.wizardHatDaten('pflwiz'), false);
  V.wizardSchrittSetzen('pflwiz', 6, 'teil');   // nur B8
  assert.equal(V.wizardHatDaten('pflwiz'), true, 'Daten in B8 erkannt');
  V.betreteApp();
  for (const [sek, hint] of [['health', 'B5'], ['people', 'B2'], ['advanceCare', 'B8']]) {
    V.oeffneSektor(sek);
    const html = document.getElementById('content').innerHTML;
    assert.ok(html.includes('data-wizard-start="pflwiz"'), 'Startknopf in ' + hint);
  }
});

test('4) Sub-Modus: pflwiz schreibt in den Sub-Inhalt über alle drei Bereiche, nicht in den Anker', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(ANKER);
  const e = await V.subDepotAnlegen({ bezeichnung: 'Depot Oma', inhaberin: 'Oma Erna', verwaltungsTyp: 'verwaltet' }, SUB);
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB);
  V.akteurSelbstErklaeren('Verwalterin');
  const anker = V.getData();
  V.subKontextBetreten(e.depotUUID);
  V.wizardSchrittSetzen('pflwiz', 0, '4');       // B7 (Pflegegrad, U2-ADR-018)
  V.wizardSchrittSetzen('pflwiz', 5, 'beantragt'); // B2
  V.wizardSchrittSetzen('pflwiz', 6, 'nein');    // B8
  assert.equal(V.getData().sektoren.socialInsurance.careLevel, '4');
  assert.equal(V.getData().sektoren['people'].careLeaveFamilyCareLeave, 'beantragt');
  assert.equal(V.getData().sektoren.advanceCare.provisionDocumentsCheckedIn, 'nein');
  assert.ok(!(anker.sektoren.socialInsurance && anker.sektoren.socialInsurance.careLevel), 'Anker-Pflegegrad leer');
  await V.subKontextVerlassen();
});

test('5) Bürger-Sprache: keine Paragrafen in den Fragen', async () => {
  const { V } = await frischMitDepot();
  for (const s of V.WIZARD_BY_ID.pflwiz.schritte) {
    assert.ok(!/§|\bBGB\b/.test(s.frage), 'keine Paragrafen in: ' + s.frage);
  }
});
