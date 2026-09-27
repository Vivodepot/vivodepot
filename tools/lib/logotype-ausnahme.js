'use strict';
/* ── LOGOTYPE-AUSNAHME (WCAG 1.4.3, 25.08.2026) ────────────────────────────
   „Text that is part of a logo or brand name has no minimum contrast
   requirement." `.lw-vivo`/`.lw-depot` (Topbar) und `.lw-vivo-d`/`.lw-depot-d`
   (Welcome-Screen) SIND das woertliche Markenlogo ("VIVO"+"DEPOT" als eigene
   Buchstaben-Spans, vivodepot.html:3057/27223 u.a.) — keine Bedienoberflaeche,
   kein Fliesstext. Befund `wortmarke-kontrast-luecke-bericht-2026-08-25.md`:
   3,5-4,01:1 statt 4,5:1 an fuenf Breiten, gebisected auf VOR der gesamten
   Sitzung, also kein neuer Bug, sondern diese fehlende Ausnahme.

   ABSICHTLICH ENG: nur genau diese vier Selektoren, kein allgemeiner
   Freifahrtschein. `sel` hat die Form `tag.ersteKlasse` (s. `ablesen()` in
   `kontrast-messen.js`) — hier immer `span.lw-vivo` etc.

   EIGENE, ABHAENGIGKEITSFREIE DATEI (nicht in kampagne.js definiert): eine
   Testdatei, die die Regel prueft, darf `tools/kampagne.js` nicht requiren —
   das zieht `playwright` transitiv mit (ueber kontrast-messen.js) und bricht
   `tests/schicht-1-ohne-lieferkette.test.js`. Dieselbe Regel steht deshalb
   hier, wo sie ohne Lieferkette ladbar ist. */
const LOGOTYPE_AUSNAHME = /^span\.lw-(vivo|depot)(-d)?$/;

module.exports = { LOGOTYPE_AUSNAHME };
