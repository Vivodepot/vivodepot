'use strict';
/* Befund MELDUNG-UNTER-DEM-WEICHZEICHNER (16.10.2026): der Schleier eines Dialogs (#modal-rueck) trägt im Glas-Erscheinungsbild einen
   Weichzeichner; eine Meldung mit niedrigerem z-index erscheint darunter verschwommen und ist nicht lesbar. Diese Probe hält die
   Stapelreihenfolge statisch fest: jede Meldungsart steht über dem Schleier. Die Messung am gerenderten Produkt (Mitte der Meldung,
   überdeckte Knöpfe, Desktop und Handy) steht in tests/e2e/meldungen-ueber-dem-weichzeichner.spec.js.
   Rot-Beweis: die alte Reihenfolge (Toast 190, Schleier 200, Banner 200) fällt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CSS = fs.readFileSync(path.join(__dirname, '..', 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');
const zIndex = (css, selektor) => {
  const esc = selektor.replace(/[.#]/g, '\\$&');
  const m = new RegExp('^\\s*' + esc + '\\s*\\{[^}]*?z-index:\\s*(\\d+)', 'm').exec(css);
  return m ? Number(m[1]) : null;
};
const MELDUNGSARTEN = ['#toast-host', '.banner-stapel'];
const ueberSchleier = (css) => {
  const schleier = zIndex(css, '#modal-rueck');
  return schleier !== null && MELDUNGSARTEN.every((s) => { const z = zIndex(css, s); return z !== null && z > schleier; });
};

test('[Meldung · Stapelreihenfolge] Toast und Banner-Stapel liegen über dem Schleier des Dialogs', () => {
  assert.ok(ueberSchleier(CSS), 'Schleier ' + zIndex(CSS, '#modal-rueck') + ', Toast ' + zIndex(CSS, '#toast-host') + ', Banner ' + zIndex(CSS, '.banner-stapel'));
});

test('[Meldung · Stapelreihenfolge] bei offenem Dialog rücken Toast und Banner an den oberen Rand, damit sie dessen Knöpfe nicht verdecken', () => {
  assert.match(CSS, /body:has\(#modal-rueck\.an\)\s+#toast-host\s*\{[^}]*top:/);
  assert.match(CSS, /body:has\(#modal-rueck\.an\)\s+\.banner-stapel\s*\{[^}]*top:\s*0/);
});

test('[Meldung · Stapelreihenfolge · Rot-Beweis] die alte Reihenfolge fällt', () => {
  const alt = CSS.replace(/(#toast-host\s*\{[^}]*?z-index:\s*)\d+/, '$1190').replace(/(\.banner-stapel\s*\{[^}]*?z-index:\s*)\d+/, '$1200');
  assert.notEqual(alt, CSS);
  assert.equal(ueberSchleier(alt), false);
  assert.equal(ueberSchleier(CSS), true);
});
