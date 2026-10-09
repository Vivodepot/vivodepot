'use strict';
/* Befund HILFE-OVERLAY-HOHL (23.09.2026): aufraeumen() in tools/produkt-durchklick-messen.js kannte #hilfe-overlay nicht;
   das offene Overlay deckte jeden folgenden Klick ab, 16 von 39 Sichten blieben unbesucht und der Lauf war trotzdem grün.
   Diese Probe hält die Klasse: jede Kennung auf „-overlay“, die der Kern anlegt oder gestaltet, steht in VOLLBILD_OVERLAYS,
   die aufraeumen() schließt. #overlay selbst (Anlass-Auswahl) schließt aufraeumen() über #a-zurueck und zählt nicht mit. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { VOLLBILD_OVERLAYS } = require('../../tools/lib/vollbild-overlays.js');

const REPO = path.join(__dirname, '..', '..');

function overlayKennungen(kern) {
  const ids = new Set();
  const muster = [/id="([a-z0-9-]+-overlay)"/g, /\.id\s*=\s*'([a-z0-9-]+-overlay)'/g, /getElementById\('([a-z0-9-]+-overlay)'\)/g, /#([a-z0-9-]+-overlay)\s*\{/g];
  for (const m of muster) for (const t of kern.matchAll(m)) ids.add(t[1]);
  return [...ids].sort();
}
const fehlend = (kern, liste) => overlayKennungen(kern).filter((id) => !liste.includes(id));

test('[Durchklick·Overlays] aufraeumen() schließt jedes Vollbild-Overlay des Kerns', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  const gefunden = overlayKennungen(kern);
  assert.ok(gefunden.length >= 3, 'Ausbeute: die Suche findet die bekannten Overlays — sonst prüft sie nichts');
  assert.deepEqual(fehlend(kern, VOLLBILD_OVERLAYS), []);
});

test('[Durchklick·Overlays·Rot-Beweis] ein neues Overlay im Kern, das aufraeumen() nicht kennt, fällt — auf jedem Anlegeweg', () => {
  const liste = ['a-overlay'];
  assert.deepEqual(fehlend('<div id="a-overlay"></div>', liste), [], 'Positivkontrolle');
  assert.deepEqual(fehlend('<div id="a-overlay"></div><div id="neu-overlay"></div>', liste), ['neu-overlay']);
  assert.deepEqual(fehlend("ov.id = 'neu-overlay';", liste), ['neu-overlay']);
  assert.deepEqual(fehlend("document.getElementById('neu-overlay')", liste), ['neu-overlay']);
  assert.deepEqual(fehlend('#neu-overlay { position: fixed; }', liste), ['neu-overlay']);
  assert.deepEqual(fehlend('<div id="overlay"></div>', liste), [], '#overlay ohne Präfix zählt nicht');
});
