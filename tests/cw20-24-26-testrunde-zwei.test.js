'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   CW-20/-24 + CW-26 (24.08.2026) — Testrunde-Nachzügler, zweite Tranche
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[CW-20/24] Hilfsmittel-Label trägt Beispiele — löst die Abgrenzung ohne abstrakte Begriffserklärung', () => {
  const { V } = ladeKern();
  const f = V.feldDefFuer('advanceCare', 'aidsEGWalkerHearingAid');
  assert.equal(f.label, 'Hilfsmittel (z. B. Rollator, Hörgerät, Rollstuhl)');
});

test('[CW-26·Rot-Beweis] verwaltung_vorgaenge.betrag hat jetzt eine Richtung, wie unterhalt.richtung', () => {
  const { V } = ladeKern();
  const f = V.feldDefFuer('administration', 'ongoingAdministrativeCases');
  const direction = (f.unterFelder || []).find(u => u.id === 'direction');
  assert.ok(direction, 'direction existiert als Unterfeld');
  assert.equal(direction.typ, 'auswahl');
  const werte = direction.optionen.map(o => o.wert).sort();
  assert.deepEqual(werte, ['bekomme', 'zahle']);
});

test('[CW-26] dieselben zwei Optionen-Werte wie beim bereits bestehenden Vorbild (unterhalt.richtung)', () => {
  const { V } = ladeKern();
  const vorbild = V.feldDefFuer('people', 'maintenanceObligationsAnd');
  const vDirection = (vorbild.unterFelder || []).find(u => u.id === 'direction');
  const neu = V.feldDefFuer('administration', 'ongoingAdministrativeCases');
  const nDirection = (neu.unterFelder || []).find(u => u.id === 'direction');
  assert.deepEqual(
    vDirection.optionen.map(o => o.wert).sort(),
    nDirection.optionen.map(o => o.wert).sort(),
    'dasselbe Muster wiederverwendet, kein neues Konzept'
  );
});

test('[CW-26] ein Vorgang mit Richtung speichert und liest verlustfrei', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('cw26-test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  V.listenEintragHinzufuegen('administration', 'ongoingAdministrativeCases', {
    authority: 'Jobcenter', typeOfCase: 'Grundsicherung', amount: '450', direction: 'bekomme',
  });
  const liste = V.feldRohwert('administration', 'ongoingAdministrativeCases');
  assert.equal(liste[0].direction, 'bekomme');
});
