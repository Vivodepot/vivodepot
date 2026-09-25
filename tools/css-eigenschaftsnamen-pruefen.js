#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Wächter — ungültige CSS-Eigenschaftsnamen im <style>-Block
   ────────────────────────────────────────────────────────────────────────────
   ANLASS (K4 Zug 3, 10.08.2026): `grid-template- columns` stand mit einem
   Leerzeichen im Property-Namen im Kern — ungültige CSS, wirkungslos seit
   jeher, und JAHRELANG niemandem aufgefallen. Kein Linter im Projekt prüft
   das <style>-Element einer .html-Datei; ein Browser verwirft die Regel
   stillschweigend, kein Fehler, keine Konsole-Meldung im Normalbetrieb.

   ZUSCHNITT: kein vollständiger CSS-Parser. Eine gültige CSS-Eigenschaft ist
   IMMER ein einzelnes Wort (Standard: klein/Bindestrich, z. B. `grid-template-
   columns`; Custom Property: `--irgendwas`). Ein Property-„Name" aus ZWEI
   durch Leerraum getrennten Wörtern vor einem Doppelpunkt ist darum IMMER
   ungültig — genau die Klasse, die hier gesucht wird. Der Fund-Ort ist an
   `{` oder `;` gebunden (Deklarationsanfang), nicht an Klammertiefe: das
   funktioniert unverändert innerhalb von `@media`/`@supports`, ohne dass eine
   echte Verschachtelung nachgebaut werden müsste.

   Aufruf:
     node tools/css-eigenschaftsnamen-pruefen.js                → echter Kern
     KERN_HTML_PATH=<pfad> node tools/css-eigenschaftsnamen-pruefen.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const HTML_PFAD = process.env.KERN_HTML_PATH
  ? path.resolve(process.env.KERN_HTML_PATH)
  : path.join(REPO, 'vivodepot.html');

/* ── Nur der <style>-Block, ohne Kommentare ──────────────────────────────── */
function styleOhneKommentare(quelle) {
  const bloecke = [];
  const styleMuster = /<style[^>]*>([\s\S]*?)<\/style>/g;
  let m;
  while ((m = styleMuster.exec(quelle))) bloecke.push(m[1]);
  return bloecke.join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
}

/* ── Deklarationsanfänge mit einem mehrwortigen „Property"-Namen ─────────── */
function ungueltigeEigenschaftsnamen(quelle) {
  const css = styleOhneKommentare(quelle);
  const muster = /[{;]\s*((?:--)?[a-zA-Z][a-zA-Z-]*(?:[ \t]+[a-zA-Z-]+)+)\s*:/g;
  const funde = [];
  let m;
  while ((m = muster.exec(css))) {
    const name = m[1].trim();
    const start = Math.max(0, m.index - 40);
    funde.push({ name, umgebung: css.slice(start, m.index + m[0].length).replace(/\s+/g, ' ').trim() });
  }
  return funde;
}

function main() {
  const quelle = fs.readFileSync(HTML_PFAD, 'utf8');
  const funde = ungueltigeEigenschaftsnamen(quelle);

  if (funde.length === 0) {
    console.log('GATE grün — keine mehrwortigen (also ungültigen) CSS-Eigenschaftsnamen im <style>-Block.');
    return;
  }
  console.error('GATE ROT — ungültiger CSS-Eigenschaftsname (Leerzeichen im Property-Namen):');
  for (const f of funde) console.error(`    "${f.name}" — Fundstelle: …${f.umgebung}…`);
  process.exitCode = 1;
}

if (require.main === module) main();
module.exports = { styleOhneKommentare, ungueltigeEigenschaftsnamen };
