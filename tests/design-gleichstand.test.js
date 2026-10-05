'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Rückrechnung „ab Werk unverändert" — U2-ADR-473, Wagen v894.
   ────────────────────────────────────────────────────────────────────────────
   `tools/design-gleichstand.js` rechnet eine Tokenisierung zurück: jede
   Deklaration beider Fassungen, aufgelöst gegen die Wurzel-Tokens, in jedem
   Wurzel-Kontext (Grund, Nacht, Hochkontrast …). Die Fixtures tragen die drei
   Fehler, die eine Tokenisierung unbemerkt macht: ein Wert, der nur im
   Nachtmodus abweicht; ein Rollen-Token, das einen lokal überschriebenen Wert an
   der Wurzel einfriert; ein geänderter Wert im JS-erzeugten style=.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { vergleichen, aufloesen } = require('../tools/design-gleichstand.js');

const FIX = path.join(__dirname, 'fixtures', 'design-gleichstand');
const lies = (n) => fs.readFileSync(path.join(FIX, n), 'utf8');

test('[Gleichstand·Negativkontrolle] eine wertgleiche Tokenisierung ist in jedem Kontext gleich', () => {
  const { abweichungen, kontexte } = vergleichen(lies('vorher.html'), lies('nachher-gleich.html'));
  assert.deepEqual(abweichungen, []);
  assert.deepEqual(kontexte, [':root', 'html.dark-mode'], 'der Nachtmodus ist als eigener Kontext erkannt');
});

test('[Gleichstand·Rot] Nachtmodus, eingefrorenes Token und JS-Wert fallen auf', () => {
  const { abweichungen } = vergleichen(lies('vorher.html'), lies('nachher-anders.html'));
  const arten = abweichungen.map((a) => a.art + ':' + (a.kontext || a.token || '')).sort();
  assert.deepEqual(arten, ['js-wert::root', 'lokal:--line', 'wert:html.dark-mode']);
});

test('[Gleichstand] eine Datei ist zu sich selbst gleich', () => {
  const t = lies('vorher.html');
  assert.deepEqual(vergleichen(t, t).abweichungen, []);
});

test('[Gleichstand] Auflösung: rekursiv, mit Rückfall, unbekanntes bleibt Bezug', () => {
  const t = { '--a': 'var(--b)', '--b': '3px' };
  assert.equal(aufloesen('var(--a) solid', t), '3px solid');
  assert.equal(aufloesen('var(--x, 2px)', t), '2px');
  assert.equal(aufloesen('var(--x)', t), 'var(--x)');
  assert.equal(aufloesen('calc(var(--b) - var(--a))', t), 'calc(3px - 3px)');
});
