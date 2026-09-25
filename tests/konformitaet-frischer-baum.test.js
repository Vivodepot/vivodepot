'use strict';
/* Ein frischer Arbeitsbaum fährt die Konformitäts-Gates durch, ohne dass vorher etwas von Hand gestartet wurde (F3, 21.09.2026).
   Der Fund: `tests/konformitaet/wcag-axe-lesen.mjs` läuft im pre-push VOR dem E2E und öffnet über tests/e2e-cross/support/helpers.js die gebackene Datei, die erst der
   E2E-globalSetup schreibt. Im Baum von jemandem, der zufällig vorher E2E gefahren hatte, lief das grün; im frischen brach es mit ERR_FILE_NOT_FOUND ab. Eine Probe, die an einem
   Zustand von vorher hängt, bleibt grün und zeigt nichts.
   Die Zusicherung ist der FRISCHE ZUSTAND SELBST: ein Kindprozess bekommt ein leeres Temp-Verzeichnis (TMPDIR), in dem keine gebackene Datei liegen kann, und fährt das Gate.
   Nichts, was ein anderer Lauf im geteilten Temp-Verzeichnis liegen ließ, kann das Ergebnis färben — und nichts, was hier geschieht, stört einen anderen Lauf. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');

test('[Frischer Baum] wcag-axe-lesen läuft in einem leeren Temp-Verzeichnis, ohne dass ein E2E-Lauf die gebackene Datei vorher geschrieben hat', { timeout: 240000 }, () => {
  const frisch = fs.mkdtempSync(path.join(os.tmpdir(), 'frischer-baum-'));
  try {
    assert.deepEqual(fs.readdirSync(frisch), [], 'Positivkontrolle: der Ort ist leer — keine gebackene Datei liegt vorher da');
    const env = Object.assign({}, process.env, { TMPDIR: frisch });
    delete env.NODE_TEST_CONTEXT;
    const r = spawnSync(process.execPath, ['--test', 'tests/konformitaet/wcag-axe-lesen.mjs'], { cwd: REPO, env, encoding: 'utf8', timeout: 200000 });
    assert.equal(r.status, 0, 'das Gate bricht im frischen Baum ab:\n' + String(r.stdout || '').split('\n').filter((z) => /ERR_FILE_NOT_FOUND|✖|Error/.test(z)).slice(0, 4).join('\n'));
    assert.ok(fs.readdirSync(frisch).some((n) => /^vivodepot-e2e-gebacken-.*-privat-de\.html$/.test(n)),
      'das Gate hat die gebackene Datei selbst geschrieben — sonst hätte es sie nicht gefunden');
  } finally {
    fs.rmSync(frisch, { recursive: true, force: true });
  }
});
