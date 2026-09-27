#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   STANDARDS-Funktionsnamen-Wächter — Auftrag „Belegkette und Lücken", Spur B2
   (A200, Register-Nachtrag Befund 5)
   ────────────────────────────────────────────────────────────────────────────
   Anlass: eine ungeprüft aus einer SP-Befundtabelle übernommene Angabe nannte
   `startCamtImport()`/`parseElster()` als Parser-Funktionen — beide existieren
   im Kern nicht, richtig sind `parseCamt053`/`_jsonParse`. `STANDARDS.md` geht
   öffentlich (Förderanträge/Nominierung); eine im Quellcode nicht auffindbare
   Funktion entwertet dort das ganze Dokument.

   `INTEROPERABILITY.md`, im Auftrag als zweite betroffene Datei genannt,
   existiert in diesem Repo nicht (geprüft, 14./15.08.2026) — nur `STANDARDS.md`
   wird geprüft. Stellt sich heraus, dass die Datei unter anderem Namen doch
   entsteht, gehört sie hier als zweiter Pfad ergänzt.

   WAS ER TUT: sammelt jeden Backtick-umschlossenen Bezeichner der Form
   `funktionsName`/`_funktionsName` (lower camelCase, optionaler führender
   Unterstrich) aus `STANDARDS.md` und hält ihn gegen `function NAME(` in
   `vivodepot.html`. Nicht jeder so geformte Bezeichner ist ein Funktionsname —
   Format-/Sektor-/Flag-Wörter (`camt053`, `finanzen`, `nurImport`, …) sehen
   gleich aus. Per Hand geprüft und unten als benannte Ausnahmen geführt
   (EXCLUDE, nach WERT, nicht nach Kontext-Raten).

   ROT-BELEG: ein gepflanzter Fantasiename (`--pflanze-fantasienamen`) fügt
   `parseFantasieKanalNichtVorhanden` als zusätzlichen Beleg ein und muss den
   Lauf mit Exit 1 scheitern lassen.

   Aufruf:
     node tools/standards-funktionsnamen-pruefen.js
     node tools/standards-funktionsnamen-pruefen.js --json
     node tools/standards-funktionsnamen-pruefen.js --pflanze-fantasienamen   (Selbsttest)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const argv = process.argv.slice(2);
const ALS_JSON = argv.includes('--json');
const PFLANZE_FANTASIENAMEN = argv.includes('--pflanze-fantasienamen');

const REPO = path.join(__dirname, '..');
const STANDARDS_PFAD = path.join(REPO, 'STANDARDS.md');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');

const BEZEICHNER_MUSTER = /`(_?[a-z][a-zA-Z0-9]*)`/g;

/* Format-/Sektor-/Flag-/Sprach-Wörter, die wie ein Funktionsname aussehen,
   aber keiner sind — per Hand gegen den Kern geprüft (14./15.08.2026). */
const EXCLUDE = new Set([
  'camt053', 'finanzen', 'nurImport', 'nurExport', 'ohneAuswahl',
  'elster', 'xmeld', 'json', 'gesundheit', 'vct', 'resourceType',
  'dataAbsentReason', 'null', 'undefined',
]);

function funktionsBezeichnerAusMarkdown(pfad) {
  const inhalt = fs.readFileSync(pfad, 'utf8');
  const zeilen = inhalt.split('\n');
  const belege = [];
  zeilen.forEach((zeile, i) => {
    let m;
    BEZEICHNER_MUSTER.lastIndex = 0;
    while ((m = BEZEICHNER_MUSTER.exec(zeile))) {
      if (EXCLUDE.has(m[1])) continue;
      belege.push({ name: m[1], zeile: i + 1, kontext: zeile.trim().slice(0, 160) });
    }
  });
  return belege;
}

function funktionExistiertImKern(name, kernQuelltext) {
  return kernQuelltext.includes('function ' + name + '(');
}

function main() {
  const dateien = [STANDARDS_PFAD].filter((p) => fs.existsSync(p));
  if (!fs.existsSync(STANDARDS_PFAD)) {
    console.error('ABBRUCH: STANDARDS.md nicht gefunden unter ' + STANDARDS_PFAD);
    process.exitCode = 2;
    return;
  }
  let kernQuelltext = fs.readFileSync(KERN_PFAD, 'utf8');
  if (PFLANZE_FANTASIENAMEN) {
    // Selbsttest: KEIN echter Fund im Kern, damit die Probe wirklich rot wird.
  }

  let alleBelege = dateien.flatMap(funktionsBezeichnerAusMarkdown);
  if (PFLANZE_FANTASIENAMEN) {
    alleBelege = alleBelege.concat([{ name: 'parseFantasieKanalNichtVorhanden', zeile: 0, kontext: '(gepflanzt, Selbsttest)' }]);
  }

  const falsch = alleBelege.filter((b) => !funktionExistiertImKern(b.name, kernQuelltext));
  const richtig = alleBelege.length - falsch.length;

  if (ALS_JSON) {
    console.log(JSON.stringify({ gesamt: alleBelege.length, richtig, falsch: falsch.length, falschListe: falsch }, null, 1));
    process.exitCode = falsch.length > 0 ? 1 : 0;
    return;
  }
  console.error('STANDARDS.md-Funktionsnamen-Belege: ' + alleBelege.length + ' (' + richtig + ' im Kern gefunden, ' + falsch.length + ' nicht)');
  for (const b of falsch) {
    console.error('  FEHLT  STANDARDS.md:' + b.zeile + '  `' + b.name + '`  — ' + b.kontext);
  }
  process.exitCode = falsch.length > 0 ? 1 : 0;
}

if (require.main === module) {
  try { main(); }
  catch (e) { console.error(e.message); process.exitCode = 2; }
}

module.exports = { funktionsBezeichnerAusMarkdown, funktionExistiertImKern, EXCLUDE };
