'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  kanonischeIds,
  pruefeDatei,
} = require('../tools/sektor-wortlisten-pruefen.js');

const ECHT = path.join(__dirname, 'fixtures', 'sektor-wortlisten-echt.js');
const ERFUNDEN = path.join(__dirname, 'fixtures', 'sektor-wortlisten-erfunden.js');

test('kanonische Liste hat dreizehn Sektor-IDs, inkl. sozialversicherung und vorsorge', () => {
  const kanon = kanonischeIds();
  assert.equal(kanon.size, 13);
  assert.ok(kanon.has('socialInsurance'));
  assert.ok(kanon.has('advanceCare'));
  assert.ok(!kanon.has('versicherungen'));
  assert.ok(!kanon.has('arbeit'));
});

test('Positivkontrolle: echte Zwölferliste bleibt grün', () => {
  const kanon = kanonischeIds();
  const befunde = pruefeDatei(ECHT, kanon);
  assert.deepEqual(befunde, []);
});

test('Rot-Beleg: eine gepflanzte Liste mit versicherungen/arbeit wird rot gemeldet', () => {
  const kanon = kanonischeIds();
  const befunde = pruefeDatei(ERFUNDEN, kanon);
  assert.equal(befunde.length, 1);
  assert.ok(befunde[0].erfunden.includes('versicherungen'));
  assert.ok(befunde[0].erfunden.includes('arbeit'));
});
