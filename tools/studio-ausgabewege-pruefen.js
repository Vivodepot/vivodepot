#!/usr/bin/env node
'use strict';
/* studio-ausgabewege-pruefen.js — jeder Ausgabeweg des Studios gibt im anwendbaren Standard und als PDF aus, oder er steht als
   Lücke in der Grundlinie (12.11.2026, Studio-Schritt 5: die Vorlage als FHIR-R4-Questionnaire und als PDF).

   Ein Ausgabeweg ist eine Funktion in vivodepot-studio.html, die blobDownload aufruft. Die Grundlinie
   (tools/studio-ausgabewege-grundlinie.json) führt
     · `geschlossen`: Wege mit Standard und PDF; je Weg die Aufrufe, die sein Rumpf tragen muss (`ruft`);
     · `luecken`: Wege ohne Standard oder ohne PDF, je mit Grund. Die Liste sinkt nur: ein neuer Weg, der weder geschlossen
       noch als Lücke geführt ist, ist rot; eine Lücke, die es nicht mehr gibt, ist rot, bis sie gestrichen ist.

     node tools/studio-ausgabewege-pruefen.js [--dokument <pfad>] [--grundlinie <pfad>]
   Ohne Argument gegen vivodepot-studio.html und die Grundlinie im Repo. Exit 0 ohne Befund, 1 mit Befund.
   Probe: tests/studio-ausgabewege-standard-pdf.test.js. */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const STUDIO = path.join(REPO, 'vivodepot-studio.html');
const GRUNDLINIE = path.join(__dirname, 'studio-ausgabewege-grundlinie.json');

/* Die Funktion, in deren Rumpf eine Stelle liegt: die letzte Deklaration `function NAME(` am Zeilenanfang davor. */
function umgebendeFunktion(quelle, index) {
  const vor = quelle.slice(0, index);
  let name = null;
  for (const m of vor.matchAll(/^(?:async )?function ([A-Za-z_$][\w$]*)\s*\(/gm)) name = m[1];
  return name;
}

/* Der Rumpf einer Funktion bis zur nächsten Deklaration am Zeilenanfang. Für die Frage „ruft der Weg X“ genügt das. */
function rumpf(quelle, name) {
  const re = new RegExp('^(?:async )?function ' + name.replace(/\$/g, '\\$') + '\\s*\\(', 'm');
  const m = re.exec(quelle);
  if (!m) return null;
  const rest = quelle.slice(m.index + m[0].length);
  const naechste = /^(?:async )?function [A-Za-z_$][\w$]*\s*\(|^const [A-Z_]+ =/m.exec(rest);
  return rest.slice(0, naechste ? naechste.index : rest.length);
}

/* Alle Ausgabewege: Funktionsname → Zahl der blobDownload-Aufrufe darin. Die Deklaration von blobDownload zählt nicht. */
function wegeMessen(quelle) {
  const wege = {};
  for (const m of quelle.matchAll(/\bblobDownload\(/g)) {
    if (/function\s+$/.test(quelle.slice(Math.max(0, m.index - 12), m.index))) continue;
    const name = umgebendeFunktion(quelle, m.index) || '(oberste Ebene)';
    wege[name] = (wege[name] || 0) + 1;
  }
  return wege;
}

function pruefen({ quelle, grundlinie }) {
  const befunde = [];
  const wege = wegeMessen(quelle);
  const geschlossen = grundlinie.geschlossen || {};
  const luecken = grundlinie.luecken || {};
  for (const name of Object.keys(wege).sort()) {
    if (!geschlossen[name] && !luecken[name]) befunde.push('neuer Ausgabeweg ohne Standard und PDF: ' + name);
  }
  for (const name of Object.keys(luecken).sort()) {
    if (!wege[name]) befunde.push('Lücke ' + name + ' gibt es nicht mehr — aus der Grundlinie streichen');
    if (geschlossen[name]) befunde.push(name + ' steht zugleich geschlossen und als Lücke');
  }
  for (const [name, soll] of Object.entries(geschlossen)) {
    const r = rumpf(quelle, name);
    if (r === null) { befunde.push('geschlossener Weg ' + name + ' fehlt im Studio'); continue; }
    if (!wege[name]) befunde.push('geschlossener Weg ' + name + ' gibt nichts aus');
    for (const aufruf of soll.ruft || []) {
      if (!r.includes(aufruf + '(')) befunde.push(name + ' ruft ' + aufruf + ' nicht (' + soll.standard + ' und PDF)');
    }
  }
  return { wege, befunde };
}

function main(argv) {
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const quelle = fs.readFileSync(arg('--dokument') || STUDIO, 'utf8');
  const grundlinie = JSON.parse(fs.readFileSync(arg('--grundlinie') || GRUNDLINIE, 'utf8'));
  const { wege, befunde } = pruefen({ quelle, grundlinie });
  console.log('[studio-ausgabewege] ' + Object.keys(wege).length + ' Wege, ' + Object.keys(grundlinie.luecken || {}).length
    + ' Lücken, ' + Object.keys(grundlinie.geschlossen || {}).length + ' geschlossen');
  for (const b of befunde) console.log('  ✖ ' + b);
  return befunde.length ? 1 : 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { wegeMessen, pruefen, rumpf, umgebendeFunktion, STUDIO, GRUNDLINIE };
