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
   ANLASS AUS DEM DIFF (04.10.2026, Befund SCHNELLSTUFE-OHNE-DIFF-ANLASS). Die Grenze oben traf ausgerechnet die Proben, die den
   geänderten Text spiegeln: ein Commit an einem Hook ließ die langsame Probe aus, die genau diese Zeile wörtlich prüft, und
   das Rot kam erst vor dem Push. Darum holt anlassDateien aus der Langsam-Liste zurück: (a) jede GEÄNDERTE
   langsame Testdatei, (b) jede langsame Probe, die einen geänderten Pfad nennt — wörtlich oder als
   Join-Folge gequoteter Segmente —, (c) jede Probe, die unter `spiegelt` der Liste für einen geänderten Pfad erklärt ist (für
   Pfade, die eine Textsuche nicht sieht). spiegelBefunde hält die Klasse: wer einen Hook spiegelt, muss zurückkommen.
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
  const sp = liste.spiegelt || {};
  if (typeof sp !== 'object' || Array.isArray(sp)) f.push('spiegelt ist kein Objekt');
  else {
    for (const [d, pfade] of Object.entries(sp)) {
      if (!liste.langsam.includes(d)) f.push('spiegelt nennt eine Datei, die nicht langsam ist: ' + d);
      if (!Array.isArray(pfade) || !pfade.length || pfade.some((p) => typeof p !== 'string' || !p)) f.push('spiegelt ohne Pfade: ' + d);
    }
  }
  const sortiert = [...liste.langsam].sort();
  if (sortiert.join('\n') !== liste.langsam.join('\n')) f.push('nicht sortiert');
  return f;
}

/** Nennt `quelle` den Pfad wörtlich oder als Folge gequoteter Segmente ('a', 'b', 'c.js')? */
function nenntPfad(quelle, pfad) {
  if (quelle.includes(pfad)) return 'wörtlich';
  const teile = pfad.split('/');
  if (teile.length < 2) return null;
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(teile.map((t) => '[\'"`]' + esc(t) + '[\'"`]').join('\\s*,\\s*'));
  return re.test(quelle) ? 'Join' : null;
}

/** Langsame Dateien, die der Diff zurück in die Schnellstufe holt: [{ datei, grund }]. */
function anlassDateien(liste, geaendert, lesen) {
  const langsam = (liste && liste.langsam) || [];
  const spiegelt = (liste && liste.spiegelt) || {};
  const aus = [];
  for (const d of langsam) {
    if (geaendert.includes(d)) { aus.push({ datei: d, grund: 'selbst geändert' }); continue; }
    const erklaert = (spiegelt[d] || []).find((p) => geaendert.includes(p));
    if (erklaert) { aus.push({ datei: d, grund: erklaert + ' (spiegelt)' }); continue; }
    let quelle = null;
    for (const p of geaendert) {
      if (p === d) continue;
      if (quelle === null) { try { quelle = lesen(d); } catch (_) { quelle = ''; } }
      const art = nenntPfad(quelle, p);
      if (art) { aus.push({ datei: d, grund: p + ' (' + art + ')' }); break; }
    }
  }
  return aus;
}

/* Spiegelt eine Probe einen Hook? (i) sie enthält eine kennzeichnende Zeile des Hooks wörtlich (≥ 30 Zeichen, kein Kommentar,
   keine bloße Klammer- oder Kontrollzeile), oder (ii) sie nennt den Ordner hooks und den Hook-Namen als Zeichenkette. */
const KONTROLLE = /^(?:fi|then|else|esac|done|do|;;|\{|\}|exit \d+|set -e)$/;
function kennzeichnendeZeilen(hookText) {
  return [...new Set(String(hookText).split('\n').map((z) => z.trim())
    .filter((z) => z.length >= 30 && !z.startsWith('#') && !KONTROLLE.test(z) && !/^echo\s/.test(z)))];
}
// `andere`: die übrigen Hooks { pfad: text }. Eine Zeile, die auch in einem Hook steht, den die Probe beim Pfad nennt, gehört zu
// jenem (pre-push und pre-commit teilen Zeilen; eine pre-push-Probe spiegelt den pre-commit nicht).
function spiegeltHook(quelle, hookPfad, hookText, andere = {}) {
  const name = hookPfad.split('/').pop();
  if (/['"`/]hooks['"`/]/.test(quelle) && new RegExp('[\'"`/]' + name.replace(/[-.]/g, '\\$&') + '[\'"`]').test(quelle)) return 'nennt den Hook';
  const genannt = Object.entries(andere).filter(([h]) => h !== hookPfad && nenntPfad(quelle, h)).map(([, t]) => t);
  const z = kennzeichnendeZeilen(hookText).find((l) => quelle.includes(l) && !genannt.some((t) => t.includes(l)));
  return z ? 'enthält die Zeile „' + z.slice(0, 60) + '“' : null;
}
/** Langsame Proben, die einen Hook spiegeln, aber bei dessen Änderung NICHT zurückgeholt würden. Leer = in Ordnung. */
function spiegelBefunde(liste, lesen, hooks) {
  const b = [];
  for (const d of (liste && liste.langsam) || []) {
    let quelle;
    try { quelle = lesen(d); } catch (_) { continue; }
    for (const [h, text] of Object.entries(hooks)) {
      const wie = spiegeltHook(quelle, h, text, hooks);
      if (!wie) continue;
      if (!anlassDateien({ langsam: [d], spiegelt: (liste.spiegelt || {}) }, [h], () => quelle).length) {
        b.push(d + ' spiegelt ' + h + ' (' + wie + '), wird bei dessen Änderung aber nicht zurückgeholt — Pfad nennen oder unter „spiegelt“ erklären');
      }
    }
  }
  return b;
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

module.exports = { ohneGitUmgebung, GRENZE_MS, DATEINAME, zeitenPfad, zeitenLesen, zusammenfuehren, langsamAusZeiten, listeLesen, listePruefen, schnelleDateien, testDateien, nenntPfad, anlassDateien, kennzeichnendeZeilen, spiegeltHook, spiegelBefunde };
