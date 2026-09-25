'use strict';
/* ═════════════════════════════════════════════════════════════════
   herkunftsort-angaben-schreiben.js — erzeugt den Block HERKUNFTSORT_ANGABEN in jedem Träger aus der einen Quelle
   ─────────────────────────────────────────────────────────────────
   Quelle: tools/herkunftsort-angaben.json. Träger: vivodepot.html (Anker: VIVODEPOT_HERKUNFT_LINK) und vivodepot-lesen.html
   (Anker: die Zeile `const URHEBER_LESEN`, VOR ihr, weil sie aus dem Block abgeleitet steht). Siehe tools/lib/herkunftsort-angaben.js.
     node tools/herkunftsort-angaben-schreiben.js               schreibt
     node tools/herkunftsort-angaben-schreiben.js --check       prüft, schreibt nichts; Exit 1 bei Abweichung
     --depot <pfad>                                             Wurzel der Träger (Standard: das Repo)
   ═════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const L = require('./lib/herkunftsort-angaben.js');

const REPO = path.join(__dirname, '..');
const TRAEGER = Object.freeze([
  { datei: 'vivodepot.html', anker: "const VIVODEPOT_HERKUNFT_LINK = 'https://vivodepot.de';", position: 'nach' },
  { datei: 'vivodepot-lesen.html', anker: 'const URHEBER_LESEN = ', position: 'vor' },
]);

function main(argv) {
  const pruefen = argv.includes('--check');
  const i = argv.indexOf('--depot');
  const depot = i >= 0 ? path.resolve(argv[i + 1]) : REPO;
  const block = L.blockErzeugen(L.quelleLesen());
  let abweichung = 0;
  for (const t of TRAEGER) {
    const pfad = path.join(depot, t.datei);
    const text = fs.readFileSync(pfad, 'utf8');
    const b = L.blockFinden(text);
    if (b && b.text === block) { process.stdout.write('[herkunftsort-angaben] ' + t.datei + ': gleich\n'); continue; }
    abweichung += 1;
    if (pruefen) { process.stdout.write('[herkunftsort-angaben] ' + t.datei + ': ' + (b ? 'ABWEICHUNG vom erzeugten Block' : 'Block FEHLT') + ' — node tools/herkunftsort-angaben-schreiben.js\n'); continue; }
    fs.writeFileSync(pfad, L.einsetzen(text, block, t.anker, t.position), 'utf8');
    process.stdout.write('[herkunftsort-angaben] ' + t.datei + ': ' + (b ? 'erneuert' : 'eingesetzt') + '\n');
  }
  return pruefen && abweichung ? 1 : 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { TRAEGER, main };
