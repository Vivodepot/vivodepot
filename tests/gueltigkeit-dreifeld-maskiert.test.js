'use strict';
/* Die Gültigkeit eines Felds („Gültig von“ / „Gültig bis“) steht als Dreifeld (_datumDreifeldHTML in feldGueltigkeitZeileHTML).
   Der gespeicherte Wert läuft dort ins versteckte ISO-Feld und in die drei Teile. Diese Probe hält fest: ein Wert mit Markup erscheint als
   Text im Attribut, nie als Element. Rot-Beweis: dieselbe Stelle ohne escapeAttr ließe das Element durch, der Prüfer findet es. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const BOESE = '"><img src=x onerror="alert(1)">';

// Ein Wert ist als Element durchgekommen, wenn ein <img-Tag im HTML steht.
function elementeAusWert(html) {
  return /<img\b/i.test(html) ? ['<img> als Element'] : [];
}

test('[Gültigkeit·Dreifeld] ein Wert mit <img onerror> erscheint als Text, nicht als Element', () => {
  const { V } = ladeKern();
  assert.equal(typeof V._datumDreifeldHTML, 'function', 'Vorbedingung: der Bauer ist geladen');
  const html = V._datumDreifeldHTML('data-gueltig-von="health.bloodType"', ' aria-label="Gültig von"', '1900-01-01', '2100-12-31', BOESE, false);
  assert.deepEqual(elementeAusWert(html), []);
  assert.ok(html.includes('&lt;img'), 'der Wert steht maskiert im Attribut: ' + html.slice(0, 300));
});

test('[Gültigkeit·Dreifeld·Rot-Beweis] dieselbe Stelle ohne Maskierung wird gefunden', () => {
  const ohne = '<div class="datum-dreifeld" role="group"><input type="text" hidden="" data-datum-iso="1" value="' + BOESE + '"></div>';
  assert.deepEqual(elementeAusWert(ohne), ['<img> als Element']);
});
