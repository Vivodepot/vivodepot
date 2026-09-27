#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   refMehrfach-Bestandsprüfung — CLI-Wrapper (Bilanz-Posten 24, 02.08.2026)
   ────────────────────────────────────────────────────────────────────────
   Listet refMehrfach-Einträge mit LEEREM ref und GEFÜLLTEM override auf —
   Verdacht auf den vor dem 20.07.2026 gefixten Overwrite-Bug (Weg A). Die
   eigentliche Traversierung steht browserunabhängig in
   tools/lib/refmehrfach-verwaiste-override-finden.js; dieser Wrapper liefert
   ihr nur die zwei Eingaben (Depot-Daten, Feld-Definitionen) und formatiert
   die Ausgabe.

   Ursprünglich ein Browser-Konsolen-IIFE (über `data`/`SEKTOREN` als globale
   Bindings der laufenden App) — hier stattdessen zwei Quellen:
     - Depot-Daten: per Argument eine JSON-Datei mit `{ sektoren, menschen }`
       (ein serialisiertes Depot), ODER ohne Argument das Repo-Fixture
       `tests/fixtures/referenzdepot.js` (auch von tests/refmehrfach.test.js
       genutzt).
     - Feld-Definitionen (SEKTOREN): immer aus dem Kern selbst
       (`tests/load-kern.js` → `vivodepot.html`) — das ist App-Struktur, kein
       Depot-Inhalt, und steht darum nicht in der JSON-Datei.

   Reine Anzeige, keine Änderung an irgendeinem Depot.

   AUFRUF
     node tools/refmehrfach-verwaiste-override-pruefen.js [depot.json]
   ════════════════════════════════════════════════════════════════════════ */

const fs = require('node:fs');
const path = require('node:path');
const { verwaisteOverrideFinden } = require('./lib/refmehrfach-verwaiste-override-finden.js');

const REPO_ROOT = path.resolve(__dirname, '..');

function datenLaden(datenPfad) {
  if (datenPfad) {
    const roh = fs.readFileSync(path.resolve(datenPfad), 'utf8');
    return JSON.parse(roh);
  }
  const { MENSCHEN, baueSektoren } = require(path.join(REPO_ROOT, 'tests', 'fixtures', 'referenzdepot.js'));
  return { sektoren: baueSektoren(), menschen: MENSCHEN };
}

function main() {
  const datenPfad = process.argv.slice(2).find(a => !a.startsWith('--'));
  const data = datenLaden(datenPfad);
  const { ladeKern } = require(path.join(REPO_ROOT, 'tests', 'load-kern.js'));
  const { V } = ladeKern();

  const funde = verwaisteOverrideFinden(data, V.bereicheAlle());
  const quelle = datenPfad || 'tests/fixtures/referenzdepot.js (Default-Fixture)';

  console.log(`\n  REFMEHRFACH-BESTANDSPRÜFUNG  ·  ${quelle}\n`);
  if (!funde.length) {
    console.log('  Keine refMehrfach-Einträge mit leerem ref + gefülltem override gefunden. Nichts zu prüfen.\n');
    return;
  }
  console.log(`  ${funde.length} Fund(e) — leerer ref + gefüllter override. Bitte durchsehen:`);
  console.table(funde);
  console.log('  Hinweis: "aehnelt_registereintrag" ist nur ein grober Hinweis, keine Diagnose. Legitimer Freitext ohne Registerbezug ist ein zulässiger Fall.\n');
}

if (require.main === module) main();
module.exports = { datenLaden, REPO_ROOT };
