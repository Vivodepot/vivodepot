'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Suite-Stufen — welche Testdateien die Schnellstufe fährt (28.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS. Der pre-commit fuhr bei jedem Commit die volle Suite (≈ 10 min). Jeder rote Anlauf — eine
   vergessene Grundlinie, ein Zähler — kostete einen weiteren vollen Lauf, auch für Zwischen-Commits auf einem
   Zweig, die nie gepusht werden. Gemessen am 28.09.2026 (Zeit je Datei aus dem jüngsten vollen Lauf): 1 156 von
   1 428 Testdateien brauchen je ≤ 2 s, zusammen 727 s Testzeit; drei Dateien allein 584 s.

   DIE STUFE. Langsam ist, was in der committeten, erzeugten Liste (LISTE unten) steht; schnell ist
   jede andere Testdatei — auch jede neue, bis ein bewusster Schreiblauf sie als langsam einträgt. Die Auswahl
   kommt NIE aus einer Zeitmessung zur Laufzeit: unter Last wäre sonst jede Datei „langsam", und die Stufe
   wackelte (Bedingung der Gegenlesung, 28.09.2026).
   GEMESSEN wird nur im bewussten Schreiblauf des Hook-Werkzeugs: er liest die Zeiten, die
   tools/lib/datei-zeiten-reporter.mjs bei jedem `npm test` im gemeinsamen Git-Verzeichnis ablegt.
   `--check` prüft allein die STRUKTUR der Liste (jeder Eintrag eine getrackte Testdatei, keine Dubletten,
   sortiert) — nie eine Messung.

   DIE GRENZE DER STUFE, ausdrücklich: die Schnellstufe kann eine langsame Datei auslassen, die rot wäre.
   Der Commit bleibt dann grün; der pre-push fährt die volle Suite (kein Voll-Beleg aus der Schnellstufe)
   und fängt es vor dem Push. So ist es gewollt: der Push ist das Einbahntor.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const GRENZE_MS = 2000;
const DATEINAME = 'vd-suite-dateizeiten.json';

function ohneGitUmgebung(env = process.env) {
  const e = { ...env };
  for (const k of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR']) delete e[k];
  return e;
}

/** Pfad der Zeiten-Datei: VD_DATEI_ZEITEN, sonst im gemeinsamen Git-Verzeichnis des Repos. */
function zeitenPfad(repo, env = process.env) {
  if (env.VD_DATEI_ZEITEN) return path.resolve(env.VD_DATEI_ZEITEN);
  try {
    const gemeinsam = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'],
      { cwd: repo, env: ohneGitUmgebung(env), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return path.join(gemeinsam, DATEINAME);
  } catch (_) { return null; }
}

function zeitenLesen(pfad) {
  try { const j = JSON.parse(fs.readFileSync(pfad, 'utf8')); return j && typeof j.zeiten === 'object' ? j : null; }
  catch (_) { return null; }
}

/** Neue Messung in die alte einarbeiten: gemessene Dateien überschreiben, ungemessene bleiben. */
function zusammenfuehren(alt, neu, jetzt = new Date().toISOString()) {
  return { erhoben: jetzt, zeiten: { ...((alt && alt.zeiten) || {}), ...neu } };
}

/** Aus einer Messung die Liste der langsamen Dateien (sortiert, nur getrackte Testdateien). */
/* NIE LANGSAM (29.09.2026): Ratschen und Deckel gegen den echten Bestand prüfen genau das, was ein Commit ändert, und
   sind billig im Verhältnis zu dem, was sie verhindern. Fielen sie in die Langsam-Liste, liefen sie erst im pre-push —
   Anlass: ein Gerüst-Deckel, der erst dort rot wurde. Sie stehen mit Grund im Feld `nie_langsam` der Liste; der
   Schreiblauf nimmt sie nie auf, und eine Datei in beiden Feldern ist ein Strukturfehler. */
function langsamAusZeiten(zeiten, testDateienListe, grenzeMs = GRENZE_MS, nieLangsam = {}) {
  const z = (zeiten && zeiten.zeiten) || {};
  const bekannt = new Set(testDateienListe);
  return Object.keys(z).filter((d) => bekannt.has(d) && z[d] > grenzeMs && !(d in nieLangsam)).sort();
}

/** Die Liste liegt beim Hook-Werkzeug; wer sie liest, nennt den Pfad. */
function listeLesen(repo, rel) {
  try { return JSON.parse(fs.readFileSync(path.join(repo, rel), 'utf8')); } catch (_) { return null; }
}

/** Struktur der Liste — keine Messung. Leer = in Ordnung. */
function listePruefen(liste, testDateienListe) {
  const f = [];
  if (!liste || !Array.isArray(liste.langsam)) return ['die Liste fehlt oder hat kein Feld „langsam"'];
  if (typeof liste.grenze_ms !== 'number') f.push('grenze_ms fehlt');
  const bekannt = new Set(testDateienListe);
  for (const d of liste.langsam) if (!bekannt.has(d)) f.push('Eintrag ohne getrackte Testdatei: ' + d);
  const doppelt = liste.langsam.filter((d, i, a) => a.indexOf(d) !== i);
  for (const d of new Set(doppelt)) f.push('Dublette: ' + d);
  const nie = liste.nie_langsam || {};
  for (const d of Object.keys(nie)) {
    if (!bekannt.has(d)) f.push('nie_langsam ohne getrackte Testdatei: ' + d);
    if (liste.langsam.includes(d)) f.push('steht in langsam UND nie_langsam: ' + d);
    if (typeof nie[d] !== 'string' || nie[d].length < 10) f.push('nie_langsam ohne Grund: ' + d);
  }
  const sortiert = [...liste.langsam].sort();
  if (sortiert.join('\n') !== liste.langsam.join('\n')) f.push('nicht sortiert');
  return f;
}

/** Die Schnellstufe: alle Testdateien außer den langsamen der Liste. */
function schnelleDateien(dateien, liste) {
  const langsam = new Set((liste && liste.langsam) || []);
  return dateien.filter((d) => !langsam.has(d));
}

/** Alle Testdateien, die `npm test` sammelt (dieselben zwei Muster wie in package.json). */
function testDateien(repo) {
  return execFileSync('git', ['ls-files', 'tests/**/*.test.js', 'tools/**/*.test.js', 'tests/*.test.js', 'tools/*.test.js'],
    { cwd: repo, env: ohneGitUmgebung(), encoding: 'utf8', maxBuffer: 64 << 20 }).split('\n').filter(Boolean)
    .filter((d, i, a) => a.indexOf(d) === i).sort();
}

module.exports = { ohneGitUmgebung, GRENZE_MS, DATEINAME, zeitenPfad, zeitenLesen, zusammenfuehren, langsamAusZeiten, listeLesen, listePruefen, schnelleDateien, testDateien };
