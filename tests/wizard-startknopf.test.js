'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Datenlage-adaptive Startknöpfe + Anlass-Dispatch (Teil 2, Schnitt 2.2)
   ────────────────────────────────────────────────────────────────────────
   Deklarativ: eine Bereich-Definition trägt optionale `wizardId`; renderSektor
   zeigt dann oben einen Startknopf, dessen Beschriftung sich der Datenlage anpasst
   (leer → „erstellen", vorhanden → „bearbeiten"). Zusätzlich dispatcht ein
   Anlass-Ziel { wizard } auf wizardLauf, wenn die Definition existiert.
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

test('1) wizardStartHTML: leer → „erstellen", vorhanden → „bearbeiten"', async () => {
  const { V } = await frischMitDepot();
  let html = V.wizardStartHTML('gebwiz');
  assert.ok(html.includes(V.STRINGS.wizStartErstellen), 'leer → erstellen');
  assert.ok(!html.includes(V.STRINGS.wizStartBearbeiten));
  V.wizardSchrittSetzen('gebwiz', 0, 'Klinikum München');
  html = V.wizardStartHTML('gebwiz');
  assert.ok(html.includes(V.STRINGS.wizStartBearbeiten), 'vorhanden → bearbeiten');
});

test('2) wizardStartHTML trägt data-wizard-start; unbekannter Wizard → leer', async () => {
  const { V } = await frischMitDepot();
  assert.ok(V.wizardStartHTML('gebwiz').includes('data-wizard-start="gebwiz"'));
  assert.equal(V.wizardStartHTML('gibtsnicht'), '', 'unbekannt → kein Knopf');
});

test('3) Anlass-Ziel { wizard } startet den Wizard (statt nur das Blatt zu öffnen)', async () => {
  const { V } = await frischMitDepot();
  // 'geburt' trägt ziel: { wizard: 'gebwiz' }
  const geburt = V.ANLAESSE.find(a => a.id === 'geburt');
  assert.ok(geburt && geburt.ziel.wizard === 'gebwiz', 'geburt → gebwiz deklariert');
  V.waehleAnlass('geburt');
  assert.equal(V.getViewState().aktiveAnsicht, 'wizard', 'geführter Einstieg statt Blatt');
  assert.equal(V.getWizardState().aktiverWizardId, 'gebwiz');
});

test('4) Anlass ohne Wizard fällt weiter auf das Situationsblatt', async () => {
  const { V } = await frischMitDepot();
  // 'arzt' hat ziel: { sbl: 2 } und ein gebautes Situationsblatt, KEIN wizard
  V.waehleAnlass('arzt');
  assert.equal(V.getViewState().aktiveAnsicht, 'situation');
  assert.equal(V.getViewState().aktiveSituationId, 'arzt');
});

test('5) Bereich ohne Wizard zeigt KEINEN Startknopf', async () => {
  const { V, document } = await frischMitDepot();
  V.betreteApp();
  // 'mobilitaet' trägt weder wizardId noch wizards — anders als 'vorsorge'/'identitaet' (mit Wizards).
  // (Hinweis: seit dem Weitere-Wizards-Auftrag tragen viele Bereiche ein wizards-Array; mobilitaet nicht.)
  const mob = V.SEKTOR_BY_ID.mobility;
  assert.ok(!mob.wizardId && !(Array.isArray(mob.wizards) && mob.wizards.length), 'mobilitaet ohne Wizard (Annahme des Tests)');
  V.oeffneSektor('mobilitaet');
  const html = document.getElementById('content').innerHTML;
  assert.ok(!html.includes('data-wizard-start'), 'kein Startknopf ohne deklarierten Wizard');
});
