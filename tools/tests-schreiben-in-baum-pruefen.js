#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   tests-schreiben-in-baum-pruefen.js — schreibt eine Probe in eine Datei des Repos selbst?

   Anlass (19.09.2026): zwei Proben überschrieben die ECHTE vivodepot.html mit einem abweichenden Kern,
   um daraus ein Produkt zu bauen, und stellten sie danach wieder her. Parallel laufende Proben (die Suite
   fährt Dateien nebeneinander) sahen den kaputten Kern — „die Probe darf den echten Kern nicht verändert
   haben" schlug an, obwohl der Test einzeln grün ist. Bricht so ein Lauf ab, bleibt der Kern beschädigt.
   Dieselbe Klasse wie das GIT_DIR-Leck: eine Probe, die in etwas schreibt, das nicht ihres ist.

   WAS ES FINDET (statisch): Aufrufe von writeFileSync/appendFileSync/rmSync/unlinkSync/… mit einem Ziel,
   das an den Repo-Baum gebunden ist (REPO, KERN_PFAD, HTML_PATH, path.join(__dirname, '..')), und
   copyFileSync/cpSync/renameSync mit einem solchen ZIEL (die Quelle darf im Repo liegen: Lesen ist erlaubt).
   Ein Ziel, in dem tmp/temp vorkommt, gilt als Wegwerf-Ort. Bekannte, begründete Ausnahmen stehen in der
   Positivliste des Tests.
   Die Grenze: was über eine Zwischenvariable läuft, sieht die statische Prüfung nicht — dafür gibt es
   tools/baum-pruefsumme.js, das im Hook vor und nach der Suite die Bytes aller getrackten Dateien vergleicht.

   Aufruf: node tools/tests-schreiben-in-baum-pruefen.js [--verzeichnis tests]
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const SCHREIBEND = /\b(?:fs\.)?(writeFileSync|appendFileSync|copyFileSync|renameSync|rmSync|unlinkSync|cpSync|truncateSync|writeFile|appendFile|copyFile|rename|rm|unlink)\s*\(/g;
const REPO_GEBUNDEN = /\b(REPO|KERN_PFAD|HTML_PATH|KERN_HTML|KERN|WURZEL|ROOT)\b|__dirname\s*,\s*['"`]\.\.['"`]/;
const NUR_ZIEL = /^(copyFileSync|cpSync|copyFile|rename|renameSync)$/;

function argument(q, offen, n) {
  let tiefe = 1;
  let start = offen + 1;
  let k = 0;
  let i = offen + 1;
  for (; i < q.length && tiefe > 0; i++) {
    const c = q[i];
    if (c === '(' || c === '[' || c === '{') tiefe++;
    else if (c === ')' || c === ']' || c === '}') { tiefe--; if (tiefe === 0) break; }
    else if (c === ',' && tiefe === 1) { if (k === n) return q.slice(start, i); k++; start = i + 1; }
  }
  return k === n ? q.slice(start, i) : '';
}

/** @returns {{zeile:number, aufruf:string, ziel:string}[]} */
function fundeInText(text) {
  const funde = [];
  let m;
  SCHREIBEND.lastIndex = 0;
  while ((m = SCHREIBEND.exec(text))) {
    const offen = m.index + m[0].length - 1;
    const ziel = NUR_ZIEL.test(m[1])
      ? argument(text, offen, 1) + (/^rename/.test(m[1]) ? ' ' + argument(text, offen, 0) : '')
      : argument(text, offen, 0);
    if (!REPO_GEBUNDEN.test(ziel) || /tmp|temp/i.test(ziel)) continue;
    funde.push({ zeile: text.slice(0, m.index).split('\n').length, aufruf: m[1], ziel: ziel.replace(/\s+/g, ' ').trim().slice(0, 90) });
  }
  return funde;
}

function dateien(verzeichnis) {
  const raus = [];
  (function ab(d) {
    for (const n of fs.readdirSync(d).sort()) {
      const p = path.join(d, n);
      if (fs.statSync(p).isDirectory()) { if (n !== 'node_modules') ab(p); } else if (/\.(js|mjs)$/.test(n)) raus.push(p);
    }
  })(verzeichnis);
  return raus;
}

/** @returns {Record<string, {zeile:number, aufruf:string, ziel:string}[]>} je Datei (relativ zum Elternverzeichnis) */
function fundeImVerzeichnis(verzeichnis) {
  const basis = path.dirname(verzeichnis);
  const je = {};
  for (const p of dateien(verzeichnis)) {
    const f = fundeInText(fs.readFileSync(p, 'utf8'));
    if (f.length) je[path.relative(basis, p).split(path.sep).join('/')] = f;
  }
  return je;
}

function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--verzeichnis');
  const dir = path.resolve(path.join(__dirname, '..'), i >= 0 ? argv[i + 1] : 'tests');
  const je = fundeImVerzeichnis(dir);
  for (const [d, f] of Object.entries(je)) for (const x of f) console.log(`${d}:${x.zeile}  ${x.aufruf}(${x.ziel})`);
  console.log(`tests-schreiben-in-baum: ${Object.keys(je).length} Datei(en) mit Schreibzugriff auf den Repo-Baum.`);
  process.exitCode = Object.keys(je).length ? 1 : 0;
}

if (require.main === module) main();

module.exports = { fundeInText, fundeImVerzeichnis };
