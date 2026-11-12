'use strict';
/* Klassenwächter zu LESE-KOPF-390 (03.11.2026): jede Ansicht der Lese-App — jede Funktion render…() in vivodepot-lesen.html —
   steht in tests/e2e/support/lese-app-ansichten.js. Nur dann misst tests/e2e/lese-app-ohne-querlauf.spec.js sie bei 390, 360
   und 320 px. Eine neue Ansicht ohne Eintrag ist rot; ein Eintrag ohne Funktion auch (die Liste veraltet nicht still).
   Rot-Beweis mit erfundenem Quelltext. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ANSICHTEN } = require('./e2e/support/lese-app-ansichten.js');

const LESE = path.join(__dirname, '..', 'vivodepot-lesen.html');

function ansichtenImQuelltext(text) {
  return [...text.matchAll(/^function (render[A-Z][A-Za-z0-9_]*)\s*\(/gm)].map((m) => m[1]);
}

function abweichungen(quelltext, liste) {
  const da = new Set(ansichtenImQuelltext(quelltext));
  const aus = [];
  for (const n of da) if (!Object.prototype.hasOwnProperty.call(liste, n)) aus.push('ohne Messung: ' + n);
  for (const n of Object.keys(liste)) if (!da.has(n)) aus.push('ohne Funktion: ' + n);
  return aus.sort();
}

test('[Lese-App·Ansichten] jede Funktion render…() der Lese-App steht in der Messliste, jeder Eintrag hat seine Funktion', () => {
  const text = fs.readFileSync(LESE, 'utf8');
  assert.ok(ansichtenImQuelltext(text).length >= 10, 'die Suche findet die Ansichten');
  assert.deepEqual(abweichungen(text, ANSICHTEN), []);
});

test('[Lese-App·Ansichten·Rot-Beweis] eine neue Ansicht ohne Eintrag und ein Eintrag ohne Funktion sind je gemeldet', () => {
  const erfunden = 'function renderWelcome() {}\nfunction renderNeueSicht(x) {}\n  function renderNichtOben() {}\n';
  assert.deepEqual(abweichungen(erfunden, { renderWelcome: 'renderWelcome()', renderAlt: 'renderAlt()' }),
    ['ohne Funktion: renderAlt', 'ohne Messung: renderNeueSicht']);
});
