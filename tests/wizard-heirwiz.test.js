'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Heirats-Wizard (Welle 3, heirwiz)
   ────────────────────────────────────────────────────────────────────────
   heirwiz schreibt über DREI Bereiche: Standardziel Sektor 'identitaet' (B1);
   ein Schritt nach 'meine-menschen' (B2). U2-ADR-096: die zwei B8-Schritte sind
   entfallen — sie hingen an den abgerissenen Gates und schrieben danach in Felder
   ohne Definition. Ein Instrument entsteht als Eintrag in der Instrument-Liste,
   nicht als Gate-Antwort in einem Anlass-Wizard.
   Dieselben Felder wie die manuelle Eingabe.
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

test('1) heirwiz registriert; Standardziel identitaet; Schritt-Ziele über B1/B2/B8; Felder existieren', async () => {
  const { V } = await frischMitDepot();
  const def = V.WIZARD_BY_ID.heirwiz;
  assert.ok(def, 'heirwiz registriert');
  assert.equal(def.ziel.sektor, 'identity');
  const ziele = def.schritte.map(s => V.wizardSchrittZiel(def, s).sektor);
  assert.equal(ziele.join(','), 'identity,identity,identity,identity,people');
  for (const s of def.schritte) {
    const z = V.wizardSchrittZiel(def, s).sektor;
    const ids = V.SEKTOR_BY_ID[z].sektionen.flatMap(x => x.felder).map(f => f.id);
    assert.ok(ids.includes(s.feld.id), 'Feld ' + s.feld.id + ' existiert in ' + z);
  }
});

test('2) Roundtrip über zwei Bereiche: B1 (Name/Güterstand), B2 (Partner)', async () => {
  const { V } = await frischMitDepot();
  V.wizardSchrittSetzen('heirwiz', 0, 'verh');                              // familienstand (B1)
  V.wizardSchrittSetzen('heirwiz', 1, 'begleitname');                      // heirat_namenswahl (B1, F4 Zug 4: Katalog)
  V.wizardSchrittSetzen('heirwiz', 2, 'zugewinn');                         // gueterstand (B1)
  V.wizardSchrittSetzen('heirwiz', 4, { ref: '', override: 'Partner Max' });// ehepartner (B2)

  const d = V.getData();
  assert.equal(d.sektoren.identity.maritalStatus, 'verh');
  assert.equal(d.sektoren.identity.choiceOfNameAfterMarriage, 'begleitname');
  assert.equal(d.sektoren.identity.maritalPropertyRegime, 'zugewinn');
  assert.equal(d.sektoren['people'].spouseOrCivilPartner.override, 'Partner Max');
  // U2-ADR-096: kein Vorsorge-Schreibzugriff mehr aus heirwiz.
  assert.ok(!(d.sektoren.advanceCare || {}).testament_vorhanden, 'heirwiz schreibt kein Gate mehr');
  assert.equal(d.urheberschaft['people'].spouseOrCivilPartner.length, 1, 'B2 gestempelt');
});

test('3) Wiedereintritt: B2-Eintrag allein genügt; Startknopf in B1, B2 und B8', async () => {
  const { V, document } = await frischMitDepot();
  assert.equal(V.wizardHatDaten('heirwiz'), false);
  V.wizardSchrittSetzen('heirwiz', 4, { ref: '', override: 'Partner Max' });   // nur B2
  assert.equal(V.wizardHatDaten('heirwiz'), true, 'Daten in B2 erkannt');
  V.betreteApp();
  for (const [sek, hint] of [['identity', 'B1'], ['people', 'B2']]) {
    V.oeffneSektor(sek);
    assert.ok(document.getElementById('content').innerHTML.includes('data-wizard-start="heirwiz"'), 'Startknopf in ' + hint);
  }
});

test('4) Sub-Modus: heirwiz schreibt in den Sub-Inhalt, nicht in den Anker', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(ANKER);
  const e = await V.subDepotAnlegen({ bezeichnung: 'Depot Sohn', inhaberin: 'Sohn Tim', verwaltungsTyp: 'verwaltet' }, SUB);
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB);
  V.akteurSelbstErklaeren('Verwalterin');
  const anker = V.getData();
  V.subKontextBetreten(e.depotUUID);
  V.wizardSchrittSetzen('heirwiz', 0, 'elp');       // B1
  V.wizardSchrittSetzen('heirwiz', 4, { override: 'Partner Muster' });   // B2 (zweiter Bereich)
  assert.equal(V.getData().sektoren.identity.maritalStatus, 'elp');
  // U2-ADR-096: heirwiz schreibt nicht mehr nach vorsorge — der zweite Bereich ist B2.
  assert.ok(V.getData().sektoren['people'], 'B2 im Sub-Inhalt gesetzt');
  assert.ok(!(anker.sektoren.identity && anker.sektoren.identity.maritalStatus), 'Anker-B1 leer');
  await V.subKontextVerlassen();
});

test('5) Bürger-Sprache: keine Paragrafen in den Fragen', async () => {
  const { V } = await frischMitDepot();
  for (const s of V.WIZARD_BY_ID.heirwiz.schritte) {
    assert.ok(!/§|\bBGB\b/.test(s.frage), 'keine Paragrafen in: ' + s.frage);
  }
});
