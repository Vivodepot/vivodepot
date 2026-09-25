'use strict';
/* F5 Posten 2 („F4 und F5", 09.08.2026, Zug 1) — Beginn und Ende beim
   Unterhalt. Fünf Unterfelder, null Datumsfelder (Regel-23-Messung, Auftrag zitierte
   dieselbe Beobachtung). Additiv, zwei neue Datumsfelder. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function unterhaltFeld(V) {
  return V.SEKTOR_BY_ID['people'].sektionen.flatMap(s => s.felder).find(f => f.id === 'maintenanceObligationsAnd');
}

test('[F5] unterhalt: Beginn- und Ende-Datumsfelder existieren', () => {
  const { V } = ladeKern();
  const feld = unterhaltFeld(V);
  const beginn = feld.unterFelder.find(u => u.id === 'start');
  const ende = feld.unterFelder.find(u => u.id === 'end');
  assert.ok(beginn, 'Beginn-Feld fehlt');
  assert.ok(ende, 'Ende-Feld fehlt');
  assert.equal(beginn.typ, 'datum');
  assert.equal(ende.typ, 'datum');
});

test('[F5] echter Rundlauf: Beginn/Ende kommen mit einem Eintrag zurück', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.listenEintragHinzufuegen('people', 'maintenanceObligationsAnd', {
    type: 'Kindesunterhalt', start: '2020-01-01', end: '2030-12-31',
  });
  const eintrag = V.getData().sektoren['people'].maintenanceObligationsAnd[0];
  assert.equal(eintrag.start, '2020-01-01');
  assert.equal(eintrag.end, '2030-12-31');
});
