#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   vivodepot-bereiche-bekannt-erzeugen.js — die Bereiche aller Vivodepot-Produkte, als EINE
   Ab-Werk-Nutzlast für jedes Produkt
   ────────────────────────────────────────────────────────────────────────────
   WOZU (Entscheidung 16.09.2026, U2-ADR-398). Jede Datei öffnet in jedem Produkt, und alles
   muss drin sein. Eine Pro-Datei von vor dem vierten Mitschrift-Fach trägt ihre Pro-Werte,
   aber nicht die Definition der Pro-Bereiche; ein Privat-Produkt konnte die Werte darum
   keinem Bereich zuordnen. Dieses Werkzeug sammelt den `neu`-Teil jedes Bereichsersatzes,
   den `tools/lib/vier-produkte.js` einem Produkt gibt, zu einer Datei. Der Konfektionierer
   backt sie in ALLE Produkte (Region `AB_WERK_BEREICHE_BEKANNT`); der Kern liest sie als
   dritte Quelle nach dem laufenden Produkt und der Mitschrift der Datei — nur `neu`, nie
   `ersetzt`, und nur für einen Bereich, zu dem die Datei Werte trägt.

   Zwei Produkte mit derselben Bereichs-ID und verschiedener Definition sind ein Fehler: dann
   bräche die Datei des einen im anderen anders auf. Das Werkzeug bricht dort ab.

   Aufruf:
     node tools/vivodepot-bereiche-bekannt-erzeugen.js [--pruefen]
     --pruefen: schreibt nichts, Exit 1 bei Abweichung
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { PRODUKTE, BEREICHE_BEKANNT_PFAD, PRO_BEREICHS_ERSATZ_PFAD } = require('./lib/vier-produkte.js');
const VORLAGEN_KENNUNGEN_PFAD = path.join(__dirname, 'pro-vorlage-en-kennungen.json');

function bekannteBereicheErzeugen(produkte = PRODUKTE) {
  const neu = {};
  // Seit dem Schnitt trägt KEIN Produkt mehr einen `bereichsErsatzPfad` (null für alle vier, die Bereiche kommen
  // als Templates) — die Quelle dieser Datei blieb aber die Bereichs-Ersatz-Datei: aus ihr stammen die
  // Definitionen der Pro-Bereiche, die jedes Produkt kennen muss. Ohne diese Zeile schrieb der Generator
  // „0 Bereiche" und die Drift-Probe (tests/pro-bereiche-in-privat.test.js) lief gegen eine leere Datei.
  const pfade = [...new Set([PRO_BEREICHS_ERSATZ_PFAD, ...produkte.map((p) => p.bereichsErsatzPfad)].filter(Boolean))].sort();
  for (const pfad of pfade) {
    const ersatz = JSON.parse(fs.readFileSync(pfad, 'utf8'));
    for (const [id, def] of Object.entries((ersatz && ersatz.neu) || {})) {
      if (Object.prototype.hasOwnProperty.call(neu, id) && JSON.stringify(neu[id]) !== JSON.stringify(def)) {
        throw new Error('Bereich „' + id + '" ist in zwei Bereichsersätzen verschieden definiert — nicht geschrieben.');
      }
      neu[id] = def;
    }
  }
  // Code-Review 17.09.2026 (B1): die eingefrorene Zuordnung der Kennungen aus der englischen
  // Pro-Vorlage reist mit, damit jedes Produkt eine alte pro-en-Datei gleich übernimmt.
  const vorlagenKennungen = JSON.parse(fs.readFileSync(VORLAGEN_KENNUNGEN_PFAD, 'utf8'));
  return { modulTyp: 'bereicheBekannt', neu, vorlagenKennungen };
}

function inhalt(modul) { return JSON.stringify(modul, null, 2) + '\n'; }

if (require.main === module) {
  const soll = inhalt(bekannteBereicheErzeugen());
  const ist = fs.existsSync(BEREICHE_BEKANNT_PFAD) ? fs.readFileSync(BEREICHE_BEKANNT_PFAD, 'utf8') : null;
  if (process.argv.includes('--pruefen')) {
    if (ist !== soll) { process.stderr.write('vivodepot-bereiche-bekannt: Drift — neu erzeugen.\n'); process.exit(1); }
    process.stdout.write('vivodepot-bereiche-bekannt: kein Drift\n');
  } else {
    fs.writeFileSync(BEREICHE_BEKANNT_PFAD, soll, 'utf8');
    process.stdout.write('vivodepot-bereiche-bekannt: geschrieben (' + Object.keys(JSON.parse(soll).neu).length + ' Bereiche)\n');
  }
}

module.exports = { bekannteBereicheErzeugen, inhalt };
