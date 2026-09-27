'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Die Liste in tests/helfer/nur-privat.js bleibt ehrlich und schrumpft nur (25.09.2026).

   Jede gelistete Datei gibt es, sie bindet den Helfer tatsächlich ein, jeder Grund ist einer der zwei benannten, und
   die Zahl der Dateien übersteigt den Deckel nicht. Läuft öffentlich und privat.
   Negativkontrolle: ein gepflanzter Eintrag ohne Datei, mit fremdem Grund und über dem Deckel fällt.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { NUR_PRIVAT, DECKEL, GIT, BESTAND, ZUSCHNITT } = require('./helfer/nur-privat.js');

const REPO = path.join(__dirname, '..');

function pruefen(liste, deckel) {
  const fehler = [];
  for (const [datei, e] of Object.entries(liste)) {
    const abs = path.join(REPO, datei);
    if (!fs.existsSync(abs)) { fehler.push(datei + ': gibt es nicht'); continue; }
    if (!fs.readFileSync(abs, 'utf8').includes('testMitPrivat(__filename)')) fehler.push(datei + ': bindet den Helfer nicht ein');
    if (![GIT, BESTAND, ZUSCHNITT].includes(e.grund)) fehler.push(datei + ': Grund nicht benannt');
    if (!e.tests || !e.tests.length) fehler.push(datei + ': ohne Tests');
    for (const t of e.tests || []) if (Array.isArray(t) && ![GIT, BESTAND, ZUSCHNITT].includes(t[1])) fehler.push(datei + ': Grund bei „' + t[0] + '" nicht benannt');
  }
  if (Object.keys(liste).length > deckel) fehler.push(Object.keys(liste).length + ' Dateien über dem Deckel ' + deckel);
  return fehler;
}

test('[Nur-privat·Liste] jede Datei gibt es, bindet den Helfer ein, hat einen benannten Grund; Deckel hält', () => {
  assert.deepEqual(pruefen(NUR_PRIVAT, DECKEL), []);
});

test('[Nur-privat·Liste·Negativkontrolle] ein gepflanzter Eintrag ohne Datei und mit fremdem Grund fällt, ebenso ein Deckel darunter', () => {
  const f = pruefen({ 'tests/gibt-es-nicht.test.js': { grund: 'irgendwas', tests: ['x'] } }, 0);
  assert.ok(f.some((x) => x.includes('gibt es nicht')));
  assert.ok(f.some((x) => x.includes('über dem Deckel')));
  const g = pruefen({ 'tests/nur-privat-helfer.test.js': { grund: 'irgendwas', tests: ['x'] } }, 5);
  assert.ok(g.some((x) => x.includes('Grund nicht benannt')));
});
