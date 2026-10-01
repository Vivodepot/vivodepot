#!/usr/bin/env node
'use strict';
/* ═════════════════════════════════════════════════════════════════
   atc-gm-auszug-pruefen.js — jeder Name der ATC-Liste ist der amtliche der ATC-GM 2026 (28.09.2026)
   ─────────────────────────────────────────────────────────────────
   `code-listen/atc.json` sichert zu: Codes und Bezeichnungen unverändert aus der amtlichen Fassung (§ 62 UrhG). Dieses Werkzeug
   hält die Zusicherung.
     ohne Argument:          gegen den zitierten AUSZUG unten (so prüft die Suite, ohne das PDF);
     --dokument <pdf>:       gegen das amtliche PDF selbst (pdftotext -layout), jede Zeile „<Code>  <Name>  …“.
   Der AUSZUG ist aus dem amtlichen PDF der ATC-Klassifikation mit DDD 2026 (BfArM) abgeschrieben, Datei `atc-ddd-amtlich-2026.pdf`,
   sha256 54c5477c553bcdc2926a9ec416ec7799bc0095ac206a018107f569845503e3fb, heruntergeladen am 28.09.2026 nach Zustimmung zu den
   Downloadbedingungen des BfArM (Quellenangabe nach § 63 UrhG: code-listen/wortlaut/atc-gm-quellenangabe.txt).
   Belegt nicht gegen die WIdO-Arbeitsfassung (xlsx), sondern gegen die amtliche Veröffentlichung.
   ═════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const LISTE_PFAD = path.join(__dirname, '..', 'code-listen', 'atc.json');
const AUSZUG = Object.freeze({
  J01CE01: 'Benzylpenicillin', J01CA04: 'Amoxicillin', J01CA01: 'Ampicillin', C09AA05: 'Ramipril', A10BA02: 'Metformin',
  M01AE01: 'Ibuprofen', N02BE01: 'Paracetamol', L01XA02: 'Carboplatin', L01CD01: 'Paclitaxel', A04AA01: 'Ondansetron',
});

// Aus dem Text des amtlichen PDF: Code am Zeilenanfang, dann der Name bis zur nächsten Spaltenlücke (zwei Leerzeichen).
function namenAusPdfText(text) {
  const namen = {};
  for (const zeile of text.split('\n')) {
    const m = /^\s*([A-Z]\d{2}[A-Z]{2}\d{2})\s{2,}(.+?)(?:\s{2,}|$)/.exec(zeile);
    if (m && !(m[1] in namen)) namen[m[1]] = m[2].trim();
  }
  return namen;
}

function abweichungen(daten, amtlich) {
  const funde = [];
  for (const e of daten) {
    if (!(e.code in amtlich)) { funde.push(e.code + ': nicht im amtlichen Beleg'); continue; }
    if (e.anzeigeName !== amtlich[e.code]) funde.push(e.code + ': „' + e.anzeigeName + '" statt amtlich „' + amtlich[e.code] + '"');
  }
  return funde;
}

function main(argv) {
  const daten = JSON.parse(fs.readFileSync(LISTE_PFAD, 'utf8')).daten;
  const i = argv.indexOf('--dokument');
  const amtlich = i >= 0 ? namenAusPdfText(execFileSync('pdftotext', ['-layout', argv[i + 1], '-'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })) : AUSZUG;
  const funde = abweichungen(daten, amtlich);
  if (funde.length) { console.error('[atc-gm] ROT:\n  ' + funde.join('\n  ')); process.exitCode = 1; return; }
  console.log('[atc-gm] grün — ' + daten.length + ' Einträge, Namen wörtlich ' + (i >= 0 ? 'wie im amtlichen PDF' : 'wie im zitierten Auszug') + '.');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { AUSZUG, namenAusPdfText, abweichungen };
