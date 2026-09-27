#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Wächter gegen geteilten Branch-Checkout (T15, A39, 31.07.2026)
   ────────────────────────────────────────────────────────────────────────
   A39 (29.07.2026): derselbe Branch stand in zwei Worktrees ausgecheckt
   (`u2-fix`/`u2-test`, geteilter Ref über ein zweites `worktree add
   --force`). Ein Commit im einen Worktree hätte den Stand des anderen
   ersatzlos zurückgenommen (`4d80034`, ADR-114 samt Test, 88 Zeilen) — nur
   ein kontaminierter `core.hooksPath` machte den Beinah-Verlust überhaupt
   sichtbar.

   DIESER WÄCHTER PRÜFT DEN ZUSTAND, NICHT DEN DIFF-INHALT. Ein früherer
   Entwurf wollte einen Commit bei "gefährlichen" Löschungen im Diff
   abbrechen — das prüft das Gegenteil dessen, was A39 zeigte (Inhalt war
   vorhanden, aber falsch/gelöscht, nicht: nichts vorhanden) und einen Fall,
   den Git ohnehin blockiert. Der tatsächliche Vorbedingungs-Zustand — zwei
   Worktrees mit demselben Branch — ist dagegen mechanisch eindeutig
   prüfbar: `git worktree list --porcelain`, zwei Einträge mit derselben
   `branch`-Zeile.

   NUR PRE-COMMIT, KEIN WRAPPER UM `worktree add --force`: der Normalfall
   blockiert Git bereits selbst (`fatal: '<branch>' is already used by
   worktree at '<pfad>'`) — nur `--force` umgeht das. Ein Wrapper um
   `--force` bräuchte einen Eingriff auf der Ebene des `git`-Aufrufs selbst
   (Shell-Alias/PATH-Vorrang) — das ist kein im Repo versionierter,
   mechanisch erzwungener Wächter (die Schreibregel für Prüfwerkzeuge
   verlangt genau das), sondern eine Umgebungsannahme außerhalb des Repos,
   die ein zweiter Klon oder ein direkter Aufruf des echten `git`-Binaries
   unterläuft. Der Pre-Commit-Wächter hier deckt dieselbe Gefahr an der
   Stelle, an der A39 tatsächlich schadenswirksam wurde — dem Commit —, und
   zwar unabhängig davon, WIE der geteilte Zustand entstanden ist (ein
   zweites `--force`, oder künftig eine andere Ursache).
   ════════════════════════════════════════════════════════════════════════ */
const { execFileSync } = require('node:child_process');

/** Reiner Parser, ohne git — trägt Fixtures und Positivkontrolle. */
function parsePorcelain(text) {
  const eintraege = [];
  let aktuell = null;
  for (const zeile of text.split('\n')) {
    if (zeile.startsWith('worktree ')) {
      aktuell = { worktree: zeile.slice('worktree '.length), branch: null };
      eintraege.push(aktuell);
    } else if (zeile.startsWith('branch ') && aktuell) {
      aktuell.branch = zeile.slice('branch '.length);
    } else if (zeile === '') {
      aktuell = null;
    }
  }
  return eintraege;
}

/** Branches, die in mehr als einem Worktree gleichzeitig ausgecheckt sind. */
function geteilteBranches(eintraege) {
  const nachBranch = new Map();
  for (const e of eintraege) {
    if (!e.branch) continue; // detached HEAD / bare — kein geteilter Branch
    if (!nachBranch.has(e.branch)) nachBranch.set(e.branch, []);
    nachBranch.get(e.branch).push(e.worktree);
  }
  const geteilt = [];
  for (const [branch, worktrees] of nachBranch) {
    if (worktrees.length > 1) geteilt.push({ branch, worktrees });
  }
  return geteilt;
}

module.exports = { parsePorcelain, geteilteBranches };

if (require.main === module) {
  /* UMLENKBAR (`--porcelain-datei <pfad>`, 17.08.2026) — die stehende Schreibregel für
     Prüfwerkzeuge verlangt den Gegenstand als Argument, und ohne sie liesse sich der
     Rot-Beleg zu diesem Gate nur führen, indem man einen zweiten Worktree anlegt: ein
     Eingriff in den Arbeitsbaum mitten in einem Prüflauf. Der Parser trug den
     Nachweis schon immer, der Einstiegspunkt nicht.
     Nulleingriff: ohne das Argument derselbe Weg wie zuvor (`git worktree list`). */
  const _i = process.argv.indexOf('--porcelain-datei');
  const text = (_i >= 0 && process.argv[_i + 1])
    ? require('node:fs').readFileSync(process.argv[_i + 1], 'utf8')
    : execFileSync('git', ['worktree', 'list', '--porcelain'], { encoding: 'utf8' });
  const geteilt = geteilteBranches(parsePorcelain(text));
  if (geteilt.length > 0) {
    console.error('[worktree-guard] ABBRUCH: derselbe Branch ist in mehreren Worktrees ausgecheckt:');
    for (const g of geteilt) {
      console.error(`  ${g.branch}: ${g.worktrees.join(' · ')}`);
    }
    console.error('  Ein Commit hier riskiert, den Stand des anderen Worktrees zurückzunehmen (A39).');
    console.error('  Beheben: das andere Worktree entfernen oder auf einen anderen Branch stellen.');
    process.exit(1);
  }
  console.log('[worktree-guard] OK — kein Branch in mehreren Worktrees ausgecheckt.');
  process.exit(0);
}
