'use strict';
/* Befund FELD-GILT-BIS-NICHT-BUENDIG (16.10.2026): die Gültigkeitszeile eines „gilt ab“-Felds (Fall 2, z. B. „Reisepass — ausgestellt am“) stand
   zwölf Pixel eingerückt in der Spalte der Beschriftung, links neben allen anderen Feldern der Gruppe. Die Zeile ist ein Gitterelement der
   Feldzeile (zwei Spalten, Beschriftung und Wert); ohne eigene Spalte landet sie in der ersten.
   Diese Probe hält die Regel statisch fest; die Messung am gerenderten Produkt (alle Bereiche, 1280 und 390 px) steht in
   tests/e2e/felder-gleiche-linke-kante.spec.js.
   Rot-Beweis: dieselbe Regel in der alten Fassung (Rand und Einrückung, keine Spalte) fällt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CSS = fs.readFileSync(path.join(__dirname, '..', 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');
const regel = (css) => { const m = /\.gueltigkeit-zeile--eingebettet\s*\{([^}]*)\}/.exec(css); return m ? m[1] : null; };
const stehtInDerWertSpalte = (block) => !!block && /grid-column:\s*-2\s*\/\s*-1/.test(block) && /margin-left:\s*0\b/.test(block) && !/margin-left:\s*var\(/.test(block);

test('[Feldzeile · Gültigkeitszeile] die eingebettete Gültigkeitszeile steht in der Spalte des Werts, ohne Einrückung', () => {
  assert.ok(stehtInDerWertSpalte(regel(CSS)), 'grid-column: -2 / -1 und margin-left: 0 an .gueltigkeit-zeile--eingebettet: ' + regel(CSS));
});

test('[Feldzeile · „Ausdrücklich keine“] die Zeile steht in der Spalte des Werts (fünf Felder in Gesundheit, gemessen 16.10.2026)', () => {
  const m = /\.ausdruecklich-keine-zeile\s*\{([^}]*)\}/.exec(CSS);
  assert.ok(m && /grid-column:\s*-2\s*\/\s*-1/.test(m[1]), String(m && m[1]));
});

test('[Feldzeile · Gültigkeitszeile · Rot-Beweis] die alte Fassung (Einrückung ohne Spalte) fällt, die Regel ohne Spalte auch', () => {
  assert.equal(stehtInDerWertSpalte('margin-left: var(--space-3); padding-left: var(--space-2); border-left: 2px solid var(--line);'), false);
  assert.equal(stehtInDerWertSpalte('margin-left: 0; padding-left: 0;'), false);
  assert.equal(stehtInDerWertSpalte(null), false);
});
