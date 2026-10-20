'use strict';
/* Probe zur ENOENT-Auswertung im öffentlichen Lauf-Beleg (09.10.2026, Auflage der Gegenlesung): eine rote Probe, die an einer
   fehlenden Repo-Datei scheitert, hält den Beleg an — auch wenn eine Grundliste sie sonst duldete. */
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../tools/oeffentlicher-lauf-beleg.js');

const KLON = '/tmp/klon-probe';
const AUSGABE = [
  '✔ eine grüne Probe (1ms)',
  '✖ failing tests:',
  '',
  'test at tests/a.test.js:3:1',
  '✖ [A] liest eine Vorlage (2.1ms)',
  "  Error: ENOENT: no such file or directory, open '" + KLON + "/tools/vorlagen-beispiel/a.json'",
  '✖ [B] liest fremdes (0.4ms)',
  "  Error: ENOENT: no such file or directory, open '/etc/gibt-es-nicht'",
  '',
].join('\n');

test('[Lauf-Beleg·ENOENT] gelesen wird der Fehlerabschnitt, nur Repo-Pfade zählen, relativ zum Klon', () => {
  assert.deepEqual(L.enoentPfade(L.unitFehlerAbschnitt(AUSGABE), KLON), ['tools/vorlagen-beispiel/a.json']);
  assert.deepEqual(L.enoentPfade(L.unitFehlerAbschnitt("✔ grün\nENOENT: no such file or directory, open '" + KLON + "/x.json'\n"), KLON), [], 'ohne roten Abschnitt zählt nichts');
});

test('[Lauf-Beleg·ENOENT] die Fehlermeldungen des Playwright-Berichts werden gelesen', () => {
  const bericht = { suites: [{ file: 'tests/e2e/a.spec.js', specs: [{ title: 'x', ok: false, tests: [{ results: [{ errors: [{ message: "Error: ENOENT: no such file or directory, open '" + KLON + "/tools/b.json'" }] }] }] }] }] };
  assert.deepEqual(L.enoentPfade(L.fehlerTexteAusBericht(bericht), KLON), ['tools/b.json']);
});

test('[Lauf-Beleg·ENOENT·Rot-Beweis] ein ENOENT hält den Beleg an, auch mit Grundliste; ohne ENOENT bleibt es wie bisher', () => {
  const beleg = (enoent) => ({ baum: 'b1', unit: { exit: 1, rot: ['[A] liest eine Vorlage'], enoent }, e2e: { exit: 0, rot: [], enoent: [] } });
  const mit = L.laufBelegPruefen(beleg(['tools/vorlagen-beispiel/a.json']), { baum: 'b1', grundliste: ['[A] liest eine Vorlage'] });
  assert.equal(mit.ok, false);
  assert.match(mit.grund, /ENOENT.*tools\/vorlagen-beispiel\/a\.json/);
  assert.equal(L.laufBelegPruefen(beleg([]), { baum: 'b1', grundliste: ['[A] liest eine Vorlage'] }).ok, true, 'ohne ENOENT duldet die Grundliste wie bisher');
  assert.equal(L.laufBelegPruefen(beleg([]), { baum: 'b1' }).ok, false, 'ohne Grundliste ist rot rot');
});
