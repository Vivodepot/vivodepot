'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   L3 (19.09.2026): tools/lib/test-zeitgrenze-preload.js sorgt dafür, dass JEDER
   node --test-Lauf eine Zeitgrenze trägt, auch der direkte Weg `node --test DATEI.test.js` ohne
   --test-timeout — der Weg, der beim L2-Push einen 11 Stunden verwaisten Testlauf zuließ.
   Rot-Beweis PFLICHT laut Auftrag: ein hängender Test, DIREKT aufgerufen (node:test ohne
   Destrukturierung gebunden — genau die Form, die ein reiner Property-Patch nicht deckt), endet
   rot statt unbegrenzt zu laufen.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
const { schonGesetzt, istTestLauf } = require('../tools/lib/test-zeitgrenze-preload.js');

const REPO = path.join(__dirname, '..');
const PRELOAD = path.join(REPO, 'tools', 'lib', 'test-zeitgrenze-preload.js');
// Ein verschachtelter node --test-Aufruf erbt sonst NODE_TEST_CONTEXT vom umschliessenden Lauf
// dieser Datei selbst und uebergeht JEDE Datei mit nur einer Warnung (dasselbe Muster wie
// ueberall sonst im Repo: env -u NODE_TEST_CONTEXT vor jedem verschachtelten Aufruf).
const env = (() => { const e = ohneGitUmgebung(); delete e.NODE_TEST_CONTEXT; return e; })();

test('[Erkennung] schonGesetzt erkennt beide Schreibweisen, istTestLauf nur unter --test', () => {
  assert.equal(schonGesetzt(['--test', '--test-timeout=5000']), true);
  assert.equal(schonGesetzt(['--test', '--test-timeout', '5000']), true);
  assert.equal(schonGesetzt(['--test', '--test-timeout=0']), true, 'eine ausdrückliche 0 ist eine bewusste Wahl, keine Lücke');
  assert.equal(schonGesetzt(['--test']), false);
  assert.equal(istTestLauf(['--test', '--require', 'x']), true);
  assert.equal(istTestLauf(['--require', 'x']), false, 'ohne --test darf nichts neu gestartet werden (kein Endlos-Neustart bei fremden node-Aufrufen)');
});

function fixture(dir, dateiname, inhalt) {
  fs.writeFileSync(path.join(dir, dateiname), inhalt);
  return path.join(dir, dateiname);
}

function lauf(dir, args, extraEnv) {
  return spawnSync(process.execPath, ['--test', '--require', PRELOAD, ...args], {
    cwd: dir, env: { ...env, ...extraEnv }, encoding: 'utf8', timeout: 15000,
  });
}

test('[Rot-Beweis·direkt] ein hängender Test, OHNE Destrukturierung gebunden, endet rot statt unbegrenzt zu laufen', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeitgrenze-'));
  try {
    const f = fixture(dir, 'haengt.test.js',
      "const test = require('node:test');\ntest('haengt', () => new Promise(() => {}));\n");
    const start = Date.now();
    const r = lauf(dir, [f], { VD_TEST_TIMEOUT_MS: '1500' });
    const dauer = Date.now() - start;
    assert.notEqual(r.status, 0, 'ROT ERWARTET: der hängende Test darf den Lauf nicht grün beenden. ' + r.stdout + r.stderr);
    assert.match(r.stdout + r.stderr, /timed out/, 'die Meldung muss den Timeout nennen, kein anderer Fehlschlag');
    assert.ok(dauer < 8000, 'die Zeitgrenze muss wirklich greifen, nicht nach dem spawnSync-Limit erst enden (Dauer: ' + dauer + 'ms)');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Rot-Beweis·destrukturiert] dieselbe Zeitgrenze greift auch bei { test } = require(...)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeitgrenze-'));
  try {
    const f = fixture(dir, 'haengt.test.js',
      "const { test } = require('node:test');\ntest('haengt', () => new Promise(() => {}));\n");
    const r = lauf(dir, [f], { VD_TEST_TIMEOUT_MS: '1500' });
    assert.notEqual(r.status, 0, 'ROT ERWARTET. ' + r.stdout + r.stderr);
    assert.match(r.stdout + r.stderr, /timed out/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Gegenprobe] ein normaler, echter Test bleibt grün — für beide Bindeformen', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeitgrenze-'));
  try {
    const a = fixture(dir, 'a.test.js', "const test = require('node:test');\ntest('ok-direkt', () => {});\n");
    const b = fixture(dir, 'b.test.js', "const { test } = require('node:test');\ntest('ok-destr', () => {});\n");
    const r = lauf(dir, [a, b], {});
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /ℹ pass 2/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Gegenprobe] eine ausdrücklich benannte Ausnahme ({ timeout: N } am Test) wird NICHT überschrieben', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeitgrenze-'));
  try {
    const f = fixture(dir, 'lang.test.js',
      "const { test } = require('node:test');\n"
      + "test('braucht laenger als die Vorgabe, benannt: Testfall', { timeout: 3000 }, async () => { await new Promise((r) => setTimeout(r, 900)); });\n");
    const r = lauf(dir, [f], { VD_TEST_TIMEOUT_MS: '400' });
    assert.equal(r.status, 0, 'die eigene, längere Angabe muss gelten, nicht die kürzere Vorgabe: ' + r.stdout + r.stderr);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('[Kein Neustart bei gesetztem Flag] mit --test-timeout auf der Kommandozeile lädt der Preload nur EINMAL je Prozess, kein zweiter Anlauf', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeitgrenze-'));
  try {
    const marker = path.join(dir, 'marker.log');
    const markerPreload = fixture(dir, 'marker-preload.js',
      "require('node:fs').appendFileSync(" + JSON.stringify(marker) + ", 'lauf\\n');\n"
      + "require(" + JSON.stringify(PRELOAD) + ");\n");
    const f = fixture(dir, 'a.test.js', "const { test } = require('node:test');\ntest('ok', () => {});\n");
    const mit = spawnSync(process.execPath, ['--test', '--test-timeout=5000', '--require', markerPreload, f], { cwd: dir, env, encoding: 'utf8', timeout: 15000 });
    assert.equal(mit.status, 0, mit.stdout + mit.stderr);
    const laeufeMit = fs.readFileSync(marker, 'utf8').trim().split('\n').length;
    fs.rmSync(marker);
    const ohne = spawnSync(process.execPath, ['--test', '--require', markerPreload, f], { cwd: dir, env, encoding: 'utf8', timeout: 15000 });
    assert.equal(ohne.status, 0, ohne.stdout + ohne.stderr);
    const laeufeOhne = fs.readFileSync(marker, 'utf8').trim().split('\n').length;
    assert.equal(laeufeOhne, laeufeMit + 1, 'OHNE gesetztes Flag muss genau EIN zusätzlicher (neu gestarteter) Prozess-Durchlauf entstehen, kein Endlos-Neustart');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
