'use strict';
/* Ein Lader im npm-test-Skript (`--require ./tests/…js`) ist kein Wächter: die Inventur darf ihn nicht als Hook-Werkzeug
   ohne Registereintrag zählen (sonst ist das Wächter-Selbsttest-Gate rot, sobald ein Test-Lader dazukommt). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ausBefehl, erheben } = require('../tools/waechter-inventur.js');

test('[Inventur·Lader] --require/--import/-r nennt einen Lader, keinen Wächter; ein echtes Werkzeug in derselben Zeile bleibt gezählt', () => {
  const z = "node --test --require ./tests/lader.js --import ./tests/lader2.mjs -r ./tests/lader3.js 'tests/**/*.test.js' && node tools/echtes-" + "werkzeug.js";
  const t = [...ausBefehl(z, {})];
  assert.ok(!t.some((x) => /lader/.test(x)), 'Lader dürfen nicht als Wächter erscheinen: ' + t.join(', '));
  assert.ok(t.includes('tools/echtes-' + 'werkzeug.js'), 'Gegenprobe: ein echtes Werkzeug in derselben Zeile muss weiter gezählt werden');
});

test('[Inventur·Lader·Rot-Beweis] ohne die Lader-Ausnahme würde der Pfad gezählt (das Muster trifft ihn tatsächlich)', () => {
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'tools', 'waechter-inventur.js'), 'utf8');
  const ohne = quelle.replace(/zeile = zeile\.replace\(\/\(\?:--require[^\n]*\n/, '');
  assert.notEqual(ohne, quelle, 'Vorbedingung: die Ausnahme steht im Quelltext');
  const fn = new Function('require', '__dirname', 'module', ohne.replace(/^#!.*\n/, '') + '\nreturn module.exports;');
  const m = { exports: {} };
  const ohneAusnahme = fn(require, path.join(__dirname, '..', 'tools'), m);
  const t = [...ohneAusnahme.ausBefehl('node --test --require ./tests/la' + 'der.js', {})];
  assert.ok(t.some((x) => /lader/.test(x)), 'ohne die Ausnahme MUSS der Lader gezählt werden — sonst prüft die Probe nichts');
});

test('[Inventur·Lader] der echte npm test-Lader steht nicht in der Inventur', () => {
  assert.ok(!erheben().some((w) => /hook-sperre-testumgebung/.test(w.deckt)));
});
