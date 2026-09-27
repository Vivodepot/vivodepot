/* U2-ADR-174 Teilprojekt 2 (Umsetzungsplan Task 2), 25.08.2026.
   Rot-Beweis: vor der Implementierung von renderEintragenKartenraster() lief diese Datei mit
   `TypeError: V.renderEintragenKartenraster is not a function` (beide Fälle unten) — erst danach
   grün. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Kartenraster] rendert alle 5 Cluster mit Überschrift und alle 13 Bereiche als .bereich-karte', () => {
  const { V } = ladeKern();
  const html = V.renderEintragenKartenraster();
  const clusterTreffer = html.match(/gruppe-titel-karten/g) || [];
  assert.equal(clusterTreffer.length, 5, 'fünf Cluster-Überschriften erwartet');
  const kartenTreffer = html.match(/class="bereich-karte"/g) || [];
  assert.equal(kartenTreffer.length, 13, 'dreizehn Bereichs-Karten erwartet');
});

test('[Kartenraster] jede Karte trägt data-sektor mit einer echten Bereichs-ID', () => {
  const { V } = ladeKern();
  const html = V.renderEintragenKartenraster();
  const ids = [...html.matchAll(/data-sektor="([a-zA-Z-]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, 13);
  assert.equal(new Set(ids).size, 13, 'keine doppelten Bereichs-IDs');
});
