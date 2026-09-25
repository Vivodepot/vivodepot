#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   W-17 · Keine Bereichszahl im Text, die nicht der gemessenen entspricht
   ────────────────────────────────────────────────────────────────────────
   W-16 bewacht die LISTEN. Dieser hier bewacht die ZAHL — den Satz „eine
   der elf Vivodepot-Kategorien", der in einem Glossar steht, das eine
   Institution liest, und in zwei Schema-Beschreibungen, die ein fremder
   Entwickler liest.

   DER ANLASS, gemessen am 18.08.2026: `krisenvorsorge` ist seit dem
   10.08.2026 der zwölfte Bereich (U2-ADR-130). Die Zahl elf stand danach
   noch an vier gelesenen und sieben kommentierten Stellen — dieselbe
   Nachpflege-Lücke, die W-16 für die Listen schliesst, nur eine Ebene
   tiefer: nicht in den Daten, sondern in dem, was über sie behauptet wird.

   ERKENNUNGSKRITERIUM, strukturell: eine Zahl (Wort oder Ziffer)
   unmittelbar vor einem Bereichs-Substantiv. NICHT „irgendwo steht elf" —
   der Bestand trägt „elf Modal-Fälle", „elf Felder", „elf Einträge", und
   keiner davon zählt Bereiche. Ein Wächter, der die mitfängt, wird
   abgeschaltet statt gepflegt.

   DIE AUSNAHME IST EINE REGEL, KEINE LISTE: eine datierte Messung darf
   eine alte Zahl nennen — sie war damals wahr, und sie auf heute
   umzuschreiben wäre eine Fälschung. Wer das tut, schreibt „damals" davor.
   Damit steht die Ausnahme im Text selbst und nicht in einer gepflegten
   Aufzählung hier.

   VORBEDINGUNG: findet der Lauf gar keine Nennung, ist das ROT und nicht
   still (Fehlerklasse A279 — ein Wächter, der über eine leere Menge grün
   läuft, prüft nichts).

   Aufruf:
     node tools/bereichszahl-pruefen.js                 → Bericht, Exit 1 bei Fund
     node tools/bereichszahl-pruefen.js --json
     node tools/bereichszahl-pruefen.js --datei <pfad>  (Rot-Beleg: eine Kopie prüfen)
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

/* Die Zahl kommt aus dem Kern, nicht aus einer Konstante hier — ein Wächter
   mit eigener Bereichszahl wäre selbst die Stelle, die er sucht. */
const { echteSektorenListe } = require('./lib/sektoren.js');

const GEGENSTAND = Object.freeze([
  'vivodepot.html', 'vivodepot-lesen.html', 'vivodepot-template-generator.html',
  'vivodepot-vc-issuer.html', 'vivodepot-schluessel-teilen.html',
  'docs/template-generator/submission-schema.json',
]);

// Zahlwörter, so weit ein Bereichsbestand je reichen wird. KEINE Bereichsliste —
// eine Zuordnung Wort→Zahl, die nichts über Vivodepot behauptet.
const ZAHLWORT = Object.freeze({
  zwei: 2, drei: 3, vier: 4, fünf: 5, fuenf: 5, sechs: 6, sieben: 7, acht: 8,
  neun: 9, zehn: 10, elf: 11, zwölf: 12, zwoelf: 12, dreizehn: 13, vierzehn: 14,
  fünfzehn: 15, fuenfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18,
  neunzehn: 19, zwanzig: 20,
});

// Ein Bereichs-Substantiv, in den Formen, in denen der Bestand es führt.
const SUBSTANTIV = '(?:Vivodepot-)?(?:Bereiche|Bereichen|Kategorien|Sektoren|Sektoren)';
const ZAHL = '(?:\\d{1,2}|' + Object.keys(ZAHLWORT).join('|') + ')';
const MUSTER = new RegExp('\\b(' + ZAHL + ')\\s+(' + SUBSTANTIV + ')\\b', 'gi');

// Der Zeitbezug, der eine alte Zahl erlaubt: er steht unmittelbar vor der Zahl.
const DATIERT = /\b(?:damals|damaligen|seinerzeit|bis dahin)\s*$/i;

/* WAS DIESER WÄCHTER NICHT MEINT: eine TEILMENGE. „ein Blatt trägt Felder aus bis zu
   drei Bereichen", „die Lage streut über zwei Bereiche" — beides sind wahre Sätze über
   einen Ausschnitt, keine Behauptung über den Bestand. Sie tragen eine Präposition
   unmittelbar vor der Zahl; die Gesamtaussage tut das nie („die zwölf Bereiche",
   „alle zwölf Bereiche", „Einer der zwölf Vivodepot-Bereiche", „(zwölf Bereiche)").
   Ohne diese Trennung meldete der erste Lauf zehn Sätze, von denen acht richtig waren —
   und ein Wächter mit acht falschen Meldungen wird abgeschaltet, nicht gepflegt. */
/* KEIN `\b` vor den Wörtern: `über` und `für` beginnen mit einem Zeichen, das die
   JavaScript-Wortgrenze ohne `u`-Flag NICHT als Wortzeichen kennt — `\büber` trifft
   darum nie. Der erste Lauf meldete deswegen fünf „über drei Bereiche"-Sätze als Fund. */
const TEILMENGE = /(?:^|[^\wÄÖÜäöüß])(?:über|aus|bis\s+zu|zu|zwischen|in|auf|für|je|pro|an|nur|sind|von|keine\s+der|einige\s+der|mehrere)\s*$/i;

function zahlAus(wort) {
  const w = String(wort);
  if (/^\d+$/.test(w)) return parseInt(w, 10);
  const k = w.toLowerCase();
  return Object.prototype.hasOwnProperty.call(ZAHLWORT, k) ? ZAHLWORT[k] : null;
}

function zeileVon(text, index) {
  let n = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === '\n') n++;
  return n;
}

/* Eine Datei prüfen. Liefert { nennungen, funde } — `nennungen` zählt jede
   erkannte Bereichszahl (auch die richtigen), damit die Vorbedingung greift. */
function dateiPruefen(text, datei, echteZahl) {
  const nennungen = [];
  const funde = [];
  let m;
  MUSTER.lastIndex = 0;
  while ((m = MUSTER.exec(text)) !== null) {
    const zahl = zahlAus(m[1]);
    if (zahl == null) continue;
    const davor = text.slice(Math.max(0, m.index - 40), m.index);
    const eintrag = {
      datei, zeile: zeileVon(text, m.index), zahl,
      text: text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 20).replace(/\s+/g, ' ').trim(),
      datiert: DATIERT.test(davor),
      teilmenge: TEILMENGE.test(davor),
    };
    if (eintrag.teilmenge) continue;          // kein Satz über den Bestand
    nennungen.push(eintrag);
    if (!eintrag.datiert && zahl !== echteZahl) funde.push(eintrag);
  }
  return { nennungen, funde };
}

function lauf(dateien, echteZahl) {
  const nennungen = [], funde = [];
  for (const rel of dateien) {
    const abs = path.isAbsolute(rel) ? rel : path.join(REPO, rel);
    if (!fs.existsSync(abs)) continue;
    const r = dateiPruefen(fs.readFileSync(abs, 'utf8'), rel, echteZahl);
    nennungen.push(...r.nennungen);
    funde.push(...r.funde);
  }
  return { nennungen, funde };
}

function main(argv) {
  const jsonAus = argv.includes('--json');
  const i = argv.indexOf('--datei');
  const einzeln = (i >= 0 && argv[i + 1]) ? [argv[i + 1]] : null;
  const echteZahl = echteSektorenListe().length;
  const { nennungen, funde } = lauf(einzeln || GEGENSTAND, echteZahl);

  if (jsonAus) {
    console.log(JSON.stringify({ echteZahl, nennungen: nennungen.length, funde }, null, 2));
  }

  // Vorbedingung zuerst: ohne Nennung prüft der Lauf nichts.
  if (!nennungen.length) {
    if (!jsonAus) {
      console.error('ROT — die Bereichszahl kommt im geprüften Bestand gar nicht vor.');
      console.error('  Ein Lauf ohne Fundmenge ist kein grüner Lauf, sondern ein blinder.');
    }
    return 1;
  }

  if (funde.length) {
    if (!jsonAus) {
      console.error('ROT — eine Bereichszahl im Text weicht von der gemessenen ab (' + echteZahl + '):');
      for (const f of funde) {
        console.error('  ' + f.datei + ':' + f.zeile + '  nennt ' + f.zahl + '  „' + f.text + '"');
      }
      console.error('  Beheben: die Zahl nachziehen — oder, wenn sie eine datierte Messung ist,');
      console.error('  „damals" davorschreiben (dann bleibt die alte Zahl stehen und ist wahr).');
    }
    return 1;
  }

  if (!jsonAus) {
    console.log('bereichszahl-pruefen: ' + nennungen.length + ' Nennung(en), alle auf ' + echteZahl
      + ' — davon ' + nennungen.filter(n => n.datiert).length + ' datiert (alte Zahl erlaubt).');
  }
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { dateiPruefen, lauf, GEGENSTAND, ZAHLWORT };
