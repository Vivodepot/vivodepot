#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   auslieferung-stand-gegen-kanon-pruefen.js — Nachtrag zum Register-Auftrag
   (12.09.2026): „der eigentliche Gewinn" des Auslieferungs-Registers — prüft, ob HiDrive dem
   Kanon entspricht, OHNE HiDrive anzufassen: die letzte Zeile in `docs/auslieferung-stand.md`
   nennt den Kanon-Commit, gegen den zuletzt ausgeliefert wurde; dieser hier hält ihn gegen den
   AKTUELLEN `origin/u2-kanon` — reiner Lesevorgang, keine Zugangsdaten, kein Netz außer `git`.

   BEWUSST NICHT-BLOCKIEREND (dieselbe Bauart wie `tools/auslieferung-frischewarnung-pruefen.js`,
   heute Nacht gebaut): der Kanon zieht ständig weiter, eine Auslieferung ist ein SELTENES,
   bewusstes Ereignis — „Kanon ist neuer als die letzte Auslieferung" ist der NORMALFALL
   zwischen zwei Auslieferungen, kein Fehler. Eine harte Suite-Sperre dafür wäre exakt die
   Bauart, die den v515-Zug in dieser Nacht acht Tage kostete (U2-ADR-372-Nachtrag). Dieses
   Werkzeug BERICHTET, entscheidet nicht, ob ausgeliefert werden soll — das ist eine
   Produktfrage, keine technische.

   Aufruf: node tools/auslieferung-stand-gegen-kanon-pruefen.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const REGISTER_PFAD = path.join(REPO, 'docs', 'auslieferung-stand.md');

// Parst die LETZTE Datenzeile einer Markdown-Tabelle mit der Spaltenform
// `| Stand | hochgeladen | Prüfsumme | Kanon-Commit | Rezeptbuch-Stand | Bemerkung |` — reine
// Textprüfung, kein Markdown-Parser (dieselbe Grenze wie bei jedem Text-Muster-Prüfer in diesem
// Umfeld, z. B. `produktsAusQuelltext` im Schwesterrepo).
function letzteZeileLesen(registerText) {
  const zeilen = registerText.split('\n').filter((z) => /^\|\s*v\S+\s*\|/.test(z));
  if (!zeilen.length) return null;
  const letzte = zeilen[zeilen.length - 1];
  const felder = letzte.split('|').map((f) => f.trim()).filter((f, i, arr) => i > 0 && i < arr.length - 1);
  const [stand, hochgeladen, pruefsumme, kanonCommit, rezeptbuchStand, bemerkung] = felder;
  return { stand, hochgeladen, pruefsumme, kanonCommit, rezeptbuchStand, bemerkung };
}

// U2-ADR-232: git-Aufrufstelle streift GIT_* ab, s. Kopf-Kommentar an derselben Funktion in
// tools/kern-ausliefern.js.
function _ohneGitUmgebung() {
  const e = { ...process.env };
  for (const k of Object.keys(e)) if (k.startsWith('GIT_')) delete e[k];
  return e;
}

function _originCommitLesen() {
  return execFileSync('git', ['rev-parse', '--short', 'origin/u2-kanon'], { cwd: REPO, env: _ohneGitUmgebung() }).toString('utf8').trim();
}

// Reiner Abgleich, kein Dateizugriff — getrennt von `main()`, damit Proben BEIDE Fälle
// (übereinstimmend/abweichend) gegen frei erfundene Werte prüfen können, ohne git oder eine
// echte Register-Datei zu brauchen.
function kanonAbgleich(letzteZeile, originCommit) {
  const stimmtUeberein = !!letzteZeile && letzteZeile.kanonCommit === originCommit;
  return { stimmtUeberein, letzteZeile, originCommit };
}

function main() {
  if (!fs.existsSync(REGISTER_PFAD)) {
    process.stdout.write('[auslieferung-stand-gegen-kanon] kein Register vorhanden — noch keine Auslieferung erfasst.\n');
    return;
  }
  const letzte = letzteZeileLesen(fs.readFileSync(REGISTER_PFAD, 'utf8'));
  if (!letzte) {
    process.stdout.write('[auslieferung-stand-gegen-kanon] Register vorhanden, aber keine Datenzeile — noch keine Auslieferung erfasst.\n');
    return;
  }
  const { stimmtUeberein, originCommit } = kanonAbgleich(letzte, _originCommitLesen());
  if (stimmtUeberein) {
    process.stdout.write('[auslieferung-stand-gegen-kanon] OK — letzte Auslieferung (' + letzte.stand
      + ') entspricht dem aktuellen Kanon (' + originCommit + ').\n');
  } else {
    process.stdout.write('[auslieferung-stand-gegen-kanon] BEFUND — der Kanon ist seit der letzten Auslieferung ('
      + letzte.stand + ' @ ' + (letzte.kanonCommit || '—') + ') weitergezogen, jetzt ' + originCommit
      + '. Kein Fehler an sich — informativ, ob ein neuer Stand ausgeliefert werden sollte.\n');
  }
}

if (require.main === module) main();
module.exports = { letzteZeileLesen, _originCommitLesen, kanonAbgleich };
