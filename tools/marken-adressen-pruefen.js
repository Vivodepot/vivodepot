#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   marken-adressen-pruefen.js — Adressen der Marke nur an der Marken-Stelle (Befund STUDIO-MARKE, v847, U2-ADR-362)
   ────────────────────────────────────────────────────────────────────────────
   Wer ein Vivodepot-Produkt unter eigener Marke betreibt, ändert die Adressen der Marke an EINER Stelle je Datei, nicht an
   dreißig. Bis v847 standen sie im Studio zehnmal und im Kern viermal frei im Code und im Markup. Die Regel, über alle
   Oberflächen gleich:

     Eine Adresse unter vivodepot.de oder vivodepot.org steht nur in der Deklaration
     `const MARKEN_ADRESSEN = Object.freeze({ … });` — sonst nirgends, auch nicht im Markup.

   Ausgenommen sind die Adressen des HERKUNFTSORTS: Konstanten der Gruppe `unersetzbar` in tools/herkunftsort-register.json
   (VIVODEPOT_HERKUNFT_LINK, DATENSCHUTZ_LINK). Sie zeigen immer auf die Urheberin, auch unter fremder Marke, und gehören darum
   gerade NICHT in die Marken-Stelle, die ein Betreiber ändert. Erlaubt nur in ihrer eigenen Deklaration `const NAME = …;`.

   Ausgenommen ist außerdem eine benannte Positivliste von KENNUNGEN, die die Form einer Adresse haben, aber nie aufgerufen werden
   (Schema-`$id`, JSON-LD-Kontext): sie zu ersetzen, hieße die Daten umzubenennen. Kommentare zählen nicht — sie erreichen
   weder Anzeige noch Datei.

   OBERFLÄCHE ist jede HTML-Datei in der Wurzel des Repos, die den VdCrypto-Block trägt — dieselbe Erkennung wie
   tools/krypto-block-propagation-pruefen.js (Signatur, nicht Dateiname). So prüft das Werkzeug in jedem Zuschnitt genau die
   Anwendungen, die dort liegen, und keine Liste kann veralten.

   Aufruf:  node tools/marken-adressen-pruefen.js [--datei <pfad>]…   (ohne --datei: alle Oberflächen)
   Exit 0 ohne Fund, 1 mit Fund. Probe: tests/marken-adressen.test.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');

const { TRAEGER_SIGNATUREN } = require('./krypto-block-propagation-pruefen.js');
function oberflaechen(repo = REPO) {
  return fs.readdirSync(repo).filter((d) => d.endsWith('.html')).sort()
    .filter((d) => { const t = fs.readFileSync(path.join(repo, d), 'utf8'); return TRAEGER_SIGNATUREN.some((s) => t.includes(s)); });
}
const OBERFLAECHEN = Object.freeze(oberflaechen());

const ADRESSE = /https?:\/\/(?:[a-z0-9-]+\.)*vivodepot\.(?:de|org)\b[^\s"'`<>)\\]*/gi;

// Kennungen in Adressform — nie aufgerufen, Teil der Daten. Je Eintrag der Grund.
const KENNUNGEN = Object.freeze([
  Object.freeze({ praefix: 'https://vivodepot.de/schemas/', grund: '`$id` der veröffentlichten JSON-Schemata (Anfrage, Einreichung) — Kennung des Schemas, kein Link' }),
  Object.freeze({ praefix: 'https://vivodepot.de/credentials/', grund: 'JSON-LD-Kontext der ausgestellten Nachweise — Kennung im Nachweis, kein Link' }),
]);

const STELLE_BEGINN = 'const MARKEN_ADRESSEN = Object.freeze({';

// Eine Quelle: die unersetzbaren Konstanten des Herkunftsorts (nur Namen in Großschreibung, keine STRINGS-Schlüssel).
function herkunftKonstanten(repo = REPO) {
  const reg = JSON.parse(fs.readFileSync(path.join(repo, 'tools', 'herkunftsort-register.json'), 'utf8'));
  return ((reg.gruppen && reg.gruppen.unersetzbar) || []).filter((n) => /^[A-Z][A-Z0-9_]*$/.test(n));
}

/* Kommentare durch Leerraum gleicher Länge ersetzen, Zeilenumbrüche bleiben — die Zeilennummern stimmen weiter. Eine
   Zeichenkette mit `//` darin (jede Adresse) darf nicht als Kommentar gelten: darum `//` nur nach Leerraum oder Zeilenbeginn. */
function ohneKommentare(text) {
  const leer = (m) => m.replace(/[^\n]/g, ' ');
  return text.replace(/<!--[\s\S]*?-->/g, leer)
    .replace(/\/\*[\s\S]*?\*\//g, leer)
    .replace(/(^|[\s;{}(),])\/\/[^\n]*/g, (m, vor) => vor + leer(m.slice(vor.length)));
}

/* Die Spanne der Marken-Stelle: vom Beginn der Deklaration bis zu ihrem schließenden `});` auf eigener Zeile. Mehr als eine
   Stelle je Datei ist selbst ein Befund — dann gäbe es wieder zwei Orte. */
function stellen(text) {
  const aus = [];
  let i = text.indexOf(STELLE_BEGINN);
  while (i >= 0) {
    const ende = text.indexOf('\n});', i);
    aus.push({ von: i, bis: ende < 0 ? text.length : ende + 4 });
    i = text.indexOf(STELLE_BEGINN, i + STELLE_BEGINN.length);
  }
  return aus;
}

// Die Spannen der Herkunftsort-Deklarationen: `const NAME = ` bis zum ersten `;` danach.
function herkunftSpannen(text, namen) {
  const aus = [];
  for (const n of namen) {
    const kopf = 'const ' + n + ' = ';
    let i = text.indexOf(kopf);
    while (i >= 0) {
      const ende = text.indexOf(';', i);
      aus.push({ von: i, bis: ende < 0 ? text.length : ende + 1 });
      i = text.indexOf(kopf, i + kopf.length);
    }
  }
  return aus;
}

function zeileVon(text, index) { return text.slice(0, index).split('\n').length; }

function pruefeText(datei, rohText, herkunft = herkunftKonstanten()) {
  const text = ohneKommentare(rohText);
  const st = stellen(text);
  const hk = herkunftSpannen(text, herkunft);
  const befunde = [];
  if (st.length > 1) befunde.push({ datei, zeile: zeileVon(text, st[1].von), adresse: '', grund: 'zweite Marken-Stelle — es darf nur eine geben' });
  ADRESSE.lastIndex = 0;
  let m;
  while ((m = ADRESSE.exec(text))) {
    const adresse = m[0];
    if (KENNUNGEN.some((k) => adresse.startsWith(k.praefix))) continue;
    if (st.some((s) => m.index >= s.von && m.index < s.bis)) continue;
    if (hk.some((s) => m.index >= s.von && m.index < s.bis)) continue;
    befunde.push({ datei, zeile: zeileVon(text, m.index), adresse, grund: 'Adresse der Marke außerhalb von MARKEN_ADRESSEN' });
  }
  return befunde;
}

function pruefen(dateien = OBERFLAECHEN, repo = REPO) {
  return dateien.flatMap((d) => pruefeText(d, fs.readFileSync(path.isAbsolute(d) ? d : path.join(repo, d), 'utf8')));
}

module.exports = { OBERFLAECHEN, oberflaechen, KENNUNGEN, STELLE_BEGINN, herkunftKonstanten, ohneKommentare, stellen, herkunftSpannen, pruefeText, pruefen };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const dateien = argv.flatMap((a, i) => (argv[i - 1] === '--datei' ? [a] : []));
  const befunde = pruefen(dateien.length ? dateien : OBERFLAECHEN);
  for (const b of befunde) console.log('BEFUND ' + b.datei + ':' + b.zeile + ' ' + (b.adresse ? b.adresse + ' — ' : '') + b.grund);
  console.log('[marken-adressen] ' + (befunde.length ? befunde.length + ' Befund(e)' : 'nur an der Marken-Stelle'));
  process.exitCode = befunde.length ? 1 : 0;
}
