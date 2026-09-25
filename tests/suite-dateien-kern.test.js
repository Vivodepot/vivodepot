'use strict';
/* U2-ADR-228. `suiteDateien()` ist der einzige Teil des Fixes, der isoliert prüfbar ist — der
   eigentliche Effekt (welche Zahl `node --test` am Ende meldet) hängt von echten Suite-Läufen ab,
   die hier zu teuer wären. Geprüft wird der Vertrag: getrackte `*.test.js` rein, ungetrackte
   raus — an einem echten, throwaway Git-Repo, nicht an einer Annahme über `git ls-files`. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { suiteDateien } = require('../scripts/suite-dateien-kern.js');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

// Während eines echten Hook-Laufs setzt git GIT_DIR/GIT_INDEX_FILE — die gewinnen gegen `cwd`.
// Ohne dieses Stripping landen die `git add`/`git commit`-Aufrufe unten NICHT im throwaway-Repo,
// sondern im echten Repo-Index (real getroffen: lief am Terminal grün, im `pre-commit`-Hook
// gegen das eigentliche Repo — dieselbe Ursache wie `ohneGitUmgebung()` in
// `scripts/build-datum-kern.js`, jetzt EIN gemeinsamer Ort, s. tools/lib/ohne-git-umgebung.js).
function git(args, cwd) { execFileSync('git', args, { cwd, env: ohneGitUmgebung() }); }

function mitFrischemRepo(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'suite-dateien-kern-'));
  try {
    git(['init', '--quiet'], tmp);
    git(['config', 'user.email', 'probe@example.invalid'], tmp);
    git(['config', 'user.name', 'Probe'], tmp);
    fs.mkdirSync(path.join(tmp, 'tests'));
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

test('[Suite-Dateien] eine committete .test.js-Datei wird gefunden', () => {
  mitFrischemRepo((tmp) => {
    fs.writeFileSync(path.join(tmp, 'tests', 'a.test.js'), '', 'utf8');
    git(['add', 'tests/a.test.js'], tmp);
    git(['commit', '--quiet', '-m', 'a'], tmp);
    assert.deepEqual(suiteDateien(tmp), ['tests/a.test.js']);
  });
});

test('[Suite-Dateien] eine NUR gestagte (nicht committete) .test.js-Datei wird ebenfalls gefunden — `git ls-files` sieht den Index, nicht erst HEAD', () => {
  mitFrischemRepo((tmp) => {
    fs.writeFileSync(path.join(tmp, 'tests', 'a.test.js'), '', 'utf8');
    git(['add', 'tests/a.test.js'], tmp);
    assert.deepEqual(suiteDateien(tmp), ['tests/a.test.js']);
  });
});

test('[Suite-Dateien] eine ungetrackte .test.js-Datei bleibt draußen — der Rot-Beweis für U2-ADR-228', () => {
  mitFrischemRepo((tmp) => {
    fs.writeFileSync(path.join(tmp, 'tests', 'committet.test.js'), '', 'utf8');
    git(['add', 'tests/committet.test.js'], tmp);
    git(['commit', '--quiet', '-m', 'a'], tmp);
    // Ungetrackt angelegt, NICHT `git add` — genau die Lage der acht ARBEITSLISTE-Dateien.
    fs.writeFileSync(path.join(tmp, 'tests', 'ungetrackt.test.js'), '', 'utf8');
    assert.deepEqual(suiteDateien(tmp), ['tests/committet.test.js']);
  });
});

test('[Suite-Dateien] eine committete Datei ohne .test.-Suffix wird NICHT mitgezählt (z. B. Hilfsmodule wie tests/load-kern.js)', () => {
  mitFrischemRepo((tmp) => {
    fs.writeFileSync(path.join(tmp, 'tests', 'a.test.js'), '', 'utf8');
    fs.writeFileSync(path.join(tmp, 'tests', 'helfer.js'), '', 'utf8');
    git(['add', 'tests/a.test.js', 'tests/helfer.js'], tmp);
    git(['commit', '--quiet', '-m', 'a'], tmp);
    assert.deepEqual(suiteDateien(tmp), ['tests/a.test.js']);
  });
});

test('[Suite-Dateien] .test.cjs und .test.mjs werden ebenfalls erfasst, .test.txt nicht', () => {
  mitFrischemRepo((tmp) => {
    fs.writeFileSync(path.join(tmp, 'tests', 'a.test.cjs'), '', 'utf8');
    fs.writeFileSync(path.join(tmp, 'tests', 'b.test.mjs'), '', 'utf8');
    fs.writeFileSync(path.join(tmp, 'tests', 'c.test.txt'), '', 'utf8');
    git(['add', 'tests/a.test.cjs', 'tests/b.test.mjs', 'tests/c.test.txt'], tmp);
    git(['commit', '--quiet', '-m', 'a'], tmp);
    assert.deepEqual(suiteDateien(tmp).sort(), ['tests/a.test.cjs', 'tests/b.test.mjs']);
  });
});

test('[Positivkontrolle] gegen den echten Bestand: alle 8 bekannten ARBEITSLISTE-Testdateien bleiben draußen, mindestens 700 echte Testdateien bleiben drin', () => {
  const REPO = path.join(__dirname, '..');
  const dateien = suiteDateien(REPO);
  const ARBEITSLISTE_MUSTER = ['arbeitsliste-kennungen', 'arbeitsliste-lockstep-anlass', 'arbeitsliste-standform',
    'kette-erzeugen', 'offen-bei-beauftragt-alterssicht', 'offen-bei-leser', 'regel2-erledigt-beleg-pruefen', 'regel8-herkunft-pruefen'];
  for (const name of ARBEITSLISTE_MUSTER) {
    assert.ok(!dateien.includes('tests/' + name + '.test.js'), name + ' ist ungetrackt und darf nicht in der Liste stehen');
  }
  assert.ok(dateien.length >= 700, 'Positivkontrolle: der echte, getrackte Bestand wird wirklich gelesen (' + dateien.length + ' Dateien)');
});
