'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Wächter für _SUBDEPOT_PALETTE_HEX (13.09.2026, PDF-CI-Auftrag) — der Kern-
   Kommentar direkt über der Konstante (vivodepot.html, bei subDepotAkzentFarbe)
   behauptet, dass DIESE Datei sie gegen den echten :root-CSS-Block hält. Diese
   Datei ist der Beleg für diesen Kommentar (U2-106, „ein Kommentar behauptet
   keine Datei, die es nicht gibt").

   _SUBDEPOT_PALETTE_HEX existiert, weil jsPDF keine CSS-Variablen kennt — die
   PDF-Farb-Übersteuerung (_pdfSubAkzentPrimaerRgb, tests/pdf-inter-einbetten.test.js)
   braucht echte #rrggbb-Werte. Ohne diesen Wächter könnte die JS-Konstante vom
   CSS-:root-Block abschreiben (Copy-Paste-Fehler) oder bei einer künftigen
   Palette-Änderung im CSS unbemerkt zurückbleiben.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[PDF-Sub-Depot-Akzent] _SUBDEPOT_PALETTE_HEX ist wortgleich mit dem :root-CSS-Block (kein Abschreiben von Hand ohne Probe)', () => {
  const { html, V } = ladeKern();
  const rootBlock = html.match(/:root\s*\{[\s\S]*?\n\s*\}/);
  assert.ok(rootBlock, 'Testaufbau: der :root-CSS-Block muss auffindbar sein');
  const css = {};
  const re = /--(hafer|ton|flieder|altrose|nebel|kiesel|schilf|malve):\s*(#[0-9a-fA-F]{6})\s*;/g;
  let m;
  while ((m = re.exec(rootBlock[0]))) css[m[1]] = m[2];

  assert.deepEqual(Object.keys(css).sort(), Object.keys(V._SUBDEPOT_PALETTE_HEX).sort(),
    'die acht Töne müssen in CSS und JS dieselbe Namensmenge sein');
  for (const tok of Object.keys(V._SUBDEPOT_PALETTE_HEX)) {
    assert.equal(V._SUBDEPOT_PALETTE_HEX[tok].toLowerCase(), css[tok].toLowerCase(),
      '--' + tok + ': CSS ' + css[tok] + ' vs. JS ' + V._SUBDEPOT_PALETTE_HEX[tok]);
  }
});

test('[PDF-Sub-Depot-Akzent·Rot-Beweis] eine gepflanzte Abweichung wird gefunden (Testaufbau der Probe selbst)', () => {
  const gefaelscht = Object.assign({}, { hafer: '#000000', ton: '#D3A98F', flieder: '#B8AECB', altrose: '#D2B3B0', nebel: '#A9B8C4', kiesel: '#C3B5A8', schilf: '#bbcda7', malve: '#cdadc4' });
  const css = { hafer: '#D9C9A3', ton: '#D3A98F', flieder: '#B8AECB', altrose: '#D2B3B0', nebel: '#A9B8C4', kiesel: '#C3B5A8', schilf: '#bbcda7', malve: '#cdadc4' };
  assert.notEqual(gefaelscht.hafer.toLowerCase(), css.hafer.toLowerCase(),
    'Testaufbau: die gepflanzte Abweichung muss selbst eine echte Abweichung sein, sonst prüft dieser Rot-Beweis nichts');
});
