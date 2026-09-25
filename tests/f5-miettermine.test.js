'use strict';
/* F5 Posten 3 („F4 und F5", 09.08.2026, Zug 1) — die drei Miettermine.
   `umzug_mietverhaeltnis` ist eine textarea für Kündigung, Auszug und Übergabe — drei
   Termine in einem Freitext. Drei Datumsfelder ergänzt, additiv. Bestandsinhalte
   bleiben stehen — das Freitextfeld wird nicht gelöscht. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function wohnenFelder(V) {
  return V.SEKTOR_BY_ID.housing.sektionen.flatMap(s => s.felder);
}

test('[F5] drei Miettermin-Datumsfelder existieren neben umzug_mietverhaeltnis, Freitext bleibt', () => {
  const { V } = ladeKern();
  const felder = wohnenFelder(V);
  const alt = felder.find(f => f.id === 'tenancyTerminationHandover');
  assert.ok(alt, 'Freitextfeld bleibt bestehen');
  assert.equal(alt.typ, 'textarea', 'Freitextfeld wird nicht gelöscht/umgewandelt');
  const kuendigung = felder.find(f => f.id === 'noticeDate');
  const auszug = felder.find(f => f.id === 'moveOutDate');
  const uebergabe = felder.find(f => f.id === 'handoverDateNewHome');
  assert.ok(kuendigung && kuendigung.typ === 'datum', 'Kündigungstermin fehlt');
  assert.ok(auszug && auszug.typ === 'datum', 'Auszugstermin fehlt');
  assert.ok(uebergabe && uebergabe.typ === 'datum', 'Übergabetermin fehlt');
});

test('[F5] Bestandsinhalt im Freitext bleibt unangetastet, wenn die drei Termine gesetzt werden', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('housing', 'tenancyTerminationHandover', 'alte Wohnung zum 30.09. gekündigt; Übergabe mit Protokoll');
  V.sektorFeldSetzen('housing', 'noticeDate', '2026-06-30');
  V.sektorFeldSetzen('housing', 'moveOutDate', '2026-09-30');
  V.sektorFeldSetzen('housing', 'handoverDateNewHome', '2026-10-01');
  const d = V.getData().sektoren.housing;
  assert.equal(d.tenancyTerminationHandover, 'alte Wohnung zum 30.09. gekündigt; Übergabe mit Protokoll');
  assert.equal(d.noticeDate, '2026-06-30');
  assert.equal(d.moveOutDate, '2026-09-30');
  assert.equal(d.handoverDateNewHome, '2026-10-01');
});
