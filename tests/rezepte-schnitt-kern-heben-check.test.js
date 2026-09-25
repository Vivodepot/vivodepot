'use strict';
/* Rezept-Fixtures gegen den Kern (19.09.2026) — Klasse: „eine Änderung an vivodepot.html macht die
   Rezept-Fixtures stale, und erst die volle Suite am Landestand merkt es". `--check` vergleicht, schreibt
   nichts, und steht im pre-commit. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const WERKZEUG = path.join(REPO, 'tools', 'rezepte-schnitt-kern-heben.js');
const FIXTURES = path.join(REPO, 'tests', 'fixtures', 'dod-v1-rezepte-stand-2026-09-17');

test('[Rezept-Fixtures·Check] der eingecheckte Stand passt zum Kern (Exit 0)', () => {
  const r = spawnSync('node', [WERKZEUG, '--check'], { cwd: REPO, encoding: 'utf8' });
  assert.equal(r.status, 0, 'Fixtures stale: ' + r.stderr);
});

test('[Rezept-Fixtures·Check·Rot-Beweis] eine veränderte Fixture wird gefunden, ohne dass der Check schreibt', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rezept-check-'));
  try {
    execFileSync('cp', ['-R', FIXTURES, path.join(tmp, 'fix')]);
    const datei = path.join(tmp, 'fix', 'privat-de.json');
    const j = JSON.parse(fs.readFileSync(datei, 'utf8'));
    j.kernPruefsumme = '0'.repeat(64);
    const veraendert = JSON.stringify(j, null, 2) + '\n';
    fs.writeFileSync(datei, veraendert);
    const r = spawnSync('node', [WERKZEUG, '--check', '--fixtures', path.join(tmp, 'fix')], { cwd: REPO, encoding: 'utf8' });
    assert.equal(r.status, 1, 'die verfälschte Fixture muss den Check rot machen: ' + r.stdout + r.stderr);
    assert.match(r.stderr, /privat-de/);
    assert.equal(fs.readFileSync(datei, 'utf8'), veraendert, '--check darf nichts schreiben');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
