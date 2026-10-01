'use strict';
/* Die Wache um `npm test` meldet, was ein Lauf im Arbeitsbaum anlegt (28.09.2026, Befund
   KONFORMITAET-ARTEFAKTE-IM-BAUM). Zuerst nur meldend. Rot-Beweis: ein Wegwerf-Repo, in dem der bewachte
   Befehl eine Datei anlegt — die Meldung nennt sie; ohne den Abdruck (Fassung davor) stand dort nichts. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const w = require('../tools/geteilte-git-config-wache.js');

test('baumNeu: nur neu Angelegtes, Playwright-Ablagen nicht, .artifacts sehr wohl', () => {
  assert.deepStrictEqual(w.baumNeu(['?? a'], ['?? a', '?? b', '!! test-results/x', '!! tests/konformitaet/.artifacts/n.json']),
    ['b', 'tests/konformitaet/.artifacts/n.json']);
});

test('ein Lauf, der in den Baum schreibt, wird gemeldet — und der Exit bleibt der des Laufs', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'baum-abdruck-suite-'));
  try {
    const env = w.ohneGitUmgebung();
    execFileSync('git', ['init', '-q'], { cwd: repo, env });
    const alt = console.error; const zeilen = []; console.error = (x) => zeilen.push(String(x));
    let rc;
    try { rc = w.bewachterLauf([process.execPath, '-e', "require('fs').writeFileSync('gepflanzt.txt','x')"], { repo, temp: true, tempBasis: repo }); }
    finally { console.error = alt; }
    assert.strictEqual(rc, 0);
    assert.ok(zeilen.some((z) => z.startsWith('[baum-abdruck]') && z.includes('HINWEIS')), zeilen.join('\n'));
    assert.ok(zeilen.some((z) => z.trim() === 'gepflanzt.txt'), zeilen.join('\n'));
  } finally { fs.rmSync(repo, { recursive: true, force: true }); }
});
