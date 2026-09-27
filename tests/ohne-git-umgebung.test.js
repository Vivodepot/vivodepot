'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   tools/lib/ohne-git-umgebung.js — Rot-Beweis (19.09.2026, Schweregrad HOCH)

   DER FUND: `tests/adr-praefix-ratsche-pruefen.test.js` legte ein Wegwerf-Repo
   unter `cwd: tmp` an, aber ohne die Umgebung zu bereinigen. Unter einem
   GIT_DIR, wie es ein `pre-commit`-Hook seinen Kindprozessen setzt, gewinnt
   GIT_DIR gegen `cwd` — der `git commit` der Probe landete im ECHTEN Repo,
   nicht in `tmp`. Ein Commit mit der Nachricht „a", Autor „Probe", genau der
   Identität, die dieselbe Probe zuvor per `git config` gesetzt hatte.

   DIESE PROBE STELLT DEN HOOK-ZUSTAND SELBST HER (wie in
   `tests/build-datum-lockstep.test.js`, U2-ADR-232 — nicht bloß eine Annahme
   über ihn): GIT_DIR/GIT_WORK_TREE/GIT_INDEX_FILE zeigen für die Dauer der
   Probe auf ein fabriziertes "amtliches" Wegwerf-Repo, nie auf dieses echte
   Repo — kein Risiko für den gemeinsamen Baum, auch wenn die erste Hälfte
   absichtlich rot geht.

   ZWEI RICHTUNGEN:
   1. OHNE `ohneGitUmgebung()`: der Commit landet nachweislich im „amtlichen"
      Repo, nicht im beabsichtigten Ziel — der Schaden wird hier NACHGESTELLT,
      nicht nur behauptet.
   2. MIT `ohneGitUmgebung()`: derselbe Aufbau, derselbe Commit-Versuch, das
      „amtliche" Repo bleibt unberührt.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

function git(args, cwd, env) {
  return execFileSync('git', args, { cwd, env, encoding: 'utf8', stdio: 'pipe' }).trim();
}

function amtlichesRepoAnlegen(basis) {
  const amtlich = fs.mkdtempSync(path.join(basis, 'amtlich-'));
  const sauber = ohneGitUmgebung();
  git(['init', '-q'], amtlich, sauber);
  git(['config', 'user.email', 'amt@example.invalid'], amtlich, sauber);
  git(['config', 'user.name', 'Amt'], amtlich, sauber);
  fs.writeFileSync(path.join(amtlich, 'echt.txt'), 'amtlicher Ursprungsstand\n');
  git(['add', '-A'], amtlich, sauber);
  git(['commit', '-q', '-m', 'amtlicher Ursprungscommit'], amtlich, sauber);
  return amtlich;
}

test('[Ohne-Git-Umgebung] entfernt nur GIT_*-Schlüssel, lässt alles andere unberührt', () => {
  const basis = { PATH: process.env.PATH, GIT_DIR: '/irgendwo/.git', GIT_WORK_TREE: '/irgendwo', SPRACHE: 'de' };
  const e = ohneGitUmgebung(basis);
  assert.deepEqual(e, { PATH: process.env.PATH, SPRACHE: 'de' });
});

test('[Ohne-Git-Umgebung·Rot-Beweis] OHNE Bereinigung: unter simuliertem Hook-GIT_DIR landet der Commit im amtlichen Repo, nicht im Ziel', () => {
  const basis = fs.mkdtempSync(path.join(os.tmpdir(), 'ohne-git-umgebung-schaden-'));
  const amtlich = amtlichesRepoAnlegen(basis);
  const ziel = fs.mkdtempSync(path.join(basis, 'ziel-'));
  // NUR GIT_DIR/GIT_INDEX_FILE, wie ein echter Hook es seinen Kindprozessen setzt (nicht
  // zusätzlich GIT_WORK_TREE) — git nimmt dann den ARBEITSBAUM aus `cwd` (hier `ziel`, wo
  // `schaden.txt` wirklich liegt), schreibt Index und Commit aber in GIT_DIR (das amtliche
  // `.git`). Genau diese Kombination macht den Fund so leicht zu übersehen: die Dateiinhalte
  // stimmen, nur die Historie landet am falschen Ort.
  //
  // KORREKTUR (19.09.2026, zweiter Fund derselben Klasse — diesmal in DIESER Probe
  // selbst; die frühere Fassung fügte dem rohen Spread der Prozessumgebung nur EINEN
  // GIT-Schlüssel — das Verzeichnis — hinzu): lief die Suite selbst in einem echten Hook,
  // dessen Index-Pfad-Variable schon gesetzt war, zeigte die Simulation dann auf ZWEI
  // verschiedene Repos gleichzeitig (das fabrizierte Verzeichnis hier, der geerbte Index-Pfad
  // vom äußeren Hook), `git commit` schrieb Baum-Einträge, die nur im `amtlich`-Repo
  // existieren, in den ECHTEN, geteilten Index — und `amtlich` wird im `finally` gelöscht.
  // GENAU DAS war die tagelange, für mehrere Sitzungen reproduzierte Index-Korruption
  // „fatal: unable to read <sha>". Fix: die Simulation aus `ohneGitUmgebung()` aufbauen
  // (kappt jede geerbte GIT-Variable der Suite selbst) und BEIDE Schlüssel — Verzeichnis UND
  // Index-Pfad — ausdrücklich auf DIESES Wegwerf-Repo setzen, siehe Code unten — eine
  // vollständig in sich geschlossene Umgebung, die nichts vom aufrufenden Prozess übernimmt,
  // egal in welchem Kontext die Suite selbst läuft.
  const hookUmgebung = { ...ohneGitUmgebung(), GIT_DIR: path.join(amtlich, '.git'),
    GIT_INDEX_FILE: path.join(amtlich, '.git', 'index') };
  try {
    // GENAU der Fehler der Probe vom 19.09.2026: cwd zeigt auf `ziel`, aber die Umgebung
    // ist NICHT bereinigt — GIT_DIR gewinnt.
    execFileSync('git', ['init', '-q'], { cwd: ziel, env: hookUmgebung, stdio: 'pipe' });
    fs.writeFileSync(path.join(ziel, 'schaden.txt'), 'sollte nie im amtlichen Repo landen\n');
    execFileSync('git', ['add', '-A'], { cwd: ziel, env: hookUmgebung, stdio: 'pipe' });
    execFileSync('git', ['commit', '-q', '-m', 'a'], { cwd: ziel, env: hookUmgebung, stdio: 'pipe' });

    const log = git(['log', '--format=%s'], amtlich, ohneGitUmgebung());
    assert.match(log, /^a$/m, 'DER SCHADEN MUSS HIER NACHWEISBAR SEIN: ohne Bereinigung landet der ' +
      'Commit "a" im amtlichen Repo — sonst prüft diese Probe nichts Reales.');
  } finally {
    fs.rmSync(basis, { recursive: true, force: true });
  }
});

test('[Ohne-Git-Umgebung·Gegenprobe] MIT Bereinigung bleibt das amtliche Repo unter demselben simulierten Hook-GIT_DIR unberührt', () => {
  const basis = fs.mkdtempSync(path.join(os.tmpdir(), 'ohne-git-umgebung-fix-'));
  const amtlich = amtlichesRepoAnlegen(basis);
  const ziel = fs.mkdtempSync(path.join(basis, 'ziel-'));
  // Dieselbe in sich geschlossene Simulation wie oben (19.09.2026, Korrektur) —
  // `ohneGitUmgebung(hookUmgebung)` gleich darunter würde die geerbten GIT_*-Reste zwar
  // ohnehin wieder abstreifen, aber `hookUmgebung` bleibt hier bewusst so gebaut, dass es
  // schon FÜR SICH deterministisch ist, nicht nur nach dem Abstreifen.
  const hookUmgebung = { ...ohneGitUmgebung(), GIT_DIR: path.join(amtlich, '.git'),
    GIT_INDEX_FILE: path.join(amtlich, '.git', 'index') };
  try {
    const sauber = ohneGitUmgebung(hookUmgebung);
    git(['init', '-q'], ziel, sauber);
    git(['config', 'user.email', 'probe@example.invalid'], ziel, sauber);
    git(['config', 'user.name', 'Probe'], ziel, sauber);
    fs.writeFileSync(path.join(ziel, 'schaden.txt'), 'darf nur hier landen\n');
    git(['add', '-A'], ziel, sauber);
    git(['commit', '-q', '-m', 'a'], ziel, sauber);

    const logAmtlich = git(['log', '--format=%s'], amtlich, ohneGitUmgebung());
    assert.doesNotMatch(logAmtlich, /^a$/m, 'das amtliche Repo darf den Commit "a" nicht sehen');
    const logZiel = git(['log', '--format=%s'], ziel, sauber);
    assert.match(logZiel, /^a$/m, 'der Commit muss im beabsichtigten Ziel ankommen, sonst prüft die Probe nichts');
  } finally {
    fs.rmSync(basis, { recursive: true, force: true });
  }
});
