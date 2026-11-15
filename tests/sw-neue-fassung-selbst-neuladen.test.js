'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Neue Fassung beim ersten Aufruf: die Seite lädt sich nur in Ruhe selbst neu (11.11.2026)
   ───────────────────────────────────────────────────────────────────────────
   Nachtrag zu U2-ADR-190. Übernimmt ein neuer Worker, lädt die Seite sich einmal selbst neu, wenn kein Depot offen
   ist, kein Fenster offen ist und nichts eingetippt ist. Sonst geschieht nichts. Die Probe im Browser mit zwei
   Fassungen steht in tests/e2e/sw-neue-fassung-beim-ersten-aufruf.spec.js; hier steht die Entscheidung der Seite.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

test('[Neue Fassung] ohne offenes Depot lädt die Seite sich genau einmal neu', () => {
  const { V } = ladeKern();
  assert.equal(typeof V._swNeueFassungUebernommen, 'function', 'Vorbedingung: die Stelle existiert');
  let n = 0;
  assert.equal(V._swNeueFassungUebernommen(() => { n++; }), true);
  assert.equal(n, 1);
});

test('[Neue Fassung] mit offenem Depot lädt die Seite sich nicht neu', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('neue-fassung-pw-2026');
  V.betreteApp();
  let n = 0;
  assert.equal(V._swNeueFassungUebernommen(() => { n++; }), false);
  assert.equal(n, 0);
});

test('[Neue Fassung] mit ungesicherter Änderung lädt die Seite sich nicht neu', () => {
  const { V } = ladeKern();
  V.markiereUngespeichert();
  let n = 0;
  assert.equal(V._swNeueFassungUebernommen(() => { n++; }), false);
  assert.equal(n, 0);
});

test('[Neue Fassung] verdrahtet: nur nach einer Übernahme, nicht beim ersten Worker, und ohne Hinweis', () => {
  const m = KERN.match(/addEventListener\('controllerchange', function \(\) \{([\s\S]*?)\n          \}\);/);
  assert.ok(m, 'der Kern hört auf die Übernahme');
  assert.match(m[1], /if \(!schonBedient\) \{ schonBedient = true; return; \}/, 'der erste Worker lädt nicht neu');
  assert.match(m[1], /if \(neuGeladen\) return;/, 'einmal je Seite');
  assert.doesNotMatch(m[1], /toast|banner|ui\.|STRINGS/i, 'kein Hinweis an die Person (U2-ADR-190)');
});

test('[Neue Fassung·Rot-Beweis] ohne die Prüfung auf das offene Depot würde neu geladen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('neue-fassung-pw-2026');
  V.betreteApp();
  assert.equal(V._swNeuLadenRuhig(), false, 'mit offenem Depot ist die Seite nicht in Ruhe');
  const ohne = KERN.replace("if (_appBereitsBetreten) return false;                                    // Depot oder Umschau offen", '');
  assert.notEqual(ohne, KERN, 'Vorbedingung: die Prüfung steht im Kern');
});
