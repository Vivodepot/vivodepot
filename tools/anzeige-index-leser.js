#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Wer liest den Anzeige-Index? — gesammelt aus dem Quelltext, nicht aufgezählt (16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   `SEKTOR_BY_ID` ist der Index der ANZEIGE: in Pro fehlen dort die ruhenden Bürger-Bereiche. Am
   16.09.2026 wurden an einem Tag fünf Stellen gefunden, die ihn für eine DATENFRAGE lasen
   (Modul-Prüfung, Feldkatalog, Merkmale und Rollen, acht Funktionen aus B2, `_bereichZuSektorId`).
   Jede war von einer Landkarte übersehen worden, die nach etwas anderem suchte — nach einem
   Parameternamen, nach einer Aufrufstelle.

   DIESES WERKZEUG FRAGT NICHT NACH DEM NAMEN, SONDERN NACH DEM LESEN: jede Funktion auf oberster
   Ebene, deren Quelltext `SEKTOR_BY_ID` enthält (Kommentare und Strings abgezogen), und jede Stelle
   außerhalb einer Funktion, zugeordnet zur Deklaration, in der sie steht. Gelesen wird die Kerndatei
   selbst: Kommentare, Strings, Template-Texte und Regex-Literale werden zuerst ausgeblendet, danach
   werden die Funktionsgrenzen an den Klammern gezählt. Im Projekt liegt kein JavaScript-Parser; ein
   Regex-Literal, das der Ausblender nicht erkennt, könnte eine Grenze verschieben — die Probe prüft
   darum den Ausblender eigens.

   DAS ERGEBNIS wird gegen `tools/anzeige-index-leser-grundlinie.json` gehalten: jede lesende Stelle
   steht dort als `anzeige` (sie darf den Anzeige-Index lesen, mit Grund) oder als `fund` (eine
   bekannte Datenfrage, die ihn noch liest — darf nur verschwinden). Eine neue, nicht eingetragene
   Stelle ist rot. Eine eingetragene, die nicht mehr liest, ebenso — dann schrumpft die Liste.

   GRENZE: gezählt wird der Name `SEKTOR_BY_ID`. Wer den Index über einen Alias liest (eine lokale
   Variable, `kernAPI`, `bereicheAlle()`), fällt hier nicht auf.

   Aufruf: node tools/anzeige-index-leser.js [--json]
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const NAME = 'SEKTOR_BY_ID';

/* Kommentare, Strings und Template-Texte durch Leerzeichen ersetzen; Code bleibt. Regex-Literale
   werden an den üblichen Stellen erkannt (nach Operator, Klammer, Komma, Schlüsselwort). */
function nurCode(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  const vorRegex = /[(,=:[!&|?{};+\-*%<>~^]|^\s*$|\b(return|typeof|case|in|of|new|delete|void|throw|else|do)\s*$/;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { const e = src.indexOf('\n', i); const j = e < 0 ? n : e; out += ' '.repeat(j - i); i = j; continue; }
    if (c === '/' && d === '*') { const e = src.indexOf('*/', i + 2); const j = e < 0 ? n : e + 2; out += src.slice(i, j).replace(/[^\n]/g, ' '); i = j; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== '\n') j += (src[j] === '\\' ? 2 : 1);
      out += ' '.repeat(Math.min(j + 1, n) - i); i = j + 1; continue;
    }
    if (c === '`') {
      let j = i + 1, tiefe = 0;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (tiefe === 0 && src[j] === '`') break;
        if (src[j] === '$' && src[j + 1] === '{') { tiefe++; j += 2; continue; }
        if (tiefe > 0 && src[j] === '}') { tiefe--; j++; continue; }
        j++;
      }
      // Ausdrücke in ${} bleiben Code: den Text einfach erhalten wäre falsch für Strings, grob ersetzen reicht hier
      out += src.slice(i, j + 1).replace(/[^\n]/g, ' '); i = j + 1; continue;
    }
    if (c === '/' && vorRegex.test(out.slice(-40).replace(/\s+$/, (m) => m))) {
      let j = i + 1, klasse = false;
      while (j < n && src[j] !== '\n') {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '[') klasse = true; else if (src[j] === ']') klasse = false;
        else if (src[j] === '/' && !klasse) break;
        j++;
      }
      if (j < n && src[j] === '/') { j++; while (j < n && /[a-z]/i.test(src[j])) j++; out += ' '.repeat(j - i); i = j; continue; }
    }
    out += c; i++;
  }
  return out;
}

function scripts(html) {
  const raus = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) raus.push(m[1]);
  return raus.join('\n');
}

function leser(kernPfad) {
  const html = fs.readFileSync(kernPfad || path.join(REPO, 'vivodepot.html'), 'utf8');
  const quelle = scripts(html);
  const code = nurCode(quelle);
  const stellen = new Set();
  // Funktionen auf oberster Ebene: Deklaration am Zeilenanfang, Körper per Klammerzählung im CODE (Strings/Kommentare sind weg)
  const re = /^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/gm;
  const bereiche = [];
  let m;
  while ((m = re.exec(code))) {
    const auf = code.indexOf('{', code.indexOf(')', m.index));
    let tiefe = 0, j = auf;
    for (; j < code.length; j++) {
      if (code[j] === '{') tiefe++;
      else if (code[j] === '}') { tiefe--; if (tiefe === 0) break; }
    }
    bereiche.push([m.index, j + 1]);
    if (code.slice(m.index, j + 1).includes(NAME)) stellen.add(m[1]);
    re.lastIndex = j + 1;
  }
  // Stellen außerhalb: der Deklaration auf oberster Ebene zuordnen, in der sie stehen
  let k = code.indexOf(NAME);
  while (k >= 0) {
    if (!bereiche.some(([a, b]) => k >= a && k < b)) {
      const davor = code.slice(0, k + NAME.length);   // die eigene Zeile mit, sonst trifft `let SEKTOR_BY_ID` die Deklaration davor
      const dekl = [...davor.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm)].pop();
      stellen.add('oberste Ebene: ' + (dekl ? dekl[1] : '?'));
    }
    k = code.indexOf(NAME, k + NAME.length);
  }
  return [...stellen].sort();
}

module.exports = { leser, nurCode };

if (require.main === module) {
  const l = leser();
  if (process.argv.includes('--json')) console.log(JSON.stringify(l, null, 2));
  else { console.log(l.length + ' lesende Stellen'); for (const x of l) console.log('  ' + x); }
}
