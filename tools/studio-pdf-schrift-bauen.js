#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   studio-pdf-schrift-bauen.js — die PDF-Schrift des Studios (Studio-Schritt 5, 12.11.2026)
   ────────────────────────────────────────────────────────────────────────────
   Das Studio gibt eine Vorlage auch als lesbares PDF aus (jsPDF, byte-gleiche Kopie des Kern-Blocks). Damit Umlaute und jedes
   Zeichen der Beschriftungen in einer eingebetteten Schrift stehen, trägt das Studio die Inter-Teilmengen, die auch das
   Ab-Werk-Erscheinungsbild des Kerns für PDF führt: Inter 400 und 700, Stil normal, `pdf: true`.

   QUELLE: tools/erscheinung/erscheinungsbild-heute-modul.json (dieselben TTF-Zuschnitte, OFL-1.1). Erzeugt, nicht gepflegt:
   ändert sich die Schrift dort, schreibt dieses Werkzeug sie neu; landung-vorbereiten fährt es.

     node tools/studio-pdf-schrift-bauen.js                 schreibt die Region STUDIO-PDF-SCHRIFT in vivodepot-studio.html
     node tools/studio-pdf-schrift-bauen.js --check         schreibt nichts, Exit 1 bei Drift
     node tools/studio-pdf-schrift-bauen.js --dokument <pfad> [--check]   gegen eine andere Studio-Datei
   Probe: tests/studio-vorlage-pdf-und-questionnaire.test.js ([Studio·PDF-Schrift]).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const STUDIO = path.join(REPO, 'vivodepot-studio.html');
const QUELLE = path.join(__dirname, 'erscheinung', 'erscheinungsbild-heute-modul.json');
const BEGIN = '/* STUDIO-PDF-SCHRIFT:BEGIN — generierter Bereich (tools/studio-pdf-schrift-bauen.js); Quelle: tools/erscheinung/erscheinungsbild-heute-modul.json */';
const ENDE = '/* STUDIO-PDF-SCHRIFT:END */';

/* Die zwei Schnitte, die das Studio-PDF setzt: normal und fett. */
function schnitte(modul) {
  const pdf = (modul.schriften || []).filter((s) => s.pdf === true && s.familie === 'Inter' && s.stil === 'normal' && typeof s.ttf === 'string');
  const nach = (gewicht) => pdf.find((s) => Number(s.gewicht) === gewicht);
  const aus = [['normal', nach(400)], ['bold', nach(700)]];
  for (const [art, s] of aus) if (!s) throw new Error('studio-pdf-schrift: Inter ' + art + ' mit pdf:true fehlt in ' + path.basename(QUELLE));
  return aus.map(([art, s]) => ({ familie: 'Inter', art, lizenz: s.lizenz, ttf: s.ttf }));
}

function region(modul) {
  return [
    BEGIN,
    'const STUDIO_PDF_SCHRIFTEN = ' + JSON.stringify(schnitte(modul)) + ';',
    ENDE,
  ].join('\n');
}

function regionErsetzen(quelle, neu, datei) {
  const a = quelle.indexOf(BEGIN), b = quelle.indexOf(ENDE);
  if (a < 0 || b < a) throw new Error('studio-pdf-schrift: Region STUDIO-PDF-SCHRIFT fehlt in ' + datei);
  return quelle.slice(0, a) + neu + quelle.slice(b + ENDE.length);
}

function main(argv) {
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const ziel = arg('--dokument') ? path.resolve(arg('--dokument')) : STUDIO;
  const modul = JSON.parse(fs.readFileSync(QUELLE, 'utf8'));
  const alt = fs.readFileSync(ziel, 'utf8');
  const neu = regionErsetzen(alt, region(modul), path.basename(ziel));
  if (argv.includes('--check')) {
    if (neu !== alt) { console.error('[studio-pdf-schrift] Drift in ' + path.basename(ziel) + ' — node tools/studio-pdf-schrift-bauen.js'); return 1; }
    console.log('[studio-pdf-schrift] ok');
    return 0;
  }
  if (neu !== alt) fs.writeFileSync(ziel, neu);
  console.log('[studio-pdf-schrift] ' + (neu !== alt ? 'geschrieben' : 'unverändert') + ': ' + path.basename(ziel));
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { BEGIN, ENDE, region, schnitte, regionErsetzen, QUELLE, STUDIO };
