#!/usr/bin/env node
'use strict';
/* ══════════════════════════════════════════════════════════════
   lebenslagen-katalog-erzeugen.js — Gültigkeitsprüfung des Lebenslagen-Katalogs (S9, 22.09.2026)
   ──────────────────────────────────────────────────────────────
   GERÜST-SCHNITT S9 (Zielkonflikt-Fund: der Paragraphen-Schnitt ließ `eimer.satz` des Gerüst-
   Wächters über seinen Deckel wachsen, weil der Lebenslagen-Katalog (`BAUSTEINE`, 29 Lagen) seit
   T5 als Literal direkt im Kern stand — derselbe Grund, aus dem S7 den nativen Bereichs-Katalog
   auslagerte). Der Katalog steht jetzt in `tools/lebenslagen-katalog-modul.json`
   (`modulTyp: 'lebenslagen'`) und wird über die Region `LEBENSLAGEN_KATALOG` in alle vier
   Produkte gebacken, byte-gleich — produktunabhängig, dieselbe Bauart wie
   `tools/bereiche-nativ-katalog-erzeugen.js`/`BEREICHE_NATIV_KATALOG`.

   DIESES WERKZEUG SCHREIBT DEN KATALOG NICHT — anders als bereiche-nativ-katalog-erzeugen.js
   (das dreizehn externe Quelldateien zu EINER Moduldatei zusammenfasst) hat der Lebenslagen-
   Katalog keine weitere Quelle: `tools/lebenslagen-katalog-modul.json` IST die Quelle, von Hand
   gepflegt (wie `tools/textsatz-de-modul.json`, `tools/dokument-module/vivodepot-dokumente-de.json`).
   Das Werkzeug PRÜFT nur: liest die Datei über denselben Weg wie der Konfektionierer
   (`textsatzModulPruefen`-Verwandte gibt es für `lebenslagen` nicht — die Form ist einfach genug
   für eine eigene, kleine Prüfung hier), verlangt eindeutige `id`s und die Felder, die der Kern
   an den sieben Lesestellen voraussetzt (`id`, `sorte`, `name`, `felder`).

   Aufruf:
     node tools/lebenslagen-katalog-erzeugen.js [--datei <pfad>]
     Exit 1 bei jeder Formabweichung, Exit 0 sonst. Kein Schreibzugriff.
   ══════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const DATEI_STANDARD = path.join(REPO, 'tools', 'lebenslagen-katalog-modul.json');

function katalogPruefen(datei = DATEI_STANDARD) {
  const probleme = [];
  let roh;
  try {
    roh = JSON.parse(fs.readFileSync(datei, 'utf8'));
  } catch (e) {
    return { gueltig: false, probleme: ['Datei nicht lesbar/kein gültiges JSON: ' + e.message] };
  }
  if (roh.modulTyp !== 'lebenslagen') probleme.push('modulTyp ist nicht "lebenslagen": ' + JSON.stringify(roh.modulTyp));
  if (!Array.isArray(roh.bausteine) || !roh.bausteine.length) probleme.push('.bausteine ist kein nicht-leeres Array');
  const gesehen = new Set();
  for (const [i, b] of (roh.bausteine || []).entries()) {
    const wo = 'bausteine[' + i + ']';
    if (!b || typeof b !== 'object') { probleme.push(wo + ': kein Objekt'); continue; }
    if (typeof b.id !== 'string' || !b.id) probleme.push(wo + ': .id fehlt oder ist kein String');
    else if (gesehen.has(b.id)) probleme.push(wo + ': .id "' + b.id + '" ist nicht eindeutig');
    else gesehen.add(b.id);
    if (typeof b.sorte !== 'string' || !b.sorte) probleme.push(wo + ' (' + (b.id || '?') + '): .sorte fehlt');
    if (typeof b.name !== 'string' || !b.name) probleme.push(wo + ' (' + (b.id || '?') + '): .name fehlt');
    // `felder` ist optional (der Ausführer kommt auch ohne Feldliste klar), aber wenn gesetzt, ein Array von Strings.
    if (b.felder !== undefined && (!Array.isArray(b.felder) || b.felder.some((f) => typeof f !== 'string'))) {
      probleme.push(wo + ' (' + (b.id || '?') + '): .felder ist gesetzt, aber kein Array von Strings');
    }
  }
  return { gueltig: probleme.length === 0, probleme, anzahl: (roh.bausteine || []).length };
}

function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--datei');
  const datei = i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : DATEI_STANDARD;
  const ergebnis = katalogPruefen(datei);
  if (ergebnis.gueltig) {
    console.log('[lebenslagen-katalog] OK — ' + ergebnis.anzahl + ' Lagen, ' + path.relative(REPO, datei));
  } else {
    console.error('[lebenslagen-katalog] ROT — ' + ergebnis.probleme.length + ' Problem(e):');
    for (const p of ergebnis.probleme) console.error('  - ' + p);
  }
  process.exitCode = ergebnis.gueltig ? 0 : 1;
}

if (require.main === module) main();

module.exports = { katalogPruefen, DATEI_STANDARD };
