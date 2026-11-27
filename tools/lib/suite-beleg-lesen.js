'use strict';
/* suite-beleg-lesen.js — der lesende Teil des Suite-Beleg-Werkzeugs (26.11.2026): Beleg-Verzeichnis, Beleg lesen, Beleg der vollen
   Suite vorhanden, Block standCommit der Übernahme-Liste. Ohne weitere Abhängigkeit als node:fs, node:path und git, damit ein
   Release- oder Signierweg den Stand-Commit-Weg nutzen kann, ohne den Test-Helfer zu laden, den das Suite-Beleg-Werkzeug für seine
   Klein-Läufe braucht (Probe [Test-Lauf·Signierwege]). Das Suite-Beleg-Werkzeug nimmt diese Funktionen
   von hier und gibt sie unverändert weiter. */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

/* git erbt die Umgebung bewusst, wie im Suite-Beleg-Werkzeug: im pre-commit zeigt GIT_INDEX_FILE auf den Index des Commits. */
function git(args) {
  return execFileSync('git', args, { maxBuffer: 256 * 1024 * 1024, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function belegVerzeichnis() {
  return path.join(path.resolve(git(['rev-parse', '--git-common-dir'])), 'vd-suite-belege');
}

/* Ein Beleg zählt nur, wenn er von einer VOLLEN Suite stammt (28.09.2026, Schnellstufe im pre-commit): ein Eintrag mit
   `stufe` ungleich „voll" wird nicht anerkannt. Ältere Belege ohne `stufe` stammen aus der Zeit, als der pre-commit immer voll fuhr. */
function belegVorhanden(tree, belegDir = belegVerzeichnis()) {
  if (!/^[0-9a-f]{40,64}$/.test(tree)) return false;
  const pfad = path.join(belegDir, tree);
  if (!fs.existsSync(pfad)) return false;
  try { const b = JSON.parse(fs.readFileSync(pfad, 'utf8')); return !b.stufe || b.stufe === 'voll'; }
  catch (_) { return false; }
}

function belegLesen(tree, belegDir = belegVerzeichnis()) {
  if (!/^[0-9a-f]{40,64}$/.test(tree)) return null;
  try { return JSON.parse(fs.readFileSync(path.join(belegDir, tree), 'utf8')); } catch (_) { return null; }
}

/* STAND-COMMIT (26.11.2026): der Block `standCommit` der Übernahme-Liste `datei` (der Aufrufer nennt sie); Regel im Kopf der
   Stand-Übernahme. */
function standCommitBlock(datei) {
  if (!fs.existsSync(datei)) return null;
  return JSON.parse(fs.readFileSync(datei, 'utf8')).standCommit || null;
}

module.exports = { git, belegVerzeichnis, belegVorhanden, belegLesen, standCommitBlock };
