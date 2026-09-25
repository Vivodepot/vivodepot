#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ab-werk-logikmodul-auszuege-kern-schreiben.js — die zwei produktunabhängigen
   Ab-Werk-Auszüge aus ihrer einzigen Quelle direkt in eine eigene, native
   Kern-Konstante schreiben (Strang A, Schnitt-Vorbedingung, 17.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   ABLÖST `tools/ab-werk-auszuege-ins-buendel-schreiben.js` (16.09.2026), das dieselben zwei
   Fixtures bisher in `BUERGERMODUL_BUENDEL.logikModule` schrieb. GRUND DER ABLÖSUNG: das
   Bündel wird beim Schnitt geleert — `erbschein-vorbereitung`/`zugang-zum-recht-beratungshilfe`
   sind aber PRODUKTUNABHÄNGIG (jedes Depot bekommt sie über `_abWerkAuszuegeEinlassen`, egal
   welches Produkt), gehören darum nicht in eine Quelle, die der Schnitt leert. `AB_WERK_LOGIK_
   MODUL_QUELLEN` (die produktspezifische, bewusst leere Konstante, s. dort) ist die FALSCHE
   Stelle dafür — gemessen und bestätigt (17.09.2026): sie bleibt leer, jedes Produkt füllt sie
   für sich, diese zwei sollen aber in JEDEM Produkt stehen, ungefragt.

   DIE EINZIGE QUELLE bleibt unverändert `tests/fixtures/erbschein-vorbereitung-logikmodul.json`
   und `tests/fixtures/zugang-zum-recht-beratungshilfe-logikmodul.json` — `tests/erbschein-
   ab-werk-einlass.test.js` hält die im Kern eingebettete Konstante gegen diese Datei.
   GERÜST-SCHNITT S5 (20.09.2026): `zugang-zum-recht-beratungshilfe` ist kein Kern-Auszug mehr, sondern ein Template, das
   das Rezept trägt. SCHEMA 87 (21.09.2026): auch `erbschein-vorbereitung` ist ein Template im Rezept; die Konstante ist leer.

   DIESES WERKZEUG: liest beide Fixtures, schreibt sie WORTGETREU (JSON.stringify, Einrückung 2)
   als natives `Object.freeze([...])`-Array-Literal zwischen die Marker
   AB_WERK_LOGIK_MODUL_AUSZUEGE_QUELLEN:BEGIN/END — derselbe Regionen-Austausch-Weg wie
   `tools/build-feldkatalog.js`/`tools/wizards-template-erzeugen.js`, kein Textersatz in einer
   200-KB-Zeile.

   Aufruf:
     node tools/ab-werk-logikmodul-auszuege-kern-schreiben.js            → schreibt vivodepot.html
     node tools/ab-werk-logikmodul-auszuege-kern-schreiben.js --check    → schreibt nichts, meldet Drift (Exit 1)
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = path.join(REPO, 'vivodepot.html');
const QUELLEN = Object.freeze([]);

const BEGIN = '/* AB_WERK_LOGIK_MODUL_AUSZUEGE_QUELLEN:BEGIN — generierter Bereich (tools/ab-werk-logikmodul-auszuege-kern-schreiben.js) */';
const ENDE = '/* AB_WERK_LOGIK_MODUL_AUSZUEGE_QUELLEN:END */';

function regionInhalt(module) {
  return BEGIN + '\nconst AB_WERK_LOGIK_MODUL_AUSZUEGE_QUELLEN = Object.freeze(\n'
    + JSON.stringify(module, null, 2) + '\n);\n' + ENDE;
}

function main() {
  const check = process.argv.includes('--check');
  const module = QUELLEN.map((q) => JSON.parse(fs.readFileSync(q, 'utf8')));
  const html = fs.readFileSync(KERN, 'utf8');
  const a = html.indexOf(BEGIN), b = html.indexOf(ENDE);
  if (a < 0 || b < 0) throw new Error('AB_WERK_LOGIK_MODUL_AUSZUEGE_QUELLEN-Marker fehlen in vivodepot.html');
  const soll = regionInhalt(module);
  const ist = html.slice(a, b + ENDE.length);
  if (ist === soll) {
    console.log('ab-werk-logikmodul-auszuege-kern-schreiben: kein Drift — ' + module.length + ' Auszüge.');
    return;
  }
  if (check) {
    console.error('ab-werk-logikmodul-auszuege-kern-schreiben: DRIFT — vivodepot.html weicht von den Fixtures ab');
    console.error('  Abhilfe: node tools/ab-werk-logikmodul-auszuege-kern-schreiben.js');
    process.exit(1);
  }
  const neu = html.slice(0, a) + soll + html.slice(b + ENDE.length);
  fs.writeFileSync(KERN, neu, 'utf8');
  console.log('ab-werk-logikmodul-auszuege-kern-schreiben: ' + module.length + ' Auszüge aus den Fixtures in vivodepot.html geschrieben.');
}

if (require.main === module) main();
module.exports = { regionInhalt, BEGIN, ENDE, QUELLEN, KERN };
