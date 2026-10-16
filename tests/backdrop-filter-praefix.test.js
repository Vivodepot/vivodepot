'use strict';
/* Jedes backdrop-filter trägt sein -webkit-Gegenstück (14.10.2026). Safari und alle WebKit-Browser auf iPhone und iPad
   zeichnen den Weichzeichner mit dem Präfix; fehlte es an einer Stelle, bliebe dort die Fläche glasklar und der Hintergrund
   scharf lesbar. Gemessen am Bestand: 15 Blöcke, alle mit Gegenstück. Die Probe hält die Klasse, nicht den Einzelfall: sie
   liest die Quell-Stylesheets der Erscheinungsbilder und verlangt je Block mit backdrop-filter auch -webkit-backdrop-filter. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const STIL = path.join(__dirname, '..', 'tools', 'erscheinung');
function stylesheets() {
  const dateien = [];
  for (const ordner of [STIL, path.join(STIL, 'stil')]) {
    for (const f of fs.readdirSync(ordner)) if (f.endsWith('.css')) dateien.push(path.join(ordner, f));
  }
  return dateien;
}
// Die eine Messfunktion für Probe und Rot-Beweis: Blöcke ohne Präfix-Gegenstück. Kommentare werden vorher entfernt.
function ohneGegenstueck(css) {
  const rein = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const fehlend = [];
  for (const m of rein.matchAll(/\{([^{}]*)\}/g)) {
    const block = m[1];
    if (/(?<!-webkit-)backdrop-filter\s*:/.test(block) && !/-webkit-backdrop-filter\s*:/.test(block)) fehlend.push(block.trim().slice(0, 80));
  }
  return fehlend;
}

test('[Backdrop-Präfix] jeder Block mit backdrop-filter trägt auch -webkit-backdrop-filter', () => {
  const dateien = stylesheets();
  assert.ok(dateien.length >= 3, 'Vorprüfung: die Stylesheets der Erscheinungsbilder liegen vor');
  let gemessen = 0;
  for (const d of dateien) {
    const css = fs.readFileSync(d, 'utf8');
    gemessen += (css.replace(/\/\*[\s\S]*?\*\//g, '').match(/(?<!-webkit-)backdrop-filter\s*:/g) || []).length;
    assert.deepEqual(ohneGegenstueck(css), [], path.basename(d) + ': backdrop-filter ohne -webkit-Gegenstück');
  }
  assert.ok(gemessen > 0, 'Vorprüfung: es gibt backdrop-filter im Bestand, die Probe misst etwas');
});

test('[Backdrop-Präfix·Rot-Beweis] ein Block ohne Gegenstück wird gefunden, einer mit Gegenstück nicht', () => {
  assert.equal(ohneGegenstueck('.a { backdrop-filter: blur(4px); }').length, 1);
  assert.equal(ohneGegenstueck('.a { -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }').length, 0);
  assert.equal(ohneGegenstueck('.a { -webkit-backdrop-filter: none; backdrop-filter: none; }').length, 0);
  assert.equal(ohneGegenstueck('/* .a { backdrop-filter: blur(4px); } */ .b { color: red; }').length, 0, 'Kommentare zählen nicht');
});
