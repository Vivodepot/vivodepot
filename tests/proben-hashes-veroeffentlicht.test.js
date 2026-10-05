'use strict';
/* Wächter gegen die Klasse PROBEN-LOKALE-HASHES (03.10.2026): keine Probe hängt an einem Commit, der nicht auf origin
   liegt. Rot-Beweis in einem Wegwerf-Repo mit eigenem origin: ein nur lokaler Commit fällt, ein gepushter nicht. */
require('./helfer/platz-isoliert.js').platzIsolieren();
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
const { unveroeffentlichteHashes } = require('../tools/lib/hash-veroeffentlicht.js');

const REPO = path.join(__dirname, '..');
const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8', env: ohneGitUmgebung() }).trim();

test('[Hash veröffentlicht] keine Probe unter tests/ nennt einen Commit, den kein Zweig auf origin enthält', () => {
  const dateien = git(['ls-files', 'tests'], REPO).split('\n').filter((f) => /\.(c?js|mjs)$/.test(f));
  assert.ok(dateien.length > 100);
  assert.deepEqual(unveroeffentlichteHashes(dateien, { repo: REPO }), []);
});

test('[Hash veröffentlicht·Rot-Beweis] ein nur lokaler Commit fällt, ein gepushter und ein erfundener nicht', () => {
  const basis = fs.mkdtempSync(path.join(os.tmpdir(), 'hash-veroeffentlicht-'));
  try {
    const hub = path.join(basis, 'hub.git');
    const klon = path.join(basis, 'klon');
    git(['init', '--bare', '-q', '--initial-branch=main', hub], basis);
    git(['clone', '-q', hub, klon], basis);
    const c = (n) => { fs.writeFileSync(path.join(klon, n), n); git(['add', n], klon); git(['-c', 'user.email=a@a', '-c', 'user.name=A', 'commit', '-q', '-m', n], klon); return git(['rev-parse', '--short=9', 'HEAD'], klon); };
    const gepusht = c('a.txt');
    git(['push', '-q', 'origin', 'HEAD:main'], klon);
    git(['fetch', '-q', 'origin'], klon);
    const lokal = c('b.txt');
    fs.mkdirSync(path.join(klon, 'tests'));
    fs.writeFileSync(path.join(klon, 'tests', 'x.test.js'), [
      `const a = execFileSync('git', ['show', '${lokal}:b.txt']);`,
      `const b = '${gepusht}';`,
      `const c = 'deadbeef';`,
    ].join('\n'));
    const funde = unveroeffentlichteHashes(['tests/x.test.js'], { repo: klon });
    assert.deepEqual(funde, [`Hash nicht veröffentlicht: ${lokal} in tests/x.test.js:1`]);
  } finally {
    fs.rmSync(basis, { recursive: true, force: true });
  }
});
