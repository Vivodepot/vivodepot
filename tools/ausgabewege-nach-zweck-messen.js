#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   DER ZWECK AM AUSGABEWEG — Zug 0 und Zug 2
   ────────────────────────────────────────────────────────────────────────────
   Produktentscheidung, 21.08.2026: **nicht das Format entscheidet, sondern
   was mit dem Ergebnis geschieht** — gelesen (PDF) · verarbeitet (Datensatz) ·
   verändert (DOCX) · mitgenommen (QR).

   ZUG 0 IST ERNST GEMEINT UND KANN DEN BAU ABWEISEN: „Gibt es heute eine Stelle,
   die anders handeln würde, wenn sie den Zweck kennte?" Wenn nein, endet der
   Auftrag — und das ist ausdrücklich ein gutes Ergebnis. **Eine Eigenschaft, die
   niemand liest, ist Gewicht ohne Wirkung.**

   WIE HIER GEMESSEN WIRD: nicht „kommt das Wort Zweck vor", sondern **an welchen
   Eigenschaften eines Ausgabewegs der Kern heute tatsächlich VERZWEIGT.** Die
   Positivkontrolle ist der Gegenstand: der Sucher muss die bekannten
   Verzweigungen finden (`ohneAuswahl`, `kategorie`, `eudiw`) — findet er sie
   nicht, sagt sein „nichts gefunden" nichts.

   ZUG 2 läuft unabhängig davon: jeder Ausgabeweg bekommt seinen Zweck, und wo
   die Zuordnung nicht eindeutig ist, wird sie BENANNT und nicht gebogen.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const fs = require('node:fs');

const { entkommentiert } = require('./nur-vom-test-erreicht-pruefen.js');
function kernCode() {
  return entkommentiert(fs.readFileSync(process.env.KERN_HTML_PATH
    || path.join(__dirname, '..', 'vivodepot.html'), 'utf8'));
}

/* Die Eigenschaften, die ein Eintrag in `EXPORT_FORMATE` tragen kann. Gemessen an der
   Registry selbst, nicht abgeschrieben. */
function registryEigenschaften(V) {
  const keys = new Set();
  for (const f of V.EXPORT_FORMATE) for (const k of Object.keys(f)) keys.add(k);
  return [...keys].sort();
}

/* An welchen dieser Eigenschaften verzweigt der Kern? Gezählt wird ein Zugriff der Form
   `<etwas>.<eigenschaft>` in einer Zeile, die eine Bedingung oder einen Filter trägt. */
/* NUR DIE REGISTRY-EIGENEN EIGENSCHAFTEN, und der Grund ist ein Fehler des ersten Laufs:
   `id`, `label`, `sektor`, `toast`, `baue` und `dateibasis` heissen im Kern an hundert anderen
   Objekten genauso. Der erste Zähler meldete 258 Verzweigungen auf `id` — eine Zahl aus einem
   Modell, das jedes `e.id` mitnimmt, ist ein Eindruck und keine Messung (A443, dieselbe Klasse).

   Gezählt wird darum allein, was NUR ein Ausgabeweg trägt. Wer diese Liste erweitert, muss
   zeigen, dass der Name sonst nirgends vorkommt. */
const NUR_AM_AUSGABEWEG = Object.freeze(['ohneAuswahl', 'kategorie', 'eudiw', 'nurExport', 'nurImport',
  'sensibelOpt', 'toastLeerFn', 'toastLeer', 'zurueckgehaltenFn', 'mime', 'endung', 'dateibasis']);

function verzweigungen(V) {
  const text = kernCode();
  const vorhanden = new Set(registryEigenschaften(V));
  const raus = {};
  for (const eig of NUR_AM_AUSGABEWEG) {
    if (!vorhanden.has(eig) && eig !== 'nurImport') continue;
    /* `.find(` und `.some(` gehören dazu: `EXPORT_FORMATE.find(f => f.eudiw && …)` ist eine
       Entscheidung, auch wenn kein `if` davorsteht. Ohne sie fiel `eudiw` beim ersten Lauf
       durch — und ein Sucher, der eine echte Verzweigung übersieht, macht sein „nichts
       gefunden" wertlos. */
    const muster = new RegExp('(if\\s*\\(|\\.filter\\(|\\.find\\(|\\.some\\(|\\?|&&|\\|\\|)[^\\n]*\\.' + eig + '\\b');
    const treffer = text.split('\n').filter((z) => muster.test(z)).length;
    if (treffer) raus[eig] = treffer;
  }
  return raus;
}

/* ZUG 2 · Die Zuordnung. Sie ist eine Aussage über den GEGENSTAND und steht darum als
   Tabelle hier, nicht als Heuristik: welchen Zweck ein Weg bedient, steht in keinem
   Wortbild. Jede Zeile nennt ihre Fundstelle; `eindeutig: false` heisst BENANNT, nicht
   gebogen. */
/* DREI ZWECKE, nicht vier — die Entscheidung ist am 21.08.2026 ERSETZT worden. Die erste
   Fassung führte „verändert (DOCX)" als vierten Weg und wollte ihn bei den Dokument-Generatoren
   behalten. Gemessen war dort nichts zu behalten: DOCX gab es allein am Bereichs-Export, und
   `window.docx` war nie zugewiesen. Die Produktentscheidung hat daraufhin den WEG gestrichen — der vierte
   Zweck entfällt nicht, er WANDERT in den Generator: angepasst wird, bevor das Dokument
   herauskommt. `VERAENDERT` steht darum nicht mehr in dieser Liste. */
const GELESEN = 'gelesen (PDF)', VERARBEITET = 'verarbeitet (Datensatz)',
      MITGENOMMEN = 'mitgenommen (QR)';

const WEGE = Object.freeze([
  { kennung: 'flowVollDepotPdf', fundstelle: 'vivodepot.html', zweck: [GELESEN], eindeutig: true,
    grund: 'das Gesamt-PDF wird abgelegt und vorgezeigt' },
  { kennung: 'flowBereichPdf', fundstelle: 'vivodepot.html', zweck: [GELESEN], eindeutig: true,
    grund: 'dasselbe, auf einen Bereich beschränkt' },
  { kennung: 'flowSituationPdf', fundstelle: 'vivodepot.html', zweck: [GELESEN], eindeutig: true,
    grund: 'das Situationsblatt ist zum Mitnehmen zum Termin — gelesen, nicht verarbeitet' },
  { kennung: 'zeichneWiderrufPdf', fundstelle: 'vivodepot.html', zweck: [GELESEN], eindeutig: true,
    grund: 'der Widerruf wird vorgezeigt und zur Akte genommen' },
  { kennung: 'zeichneDokumentPdf', fundstelle: 'vivodepot.html', zweck: [GELESEN], eindeutig: true,
    grund: 'das erzeugte Vorsorge-Dokument als fertiges Blatt' },
  { kennung: 'flowNotfallkartePdf', fundstelle: 'vivodepot.html', zweck: [GELESEN, MITGENOMMEN], eindeutig: false,
    grund: 'NICHT EINDEUTIG: eine Notfallkarte wird gedruckt UND in der Brieftasche mitgenommen. '
      + 'Die Entscheidung bindet „mitgenommen" an QR (kleine Nutzlast); die Karte ist Papier und wird '
      + 'trotzdem getragen. Hier ist nachzuschärfen, ob „mitgenommen" die NUTZLAST meint oder die BENUTZUNG' },
  { kennung: 'flowFormatExport (11 EXPORT_FORMATE)', fundstelle: 'vivodepot.html', zweck: [VERARBEITET], eindeutig: true,
    grund: 'jedes Format-Ziel ist zum Einlesen durch eine Maschine gedacht' },
  { kennung: 'flowGesundheitFhirExport', fundstelle: 'vivodepot.html', zweck: [VERARBEITET], eindeutig: true,
    grund: 'FHIR-IPS für ein empfangendes System' },
  { kennung: 'flowNotfallQR', fundstelle: 'vivodepot.html', zweck: [MITGENOMMEN], eindeutig: true,
    grund: 'kleine Nutzlast, unterwegs gescannt' },
  { kennung: 'anlassQrTeile', fundstelle: 'vivodepot.html', zweck: [MITGENOMMEN], eindeutig: true,
    grund: 'dieselbe Bindung an die kleine Nutzlast' },
  { kennung: 'flowAnlassExport', fundstelle: 'vivodepot.html', zweck: [GELESEN, VERARBEITET, MITGENOMMEN], eindeutig: false,
    grund: 'NICHT EINDEUTIG, aber ABSICHTLICH: der Anlass-Weg erzeugt die drei Ausgaben ZUSAMMEN '
      + '(Umsetzungskonzept 20.08., Zug 1.3 — „Kein Feld nur im PDF"). Ein Weg mit drei Zwecken ist '
      + 'hier kein Mangel, sondern die Zusage' },
  { kennung: 'flowSubDepotBlackboxExport', fundstelle: 'vivodepot.html', zweck: [], eindeutig: false,
    grund: 'KEINER DER VIER: eine versiegelte Datei wird weder gelesen noch verarbeitet noch verändert '
      + 'noch gescannt — sie wird ÜBERGEBEN. Die Entscheidung kennt diesen Zweck nicht' },
]);

function docxWege(V) {
  const text = kernCode();
  const stellen = [];
  if (/function docxBereichModell/.test(text)) stellen.push('docxBereichModell — das Datenmodell');
  if (/function flowDocxExport/.test(text)) stellen.push('flowDocxExport — der Bereichs-Export');
  if (/data-h-docx/.test(text)) stellen.push('der Knopf im Bereichs-Herausgabe-Chooser');
  const beiGeneratoren = /zeichneDokumentPdf[\s\S]{0,400}window\.docx/.test(text);
  return { stellen, beiGeneratoren };
}

function messen(V) {
  return {
    eigenschaften: registryEigenschaften(V),
    verzweigungen: verzweigungen(V),
    mimeAlsEntscheidung: /(if\s*\(|\.filter\(|===)[^\n]*\.mime\b/.test(kernCode()
      .split('\n').filter((z) => /def\.mime|f\.mime/.test(z)).join('\n')),
    wege: WEGE,
    docx: docxWege(V),
  };
}

function bericht(m) {
  const z = [];
  z.push('ZUG 0 · Woran verzweigt der Kern heute?');
  z.push('    Eigenschaften eines Registry-Eintrags: ' + m.eigenschaften.join(', '));
  z.push('    Davon TATSÄCHLICH als Entscheidung gelesen:');
  const v = Object.entries(m.verzweigungen);
  for (const [k, n] of v) z.push('      ' + k.padEnd(16) + n + ' Verzweigung(en)');
  if (!v.length) z.push('      (keine) — dann findet der Sucher nichts, und sein Nein sagt nichts');
  z.push('    `mime` als Entscheidung: ' + (m.mimeAlsEntscheidung ? 'JA' : 'nein — nur als Blob-Typ beim Download'));
  z.push('');
  z.push('ZUG 2 · Die Zuordnung, ' + m.wege.length + ' Wege');
  for (const w of m.wege) {
    z.push('  ' + w.kennung);
    z.push('      Zweck     : ' + (w.zweck.join(' + ') || '(keiner der vier)')
      + (w.eindeutig ? '' : '   ← NICHT EINDEUTIG'));
    z.push('      Grund     : ' + w.grund);
  }
  z.push('');
  z.push('DOCX heute:');
  for (const s of m.docx.stellen) z.push('    · ' + s);
  z.push('    bei den Dokument-Generatoren: ' + (m.docx.beiGeneratoren ? 'JA' : 'NEIN'));
  return z.join('\n');
}

function laufen(kernPfad) {
  if (kernPfad) process.env.KERN_HTML_PATH = kernPfad;
  const { ladeKern } = require(path.join(__dirname, '..', 'tests', 'load-kern.js'));
  return messen(ladeKern().V);
}

if (require.main === module) {
  const i = process.argv.indexOf('--kern');
  const m = laufen(i > -1 ? process.argv[i + 1] : null);
  console.log(bericht(m));
  if (!Object.keys(m.verzweigungen).length) {
    console.error('\nABBRUCH: der Sucher findet keine einzige Verzweigung — sein Ergebnis trägt nicht.');
    process.exit(2);
  }
}

module.exports = { messen, bericht, laufen, WEGE, registryEigenschaften, verzweigungen, docxWege,
  GELESEN, VERARBEITET, MITGENOMMEN };
