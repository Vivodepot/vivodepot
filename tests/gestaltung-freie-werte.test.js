'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Wächter „freie Werte“ in der Stilquelle des Kerns (Stufe 1).
   Je Art (padding, margin, gap, radius, trefferMin, mediaFrei) zählt tools/gestaltung-freie-werte.js die Deklarationen mit freier
   Zahl in tools/erscheinung/stil/grundlage.css. Die Grundlinie hält die heutigen Zahlen: steigt eine, ist es rot; sinkt eine,
   ist es rot, bis die Grundlinie nachgezogen ist. Die Zahl kann nur sinken.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const w = require('../tools/gestaltung-freie-werte.js');

const WERKZEUG = path.join(__dirname, '..', 'tools', 'gestaltung-freie-werte.js');
const def = () => JSON.parse(fs.readFileSync(w.DEFINITION, 'utf8'));
const gl = () => JSON.parse(fs.readFileSync(w.GRUNDLINIE, 'utf8'));

test('[Freie Werte·a] keine Art liegt über der Grundlinie, und die Grundlinie ist nachgezogen', () => {
  const { zahlen } = w.messen(fs.readFileSync(w.GRUNDLAGE, 'utf8'), def());
  const { gestiegen, gefallen } = w.vergleichen(zahlen, gl());
  assert.deepEqual(gestiegen, [], 'ein neuer freier Wert gehört als Token (--abstand-*, --radius-*, --treffer) in die Regel');
  assert.deepEqual(gefallen, [], 'neuer Tiefstand — mit `node tools/gestaltung-freie-werte.js --grundlinie-schreiben` festschreiben');
});

test('[Freie Werte·b] die Grundlinie führt jede Art als Zahl', () => {
  for (const a of w.ARTEN) assert.equal(typeof gl().zahlen[a], 'number', a);
});

test('[Freie Werte·c] Fixtures: gut zählt null, roh zählt je Art einen', () => {
  const fdef = JSON.parse(fs.readFileSync(path.join(w.FIXTURES, 'definition-gut.json'), 'utf8'));
  const gut = w.messen(fs.readFileSync(path.join(w.FIXTURES, 'frei-gut.css'), 'utf8'), fdef).zahlen;
  const roh = w.messen(fs.readFileSync(path.join(w.FIXTURES, 'frei-roh.css'), 'utf8'), fdef).zahlen;
  for (const a of w.ARTEN) { assert.equal(gut[a], 0, 'gut ' + a); assert.equal(roh[a], 1, 'roh ' + a); }
  assert.match(execFileSync(process.execPath, [WERKZEUG], { encoding: 'utf8' }), /Selbstprobe grün/);
});

test('[Freie Werte·d] der erzeugte Block der Definition zählt nicht, die Umbruchpunkte kommen aus der Definition', () => {
  const css = '.a { padding: 4px; }\n/* GESTALTUNG-DEFINITION:BEGIN */\n.b { padding: 4px; margin: 4px; }\n/* GESTALTUNG-DEFINITION:END */\n@media (max-width: 767px) { .a { gap: 0; } }\n@media (min-width: 768px) { .a { gap: 0; } }';
  const z = w.messen(css, def()).zahlen;
  assert.equal(z.padding, 1);
  assert.equal(z.margin, 0);
  assert.equal(z.mediaFrei, 0);
  const anders = JSON.parse(JSON.stringify(def())); anders.grundwerte.umbrueche = { schmal_bis_px: 599, breit_ab_px: 600 };
  assert.equal(w.messen(css, anders).zahlen.mediaFrei, 2);
});

test('[Freie Werte·Rot-Beweis] ein zusätzlicher freier Wert hebt die Zahl und macht den Vergleich rot', () => {
  const css = fs.readFileSync(w.GRUNDLAGE, 'utf8') + '\n.rot-beweis { padding: 13px; margin: 7px; gap: 5px; border-radius: 9px; min-height: 44px; }\n@media (max-width: 999px) { .rot-beweis { gap: 0; } }\n';
  const { zahlen } = w.messen(css, def());
  const { gestiegen } = w.vergleichen(zahlen, gl());
  assert.equal(gestiegen.length, 6, gestiegen.join('; '));
  // sinkt eine Zahl, verlangt der Vergleich das Nachziehen
  const tiefer = JSON.parse(JSON.stringify(gl())); tiefer.zahlen.padding += 1;
  const r = w.vergleichen(w.messen(fs.readFileSync(w.GRUNDLAGE, 'utf8'), def()).zahlen, tiefer);
  assert.deepEqual(r.gestiegen, []);
  assert.equal(r.gefallen.length, 1);
});

test('[Freie Werte·Rot-Beweis] eine Zahl mit var(), Null, auto oder Prozent im Token ist kein freier Wert', () => {
  assert.deepEqual(w.freieZahlen('var(--abstand-2) 0 auto'), []);
  assert.deepEqual(w.freieZahlen('calc(var(--abstand-2) + 2px)'), ['2px']);
  assert.deepEqual(w.freieZahlen('50%'), ['50%']);
  assert.deepEqual(w.freieZahlen('0 var(--radius-klein) var(--radius-klein) 0'), []);
});
