#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   build-pdf-inter-einbetten.js — Inter als jsPDF-Font, offline eingebettet
   ────────────────────────────────────────────────────────────────────────────
   U2-ADR-263-Nachtrag (13.09.2026, Auftrag „Kern: Eingabe springt, Sub-Depot-
   Farbe, PDF-CI"): jene ADR liess Teil 2 ("eine vollere Schrift einbetten")
   ausdrücklich offen — „dafür fehlt heute ein reales, geprüftes Kandidaten-
   Schriftmaß". Dieses Werkzeug liefert das Maß UND den Einbau: es liest die
   beiden bereits ZUGESCHNITTENEN Inter-Dateien unter tools/schrift-pdf-quellen/
   und schreibt sie als Base64 zwischen die Marker `PDF-INTER-B64:BEGIN/END`
   in vivodepot.html — dieselbe Bauform wie build-torwaechter.js (wörtliche
   Kopie zwischen Markern, kein Diff-Merge).

   DER ZUSCHNITT SELBST braucht `fonttools` (Python), nicht Node — darum HIER
   NICHT automatisiert, sondern als Rezept festgehalten (unten). Ändert sich
   die Zeichen-Deckung, ist das Rezept neu zu fahren UND
   `pdfZeichenUnterstuetzt()`/PDF_INTER_LUECKEN im Kern von Hand nachzuziehen
   (derselbe gemessene, nicht angenommene Weg wie beim ersten Zuschnitt) —
   dieses Werkzeug prüft nur, dass die EINGEBETTETEN Bytes zur committeten
   Quelle passen, nicht die Zeichen-Deckung selbst.

   REZEPT (einmalig gefahren, 13.09.2026, Ergebnis committet — DREI Schnitte, nicht zwei:
   `zeichneVollDepotPdf` nutzt auch 'italic', ohne eigene Einbettung würde jsPDF für diesen
   Stil eine unregistrierte Schrift anfragen — gemessen, nicht angenommen, s. Rot-Beweis):
     python3 -c "
       from fontTools.varLib.instancer import instantiateVariableFont
       from fontTools.ttLib import TTFont
       quellen = {'regular': '<Inter Variable TTF>', 'bold': '<dieselbe Datei>',
                  'italic': '<Inter Italic Variable TTF, eigene Datei, OFL-1.1>'}
       for name, wght in [('regular',400), ('bold',700), ('italic',400)]:
           f = TTFont(quellen[name])
           instantiateVariableFont(f, {'wght': wght, 'opsz': 14}, inplace=True)
           f.save(f'/tmp/Inter-{name}-instance.ttf')
     "
     # Unicode-Bereich: Basis-Latein+Latein-1 (0x20-0xFF), Latein-Erweiterung A+B
     # (0x100-0x24F), allgemeine Interpunktion (0x2000-0x2070), Währungssymbole
     # (0x20A0-0x20D0), fi/fl-Ligaturen, plus drei einzelne WinAnsi-Nachzügler
     # (ˆ˜™, U+02C6/U+02DC/U+2122 — sonst ein Rückschritt ggü. der alten
     # WinAnsi-Deckung, s. Rot-Beweis in tests/pdf-inter-einbetten.test.js).
     # KEIN --name-IDs='': ein erster Zuschnitt strich die `name`-Tabelle komplett leer —
     # jsPDFs eigener TTF-Parser (nicht fontTools) griff beim Registrieren lesend auf einen
     # Eintrag darin zu und brach mit "Cannot read properties of undefined (reading '0')"
     # ab, live im Browser gemessen (Playwright, notfallkartePdfSchritt lief in ein 30s-
     # Downloadtimeout, weil doc.text() den Fehler intern nur als PubSub-Error loggte, nie
     # warf). fontTools' eigener Default (nameIDs 0-6: Family/Subfamily/Unique/Full/Version/
     # PostScript) reicht jsPDF, darum bewusst WEGGELASSEN statt auf leer gesetzt.
     pyftsubset Inter-{regular,bold,italic}-instance.ttf \
       --unicodes="U+0020-024F,U+2000-2070,U+20A0-20D0,U+FB01,U+FB02,U+02C6,U+02DC,U+2122" \
       --layout-features='' --no-hinting --desubroutinize \
       --drop-tables+=DSIG,GPOS,GSUB,GDEF,STAT,fvar,avar,gvar,HVAR,MVAR,cvar \
       --output-file=Inter-{Regular,Bold,Italic}-pdf-subset.ttf

   NEU GESCHNITTEN (23.09.2026, Befund PDF-MINUS-BLUTGRUPPE): dasselbe Rezept, --unicodes zusätzlich um
   U+2192,U+2212,U+2713 (→ − ✓, von den Sprachmodulen getragen; tests/pdf-schrift-deckung-klasse.test.js). HERKUNFT:
   https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip (Release v4.1, OFL-1.1),
   SHA-256 9883fdd4a49d4fb66bd8177ba6625ef9a64aa45899767dde3d36aa425756b11e, daraus InterVariable.ttf und
   InterVariable-Italic.ttf, nameID 5 „Version 4.001;git-9221beed3". Die vorigen Subsets stammten aus git-66647c0bb, das
   in keinem Release-ZIP liegt. Gemessen gegen die vorigen Subsets (Instanz wght 400/700/400, opsz 14): Regular und Bold
   alle Vorschubbreiten gleich, Italic alle bis auf „{" (U+007B, 875 → 874 Einheiten von 2048). Neu im Zuschnitt außer den
   drei Zeichen: U+20C0 (im Bereich 0x20A0–0x20D0 des Rezepts; der Kern sagt es nicht zu, PDF_INTER_BEREICHE endet bei 0x20BF).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN_PFAD = path.join(REPO, 'vivodepot.html');
const ASSETS = path.join(__dirname, 'schrift-pdf-quellen');
const REGULAR_PFAD = path.join(ASSETS, 'Inter-Regular-pdf-subset.ttf');
const BOLD_PFAD = path.join(ASSETS, 'Inter-Bold-pdf-subset.ttf');
const ITALIC_PFAD = path.join(ASSETS, 'Inter-Italic-pdf-subset.ttf');
const BEGIN = '/* PDF-INTER-B64:BEGIN */';
const END = '/* PDF-INTER-B64:END */';

function blockBauen() {
  const regB64 = fs.readFileSync(REGULAR_PFAD).toString('base64');
  const boldB64 = fs.readFileSync(BOLD_PFAD).toString('base64');
  const kursivB64 = fs.readFileSync(ITALIC_PFAD).toString('base64');
  return BEGIN + '\n'
    + "const _PDF_INTER_REGULAR_B64 = '" + regB64 + "';\n"
    + "const _PDF_INTER_BOLD_B64 = '" + boldB64 + "';\n"
    + "const _PDF_INTER_ITALIC_B64 = '" + kursivB64 + "';\n"
    + END;
}

function main() {
  const check = process.argv.includes('--check');
  const kern = fs.readFileSync(KERN_PFAD, 'utf8');
  const anfang = kern.indexOf(BEGIN);
  const ende = kern.indexOf(END);
  if (anfang < 0 || ende < 0 || ende < anfang) {
    console.error('build-pdf-inter-einbetten: Marker ' + BEGIN + ' / ' + END + ' nicht (beide) gefunden.');
    process.exit(1);
  }
  const neuerBlock = blockBauen();
  const vorher = kern.slice(anfang, ende + END.length);
  if (check) {
    if (vorher === neuerBlock) { console.log('build-pdf-inter-einbetten --check: kein Drift.'); return; }
    console.error('build-pdf-inter-einbetten --check: DRIFT — die eingebetteten Bytes weichen von tools/schrift-pdf-quellen/*.ttf ab. node tools/build-pdf-inter-einbetten.js ausführen.');
    process.exit(1);
  }
  if (vorher === neuerBlock) { console.log('build-pdf-inter-einbetten: bereits aktuell.'); return; }
  const neu = kern.slice(0, anfang) + neuerBlock + kern.slice(ende + END.length);
  fs.writeFileSync(KERN_PFAD, neu, 'utf8');
  console.log('build-pdf-inter-einbetten: eingebettet — Regular ' + fs.statSync(REGULAR_PFAD).size
    + ' Byte, Bold ' + fs.statSync(BOLD_PFAD).size + ' Byte, Italic ' + fs.statSync(ITALIC_PFAD).size + ' Byte (roh).');
}

if (require.main === module) main();
module.exports = { blockBauen, BEGIN, END, REGULAR_PFAD, BOLD_PFAD, ITALIC_PFAD };
