#!/usr/bin/env node
'use strict';
/* modul-text-lese-app-messen.js — was ein Sprachmodul dem Kern mitbringt, muss die Lese-App auch ausgeben können (Grundsatz, 19.09.2026).
   Erste Stufe, gemessen statt behauptet: nimmt die Lese-App dieselben Kennungen aus einem Sprachmodul an wie der Kern? Was der Kern annimmt und die
   Lese-App verwirft, kommt im Kern an und fehlt beim Empfänger. Die Kennungen kommen aus `tools/textsatz-de-modul.json` (die Kernquelle), gruppiert
   nach FAMILIE (Form der Kennung ohne die konkreten Namen). Die `strings:`-Sätze des Kerns (Bedienfluss der Anwendung) sind kein Gegenstand: die
   Lese-App hat eine eigene, kleinere Oberfläche und eigene Zusicherungssätze, geprüft in tests/sprachmodul-zusicherungen-lese-app.test.js.
   Bausteine (Familie, Annahme-Probe) für tools/modul-text-lese-app-ausgabe-messen.js, das die Ausgabe der Lese-App misst und die Grundlinie führt. */
const fs = require('node:fs');
const path = require('node:path');

const QUELLE = path.join(__dirname, 'textsatz-de-modul.json');
const NAMEN = ['label', 'hint', 'beispiel', 'einfuehrungstext', 'navUnterzeile', 'titel', 'frage', 'luecke', 'h1', 'herkunftText', 'text'];

function familie(kennung) {
  return kennung
    .replace(/^[^:.#/]+/, '<id>')
    .replace(/:[a-z0-9-]+/, ':<ort>')
    .replace(/#[^./]+/, '#<sek>')
    .replace(/\.[A-Za-z0-9_]+(?=\.|\/|$)/g, (x) => (NAMEN.includes(x.slice(1)) ? x : '.<feld>'))
    .replace(/\/[^.]+/, '/<opt>')
    .replace(/\[\d+\]/, '[n]')
    .replace(/(:<ort>)[A-Za-z]+/, '$1');
}
function kennungen() {
  return Object.keys(JSON.parse(fs.readFileSync(QUELLE, 'utf8')).texte).filter((k) => !k.startsWith('strings:'));
}
/* keys: alle Kernkennungen; kernNimmt / leseNimmt: (kennung) → boolean. Rückgabe: je Familie { gesamt, kern, lese, fehlt } und die Summe. */
function messen(keys, kernNimmt, leseNimmt) {
  const je = {};
  for (const k of keys) {
    const f = familie(k);
    const z = je[f] || (je[f] = { gesamt: 0, kern: 0, lese: 0, fehlt: 0 });
    z.gesamt++;
    const kern = kernNimmt(k); const lese = leseNimmt(k);
    if (kern) z.kern++;
    if (lese) z.lese++;
    if (kern && !lese) z.fehlt++;
  }
  return { je, summeFehlt: Object.values(je).reduce((a, z) => a + z.fehlt, 0), summeLese: Object.values(je).reduce((a, z) => a + z.lese, 0) };
}
function annehmer(V) {
  return (k) => !!V.textsatzModulPruefen({ modulTyp: 'textsatz', sprache: 'xx', moduleVersion: 1, texte: { [k]: 'X' } }).texte[k];
}
module.exports = { familie, kennungen, messen, annehmer };
