'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Fix: Statuskarten-Titel wirkt "flatternd" (Screenshot-Review, 27.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   Gemeldeter Eindruck: der Status-Text ("noch nichts eingetragen" usw.) steht
   bei jeder Karte an einer anderen Stelle. Mehrere Font-Rendering-Proben
   fanden nichts — der eigentliche Grund lag im Layout: `.feldgruppen-karte >
   summary` (und dieselbe Regel für .situation-block/.anfragen-ort) war
   `display: flex; justify-content: space-between` über DREI Flex-Kindern
   (Titel-Span, Status-Span, UND das generierte `::after`-Pfeil-Pseudo-
   Element zählt als drittes Flex-Item) — bei space-between wandert die
   Startposition des mittleren/zweiten Items mit der Breite des Titels.

   Fix: feste Spalten (CSS Grid) statt Flex+space-between — der Status-Text
   landet bei jeder Kartenbreite an derselben relativen Spalte, unabhängig
   von der Titellänge.

   Rot-Beweis: vor dem Fix (display:flex; justify-content:space-between) schlug
   diese Probe fehl — visuell per Playwright-Stichprobe bestätigt (vier
   geschlossene Karten unterschiedlicher Titellänge, identische Status-X-Position
   erst nach der Umstellung auf grid-template-columns: 1fr auto auto). ═══════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const QUELLE = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

function regelBlock(selektor) {
  const i = QUELLE.indexOf(selektor);
  assert.ok(i > -1, selektor + ' nicht gefunden');
  return QUELLE.slice(i, QUELLE.indexOf('}', i) + 1);
}

test('[Statuskarte·Spalten] .feldgruppen-karte > summary nutzt Grid mit festen Spalten, nicht Flex+space-between', () => {
  const block = regelBlock('.feldgruppen-karte > summary, .situation-block > summary, .anfragen-ort > summary {');
  assert.match(block, /display:\s*grid/, 'muss auf grid umgestellt sein');
  assert.match(block, /grid-template-columns:\s*1fr auto auto/,
    'drei feste Spalten (Titel flexibel, Status + Pfeil auto) — sonst wandert die Statusspalte wieder mit der Titellänge');
  assert.doesNotMatch(block, /justify-content:\s*space-between/,
    'space-between war die eigentliche Ursache des "Flatterns" — darf nicht zurückkommen');
});
