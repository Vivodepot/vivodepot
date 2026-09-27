#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════
   bereiche-nativ-katalog-erzeugen.js — die vollen Definitionen der dreizehn nativen
   Bereiche, produktunabhängig, als EINE Moduldatei
   ──────────────────────────────────────────────────────────────
   WOZU (B12-Reparatur, Auftrag, 19.09.2026). RUHENDE BEREICHE (s. Kern-
   Kommentar an `_BEREICH_IDS_RUHEND`) weckt einen nativen Bereich, den ein Produkt selbst nicht
   einbäckt (Pro bäckt nur `identity` + sechs eigene Bereiche, U2-ADR-398), sobald eine geöffnete
   Datei dort Werte trägt. Was fehlte, war eine DEFINITION zum Wecken: Pro bäckt diese zwölf
   Bereiche gar nicht erst ein, `bereicheAlle()`s Filter kann aber nur ein vorhandenes Element
   ein-/ausblenden, keins erzeugen.

   GERÜST-SCHNITT S7 (21.09.2026): das Gerüst trägt diesen Katalog nicht mehr. Er steht in
   `tools/bereiche-nativ-katalog-modul.json` (`modulTyp: 'bereicheNativ'`) und wird als Region
   `BEREICHE_NATIV_KATALOG` in ALLE vier Produkte gebacken, byte-gleich — die Grundlage ist
   produktunabhängig, ein Produkt ohne sie verliert beim Öffnen einer fremden Akte Inhalt (B12).

   DIESE DATEI IST NICHT DIE QUELLE — die einzige Quelle bleiben die dreizehn Dateien in
   `tools/bereich-templates/` (`BEREICH_TEMPLATE_PFADE_PRIVAT_13`), dieselben, die Privat über
   `AB_WERK_BEREICH_QUELLEN` einbäckt. Dieses Werkzeug fasst sie zu der einen Moduldatei zusammen.

   Aufruf:
     node tools/bereiche-nativ-katalog-erzeugen.js [--pruefen] [--datei <pfad>]
     --pruefen: schreibt nichts, Exit 1 bei Abweichung
     --datei: Ziel-/Prüfdatei (Default: tools/bereiche-nativ-katalog-modul.json)
   ══════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { BEREICH_TEMPLATE_PFADE_PRIVAT_13 } = require('./lib/vier-produkte.js');

const REPO = path.join(__dirname, '..');
const DATEI_STANDARD = path.join(REPO, 'tools', 'bereiche-nativ-katalog-modul.json');

// Reihenfolge = `BEREICH_IDS_EINGEBAUT` im Kern — AUS DEM KERN GELESEN, keine Handkopie (W-15, tests/w15-eine-quelle-statt-
// kopien.test.js: eine Sektorenliste im Werkzeug ist eine zweite Quelle, die driftet). Das nackte Gerüst (`blank`) genügt und macht
// den Generator unabhängig vom eigenen Block, den er schreibt. Rein kosmetisch für einen stabilen Diff, keine Bedeutung für den
// Zugriff (Objekt-Lookup per ID).
function reihenfolgeAusKern() {
  const { ladeKern } = require('../tests/load-kern.js');
  const ids = ladeKern({ blank: true }).V.BEREICH_IDS_EINGEBAUT;
  if (!Array.isArray(ids) || !ids.length) throw new Error('BEREICH_IDS_EINGEBAUT nicht aus dem Kern lesbar — nicht geschrieben.');
  return ids.slice();
}

function katalogErzeugen() {
  const roh = {};
  for (const pfad of BEREICH_TEMPLATE_PFADE_PRIVAT_13) {
    const modul = JSON.parse(fs.readFileSync(pfad, 'utf8'));
    for (const [id, def] of Object.entries(modul.bereiche || {})) {
      if (Object.prototype.hasOwnProperty.call(roh, id)) {
        throw new Error('Bereich „' + id + '" ist in zwei nativen Bereichs-Dateien definiert — nicht geschrieben.');
      }
      roh[id] = def;
    }
  }
  const REIHENFOLGE = reihenfolgeAusKern();
  const fehlend = REIHENFOLGE.filter((id) => !Object.prototype.hasOwnProperty.call(roh, id));
  if (fehlend.length) throw new Error('Native Bereichs-Definition fehlt: ' + fehlend.join(', '));
  const geordnet = {};
  for (const id of REIHENFOLGE) geordnet[id] = roh[id];
  return geordnet;
}

function moduldatei(katalog) {
  return JSON.stringify({
    modulTyp: 'bereicheNativ', moduleVersion: 1, herkunft: 'vivodepot', kennung: 'vivodepot/bereiche-nativ', fassung: 1,
    bereiche: katalog,
  }, null, 2) + '\n';
}

function main() {
  const argv = process.argv.slice(2);
  const pruefen = argv.includes('--pruefen');
  const dIdx = argv.indexOf('--datei');
  const datei = dIdx >= 0 ? path.resolve(argv[dIdx + 1]) : DATEI_STANDARD;

  const katalog = katalogErzeugen();
  const soll = moduldatei(katalog);
  const ist = fs.existsSync(datei) ? fs.readFileSync(datei, 'utf8') : null;
  const n = Object.keys(katalog).length;

  if (ist === soll) {
    if (pruefen) process.stdout.write('bereiche-nativ-katalog: kein Drift (' + n + ' Bereiche)\n');
    return;
  }
  if (pruefen) {
    process.stderr.write('bereiche-nativ-katalog: ' + (ist === null ? 'Moduldatei fehlt' : 'Drift') + ' — neu erzeugen (node tools/bereiche-nativ-katalog-erzeugen.js).\n');
    process.exit(1);
  }
  fs.writeFileSync(datei, soll, 'utf8');
  process.stdout.write('bereiche-nativ-katalog: geschrieben (' + n + ' Bereiche)\n');
}

if (require.main === module) main();
module.exports = { katalogErzeugen, moduldatei, DATEI_STANDARD };
