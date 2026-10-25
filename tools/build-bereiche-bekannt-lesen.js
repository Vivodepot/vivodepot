#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   build-bereiche-bekannt-lesen.js — die Lese-App kennt die Bereiche der Pro-Produkte auch ohne Mitschrift
   ────────────────────────────────────────────────────────────────────────────
   WOZU (19.10.2026, Fix b zu PRO-AUSSCHNITT-OHNE-BEREICHSDEFINITION). Eine Datei ohne Mitschrift (ein Ausschnitt von vor v935,
   die QR-Übergabe) trägt Pro-Werte ohne die Definitionen ihrer Bereiche. Der Kern kennt sie über die eingebackene Region
   AB_WERK_BEREICHE_BEKANNT; die Lese-App wird nicht konfektioniert und hatte keine. Dieses Werkzeug schreibt `neu` aus
   tools/vivodepot-bereiche-bekannt.json wörtlich in die Region BEREICHE_BEKANNT_LESEN von vivodepot-lesen.html.

   NUR `neu`, NIE `benennen`: die Bereiche der Berufsmodule gehen nicht hinaus, und die Lese-App ist die ausgelieferte Datei selbst.
   Die öffentliche Datei trägt `benennen` ohnehin nicht (ihr Erzeuger schreibt es nur in die Fassung bei den Berufsmodulen).

   Aufruf:
     node tools/build-bereiche-bekannt-lesen.js            → schreibt die Region
     node tools/build-bereiche-bekannt-lesen.js --check    → schreibt nichts, meldet Drift (Exit 1)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const LESEN = path.join(REPO, 'vivodepot-lesen.html');
const BEKANNT = path.join(REPO, 'tools', 'vivodepot-bereiche-bekannt.json');
const BEGIN = '/* BEREICHE_BEKANNT_LESEN:BEGIN */';
const ENDE = '/* BEREICHE_BEKANNT_LESEN:END */';

/* Ohne `icon` (20.10.2026): die Lese-App zeichnet keine Bereichs-Icons, und der Name eines Icons (etwa „wallet") ist kein Text der App. */
function ohneIcon(o) {
  if (Array.isArray(o)) return o.map(ohneIcon);
  if (!o || typeof o !== 'object') return o;
  return Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'icon').map(([k, v]) => [k, ohneIcon(v)]));
}
function region(bekannt) {
  const neu = ohneIcon((bekannt && bekannt.neu) || {});
  if (!Object.keys(neu).length) throw new Error('vivodepot-bereiche-bekannt.json trägt keine Bereiche in `neu` — Form geändert? Nicht raten, nachsehen.');
  return BEGIN + '\nconst BEREICHE_BEKANNT_LESEN = Object.freeze(' + JSON.stringify({ neu }) + ');\n' + ENDE;
}

function regionErsetzen(quelle, neu, datei) {
  const a = quelle.indexOf(BEGIN), b = quelle.indexOf(ENDE);
  if (a < 0 || b < 0 || b < a) throw new Error('BEREICHE_BEKANNT_LESEN-Marker fehlen in ' + datei);
  return quelle.slice(0, a) + neu + quelle.slice(b + ENDE.length);
}

function main() {
  const check = process.argv.includes('--check');
  const bekannt = JSON.parse(fs.readFileSync(BEKANNT, 'utf8'));
  const q = fs.readFileSync(LESEN, 'utf8');
  const neu = regionErsetzen(q, region(bekannt), path.basename(LESEN));
  if (neu === q) { console.log('build-bereiche-bekannt-lesen: kein Drift (' + Object.keys(bekannt.neu).length + ' Bereiche).'); return; }
  if (check) {
    console.error('build-bereiche-bekannt-lesen: DRIFT — vivodepot-lesen.html (BEREICHE_BEKANNT_LESEN-Region)');
    console.error('  Abhilfe: node tools/build-bereiche-bekannt-lesen.js');
    process.exit(1);
  }
  fs.writeFileSync(LESEN, neu);
  console.log('build-bereiche-bekannt-lesen: Region geschrieben (' + Object.keys(bekannt.neu).length + ' Bereiche).');
}

if (require.main === module) main();
module.exports = { region, regionErsetzen, ohneIcon, BEGIN, ENDE, LESEN, BEKANNT };
