#!/usr/bin/env node
'use strict';
/* ═════════════════════════════════════════════════════════════════════════
   Doppelte IDs in den ausgelieferten Seiten
   ─────────────────────────────────────────────────────────────────────────
   Anlass: in vivodepot-studio.html stand `id="as-k-name"` zweimal (Eingabefeld und Vorschau-Kopfzeile). `getElementById` greift
   das erste Element; die Vorschau zeigte den Namen der Einrichtung nie. Eine Wortsuche nach einer einzelnen ID findet die
   Klasse nicht — dieses Werkzeug misst sie für jede ID.

   Aufruf
     node tools/doppelte-ids-pruefen.js                 gegen die ausgelieferten Seiten im Repo (Vorgabe) und die Grundlinie
     node tools/doppelte-ids-pruefen.js <datei.html>…   nur die genannten Dateien, ohne Grundlinie: jede Doppelung ist ein Befund
     --json                                             Messung als JSON auf die Standardausgabe
   Ohne Argument läuft die Prüfung gegen tools/doppelte-ids-grundlinie.json, mit Argument ohne sie (der Prüfgegenstand ist
   dann frei wählbar).

   Zwei Klassen, getrennt gemessen
     MARKUP        `id="…"` im statischen HTML außerhalb von <script> und <style>. Zwei gleiche IDs stehen dort immer zugleich
                   im Dokument: ein Befund. Die Grundlinie führt für jede Seite 0.
     SKRIPTVORLAGE `id="…"` in Zeichenketten im Skript (die Seiten bauen Teile ihrer Oberfläche aus Vorlagen). Dieselbe ID in
                   zwei Zweigen einer Bedingung ist harmlos, dieselbe ID in zwei zugleich stehenden Teilen ein Befund; das
                   entscheidet kein statischer Blick. Diese Kandidaten stehen je Seite als Positivliste in der Grundlinie,
                   nur sinkend: ein neuer Kandidat ist rot, ein verschwundener verlangt den Eintrag zu streichen.
                   Eine ID, die auch im Markup steht und in einer Vorlage wiederkehrt, zählt als Kandidat.
     AUSNAHME      `id="…"` mit dynamischem Anteil (`' + x + '`, `${…}`): die ID entsteht erst zur Laufzeit. Das Werkzeug kann
                   sie nicht vergleichen, nennt sie und zählt sie je Seite.
   Exit 0 = nichts Neues; Exit 1 = Befund.
   ═════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = path.join(__dirname, 'doppelte-ids-grundlinie.json');
const SEITEN = ['vivodepot.html', 'vivodepot-studio.html', 'vivodepot-lesen.html', 'vivodepot-vc-issuer.html', 'vivodepot-schluessel-teilen.html'];

function zaehle(liste) {
  const m = new Map();
  for (const k of liste) m.set(k, (m.get(k) || 0) + 1);
  return m;
}
function dynamisch(wert) { return wert === '' || /[+$\\{}'<>]/.test(wert); }

/* Eine HTML-Quelle → { markup: {id: n}, skript: {id: n}, ausnahmen: [Wert], doppeltMarkup, kandidaten }. */
function messen(html) {
  const skripte = [];
  const markup = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (m, b) => { skripte.push(b); return ' '; })
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  const mk = zaehle([...markup.matchAll(/(?<=[\s"'])id\s*=\s*"([^"]*)"/g)].map((m) => m[1]));
  const sk = new Map();
  const ausnahmen = [];
  const skriptText = skripte.join('\n');
  /* In Zeichenketten steht das Attribut als id="x" oder, in doppelt gequoteten Zeichenketten, als id=\"x\". */
  for (const m of skriptText.matchAll(/(?<=[\s"'(\\])id=\\?"([^"\n]*)"/g)) {
    const wert = m[1].replace(/\\+$/, '');
    if (dynamisch(wert)) ausnahmen.push(wert);
    else sk.set(wert, (sk.get(wert) || 0) + 1);
  }
  const doppeltMarkup = [...mk].filter(([, n]) => n > 1).map(([id, n]) => ({ id, n })).sort((a, b) => a.id.localeCompare(b.id));
  const kandidaten = [...sk].filter(([id, n]) => n > 1 || mk.has(id)).map(([id]) => id).sort();
  return { markup: Object.fromEntries(mk), skript: Object.fromEntries(sk), ausnahmen, doppeltMarkup, kandidaten };
}

function messeDatei(pfad) { return messen(fs.readFileSync(pfad, 'utf8')); }

/* Vergleich mit der Grundlinie → Liste von Befundzeilen (leer = nichts Neues). */
function gegenGrundlinie(seite, m, grund) {
  const f = [];
  const g = grund && grund.seiten && grund.seiten[seite];
  if (!g) return ['Seite ' + seite + ' steht nicht in der Grundlinie — eine Seite ohne Eintrag wird nicht geprüft'];
  if (m.doppeltMarkup.length > g.markup) {
    f.push(seite + ': ' + m.doppeltMarkup.length + ' doppelte IDs im Markup (Grundlinie ' + g.markup + '): ' +
      m.doppeltMarkup.map((d) => d.id + ' ×' + d.n).join(', '));
  } else if (m.doppeltMarkup.length < g.markup) f.push(seite + ': nur noch ' + m.doppeltMarkup.length + ' doppelte IDs im Markup — die Grundlinie auf diese Zahl senken');
  const neu = m.kandidaten.filter((id) => !g.skriptvorlagen.includes(id));
  const weg = g.skriptvorlagen.filter((id) => !m.kandidaten.includes(id));
  if (neu.length) f.push(seite + ': neue Kandidaten in Skriptvorlagen (nicht in der Grundlinie): ' + neu.join(', '));
  if (weg.length) f.push(seite + ': kein Kandidat mehr — aus der Grundlinie streichen: ' + weg.join(', '));
  if (m.ausnahmen.length > g.ausnahmen) f.push(seite + ': ' + m.ausnahmen.length + ' dynamische IDs im Skript (Grundlinie ' + g.ausnahmen + ')');
  else if (m.ausnahmen.length < g.ausnahmen) f.push(seite + ': nur noch ' + m.ausnahmen.length + ' dynamische IDs im Skript — die Grundlinie senken');
  return f;
}

function main(argv) {
  const json = argv.includes('--json');
  const dateien = argv.filter((a) => !a.startsWith('--'));
  const mitGrundlinie = dateien.length === 0;
  const ziele = mitGrundlinie ? SEITEN.map((s) => path.join(REPO, s)) : dateien.map((d) => path.resolve(d));
  const grund = mitGrundlinie ? JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8')) : null;
  const ergebnis = {};
  const befunde = [];
  for (const z of ziele) {
    const name = path.basename(z);
    const m = messeDatei(z);
    ergebnis[name] = { markupDoppelt: m.doppeltMarkup, kandidaten: m.kandidaten, ausnahmen: m.ausnahmen.length };
    if (mitGrundlinie) befunde.push(...gegenGrundlinie(name, m, grund));
    else if (m.doppeltMarkup.length) befunde.push(name + ': doppelte IDs im Markup: ' + m.doppeltMarkup.map((d) => d.id + ' ×' + d.n).join(', '));
  }
  if (json) process.stdout.write(JSON.stringify({ ergebnis, befunde }, null, 2) + '\n');
  else {
    for (const [name, e] of Object.entries(ergebnis)) {
      console.log(name + ': Markup doppelt ' + e.markupDoppelt.length + ' · Kandidaten in Skriptvorlagen ' + e.kandidaten.length + ' · dynamische IDs (Ausnahmen) ' + e.ausnahmen);
    }
    for (const b of befunde) console.log('BEFUND ' + b);
    console.log(befunde.length ? 'doppelte-ids: ' + befunde.length + ' Befund(e)' : 'doppelte-ids: nichts Neues');
  }
  return befunde.length ? 1 : 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { messen, messeDatei, gegenGrundlinie, SEITEN, GRUNDLINIE };
