'use strict';
/* Die Wache um `npm test` kennzeichnet Ausgaben, die aus einem Testprozess stammen (29.09.2026): zweimal an einem Tag
   wurden die gepflanzten Abbrüche der Proben (geteilte Konfiguration, Temp-Reste) für echte Funde gehalten.
   Rot-Beweis: ohne den Test-Schalter (so läuft der echte Hook) steht kein Zusatz — die Zeile ist ein echter Befund. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const w = require('../tools/geteilte-git-config-wache.js');

test('[Gegenprobe] im Testprozess trägt die Meldung den Zusatz „Probe eines Tests"', () => {
  assert.match(w.kennung({ VD_HOOK_SPERRE_JE_PID: '1' }), /Probe eines Tests, kein Befund dieses Laufs/);
});

test('[Rot-Beweis] im echten Hook (ohne Test-Schalter) steht kein Zusatz', () => {
  assert.strictEqual(w.kennung({}), '');
});

test('[Gegenprobe] eine gepflanzte Temp-Rest-Meldung aus einem Testprozess ist als Probe erkennbar', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'wache-probe-kennung-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: repo, env: w.ohneGitUmgebung() });
    const alt = console.error; const zeilen = []; console.error = (x) => zeilen.push(String(x));
    try {
      w.bewachterLauf([process.execPath, '-e', "require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'leck-kennung-'))"],
        { repo, temp: true, tempBasis: repo });
    } finally { console.error = alt; }
    const z = zeilen.find((x) => x.startsWith('[temp-aufraeumen]'));
    assert.ok(z, zeilen.join('\n'));
    assert.match(z, /\(Probe eines Tests, kein Befund dieses Laufs\) ABBRUCH/);
  } finally { fs.rmSync(repo, { recursive: true, force: true }); }
});
