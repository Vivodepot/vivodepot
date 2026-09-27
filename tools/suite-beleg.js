#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Beleg „volle Node-Suite grün" je Baum-Hash (HOOKS2, 19.09.2026).
   Anlass: Der pre-push fuhr die volle Node-Suite nicht und verließ sich darauf, dass jeder Commit
   unter einem intakten pre-commit entstand. Mit `--no-verify`-Commits in Landungen kamen so 13
   Rote aus dem Schnitt unbemerkt bis vor den Kanon. Ein Push ist nur so gut wie die Suite, die
   für GENAU den Stand lief, der gepusht wird.

   DER BELEG ist eine Datei je Baum-Hash im gemeinsamen Git-Verzeichnis (vd-suite-belege/<hash>).
   Er wird nur geschrieben, wenn die volle Suite für genau diesen Baum grün war:
     - pre-commit nach grüner Suite, und nur wenn der Arbeitsbaum dem Index entspricht (sonst lief
       die Suite über andere Dateien als die, die der Commit trägt);
     - pre-push nach eigener grüner Suite, und nur für den Baum, den HEAD trägt, bei sauberem
       Arbeitsbaum.
   Ein Baum-Hash ist inhaltsgleich in jedem Arbeitsbaum — ein Beleg gilt darum baumübergreifend.

   `--push-pruefen` (stdin: die Ref-Zeilen des pre-push) prüft je gepushter Ref-Spitze, ob ein
   Beleg für ihren Baum-Hash existiert. Exit 0: alle belegt. Exit 3: für den Baum in HEAD fehlt er,
   der Hook muss die Suite fahren. Exit 1: es fehlt ein Beleg und HEAD trägt diesen Stand nicht —
   die Suite lässt sich hier nicht für ihn fahren, der Push ist abzubrechen.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

/* Alle git-Aufrufe laufen im Prozess-Arbeitsverzeichnis (bei einem Hook die Wurzel des Baums) und
   erben die Umgebung des Hooks BEWUSST: im pre-commit zeigt GIT_INDEX_FILE bei `commit -a` oder
   `commit <pfad>` auf den Index, den der Commit wirklich trägt — ein abgestreifter Index ergäbe
   einen Beleg für einen Baum, der nie committet wird. */
function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function belegVerzeichnis() {
  return path.join(path.resolve(git(['rev-parse', '--git-common-dir'])), 'vd-suite-belege');
}

function belegVorhanden(tree, belegDir = belegVerzeichnis()) {
  return /^[0-9a-f]{40,64}$/.test(tree) && fs.existsSync(path.join(belegDir, tree));
}

function belegSchreiben(tree, hook, belegDir = belegVerzeichnis()) {
  if (!/^[0-9a-f]{40,64}$/.test(tree)) throw new Error('kein Baum-Hash: ' + tree);
  const dir = belegDir;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, tree), JSON.stringify({ tree, hook, geschriebenAm: new Date().toISOString() }) + '\n');
}

function arbeitsbaumSauber() {
  return git(['status', '--porcelain', '--untracked-files=no']) === '';
}

/* Reine Entscheidung, ohne Seiteneffekt — für die Probe. */
function pushEntscheidung({ baeume, headTree, sauber, belegt }) {
  const fehlend = baeume.filter((t) => !belegt(t));
  if (!fehlend.length) return { code: 0, grund: 'alle gepushten Bäume tragen einen Suite-Beleg' };
  if (fehlend.length > 1 || fehlend[0] !== headTree) {
    return { code: 1, grund: 'für ' + fehlend.join(', ') + ' gibt es keinen Suite-Beleg, und HEAD trägt diesen Stand nicht — die volle Suite lässt sich hier nicht für ihn fahren. Aus dem Baum pushen, der den Stand trägt (Zweig auschecken, dann pushen).' };
  }
  if (!sauber) return { code: 1, grund: 'Der Arbeitsbaum hat Änderungen an verfolgten Dateien — die Suite liefe über etwas anderes als den Stand, der gepusht wird. Erst committen oder verwerfen.' };
  return { code: 3, grund: 'für den gepushten Baum ' + fehlend[0] + ' fehlt der Beleg — die volle Suite läuft jetzt', tree: fehlend[0] };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === '--schreiben') {
    const hook = argv[1] || 'unbekannt';
    const iTree = argv.indexOf('--tree');
    let tree;
    if (iTree >= 0) {
      tree = argv[iTree + 1];
    } else {
      // pre-commit: nur wenn der Arbeitsbaum dem Index entspricht.
      try { git(['diff', '--quiet']); } catch (e) {
        process.stdout.write('[suite-beleg] kein Beleg: der Arbeitsbaum weicht vom Index ab — die Suite lief über andere Dateien als die, die der Commit trägt.\n');
        return;
      }
      tree = git(['write-tree']);
    }
    belegSchreiben(tree, hook);
    process.stdout.write('[suite-beleg] Beleg für Baum ' + tree + ' geschrieben (' + hook + ').\n');
    return;
  }
  if (argv[0] === '--push-pruefen') {
    const zeilen = fs.readFileSync(0, 'utf8').split('\n').map((z) => z.trim()).filter(Boolean);
    const baeume = [];
    for (const z of zeilen) {
      const [, lokal] = z.split(/\s+/);
      if (!lokal || /^0+$/.test(lokal)) continue;
      const tree = git(['rev-parse', lokal + '^{tree}']);
      if (!baeume.includes(tree)) baeume.push(tree);
    }
    const headTree = git(['rev-parse', 'HEAD^{tree}']);
    const e = pushEntscheidung({ baeume, headTree, sauber: arbeitsbaumSauber(), belegt: (t) => belegVorhanden(t) });
    (e.code === 1 ? process.stderr : process.stdout).write('[suite-beleg] ' + e.grund + '\n');
    if (e.tree) process.stdout.write('TREE ' + e.tree + '\n');
    process.exitCode = e.code;
    return;
  }
  process.stderr.write('Aufruf: suite-beleg.js --schreiben <hook> [--tree <hash>] | --push-pruefen < ref-zeilen\n');
  process.exitCode = 2;
}

if (require.main === module) main();

module.exports = { belegVerzeichnis, belegVorhanden, belegSchreiben, pushEntscheidung, arbeitsbaumSauber };
