'use strict';
/* Demo-Weg, Review-Befund D3 HOCH (12.11.2026): „im Bereich öffnen ›“ am Touch-Gerät. Statische Probe auf die Stilquelle.
   ROT-BEWEIS (von Hand nachgerechnet, nichts gelaufen): vor dem Fix fehlt in grundlage.css die (hover: none)-Regel. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lies = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('[DEMO-D3] „im Bereich öffnen ›“ steht am Touch-Gerät dauerhaft da (Deckkraft 0.7 ohne Hover)', () => {
  const css = lies('tools/erscheinung/stil/grundlage.css');
  assert.match(css, /@media\s*\(hover:\s*none\),\s*\(pointer:\s*coarse\)\s*\{[^}]*\.klick-hinweis\s*\{[^}]*opacity:\s*0\.7/s,
    'ohne Maus gibt es kein Hover: der Hinweis braucht eine Regel für (hover: none) / (pointer: coarse)');
});
