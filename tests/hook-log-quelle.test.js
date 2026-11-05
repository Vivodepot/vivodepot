'use strict';
/* hooks/_hook-log.sh trennt echte Hook-Läufe von Testläufen (Feld `quelle`, 28.09.2026). Ohne das Feld
   konnte hook-log.ndjson die Frage „wie oft lief der Hook je Landung?" nicht beantworten.
   Rot-Beweis: die Fassung davor schrieb kein `quelle` — die erste Probe prüft genau das Feld. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');

function lauf(env) {
  const baum = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-log-quelle-'));
  try {
    fs.mkdirSync(path.join(baum, 'hooks'));
    fs.copyFileSync(path.join(REPO, 'hooks', '_hook-log.sh'), path.join(baum, 'hooks', '_hook-log.sh'));
    execFileSync('/bin/sh', ['-c', '. hooks/_hook-log.sh; hook_log_schreiben probe 0'], { cwd: baum, env });
    return JSON.parse(fs.readFileSync(path.join(baum, 'hook-log.ndjson'), 'utf8').trim());
  } finally { fs.rmSync(baum, { recursive: true, force: true }); }
}
const ohne = () => { const e = { ...process.env }; delete e.VD_HOOK_SPERRE_JE_PID; return e; };

test('ein Hook-Lauf aus einem Test trägt quelle=test', () => {
  assert.strictEqual(lauf({ ...process.env, VD_HOOK_SPERRE_JE_PID: '1' }).quelle, 'test');
});

test('ein echter Hook-Lauf (ohne den Test-Schalter) trägt quelle=echt', () => {
  assert.strictEqual(lauf(ohne()).quelle, 'echt');
});

test('die übrigen Felder bleiben, wie sie waren', () => {
  const e = lauf(ohne());
  // start (02.10.2026): Startzeit des Hooks, damit die Dauer eines Pushes aus dem Log lesbar ist.
  assert.deepStrictEqual(Object.keys(e), ['zeit', 'start', 'hook', 'ziel', 'rc', 'quelle']);
  assert.match(e.start, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
  assert.strictEqual(e.hook, 'probe'); assert.strictEqual(e.rc, '0');
});

/* NICHT IN DEN ARBEITSBAUM (30.10.2026, Befund ZUGKOPF-AIR-HOOKLOG-IM-SELBSTTEST, MITTEL): am Zugkopf pusht die Air-Seite ihren
   Prüfzweig aus demselben Baum, in dem die Mac-Seite den Wächter-Selbsttest fährt. Der pre-push legte dabei hook-log.ndjson in
   die Wurzel des Baums; in einem frischen Baum war das eine neue Datei mitten im Selbsttest-Fenster, und der Zugkopf fiel rot
   („PROBE SCHRIEB IN DEN ARBEITSBAUM“). Jetzt schreibt der Hook ins git-Verzeichnis des Baums, gelesen aus `.git` in der
   Wurzel (Datei mit „gitdir:“ bei einem Arbeitsbaum, Verzeichnis beim Hauptbaum) — nicht über git selbst, denn GIT_DIR aus
   einem umgebenden Hook darf den Ort nicht verschieben. Ohne `.git` (Temp-Bäume der Hook-Proben) bleibt es die Wurzel. */
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');
function frischerBaum() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-log-baum-'));
  const env = { ...ohneGitUmgebung(ohne()), GIT_AUTHOR_NAME: 'p', GIT_AUTHOR_EMAIL: 'p@example.invalid', GIT_COMMITTER_NAME: 'p', GIT_COMMITTER_EMAIL: 'p@example.invalid' };
  const git = (args, cwd) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();
  const haupt = path.join(d, 'haupt');
  fs.mkdirSync(path.join(haupt, 'hooks'), { recursive: true });
  fs.copyFileSync(path.join(REPO, 'hooks', '_hook-log.sh'), path.join(haupt, 'hooks', '_hook-log.sh'));
  git(['init', '-q'], haupt);
  git(['add', 'hooks'], haupt);
  git(['commit', '-q', '-m', 'probe'], haupt);
  const baum = path.join(d, 'baum');
  git(['worktree', 'add', '-q', baum], haupt);
  return { d, haupt, baum, env, git };
}
function schreibenIn(cwd, env) {
  // Ein GIT_DIR aus der Umgebung (wie in einem umgebenden Hook) darf den Ort nicht verschieben.
  execFileSync('/bin/sh', ['-c', '. hooks/_hook-log.sh; hook_log_schreiben pre-push 0; hook_log_ereignis air-rueckfall 3 probe'], { cwd, env: { ...env, GIT_DIR: path.join(os.tmpdir(), 'kein-git-dir-' + process.pid) } });
}

test('[Hook-Log·Außerhalb·Rot-Beweis] ein Hook-Lauf in einem frischen Arbeitsbaum legt keine Datei in den Baum, die Zeilen stehen im git-Verzeichnis des Baums', () => {
  const f = frischerBaum();
  try {
    schreibenIn(f.baum, f.env);
    assert.strictEqual(fs.existsSync(path.join(f.baum, 'hook-log.ndjson')), false, 'hook-log.ndjson liegt im Arbeitsbaum');
    assert.strictEqual(f.git(['status', '--porcelain', '--ignored', '--untracked-files=all'], f.baum), '', 'der Baum ist nach dem Hook-Lauf unverändert');
    const ziel = f.git(['rev-parse', '--git-path', 'hook-log.ndjson'], f.baum);
    const zeilen = fs.readFileSync(path.resolve(f.baum, ziel), 'utf8').trim().split('\n').map((z) => JSON.parse(z));
    assert.deepStrictEqual(zeilen.map((z) => z.hook), ['pre-push', 'air-rueckfall']);
  } finally { fs.rmSync(f.d, { recursive: true, force: true }); }
});

test('[Hook-Log·Außerhalb·Hauptbaum] im Hauptbaum (.git ist ein Verzeichnis) steht die Zeile in .git, nicht in der Wurzel', () => {
  const f = frischerBaum();
  try {
    schreibenIn(f.haupt, f.env);
    assert.strictEqual(fs.existsSync(path.join(f.haupt, 'hook-log.ndjson')), false);
    assert.strictEqual(fs.readFileSync(path.join(f.haupt, '.git', 'hook-log.ndjson'), 'utf8').trim().split('\n').length, 2);
  } finally { fs.rmSync(f.d, { recursive: true, force: true }); }
});

