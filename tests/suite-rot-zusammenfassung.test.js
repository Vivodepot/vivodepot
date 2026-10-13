'use strict';
/* ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Befund ROT-BERICHT-MISCHT-TODO-UNTER-FEHLER (08.10.2026). Der Abschnitt „✖ failing tests:“ von node:test listet neben den
   echten Fehlern (✖) auch jeden todo-Test, der wie erwartet fehlschlägt (⚠). Die todo-Proben offener Befunde stehen darum in
   jedem roten Protokoll und wurden als „rot“ gelesen. Gehalten wird:
   - das Werkzeug trennt ✖ und ⚠; die erste Zeile nennt nur die Zahl der ✖;
   - beide Hooks rufen es im roten Zweig vor und nach der vollen Ausgabe (Klassenwächter: jede Stelle, die ein rotes
     Suite-Protokoll ausgibt).
   ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { zerlegen, bericht } = require('../tools/suite-rot-zusammenfassung.js');

// Erfundenes Protokoll in der Form von node:test (spec-Reporter), mit einem echten Fehler und zwei erwarteten todo.
const PROTOKOLL = [
  '✔ [A] grün (1.2ms)',
  '✖ [B] echter Fehler (3.4ms)',
  '⚠ [C] offener Befund (0.5ms) # BEFUND-C (Befund-Ratsche)',
  'ℹ tests 3',
  'ℹ fail 1',
  'ℹ todo 2',
  '',
  '✖ failing tests:',
  '',
  'test at tests/b.test.js:1:1',
  '✖ [B] echter Fehler (3.4ms)',
  '  AssertionError [ERR_ASSERTION]: rot',
  '',
  'test at tests/c.test.js:1:1',
  '⚠ [C] offener Befund (0.5ms) # BEFUND-C (Befund-Ratsche)',
  '  AssertionError [ERR_ASSERTION]: erwartet rot',
  '',
  'test at tests/d.test.js:1:1',
  '⚠ [D] zweiter offener Befund (0.7ms) # BEFUND-D',
].join('\n');

test('[Rot-Bericht] trennt echte Fehler und erwartete todo; die erste Zeile nennt nur die Zahl der ✖', () => {
  const r = zerlegen(PROTOKOLL);
  assert.deepEqual(r.fehler, ['[B] echter Fehler']);
  assert.deepEqual(r.todo, ['[C] offener Befund', '[D] zweiter offener Befund']);
  const zeilen = bericht(PROTOKOLL).split('\n');
  assert.equal(zeilen[0], '[suite] ROT: 1 echte Fehler (✖)');
  assert.ok(zeilen.includes('  ✖ [B] echter Fehler'));
  assert.ok(zeilen.some((z) => z.startsWith('[suite] daneben 2 erwartete todo-Fehlschläge (⚠)')));
  assert.ok(!zeilen.some((z) => z.includes('[C]') || z.includes('[D]')), 'die todo-Namen stehen nicht als Fehler da');
});

test('[Rot-Bericht·Rot-Beweis] wer den Abschnitt „failing tests“ zeilenweise liest, zählt die todo als rot — genau der Befund', () => {
  const ab = PROTOKOLL.split('\n').findIndex((z) => z === '✖ failing tests:');
  const naiv = PROTOKOLL.split('\n').slice(ab + 1).filter((z) => /^(✖|⚠) \[/.test(z));
  assert.equal(naiv.length, 3, 'drei Namen im Abschnitt, davon nur einer ein Fehler');
  assert.equal(zerlegen(PROTOKOLL).fehler.length, 1);
});

test('[Rot-Bericht] ohne ✖ im Abschnitt oder ohne Abschnitt sagt die Zusammenfassung, dass die volle Ausgabe zu lesen ist', () => {
  assert.match(bericht('✖ failing tests:\n⚠ [C] x (1ms) # B'), /^\[suite\] ROT: 0 echte Fehler \(✖\)\n  kein ✖ im Abschnitt/);
  assert.match(bericht('irgendein Abbruch'), /kein Abschnitt „failing tests“/);
});

/* Klassenwächter: jede Stelle in den Hooks, die ein rotes Suite-Protokoll ausgibt (cat "$_suite_log" nach einer ROT-Zeile),
   ruft die Zusammenfassung unmittelbar davor (vor der ROT-Zeile) und danach. */
const HOOKS = ['pre-commit', 'pre-push'].map((h) => path.join(__dirname, '..', 'hooks', h));
const AUFRUF = 'node tools/suite-rot-zusammenfassung.js "$_suite_log" >&2 || true';
// Die Hooks hält der öffentliche Zuschnitt zurück; dort gelten die zwei Hook-Proben nicht (tools/lib/wurzel-kopfzeile.js).
const { imOeffentlichenZuschnitt, IM_ZUSCHNITT_GRUND } = require('../tools/lib/wurzel-kopfzeile.js');
const HOOKS_SKIP = imOeffentlichenZuschnitt(path.join(__dirname, '..')) ? IM_ZUSCHNITT_GRUND : false;
function stellenOhneZusammenfassung(text) {
  const z = text.split('\n').map((s) => s.trim());
  const fehlt = [];
  z.forEach((zeile, i) => {
    if (zeile !== 'cat "$_suite_log" >&2') return;
    if (!/ROT/.test(z[i - 1] || '')) return;   // nur der rote Zweig; Hänger und Zeitabbruch haben eigene Wege
    if (z[i - 2] !== AUFRUF || z[i + 1] !== AUFRUF) fehlt.push(i + 1);
  });
  return fehlt;
}

test('[Rot-Bericht·Klasse] beide Hooks geben im roten Zweig die Zusammenfassung vor und nach der vollen Ausgabe', { skip: HOOKS_SKIP }, () => {
  for (const h of HOOKS) {
    const text = fs.readFileSync(h, 'utf8');
    assert.ok(text.split('\n').some((s) => s.trim() === 'cat "$_suite_log" >&2'), path.basename(h) + ': Vorbedingung — der rote Zweig gibt das Protokoll aus');
    assert.deepEqual(stellenOhneZusammenfassung(text), [], path.basename(h));
  }
});

test('[Rot-Bericht·Klasse·Rot-Beweis] ohne den Aufruf meldet der Wächter die Stelle', { skip: HOOKS_SKIP }, () => {
  const text = fs.readFileSync(HOOKS[0], 'utf8');
  const ohne = text.split('\n').filter((s) => s.trim() !== AUFRUF).join('\n');
  assert.ok(stellenOhneZusammenfassung(ohne).length >= 1);
});
