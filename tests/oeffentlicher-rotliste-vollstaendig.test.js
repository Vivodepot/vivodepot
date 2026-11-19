'use strict';
/* Probe für OEFFENTLICH-BELEG-NUR-ERSTES-ROT (14.11.2026): die Rotliste des öffentlichen Laufs nennt jede rote Probe,
   nicht nur die erste. Die Fixtures liegen in tests/rotliste-fixturen/ (kein .test.js: die Suite fährt sie nicht selbst)
   und werden hier mit node --test gefahren.

   Acceptanz: zwei rote Fixture-Tests in zwei Dateien ergeben eine Rotliste der Länge 2.
   Rot-Beweis: eine rote Suite mit zwei roten Subtests hat drei ✖-Zeilen; die Rotliste muss alle drei nennen. Der alte
   Parser las nur den Abschnitt „failing tests“ und nannte zwei. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { roteUnitProben } = require('../tools/oeffentlicher-lauf-beleg.js');

const FIX = path.join(__dirname, 'rotliste-fixturen');

function unitLauf(dateien) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, ['--test', ...dateien.map((f) => path.join(FIX, f))], { encoding: 'utf8', env });
  return (r.stdout || '') + (r.stderr || '');
}

/* Die verschiedenen roten Proben des Protokolls. Node wiederholt die roten Zeilen im Abschnitt „failing tests:“; deshalb
   zählen hier die verschiedenen Namen, nicht die Zeilen. */
function rotZeilen(t) {
  const namen = new Set();
  for (const z of t.split('\n')) {
    const m = /^\s*✖ (.+) \([0-9.]+ms\)$/.exec(z);
    if (m) namen.add(m[1]);
  }
  return namen.size;
}

test('[Rotliste·Acceptanz] zwei rote Fixture-Tests in zwei Dateien: die Rotliste hat Länge 2', () => {
  const t = unitLauf(['rot-a.js', 'rot-b.js']);
  const rot = roteUnitProben(t);
  assert.equal(rot.length, 2, rot.join(' | '));
  assert.ok(rot.some((n) => n.includes('Rotliste·Fixture·A')), rot.join(' | '));
  assert.ok(rot.some((n) => n.includes('Rotliste·Fixture·B')), rot.join(' | '));
});

test('[Rotliste·Rot-Beweis] eine rote Suite mit zwei roten Subtests: jede ✖-Zeile steht in der Rotliste', () => {
  const t = unitLauf(['rot-suite.js']);
  const zeilen = rotZeilen(t);
  const rot = roteUnitProben(t);
  assert.equal(zeilen, 3, 'die Fixture liefert drei ✖-Zeilen: Suite und zwei Subtests');
  assert.equal(rot.length, zeilen, rot.join(' | '));
  assert.ok(rot.some((n) => n.includes('Rotliste·Fixture·Suite')), rot.join(' | '));
});
