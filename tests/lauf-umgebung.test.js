'use strict';
/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   VARIABLEN DES ÄUSSEREN LAUFS ERREICHEN KEINE TESTDATEI (26.10.2026) — tools/lib/lauf-umgebung.js.
   Zwei Zugkopf-Läufe wurden rot, weil Testdateien Variablen des äußeren Laufs erbten: ein verschachtelter Testlauf
   schrieb das künstliche Rot seiner Fixture in die Frührot-Datei, eine Platz-Probe hielt ihren Platz nicht selbst.
   Geprüft: (1) die Liste deckt jede VD_-Variable, die ein Reporter des Testlaufs liest (Wächter für neue Variablen);
   (2) die Vorlade-Datei nimmt sie in einer Testdatei heraus, im Testläufer nicht; (3) Ende zu Ende: ein verschachtelter
   Lauf mit Rot erreicht die Frührot-Datei des äußeren nicht. Rot-Beweise je Stelle.
   ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const L = require('../tools/lib/lauf-umgebung.js');

const WURZEL = path.join(__dirname, '..');
const VORLADEN = path.join(WURZEL, 'tests', 'hook-sperre-testumgebung.js');
const REPORTER = path.join(WURZEL, 'tools', 'lib', 'datei-zeiten-reporter.mjs');

/* Die Reporter des Testlaufs: jede --test-reporter=<datei> im Befehl von `npm test`. */
function reporterDateien() {
  const befehl = require('../package.json').scripts.test;
  return [...befehl.matchAll(/--test-reporter=(\.\/[^\s'"]+)/g)].map((m) => m[1].replace(/^\.\//, ''));
}
function fehlendeVariablen(quellen, liste = L.LAUF_VARIABLEN) {
  const gelesen = new Set();
  for (const q of quellen) for (const m of q.matchAll(/process\.env\.(VD_[A-Z0-9_]+)/g)) gelesen.add(m[1]);
  return [...gelesen].filter((v) => !liste.includes(v)).sort();
}

test('[Lauf·Umgebung] jede VD_-Variable, die ein Reporter des Testlaufs liest, steht in der Liste', () => {
  const dateien = reporterDateien();
  assert.ok(dateien.includes('tools/lib/datei-zeiten-reporter.mjs'), 'Vorbedingung: der Zeiten-Reporter ist im Befehl');
  const quellen = dateien.map((d) => fs.readFileSync(path.join(WURZEL, d), 'utf8'));
  assert.deepEqual(fehlendeVariablen(quellen), []);
});
test('[Lauf·Umgebung·Rot-Beweis] ein Reporter mit einer neuen Variable fällt auf', () => {
  assert.deepEqual(fehlendeVariablen(["if (process.env.VD_ERSTES_ROT) x(); if (process.env.VD_NEUE_SPUR) y();"]), ['VD_NEUE_SPUR']);
});

function umgebungNachVorladen(extra) {
  const env = { ...process.env, ...extra };
  for (const k of L.LAUF_VARIABLEN) env[k] = 'aussen';
  env.VD_NACHWEIS_DIR = '/nachweis';
  const r = spawnSync(process.execPath, ['--require', VORLADEN, '-e', 'process.stdout.write(JSON.stringify(process.env))'],
    { cwd: WURZEL, env, encoding: 'utf8', timeout: 60000 });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}
test('[Lauf·Umgebung·Vorladen] in einer Testdatei sind die Lauf-Variablen fort, im Testläufer nicht; Nachweis-Ziel bleibt', () => {
  const kind = umgebungNachVorladen({ NODE_TEST_CONTEXT: 'child-v8' });
  for (const k of L.LAUF_VARIABLEN) assert.equal(kind[k], undefined, k + ' in der Testdatei');
  assert.equal(kind.VD_NACHWEIS_DIR, '/nachweis', 'wer den Nachweis behalten will, setzt ihn für die Proben');
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const laeufer = spawnSync(process.execPath, ['--require', VORLADEN, '-e', 'process.stdout.write(String(process.env.VD_ERSTES_ROT))'],
    { cwd: WURZEL, env: { ...env, VD_ERSTES_ROT: 'aussen' }, encoding: 'utf8', timeout: 60000 });
  assert.equal(laeufer.stdout, 'aussen', 'der Testläufer behält sie für seinen Reporter');
});

/* Ende zu Ende: eine Testdatei startet einen eigenen Testlauf mit künstlichem Rot (wie die Wackel-Probe). */
function verschachtelt({ mitVorladen }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lauf-umgebung-'));
  const innen = path.join(dir, 'innen.test.js');
  fs.writeFileSync(innen, "require('node:test')('innen-rot', () => { throw new Error('künstlich'); });\n");
  const aussen = path.join(dir, 'aussen.test.js');
  fs.writeFileSync(aussen, `const { spawnSync } = require('node:child_process'); const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
require('node:test')('aussen', () => { const r = spawnSync(process.execPath, ['--test', '--test-reporter=${REPORTER}', '--test-reporter-destination=stderr', ${JSON.stringify(innen)}], { cwd: ${JSON.stringify(dir)}, env, encoding: 'utf8' }); if (r.status === 0) throw new Error('innen hätte rot sein sollen'); });\n`);
  const rot = path.join(dir, 'erstes-rot');
  const env = { ...process.env, VD_ERSTES_ROT: rot }; delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, ['--test', ...(mitVorladen ? ['--require', VORLADEN] : []), aussen],
    { cwd: dir, env, encoding: 'utf8', timeout: 120000 });
  const inhalt = fs.existsSync(rot) ? fs.readFileSync(rot, 'utf8') : '';
  fs.rmSync(dir, { recursive: true, force: true });
  return { status: r.status, inhalt, aus: r.stdout + r.stderr };
}
test('[Lauf·Umgebung·Verschachtelt] das Rot eines Testlaufs, den eine Probe startet, erreicht die Frührot-Datei nicht', () => {
  const r = verschachtelt({ mitVorladen: true });
  assert.equal(r.status, 0, r.aus);
  assert.doesNotMatch(r.inhalt, /innen-rot/);
});
test('[Lauf·Umgebung·Verschachtelt·Rot-Beweis] ohne die Vorlade-Datei schreibt der innere Lauf sein Rot in die äußere Datei', () => {
  const r = verschachtelt({ mitVorladen: false });
  assert.match(r.inhalt, /innen-rot/);
});
test('[Lauf·Umgebung·Ort] npm test lädt die Vorlade-Datei in jede Testdatei', () => {
  assert.match(require('../package.json').scripts.test, /--require \.\/tests\/hook-sperre-testumgebung\.js/);
});
