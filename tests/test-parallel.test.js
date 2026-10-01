'use strict';
/* Test-Parallelität aus EINER Stelle (tools/lib/test-parallel.js, 29.09.2026): höchstens die Hälfte der Kerne je
   Lauf, Playwright die Hälfte davon, übersteuerbar nur über VD_TEST_PARALLEL / PW_WORKERS. Rot-Beweis: die Wache ohne
   die Einfügung liefe mit node --test-Vorgabe (Kerne - 1). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const P = require('../tools/lib/test-parallel.js');

const REPO = path.join(__dirname, '..');

test('[Gegenprobe] Vorgabe: die Hälfte der Kerne, mindestens 2; Playwright die Hälfte davon, mindestens 1', () => {
  assert.strictEqual(P.testParallel({ env: {}, kerne: 15 }), 7);
  assert.strictEqual(P.testParallel({ env: {}, kerne: 2 }), 2);
  assert.strictEqual(P.pwWorker({ env: {}, kerne: 15 }), 3);
  assert.strictEqual(P.pwWorker({ env: {}, kerne: 2 }), 1);
});

test('[Gegenprobe] VD_TEST_PARALLEL und PW_WORKERS übersteuern; Unsinn wird ignoriert', () => {
  assert.strictEqual(P.testParallel({ env: { VD_TEST_PARALLEL: '14' }, kerne: 15 }), 14);
  assert.strictEqual(P.pwWorker({ env: { VD_TEST_PARALLEL: '14' }, kerne: 15 }), 7);
  assert.strictEqual(P.pwWorker({ env: { PW_WORKERS: '5' }, kerne: 15 }), 5);
  assert.strictEqual(P.testParallel({ env: { VD_TEST_PARALLEL: 'viel' }, kerne: 15 }), 7);
});

test('[Gegenprobe] --test-concurrency wird nur in node --test eingefügt und nie doppelt', () => {
  assert.deepStrictEqual(P.mitParallelitaet(['node', '--test', 'a.test.js'], 7), ['node', '--test', '--test-concurrency=7', 'a.test.js']);
  assert.deepStrictEqual(P.mitParallelitaet(['node', '--test', '--test-concurrency=2', 'a'], 7), ['node', '--test', '--test-concurrency=2', 'a']);
  assert.deepStrictEqual(P.mitParallelitaet(['npx', 'playwright', 'test'], 7), ['npx', 'playwright', 'test']);
});

test('[Gegenprobe] eine Stelle: die Wache und playwright.config.js lesen den Wert aus tools/lib/test-parallel.js', () => {
  const wache = fs.readFileSync(path.join(REPO, 'tools', 'geteilte-git-config-wache.js'), 'utf8');
  assert.match(wache, /require\('\.\/lib\/test-parallel\.js'\)/);
  assert.match(wache, /mitParallelitaet\(/);
  const pw = fs.readFileSync(path.join(REPO, 'playwright.config.js'), 'utf8');
  assert.match(pw, /workers: process\.env\.CI \? 1 : require\('\.\/tools\/lib\/test-parallel\.js'\)\.pwWorker\(\)/);
  const skript = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8')).scripts.test;
  assert.ok(!/--test-concurrency/.test(skript), 'npm test setzt keine eigene Zahl — sonst gälte die eine Stelle nicht');
  assert.ok(skript.startsWith('node tools/geteilte-git-config-wache.js -- node --test'), 'npm test läuft über die Wache');
});

test('[Rot-Beweis] ohne die Einfügung in der Wache fehlte --test-concurrency, node nähme Kerne - 1', () => {
  const befehl = ['node', '--test', 'a.test.js'];
  assert.ok(!befehl.some((a) => a.startsWith('--test-concurrency')), 'Vorbedingung: der rohe Befehl trägt keine Zahl');
  assert.ok(P.mitParallelitaet(befehl, 7).includes('--test-concurrency=7'));
});
