'use strict';
/* ABN-B6 BEREICH-OEFFNEN-ZIEL (11.11.2026): „im Bereich öffnen“ führt zum Feld. Die Probe führt `oeffneSektorFeld` aus dem Kern
   gegen ein Feld in zwei ineinander liegenden zugeklappten Karten aus und verlangt: beide Karten offen, Sprung ins Blickfeld,
   Fokus im Feld, Markierung. Die Browser-Probe dazu: tests/e2e/bereich-oeffnen-fuehrt-zum-feld.spec.js (390 px und Desktop).
   Rot-Beweis (am Kern ohne das Aufklappen gemessen): die äußere Karte bleibt zu, die Probe fällt. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const start = html.indexOf('function oeffneSektorFeld(');
const ende = html.indexOf('\n}\n', start) + 3;
const quelle = html.slice(start, ende);

function ausfuehren(feldId) {
  const protokoll = { geoeffnet: [], scroll: 0, fokus: 0, klassen: [], sektor: null };
  const eingabe = { matches: (s) => /input/.test(s), focus: () => { protokoll.fokus++; } };
  const innen = { open: false }; const aussen = { open: false };
  const feld = {
    matches: () => false,
    closest: (s) => (s === 'details' ? innen : null),
    querySelector: () => eingabe,
    scrollIntoView: () => { protokoll.scroll++; },
    classList: { add: (c) => protokoll.klassen.push(c), remove: () => {} },
  };
  innen.parentElement = { closest: (s) => (s === 'details' ? aussen : null) };
  aussen.parentElement = null;
  const doc = { querySelector: (s) => (s.includes(feldId) && s.startsWith('[data-feld="') ? feld : null) };
  const f = new Function('oeffneSektor', 'document', 'requestAnimationFrame', '_ohneProzessHalt', 'setTimeout',
    quelle + '\nreturn oeffneSektorFeld;')(
    (id) => { protokoll.sektor = id; }, doc, (fn) => fn(), (t) => t, () => 0);
  f('health', feldId);
  protokoll.innen = innen.open; protokoll.aussen = aussen.open;
  return protokoll;
}

test('[ABN-B6] der Sprung öffnet die Karten um das Feld, holt es ins Blickfeld, setzt den Fokus und markiert es', () => {
  assert.ok(quelle.includes('oeffneSektorFeld'), 'Funktion im Kern gefunden');
  const p = ausfuehren('allergiesMedicationFoodOther');
  assert.equal(p.sektor, 'health');
  assert.equal(p.innen, true, 'die innere Karte ist offen');
  assert.equal(p.aussen, true, 'die äußere Karte ist offen');
  assert.equal(p.scroll, 1, 'das Feld kommt ins Blickfeld');
  assert.equal(p.fokus, 1, 'der Fokus liegt im Feld');
  assert.deepEqual(p.klassen, ['feld-hervorgehoben'], 'das Feld ist sichtbar markiert');
});
