#!/usr/bin/env node
'use strict';
/* ═════════════════════════════════════════════════════════════════
   befunde-erzeugen.js — die Beispielbefunde der Demo „Schwerbehindertenausweis“ (14.10.2026)
   ─────────────────────────────────────────────────────────────────
   Erzeugt drei einseitige PDFs einer ERFUNDENEN Person (Ilse Mustermann), die im Beispiel-Depot
   unter „Meine Dokumente“ liegen (Eintrag `documents` der Depot-Datei des Szenarios).
   Selbst erzeugt, deterministisch (zwei Läufe ergeben dieselben Bytes), jede Seite sagt in der
   ersten Zeile, dass sie erfunden ist. Kein Fremdmaterial, kein echter Befund.

   Ablage: neben diesem Werkzeug (tools/vorfuehrung/schwerbehindertenausweis/). Die Daten der Befunde (Datum, Aussteller)
   stehen in BEFUNDE; die Datumsangaben liegen alle innerhalb von zwei Jahren vor dem Stand des Szenarios
   (2026-10-14), weil das Amt Befunde „nicht älter als zwei Jahre“ verlangt.

   Aufruf:  node tools/vorfuehrung/schwerbehindertenausweis/befunde-erzeugen.js [--check]
   ═════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const ZIEL = __dirname;
const PERSON = 'Ilse Mustermann, geb. 08.07.1942';
const HINWEIS = ['Beispiel für eine Vorführung: erfunden.', 'Es enthält keinen Befund einer realen Person.'];

const BEFUNDE = Object.freeze({
  'arztbrief-orthopaedie-2026-02.pdf': { titel: 'Arztbrief Orthopädie (Beispiel)', aussteller: 'Praxis für Orthopädie am Beispielring', datum: '17.02.2026', inhalt: ['Diagnose: Arthrose beider Kniegelenke.', 'Beschwerden beim Gehen längerer Strecken.'] },
  'befundbericht-kardiologie-2025-12.pdf': { titel: 'Befundbericht Kardiologie (Beispiel)', aussteller: 'Kardiologische Praxis am Beispielring', datum: '03.12.2025', inhalt: ['Diagnose: Herzinsuffizienz, medikamentös eingestellt.', 'Belastbarkeit eingeschränkt.'] },
  'hausarztbericht-2026-05.pdf': { titel: 'Hausarztbericht (Beispiel)', aussteller: 'Praxis am Beispielanger', datum: '26.05.2026', inhalt: ['Zusammenfassung der laufenden Behandlung.', 'Medikamente und Facharztüberweisungen siehe Depot.'] },
});

/* Ein kleines, gültiges PDF ohne Bibliothek: eine Seite, Helvetica, WinAnsi. Umlaute als Oktal-Escapes. */
function pdfText(s) {
  const tabelle = { 'ä': '\\344', 'ö': '\\366', 'ü': '\\374', 'Ä': '\\304', 'Ö': '\\326', 'Ü': '\\334', 'ß': '\\337' };
  return s.replace(/[\\()]/g, (c) => '\\' + c).replace(/[äöüÄÖÜß]/g, (c) => tabelle[c]);
}
function befundPdf(b) {
  const zeilen = [
    ['F2', 16, b.titel],
    ['F1', 11, 'Beispielperson: ' + PERSON],
    ['F1', 11, 'Aussteller: ' + b.aussteller],
    ['F1', 11, 'Befunddatum: ' + b.datum],
    ...b.inhalt.map((t) => ['F1', 11, t]),
    ...HINWEIS.map((t) => ['F1', 11, t]),
  ];
  let y = 780;
  const inhalt = zeilen.map(([font, groesse, text], i) => {
    const zeile = 'BT /' + font + ' ' + groesse + ' Tf 56 ' + y + ' Td (' + pdfText(text) + ') Tj ET';
    y -= i === 0 ? 34 : 18;
    return zeile;
  }).join('\n');
  const objekte = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    '<< /Length ' + Buffer.byteLength(inhalt, 'latin1') + ' >>\nstream\n' + inhalt + '\nendstream',
  ];
  let aus = '%PDF-1.4\n';
  const positionen = [];
  objekte.forEach((o, i) => {
    positionen.push(Buffer.byteLength(aus, 'latin1'));
    aus += (i + 1) + ' 0 obj\n' + o + '\nendobj\n';
  });
  const xref = Buffer.byteLength(aus, 'latin1');
  aus += 'xref\n0 ' + (objekte.length + 1) + '\n0000000000 65535 f \n'
    + positionen.map((p) => String(p).padStart(10, '0') + ' 00000 n \n').join('')
    + 'trailer\n<< /Size ' + (objekte.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(aus, 'latin1');
}

function befundeErzeugen() {
  return Object.fromEntries(Object.entries(BEFUNDE).map(([datei, b]) => [datei, befundPdf(b)]));
}

if (require.main === module) {
  const pruefen = process.argv.includes('--check');
  let abweichung = false;
  for (const [datei, bytes] of Object.entries(befundeErzeugen())) {
    const pfad = path.join(ZIEL, datei);
    const vorhanden = fs.existsSync(pfad) ? fs.readFileSync(pfad) : null;
    if (vorhanden && vorhanden.equals(bytes)) continue;
    abweichung = true;
    if (!pruefen) { fs.mkdirSync(ZIEL, { recursive: true }); fs.writeFileSync(pfad, bytes); }
  }
  if (pruefen) { console.log(abweichung ? 'befunde-erzeugen --check: Abweichung' : 'befunde-erzeugen --check: kein Drift'); process.exitCode = abweichung ? 1 : 0; }
}

module.exports = { befundeErzeugen, BEFUNDE, PERSON };
