#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Tote `html`-Regeln finden — was `:root` gesetzt hat, gewinnt immer
   ────────────────────────────────────────────────────────────────────────────
   DER ANLASS (27.07.2026, Posten 36). Ein `@media (max-width: 760px)`-Block
   setzte sieben Token an `html`. Sie haben NIE gewirkt: `:root` ist eine
   Pseudoklasse (0-1-0), `html` ein Typselektor (0-0-1), und `@media` addiert
   nichts zur Spezifitaet. Die `:root`-Werte gewannen unabhaengig von der
   Reihenfolge im Dokument.

   Das faellt weder beim Lesen noch beim Testen auf: die Deklaration steht da,
   sieht wirksam aus, und jede Pruefung, die den QUELLTEXT liest, bestaetigt sie.
   Gefunden wurde es erst, als eine Messung ueber eine echte Eigenschaft in px
   andere Zahlen lieferte als der Quelltext versprach.

   Aufruf:
     node tools/css-tote-html-regeln.js [--datei <pfad>]
   Ohne Argument gegen die vivodepot.html des Repos. Exit-Code 1 bei Funden.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const argv = process.argv.slice(2);
const arg = (n, s) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : s; };
const REPO = path.join(__dirname, '..');
const DATEI = path.resolve(arg('datei', path.join(REPO, 'vivodepot.html')));

/* Jede Deklaration mit ihrem Selektor und ihrer Zeile. Die Zerlegung ist grob,
   aber pruefbar: Selektor { Rumpf }, und der Rumpf enthaelt `eigenschaft: wert;`. */
function deklarationen(text) {
  const raus = [];
  const zeileVon = (pos) => text.slice(0, pos).split('\n').length;
  for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selektor = m[1].trim().replace(/\s+/g, ' ');
    if (!selektor || selektor.startsWith('@')) continue;
    for (const d of m[2].matchAll(/(^|;)\s*([a-zA-Z-][\w-]*)\s*:/g)) {
      raus.push({ selektor, eigenschaft: d[2], zeile: zeileVon(m.index + m[1].length + d.index) });
    }
  }
  return raus;
}

/* Die Regel: eine Eigenschaft an einem REINEN `html`-Selektor ist tot, wenn
   dieselbe Eigenschaft irgendwo an `:root` gesetzt ist.
   `html, body { … }` zaehlt NICHT — dort traegt der zweite Selektor die Regel,
   und `body` erbt nicht dieselbe Konkurrenz. */
function funde(text) {
  const alle = deklarationen(text);
  const anRoot = new Set(alle.filter((d) => /(^|,\s*):root$/.test(d.selektor)).map((d) => d.eigenschaft));
  return alle
    .filter((d) => d.selektor === 'html' && anRoot.has(d.eigenschaft))
    .map((d) => `${DATEI.split('/').pop()}:${d.zeile}  html { ${d.eigenschaft} } — ` +
                `dieselbe Eigenschaft steht an :root und gewinnt (0-1-0 gegen 0-0-1)`);
}

if (require.main === module) {
  const gefunden = funde(fs.readFileSync(DATEI, 'utf8'));
  if (gefunden.length) {
    console.error('TOTE REGELN — an `html` gesetzt, von `:root` ueberstimmt:\n  ' + gefunden.join('\n  ') +
      '\n\nEine @media-Query aendert daran nichts: sie addiert keine Spezifitaet.\n' +
      'Entweder die Zeile entfernen oder den Selektor auf `:root` heben — aber\n' +
      'dann WIRKT sie, und das ist eine Entscheidung, kein Aufraeumen.');
    process.exit(1);
  }
  console.log('Keine toten `html`-Regeln. Geprueft: ' + path.relative(REPO, DATEI));
}

module.exports = { funde, deklarationen };
