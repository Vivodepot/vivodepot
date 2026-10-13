'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Die Quelle eines Baus ist ein benannter Commit (11.10.2026) — die schnelle Probe zu tools/lib/quelle-aus-commit.js.

   Ein kleines Wegwerf-Repository mit einem Commit. Verlangt wird:
     - das entpackte Verzeichnis trägt genau den Commit, auch wenn im Arbeitsbaum eine nicht getrackte Datei, eine
       ignorierte Datei, eine nicht committete Änderung und eine vorgemerkte neue Datei liegen;
     - die Inhaltsprüfung schlägt bei jeder Abweichung an (Rot-Beweis je Sorte: Inhalt, zusätzliche Datei, fehlende
       Datei, Ausführbar-Bit, Symlink) und schweigt beim unveränderten Verzeichnis (Gegenprobe);
     - das Wegwerf-Verzeichnis ist nach dem Lauf fort, auch wenn der Lauf darin wirft.
   Der ganze Weg durch den Zuschnitt-Bau (zwei volle Bauten, vier Störungen, die Verweigerungen) steht in einer eigenen,
   langsameren Probe.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
const { commitAufloesen, inhaltGegenCommit, mitQuelleAusCommit } = require('../tools/lib/quelle-aus-commit.js');

const env = ohneGitUmgebung();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'quelle-aus-commit-probe-'));
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', env });
  assert.equal(r.status, 0, 'git ' + args.join(' ') + ': ' + (r.stderr || '').trim());
  return r.stdout;
}
function baum(dir, rel = '') {
  const liste = [];
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) liste.push(...baum(dir, r)); else liste.push(r);
  }
  return liste.sort();
}

const repo = path.join(tmp, 'repo');
fs.mkdirSync(path.join(repo, 'sub'), { recursive: true });
fs.writeFileSync(path.join(repo, 'a.txt'), 'a im Commit\n');
fs.writeFileSync(path.join(repo, 'sub', 'b.sh'), '#!/bin/sh\n');
fs.chmodSync(path.join(repo, 'sub', 'b.sh'), 0o755);
fs.symlinkSync('a.txt', path.join(repo, 'verweis'));
// Der Name ist zusammengesetzt: als ganze Zeichenkette läse ihn der Zuschnitt als Verweis auf die Datei dieses Repositorys.
const AUSNAHMEN = '.git' + 'ignore';
fs.writeFileSync(path.join(repo, AUSNAHMEN), 'ausgenommen/\n');
git(['init', '-q'], repo);
git(['add', '-A'], repo);
git(['-c', 'user.name=Probe', '-c', 'user.email=probe@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null',
  'commit', '-q', '-m', 'Stand der Probe'], repo);
const commit = git(['rev-parse', 'HEAD'], repo).trim();
const IM_COMMIT = [AUSNAHMEN, 'a.txt', 'sub/b.sh', 'verweis'];

test('[Quelle aus Commit] vier Störungen im Arbeitsbaum erreichen das entpackte Verzeichnis nicht', () => {
  fs.writeFileSync(path.join(repo, 'ungetrackt.txt'), 'x\n');
  fs.mkdirSync(path.join(repo, 'ausgenommen'));
  fs.writeFileSync(path.join(repo, 'ausgenommen', 'bild.png'), 'x\n');
  fs.appendFileSync(path.join(repo, 'a.txt'), 'nicht committet\n');
  fs.writeFileSync(path.join(repo, 'vorgemerkt.txt'), 'x\n');
  git(['add', 'vorgemerkt.txt'], repo);
  const status = git(['status', '--porcelain', '--ignored'], repo);
  for (const zeile of ['?? ungetrackt.txt', '!! ausgenommen/', ' M a.txt', 'A  vorgemerkt.txt']) {
    assert.ok(status.split('\n').includes(zeile), 'Vorbedingung: ' + zeile + ' steht im Status: ' + JSON.stringify(status));
  }
  let ort;
  const ergebnis = mitQuelleAusCommit(repo, commit, ({ quelle, tmp: wegwerf }) => {
    ort = wegwerf;
    assert.deepEqual(baum(quelle), IM_COMMIT);
    assert.equal(fs.readFileSync(path.join(quelle, 'a.txt'), 'utf8'), 'a im Commit\n');
    return 'gelaufen';
  });
  assert.equal(ergebnis, 'gelaufen');
  assert.equal(fs.existsSync(ort), false, 'das Wegwerf-Verzeichnis ist nach dem Lauf fort');
});

test('[Quelle aus Commit] das Wegwerf-Verzeichnis ist auch fort, wenn der Lauf darin wirft', () => {
  let ort;
  assert.throws(() => mitQuelleAusCommit(repo, commit, ({ tmp: wegwerf }) => { ort = wegwerf; throw new Error('Abbruch der Probe'); }), /Abbruch der Probe/);
  assert.equal(typeof ort, 'string');
  assert.equal(fs.existsSync(ort), false);
});

test('[Quelle aus Commit·Gegenprobe und Rot-Beweis] die Inhaltsprüfung schweigt beim Commit und nennt jede Abweichung', () => {
  mitQuelleAusCommit(repo, commit, ({ quelle }) => {
    assert.deepEqual(inhaltGegenCommit(quelle, repo, commit), [], 'Gegenprobe: unverändert keine Abweichung');
    const faelle = [
      ['anderer Inhalt', /^a\.txt: anderer Inhalt$/, () => fs.appendFileSync(path.join(quelle, 'a.txt'), 'x'), () => fs.writeFileSync(path.join(quelle, 'a.txt'), 'a im Commit\n')],
      ['zusätzliche Datei', /^sub\/neu\.txt: liegt im Verzeichnis, nicht im Commit$/, () => fs.writeFileSync(path.join(quelle, 'sub', 'neu.txt'), 'x'), () => fs.rmSync(path.join(quelle, 'sub', 'neu.txt'))],
      ['fehlende Datei', /^\.git[i]gnore: im Commit, fehlt im Verzeichnis$/, () => fs.rmSync(path.join(quelle, AUSNAHMEN)), () => fs.writeFileSync(path.join(quelle, AUSNAHMEN), 'ausgenommen/\n')],
      ['Ausführbar-Bit', /^sub\/b\.sh: Ausführbar-Bit fehlt, im Commit 100755$/, () => fs.chmodSync(path.join(quelle, 'sub', 'b.sh'), 0o644), () => fs.chmodSync(path.join(quelle, 'sub', 'b.sh'), 0o755)],
      ['Symlink zeigt anderswohin', /^verweis: Symlink zeigt anderswohin$/, () => { fs.rmSync(path.join(quelle, 'verweis')); fs.symlinkSync('sub/b.sh', path.join(quelle, 'verweis')); }, () => { fs.rmSync(path.join(quelle, 'verweis')); fs.symlinkSync('a.txt', path.join(quelle, 'verweis')); }],
      ['Symlink durch Datei ersetzt', /^verweis: im Commit ein Symlink, im Verzeichnis nicht$/, () => { fs.rmSync(path.join(quelle, 'verweis')); fs.writeFileSync(path.join(quelle, 'verweis'), 'a.txt'); }, () => { fs.rmSync(path.join(quelle, 'verweis')); fs.symlinkSync('a.txt', path.join(quelle, 'verweis')); }],
    ];
    for (const [name, muster, stoeren, heilen] of faelle) {
      stoeren();
      const ab = inhaltGegenCommit(quelle, repo, commit);
      assert.equal(ab.length, 1, name + ': genau eine Abweichung, gemeldet: ' + ab.join(' | '));
      assert.match(ab[0], muster, name);
      heilen();
      assert.deepEqual(inhaltGegenCommit(quelle, repo, commit), [], name + ': nach dem Heilen wieder still');
    }
    // node_modules an der Wurzel zählt nicht, wie beim Bestand eines entpackten Archivs; tiefer zählt es.
    fs.mkdirSync(path.join(quelle, 'node_modules', 'x'), { recursive: true });
    fs.writeFileSync(path.join(quelle, 'node_modules', 'x', 'index.js'), '');
    assert.deepEqual(inhaltGegenCommit(quelle, repo, commit), []);
  });
});

test('[Quelle aus Commit] ein Stand wird nur als Commit dieses Repositorys angenommen', () => {
  assert.equal(commitAufloesen(repo, commit), commit);
  assert.equal(commitAufloesen(repo, commit.slice(0, 9)), commit);
  assert.equal(commitAufloesen(repo, '0123456789abcdef0123456789abcdef01234567'), null, 'unbekannter Hash');
  assert.equal(commitAufloesen(repo, 'HEAD'), null, 'kein Name, nur ein Hash');
  assert.equal(commitAufloesen(repo, ''), null);
});
