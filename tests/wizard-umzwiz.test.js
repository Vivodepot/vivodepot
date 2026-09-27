'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Umzugs-Wizard (Welle 3, umzwiz)
   ────────────────────────────────────────────────────────────────────────
   umzwiz schreibt über DREI Bereiche: Standardziel Sektor 'identitaet' (B1);
   ein Schritt nach 'verwaltung' (B9), einer nach 'wohnen' (B11).
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

test('1) umzwiz registriert; Standardziel identitaet; Schritt-Ziele über B1/B9/B11; Felder existieren', async () => {
  const { V } = await frischMitDepot();
  const def = V.WIZARD_BY_ID.umzwiz;
  assert.ok(def, 'umzwiz registriert');
  assert.equal(def.ziel.sektor, 'identity');
  const ziele = def.schritte.map(s => V.wizardSchrittZiel(def, s).sektor);
  // F5 Posten 3 („F4 und F5", 09.08.2026): drei neue Termin-Schritte (alle nach
  // 'wohnen', wie der Mietverhältnis-Schritt daneben) kamen dazu.
  assert.equal(ziele.join(','), 'identity,identity,identity,administration,housing,housing,housing,housing');
  for (const s of def.schritte) {
    const z = V.wizardSchrittZiel(def, s).sektor;
    const ids = V.SEKTOR_BY_ID[z].sektionen.flatMap(x => x.felder).map(f => f.id);
    assert.ok(ids.includes(s.feld.id), 'Feld ' + s.feld.id + ' existiert in ' + z);
  }
});

test('2) Roundtrip über drei Bereiche: B1 (Anschrift/Ummeldung), B9 (Versorger), B11 (Mietverhältnis)', async () => {
  const { V } = await frischMitDepot();
  V.wizardSchrittSetzen('umzwiz', 0, 'Lindenweg 4');                        // strasse (B1)
  V.wizardSchrittSetzen('umzwiz', 1, '80331 München');                     // plz_ort (B1)
  V.wizardSchrittSetzen('umzwiz', 2, 'Bürgerbüro 12.07.');                 // umzug_ummeldung (B1)
  V.wizardSchrittSetzen('umzwiz', 3, 'Strom/Gas/Internet; Bank informieren'); // umzug_versorger (B9)
  V.wizardSchrittSetzen('umzwiz', 4, 'alte Wohnung zum 30.09. gekündigt'); // umzug_mietverhaeltnis (B11)
  const d = V.getData();
  assert.equal(d.sektoren.identity.streetAddress, 'Lindenweg 4');
  assert.equal(d.sektoren.identity.postcodeCity, '80331 München');
  assert.equal(d.sektoren.identity.reRegistrationWithTheResidents, 'Bürgerbüro 12.07.');
  assert.equal(d.sektoren.administration.changingUtilityProviders, 'Strom/Gas/Internet; Bank informieren');
  assert.equal(d.sektoren.housing.tenancyTerminationHandover, 'alte Wohnung zum 30.09. gekündigt');
  assert.equal(d.urheberschaft.administration.changingUtilityProviders.length, 1, 'B9 gestempelt');
  assert.equal(d.urheberschaft.housing.tenancyTerminationHandover.length, 1, 'B11 gestempelt');
});

test('3) Wiedereintritt: B11-Eintrag allein genügt; Startknopf in B1, B9 und B11', async () => {
  const { V, document } = await frischMitDepot();
  assert.equal(V.wizardHatDaten('umzwiz'), false);
  V.wizardSchrittSetzen('umzwiz', 4, 'gekündigt zum 30.09.');   // nur B11
  assert.equal(V.wizardHatDaten('umzwiz'), true, 'Daten in B11 erkannt');
  V.betreteApp();
  for (const [sek, hint] of [['identity', 'B1'], ['administration', 'B9'], ['housing', 'B11']]) {
    V.oeffneSektor(sek);
    assert.ok(document.getElementById('content').innerHTML.includes('data-wizard-start="umzwiz"'), 'Startknopf in ' + hint);
  }
});

test('4) Sub-Modus: umzwiz schreibt in den Sub-Inhalt, nicht in den Anker', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(ANKER);
  const e = await V.subDepotAnlegen({ bezeichnung: 'Depot Oma', inhaberin: 'Oma Erna', verwaltungsTyp: 'verwaltet' }, SUB);
  await V.subDepotVertrauenOeffnen(e.depotUUID, SUB);
  V.akteurSelbstErklaeren('Verwalterin');
  const anker = V.getData();
  V.subKontextBetreten(e.depotUUID);
  V.wizardSchrittSetzen('umzwiz', 0, 'Seestraße 12');   // B1
  V.wizardSchrittSetzen('umzwiz', 3, 'Strom ummelden'); // B9
  assert.equal(V.getData().sektoren.identity.streetAddress, 'Seestraße 12');
  assert.equal(V.getData().sektoren.administration.changingUtilityProviders, 'Strom ummelden');
  assert.ok(!(anker.sektoren.identity && anker.sektoren.identity.streetAddress), 'Anker-B1 leer');
  assert.ok(!(anker.sektoren.administration && anker.sektoren.administration.changingUtilityProviders), 'Anker-B9 leer');
  await V.subKontextVerlassen();
});

test('5) Bürger-Sprache: keine Paragrafen in den Fragen', async () => {
  const { V } = await frischMitDepot();
  for (const s of V.WIZARD_BY_ID.umzwiz.schritte) {
    assert.ok(!/§|\bBGB\b/.test(s.frage), 'keine Paragrafen in: ' + s.frage);
  }
});

/* ── 6) Krisenvorsorge-Verweis (Auftrag „Krisenvorsorge Sichtbarkeit", Zug 3, 10.08.2026) ──
   „der Vorrat zieht mit, die Mengen ändern sich mit der Haushaltsgröße" — ein Satz mit einem
   Weg am Versorger-Schritt, keine Wiederholung der BBK-Systematik. */
test('6) der Versorger-Schritt verweist auf Krisenvorsorge — ein Satz, kein zweiter Rechenweg', async () => {
  const { V } = await frischMitDepot();
  const schritt = V.WIZARD_BY_ID.umzwiz.schritte.find(s => s.feld.id === 'changingUtilityProviders');
  assert.ok(/Krisenvorsorge/.test(schritt.hilfetext), 'Hilfetext nennt den Bereich Krisenvorsorge');
  assert.ok(!/Liter|BBK/.test(schritt.hilfetext), 'keine Wiederholung der BBK-Systematik im Hilfetext');
});
