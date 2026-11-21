'use strict';
/* Probe zu tools/test-teil.js (19.11.2026, Befund OPENCODE-PIPELINE-ROT, Rückfall): der Teil-Schalter steht vor den Mustern,
   der Rest ist der Befehl von `npm test`; ohne Teil kein Lauf. Dazu ein echter Lauf in einem Wegwerf-Ordner: zwei Teile
   fahren zusammen jede Datei genau einmal, und hinter den Mustern hätte Node den Schalter nicht als Schalter gelesen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const T = require('../tools/test-teil.js');
// Ohne NODE_TEST_CONTEXT: sonst meldet der innere Lauf an den äußeren Runner statt auf stdout.
const ohneTestKontext = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT'));

// Erfundener Wächterpfad, zusammengesetzt: keine Behauptung über eine Datei im Repo.
const WACHE = 'tools/' + 'wache.js';
const SKRIPT = "node " + WACHE + " -- node --test --require ./a.js --test-reporter=spec 'tests/**/*.test.js' 'tools/**/*.test.js'";

test('[Test-Teil·Befehl] der Schalter steht vor dem ersten Muster, Vorlader und Reporter bleiben', () => {
  const [prog, args] = T.befehl(SKRIPT, { index: 3, gesamt: 10 });
  assert.equal(prog, 'node');
  assert.deepEqual(args, [WACHE, '--', 'node', '--test', '--require', './a.js', '--test-reporter=spec', '--test-shard=3/10', 'tests/**/*.test.js', 'tools/**/*.test.js']);
});

test('[Test-Teil·Teil] aus --teil oder aus CI_NODE_INDEX/CI_NODE_TOTAL; ohne oder ungültig kein Lauf', () => {
  assert.deepEqual(T.teilLesen(['--teil', '2/10'], {}), { index: 2, gesamt: 10 });
  assert.deepEqual(T.teilLesen([], { CI_NODE_INDEX: '10', CI_NODE_TOTAL: '10' }), { index: 10, gesamt: 10 });
  assert.throws(() => T.teilLesen([], {}), /Teil fehlt/);
  assert.throws(() => T.teilLesen(['--teil', '11/10'], {}), /ungültig/);
  assert.throws(() => T.teilLesen(['--teil', '0/10'], {}), /ungültig/);
});

test('[Test-Teil·Lauf] zwei Teile fahren jede Datei genau einmal; hinter den Mustern fährt Node alles (Rot-Beweis)', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'test-teil-'));
  try {
    for (const n of ['d', 'a', 'c', 'b', 'e']) fs.writeFileSync(path.join(d, n + '.test.js'), "require('node:test')('" + n + "', () => {});\n");
    const lauf = (args) => spawnSync(process.execPath, args, { cwd: d, encoding: 'utf8', env: ohneTestKontext }).stdout.split('\n').filter((z) => /^ok \d+ - /.test(z)).map((z) => z.replace(/^ok \d+ - /, ''));
    const [, a1] = T.befehl("node --test --test-reporter=tap '*.test.js'", { index: 1, gesamt: 2 });
    const [, a2] = T.befehl("node --test --test-reporter=tap '*.test.js'", { index: 2, gesamt: 2 });
    const eins = lauf(a1); const zwei = lauf(a2);
    assert.deepEqual(eins, ['a', 'c', 'e']);
    assert.deepEqual(zwei, ['b', 'd']);
    assert.deepEqual([...eins, ...zwei].sort(), ['a', 'b', 'c', 'd', 'e']);
    assert.deepEqual(lauf(['--test', '--test-reporter=tap', '*.test.js', '--test-shard=1/2']).sort(), ['a', 'b', 'c', 'd', 'e'], 'Rot-Beweis: hinter dem Muster kein Teil');
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('[Test-Teil·Bestand] das Skript von npm test nennt Muster, und TEILE ist mindestens acht', () => {
  const skript = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).scripts.test;
  const [, args] = T.befehl(skript, { index: 1, gesamt: T.TEILE });
  assert.ok(args.includes('--test-shard=1/' + T.TEILE));
  assert.ok(args.indexOf('--test-shard=1/' + T.TEILE) < args.findIndex((a) => a.includes('*')));
  assert.ok(T.TEILE >= 8);
});
