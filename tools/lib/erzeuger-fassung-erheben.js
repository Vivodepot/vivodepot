'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   erzeuger-fassung-erheben.js — welche Werkzeuge schreiben die Fassung in eine getrackte Datei? (18.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Anlass: tools/bausteinregister-bauen.js trägt `fassung.kern` (aus SCHALEN_STAND) in tools/bausteinregister/bausteine.json,
   stand aber nicht in den Regenerier-Schritten der Landung. Nach einem Fassungssprung war die Liste veraltet,
   und erst pre-push oder Zugkopf wurden rot. Diese Erhebung findet die ganze Klasse, nicht nur den einen Fall; gehalten von
   die Klassenprobe der Landung.

   DIE SIGNATUR, am Quelltext gelesen (Kommentare ausgeblendet), nur tools/*.js der obersten Ebene:
     1. liest eine Fassung oder einen Stempel: SCHALEN_STAND, BUILD_DATUM oder docs/fassungen* im Code;
     2. schreibt mit writeFileSync auf ein Ziel, das sich statisch zu einem Repo-Pfad auflösen lässt — eine Konstante
        `path.join(REPO|repo|ROOT|__dirname|'literal', 'seg', KONST …)` oder dieselbe Form direkt im Aufruf;
     3. das Ziel ist eine getrackte Datei (git ls-files).
   GRENZE: ein Ziel aus einer Laufzeitvariablen (Argument, Schleife, Funktion) löst die Erhebung nicht auf; solche Erzeuger
   fallen durch. Sie ist eine Ratsche gegen die Form, die bausteinregister-bauen.js hat, kein Beweis für Vollständigkeit.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./ohne-git-umgebung.js');

const LIEST_FASSUNG = /SCHALEN_STAND|BUILD_DATUM|'docs',\s*'fassungen|docs\/fassungen/;
const BASIS = /^(REPO|repo|ROOT|root|WURZEL|wurzel|REPO_ROOT|__dirname)$/;
const SEGMENTE = "((?:\\s*,\\s*(?:'[^']*'|[A-Z_][A-Z0-9_]*))*)";
const JOIN = "path\\.(?:join|resolve)\\(\\s*([A-Za-z_]+|'[^']*')" + SEGMENTE + '\\s*\\)';

function ohneKommentare(t) {
  return t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
}

/** Die statisch auflösbaren writeFileSync-Ziele eines Quelltexts, als Repo-relative Pfade. */
function schreibziele(text) {
  const t = ohneKommentare(text);
  const werte = {};
  const aufloesen = (basis, segmente) => {
    const teile = [];
    if (basis.startsWith("'")) { teile.push(basis.slice(1, -1)); basis = '.'; } else if (!BASIS.test(basis)) return null;
    for (const x of segmente.split(',').map((v) => v.trim()).filter(Boolean)) {
      const q = /^'(.*)'$/.exec(x);
      if (q) teile.push(q[1]); else if (werte[x] !== undefined) teile.push(werte[x]); else return null;
    }
    return path.posix.normalize(path.posix.join(basis === '__dirname' ? 'tools' : '.', ...teile));
  };
  let vorher = -1;
  while (Object.keys(werte).length !== vorher) {   // Konstanten, die auf Konstanten aufbauen
    vorher = Object.keys(werte).length;
    for (const m of t.matchAll(/const\s+([A-Z_][A-Z0-9_]*)\s*=\s*((?:'[^'\n]*'|[A-Z_][A-Z0-9_]*)(?:\s*\+\s*(?:'[^'\n]*'|[A-Z_][A-Z0-9_]*))*)\s*;/g)) {
      let v = ''; let ok = true;
      for (const x of m[2].split('+').map((s) => s.trim())) {
        const q = /^'(.*)'$/.exec(x);
        if (q) v += q[1]; else if (werte[x] !== undefined) v += werte[x]; else { ok = false; break; }
      }
      if (ok && werte[m[1]] === undefined) werte[m[1]] = v;
    }
    for (const m of t.matchAll(new RegExp('const\\s+([A-Z_][A-Z0-9_]*)\\s*=\\s*[^\\n;]*?' + JOIN + '\\s*;', 'g'))) {
      const r = aufloesen(m[2], m[3]);
      if (r !== null && werte[m[1]] === undefined) werte[m[1]] = r;
    }
  }
  const ziele = new Set();
  for (const m of t.matchAll(/writeFileSync\(\s*([A-Z_][A-Z0-9_]*)\s*,/g)) if (werte[m[1]] !== undefined) ziele.add(path.posix.normalize(werte[m[1]]));
  for (const m of t.matchAll(new RegExp('writeFileSync\\(\\s*' + JOIN, 'g'))) { const r = aufloesen(m[1], m[2]); if (r) ziele.add(r); }
  return [...ziele].sort();
}

/**
 * Rein: { werkzeuge: { 'name.js': quelltext }, getrackt: Set<pfad> } → [{ name, ziele }] (sortiert nach Name).
 */
function erheben({ werkzeuge, getrackt }) {
  const treffer = [];
  for (const name of Object.keys(werkzeuge).sort()) {
    const text = werkzeuge[name];
    if (!LIEST_FASSUNG.test(ohneKommentare(text))) continue;
    const ziele = schreibziele(text).filter((z) => getrackt.has(z));
    if (ziele.length) treffer.push({ name, ziele });
  }
  return treffer;
}

/** Dieselbe Erhebung gegen einen echten Baum: tools/*.js und git ls-files. */
function erhebenAusRepo(repo) {
  const ordner = path.join(repo, 'tools');
  const werkzeuge = {};
  for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
    if (e.isFile() && e.name.endsWith('.js')) werkzeuge[e.name] = fs.readFileSync(path.join(ordner, e.name), 'utf8');
  }
  const getrackt = new Set(execFileSync('git', ['ls-files'], { cwd: repo, encoding: 'utf8', env: ohneGitUmgebung() }).split('\n').filter(Boolean));
  return erheben({ werkzeuge, getrackt });
}

/**
 * Jeder Treffer steht in den Schritten oder in der Positivliste, nie in beiden; jeder Eintrag der Positivliste ist ein Treffer.
 * @param {{ treffer: {name:string}[], schritte: Set<string>, positivliste: Object<string,string> }} p
 */
function pruefen({ treffer, schritte, positivliste }) {
  const fehler = [];
  const namen = new Set(treffer.map((t) => t.name));
  for (const t of treffer) {
    const imSchritt = schritte.has(t.name); const gelistet = Object.prototype.hasOwnProperty.call(positivliste, t.name);
    if (!imSchritt && !gelistet) {
      fehler.push(t.name + ': schreibt eine Fassung in ' + t.ziele.join(', ') + ', steht aber weder in REGENERIER_SCHRITTE '
        + '(Landung) noch in der Positivliste — aufnehmen, oder mit Grund eintragen.');
    } else if (imSchritt && gelistet) fehler.push(t.name + ': steht in REGENERIER_SCHRITTE und in der Positivliste — genau eine Stelle.');
  }
  for (const [n, grund] of Object.entries(positivliste)) {
    if (!namen.has(n)) fehler.push(n + ': steht in der Positivliste, trifft die Signatur aber nicht mehr — Zeile streichen.');
    else if (typeof grund !== 'string' || grund.trim().length < 40) fehler.push(n + ': Positivliste ohne Grund (mindestens 40 Zeichen).');
  }
  return fehler;
}

module.exports = { erheben, erhebenAusRepo, pruefen, schreibziele, LIEST_FASSUNG };
