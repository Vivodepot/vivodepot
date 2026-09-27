#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Geteilte-Git-Config-Wache — Befund, 20.09.2026 (git-umgebung-pruefen)
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS. Die geteilte Konfiguration (`$GIT_COMMON_DIR/config`, EINE Datei
   für JEDEN Arbeitsbaum dieses Repos — Haupt-Checkout und jeden Wegwerf-
   Worktree) trug wieder `user.name=Probe`/`user.email=probe@example.invalid`,
   obwohl sie auf die eigene Identität gesetzt war (gemessen von -50
   per `--show-origin`). GEMESSEN UND NACHGESTELLT (20.09.2026, isoliertes
   Bare-Repo + zwei Arbeitsbäume): ein geleaktes `GIT_DIR` — zeigt es auf
   IRGENDEINEN Arbeitsbaum dieses Repos, auch nur indirekt über dessen `.git`-
   Verweisdatei — lässt `git config user.email/user.name` (ohne `--worktree`)
   IMMER in die geteilte Konfiguration schreiben, unabhängig von `cwd` und
   unabhängig davon, ob `extensions.worktreeConfig` gesetzt ist. Das ist
   dieselbe Fehlerklasse wie U2-ADR-232 (03.09.2026), nur an der geteilten
   Konfiguration statt an einem Wegwerf-Repo-Index.

   NICHT GEFUNDEN, TROTZ VOLLSTÄNDIGER DURCHSICHT: eine konkrete Aufrufstelle
   im heutigen Bestand, die das auslöst. Jede der 22 laufenden `.test.js`-
   Dateien, die `git` als Unterprozess mit `user.email`/`user.name` aufrufen,
   streift ihre `GIT_*`-Umgebung korrekt ab (einzeln UND unter simuliertem
   Hook-Leck nachgestellt, 20.09.2026 — alle sauber). Der Schreiber blieb
   darum UNBEKANNT — vermutlich ein von Hand ausgeführter, nicht isolierter
   `git`-Befehl in einem geschachtelten Kontext, nicht ein Fehler im Testcode.

   WAS DIESE WACHE DESHALB TUT: sie bewacht den `[user]`-ABSCHNITT der Datei, nicht den
   Verdächtigen. Sie nimmt einen Befehl entgegen, merkt sich `[user]` VOR dem Befehl, führt ihn
   aus (Ein-/Ausgabe durchgereicht, sein Exit-Code bleibt maßgeblich), und vergleicht NACHHER.
   Ändert sich `[user]`, wird der Lauf als Befund gemeldet — mit den geänderten Zeilen —,
   unabhängig davon, WAS den Schreibzugriff auslöste. Trifft es das nächste Mal wieder zu, ist es
   kein Rätsel mehr, sondern ein Lauf mit Zeitstempel.

   SELBSTKORREKTUR (20.09.2026, noch am selben Tag, gefunden am eigenen Einsatz): die erste
   Fassung verglich die GANZE Datei. Diese Datei sammelt aber laufend neue `[branch "…"]`-
   Abschnitte — jeder `git branch`/`git worktree add -b`/`checkout -b` aus JEDEM Arbeitsbaum
   dieses Repos schreibt hierher, das ist keine Korruption, sondern der Normalfall einer von
   allen Arbeitsbäumen geteilten Konfiguration. Die erste Fassung meldete darum bei der
   eigenen Erprobung einen neuen `[branch "l4-…"]`-Eintrag als vermeintlichen Fund — echter
   Alarm für ein harmloses, ständiges Nebeneinander vieler gleichzeitiger Arbeitsbäume, nicht
   für das, wofür diese Wache gebaut wurde. Beschränkt auf `[user]` bleibt sie scharf für den
   tatsächlichen Fund (user.name/user.email) und blind für jeden neuen Zweig — genau die
   Grenze, die schon im Kopf dieser Datei stand („Die Datei ändert niemand … das macht
   ausschließlich die Depotinhaberin"), nur beim Bauen zu wörtlich auf „die ganze Datei"
   übertragen statt auf den Abschnitt, den dieser Satz eigentlich meint.

   Aufruf:
     node tools/geteilte-git-config-wache.js [--repo <pfad>] -- <befehl> [args...]
     node tools/geteilte-git-config-wache.js --pfad-zeigen [--repo <pfad>]
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');

/* Dieselbe Absicherung wie in jeder korrekten Aufrufstelle im Bestand
   (`ohneGitUmgebung`/`ohneGitEnv`, U2-ADR-232): diese Wache misst die geteilte
   Konfiguration selbst per `git`-Unterprozess — ohne Abstreifen wäre sie die
   naechste Aufrufstelle, die unter geleaktem GIT_DIR das Falsche liest. */
function ohneGitUmgebung() {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith('GIT_')) delete env[k];
  return env;
}

/**
 * Pfad der GETEILTEN Konfiguration dieses Repos (`$GIT_COMMON_DIR/config`) —
 * dieselbe Datei für jeden Arbeitsbaum. `null`, wenn `repo` kein Git-
 * Arbeitsbaum ist (z. B. ein ausgepackter Stand ohne `.git`).
 * @param {string} repo
 * @returns {string|null}
 */
function geteilteConfigPfad(repo) {
  let commonDir;
  try {
    commonDir = execFileSync('git', ['-C', repo, 'rev-parse', '--git-common-dir'],
      { encoding: 'utf8', env: ohneGitUmgebung(), stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return null; }
  const absolut = path.isAbsolute(commonDir) ? commonDir : path.join(repo, commonDir);
  return path.join(absolut, 'config');
}

/** Inhalt der Datei, oder `null`, wenn sie (noch) nicht existiert. */
function inhaltLesen(pfad) {
  try { return fs.readFileSync(pfad, 'utf8'); } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

/** Zeilenweiser Diff zweier Textstände — nur die geänderten/neuen/entfernten Zeilen. */
function geaenderteZeilen(vorher, nachher) {
  const a = (vorher || '').split('\n');
  const b = (nachher || '').split('\n');
  const aSet = new Set(a);
  const bSet = new Set(b);
  const neu = b.filter((z) => z.trim() && !aSet.has(z));
  const weg = a.filter((z) => z.trim() && !bSet.has(z));
  return { neu, weg };
}

/**
 * Nur der `[user]`-Abschnitt einer Git-Config-Datei, roh als Text (samt Kommentaren, falls
 * welche darin stehen) — von der `[user]`-Kopfzeile bis zur naechsten Abschnitts-Kopfzeile oder
 * dem Dateiende. `null`, wenn kein `[user]`-Abschnitt existiert (dann ist auch nichts zu
 * bewachen: kein Abschnitt, keine Korruption). Abschnittsnamen in Git-Configs sind
 * gross-/kleinschreibungs-unabhaengig (`[user]`/`[User]`), Schluessel innerhalb nicht — hier
 * reicht die gaengige Kleinschreibung, dieselbe, die jede Aufrufstelle im Bestand erzeugt.
 * @param {string|null} inhalt
 * @returns {string|null}
 */
function userAbschnitt(inhalt) {
  if (inhalt == null) return null;
  const zeilen = inhalt.split('\n');
  const start = zeilen.findIndex((z) => /^\s*\[user\]\s*$/i.test(z));
  if (start === -1) return null;
  let ende = zeilen.length;
  for (let i = start + 1; i < zeilen.length; i++) {
    if (/^\s*\[/.test(zeilen[i])) { ende = i; break; }
  }
  return zeilen.slice(start, ende).join('\n');
}

/**
 * Führt `befehl` aus, merkt sich die geteilte Konfiguration vor und nach dem
 * Lauf. Reicht Ein-/Ausgabe durch und gibt IMMER den Exit-Code von `befehl`
 * zurück — außer die Konfiguration hat sich geändert: dann Exit 1 (auch wenn
 * `befehl` selbst grün war), Meldung auf stderr mit den geänderten Zeilen.
 * @param {string[]} befehl  [cmd, ...args]
 * @param {{repo?: string}} [optionen]
 * @returns {number} Exit-Code
 */
function bewachterLauf(befehl, { repo = REPO } = {}) {
  const pfad = geteilteConfigPfad(repo);
  const vorher = userAbschnitt(pfad ? inhaltLesen(pfad) : null);

  const [cmd, ...args] = befehl;
  const ergebnis = spawnSync(cmd, args, { stdio: 'inherit', cwd: repo });
  const laufExit = ergebnis.status == null ? 1 : ergebnis.status;

  if (!pfad) return laufExit; // kein Git-Arbeitsbaum — nichts zu bewachen, das ist kein Fehler dieser Wache
  const nachher = userAbschnitt(inhaltLesen(pfad));
  if (nachher === vorher) return laufExit;

  const { neu, weg } = geaenderteZeilen(vorher, nachher);
  console.error('');
  console.error('[geteilte-git-config-wache] ABBRUCH — der [user]-Abschnitt der GETEILTEN Konfiguration '
    + 'hat sich waehrend dieses Laufs veraendert: ' + pfad);
  console.error('  Diese Datei gehoert JEDEM Arbeitsbaum dieses Repos gemeinsam — den [user]-Abschnitt '
    + 'aendert niemand aus einem Lauf heraus, das macht ausschliesslich die Depotinhaberin von Hand.');
  console.error('  Ursache (U2-ADR-232-Fehlerklasse): ein geschachtelter `git`-Aufruf hat ein geleaktes '
    + '`GIT_DIR`/`GIT_WORK_TREE`/`GIT_INDEX_FILE` geerbt und dadurch hier statt im vorgesehenen '
    + 'Wegwerf-Ziel geschrieben.');
  if (neu.length) console.error('  NEU:      ' + neu.join('\n            '));
  if (weg.length) console.error('  ENTFERNT: ' + weg.join('\n            '));
  console.error('');
  return laufExit === 0 ? 1 : laufExit;
}

function main() {
  const argv = process.argv.slice(2);
  const iRepo = argv.indexOf('--repo');
  const repo = iRepo > -1 ? argv[iRepo + 1] : REPO;

  if (argv.includes('--pfad-zeigen')) {
    const pfad = geteilteConfigPfad(repo);
    console.log(pfad || '(kein Git-Arbeitsbaum unter ' + repo + ')');
    process.exit(pfad ? 0 : 1);
  }

  const trenner = argv.indexOf('--');
  if (trenner === -1 || trenner === argv.length - 1) {
    console.error('Aufruf: node tools/geteilte-git-config-wache.js [--repo <pfad>] -- <befehl> [args...]');
    process.exit(2);
  }
  const befehl = argv.slice(trenner + 1);
  process.exit(bewachterLauf(befehl, { repo }));
}

if (require.main === module) main();
module.exports = { geteilteConfigPfad, inhaltLesen, geaenderteZeilen, userAbschnitt, bewachterLauf, ohneGitUmgebung };
