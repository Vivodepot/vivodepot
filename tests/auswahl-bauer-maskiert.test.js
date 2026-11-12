'use strict';
/* Die zwei Bauer der Auswahl (M21): _auswahlPlatzhalterHTML setzt „Bitte wählen“, _auswahlEntfernenHTML „Auswahl entfernen“ ein.
   Beide stehen gezählt in tools/textknoten-verkettung-grundlinie.json, weil der Wächter Bauer an ihren Aufrufstellen zählt.
   Diese Probe hält fest, dass jeder Bauer seinen Textsatz-Wert selbst maskiert: ein Wert mit <img onerror> erscheint als Text,
   nie als Element. Rot-Beweis: derselbe Bauer ohne escapeHTML ließe das Element durch, und der Prüfer findet es. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const BOESE = '<img src=x onerror="alert(1)">';

// Die beiden Funktionen wörtlich aus dem Kern, ausgeführt mit dem echten escapeHTML.
function bauerQuelle(kern) {
  const a = kern.indexOf('function _auswahlPlatzhalterHTML(leer) {');
  const b = kern.indexOf('function _auswahlEntfernenHTML(leer) {');
  assert.ok(a >= 0 && b > a, 'Vorbedingung: beide Bauer stehen im Kern');
  return kern.slice(a, kern.indexOf('\n}\n', b) + 2);
}
function bauen(quelle, escapeHTML) {
  return new Function('STRINGS', 'escapeHTML', quelle + '\nreturn [_auswahlPlatzhalterHTML, _auswahlEntfernenHTML];')(
    { auswahlPlatzhalter: BOESE, auswahlEntfernen: BOESE }, escapeHTML);
}
function elemente(html) {
  return /<img\b/i.test(html) ? ['<img> als Element'] : [];
}

test('[Auswahl·Bauer] ein Textsatz-Wert mit <img onerror> erscheint in beiden Bauern als Text', () => {
  const { V } = ladeKern();
  const [platz, entf] = bauen(bauerQuelle(KERN), V.escapeHTML);
  for (const html of [platz(true), platz(false), entf(false)]) {
    assert.deepEqual(elemente(html), [], html);
    assert.ok(html.includes('&lt;img'), 'der Wert steht maskiert da: ' + html);
  }
  assert.equal(entf(true), '', 'leer gibt es nichts zu entfernen');
});

test('[Auswahl·Bauer·Rot-Beweis] dieselben Bauer ohne Maskierung lassen das Element durch', () => {
  const [platz, entf] = bauen(bauerQuelle(KERN), (s) => String(s));
  assert.deepEqual(elemente(platz(true)), ['<img> als Element']);
  assert.deepEqual(elemente(entf(false)), ['<img> als Element']);
});
