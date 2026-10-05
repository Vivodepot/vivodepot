'use strict';
/* Befund B2 (02.10.2026, U2-ADR-473): Status und Hinweise der Einstellungen sind Inhalt —
   „v1.0", „0 eingetragen", der Hinweis zum Passwort. G7 § 2.2 erlaubt --fs-xs (12 px) nur für
   sehr dezente Marker. Gegen die Klasse wirkt die Ratsche `fontSizeXs` in
   tools/design-treue-grundlinie.json: die Zahl der --fs-xs-Stellen kann nur fallen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// v894: das Stylesheet kommt mit dem Erscheinungsbild „heute".
const KERN = require('./helfer/kern-mit-erscheinungsbild.js').kernMitHeute(fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8'));
const regel = (text, sel) => { const m = text.match(new RegExp('\\n\\s*' + sel.replace(/[.]/g, '\\.') + '\\s*\\{([^}]*)\\}')); return m && m[1]; };
const zuKlein = (text) => ['.einst-abschnitt-status', '.einst-hint']
  .filter((s) => /font-size\s*:\s*var\(--fs-xs\)/.test(regel(text, s) || ''));

test('[B2] Status und Hinweis der Einstellungen stehen nicht in --fs-xs', () => {
  for (const s of ['.einst-abschnitt-status', '.einst-hint']) assert.ok(regel(KERN, s), s + ' gefunden');
  assert.deepEqual(zuKlein(KERN), []);
});

test('[B2·Rot-Beweis] die Form vor dem Fix wird erkannt', () => {
  assert.deepEqual(zuKlein('\n  .einst-hint { color: var(--ink3); font-size: var(--fs-xs); }'), ['.einst-hint']);
});
