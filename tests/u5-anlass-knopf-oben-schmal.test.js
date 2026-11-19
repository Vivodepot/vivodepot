'use strict';
/* Anlass, schmal: der Kasten „Herausgeben“ steht über der Liste (17.11.2026, Dummy-Abgleich A02/M21).
   Im Ablauf-Dummy des Anlasses steht der Knopf oben, darunter „Dazu gehört“. Am Stand von U-5 Schritt 1 fiel der Kasten unter
   ≤ 767 px in einer Spalte UNTER die Aufgabenliste, weil er im Markup nach ihr steht. Die Probe verlangt in den erzeugten Erscheinungsbildern und in
   der Quelle der Grundlage eine Regel im schmalen Raster, die den Kasten vor die Liste stellt.
   Rot-Beweis: dieselbe Prüfung auf den Stil ohne diese Regel fällt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');

function kastenObenSchmal(css) {
  const re = /@media\s*\(max-width:\s*767px\)\s*\{([^{}]*\{[^{}]*\})*[^{}]*\}/g;
  for (const m of String(css).match(re) || []) {
    if (/\.anlass-herausgeben\s*\{[^}]*order:\s*-1/.test(m)) return true;
  }
  return false;
}

test('[Anlass·schmal] die Grundlage stellt den Kasten „Herausgeben“ im schmalen Raster vor die Liste', () => {
  const css = fs.readFileSync(path.join(WURZEL, 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');
  assert.equal(kastenObenSchmal(css), true);
});

for (const modul of ['erscheinungsbild-heute-modul.json', 'erscheinungsbild-salbei-glas-modul.json', 'erscheinungsbild-dummy-modul.json']) {
  test(`[Anlass·schmal] das Erscheinungsbild ${modul} trägt die Regel im erzeugten Stil`, () => {
    const text = fs.readFileSync(path.join(WURZEL, 'tools', 'erscheinung', modul), 'utf8');
    assert.equal(kastenObenSchmal(text), true);
  });
}

test('[Anlass·schmal·Rot-Beweis] ohne die Regel fällt die Prüfung', () => {
  const ohne = '@media (max-width: 767px) { .anlass-raster { grid-template-columns: minmax(0, 1fr); } }';
  assert.equal(kastenObenSchmal(ohne), false);
  const mit = '@media (max-width: 767px) { .anlass-raster { grid-template-columns: minmax(0, 1fr); } .anlass-herausgeben { order: -1; } }';
  assert.equal(kastenObenSchmal(mit), true);
});
