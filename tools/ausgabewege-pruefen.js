#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   ausgabewege-pruefen.js — Wächter: jeder Ausgabeweg des Kerns ist eingeordnet
   (MyTerms v1-Schnitt, Teil D, 16.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Sammelt aus den Skriptblöcken von vivodepot.html jede Stelle, an der etwas das Gerät
   verlassen kann — Aufrufe der Senken unten, Kommentare und eingebettete Bibliotheken
   (Zeilen über 2000 Zeichen) ausgenommen — und ordnet sie der umschließenden Funktion
   auf oberster Ebene zu. Jede so gefundene Funktion braucht eine Zeile in
   tools/lib/ausgabewege-einordnung.js.

   ZWEI ARTEN VON ROT (dieselbe Bauart wie ab-werk-rangfolge-pruefen.js):
     UNEINGEORDNET  ein Ausgabeweg im Kern ohne Zeile
     VERALTET       eine Zeile ohne Ausgabeweg im Kern

   Aufruf: node tools/ausgabewege-pruefen.js [--kern pfad]
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { KLASSEN, AUSGABEWEGE_EINORDNUNG } = require('./lib/ausgabewege-einordnung.js');

const SENKEN = Object.freeze([
  /\bdateiAusgeben\s*\(/, /\bwindow\.print\s*\(/, /\bnavigator\.share\s*\(/,
  /\bshowSaveFilePicker\s*\(/, /\.download\s*=/, /\bURL\.createObjectURL\s*\(/,
]);

// Entfernt Block- und Zeilenkommentare zeilenweise; `imBlock` trägt den Zustand über Zeilen.
function _ohneKommentare(zeile, zustand) {
  let raus = '';
  let i = 0;
  while (i < zeile.length) {
    if (zustand.imBlock) {
      const ende = zeile.indexOf('*/', i);
      if (ende < 0) return raus;
      zustand.imBlock = false; i = ende + 2; continue;
    }
    const block = zeile.indexOf('/*', i);
    const linie = zeile.indexOf('//', i);
    const naechst = [block, linie].filter((x) => x >= 0).sort((a, b) => a - b)[0];
    if (naechst === undefined) { raus += zeile.slice(i); break; }
    // `//` in einer URL-Zeichenkette ('https://…') ist kein Kommentar.
    if (naechst === linie && zeile.charAt(linie - 1) === ':') { raus += zeile.slice(i, linie + 2); i = linie + 2; continue; }
    raus += zeile.slice(i, naechst);
    if (naechst === linie) break;
    zustand.imBlock = true; i = block + 2;
  }
  return raus;
}

function ausgabewegeSammeln(kernText) {
  const zeilen = String(kernText).split('\n');
  const funde = new Map();
  let imSkript = false;
  let funktion = null;
  const zustand = { imBlock: false };
  zeilen.forEach((roh, idx) => {
    if (/<script\b/i.test(roh) && !/<\/script>/i.test(roh)) { imSkript = true; zustand.imBlock = false; funktion = null; return; }
    if (/<\/script>/i.test(roh)) { imSkript = false; return; }
    if (!imSkript || roh.length > 2000) return;
    const kopf = roh.match(/^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/);
    if (kopf && !zustand.imBlock) funktion = kopf[1];
    else if (!zustand.imBlock && /^(?:const|let|var|class)\s/.test(roh)) funktion = null;
    const code = _ohneKommentare(roh, zustand);
    for (const s of SENKEN) {
      if (!s.test(code)) continue;
      const name = funktion || '(oberste Ebene, Zeile ' + (idx + 1) + ')';
      if (!funde.has(name)) funde.set(name, []);
      funde.get(name).push(idx + 1);
    }
  });
  return funde;
}

function ausgabewegePruefen(kernText, tabelle) {
  const t = tabelle || AUSGABEWEGE_EINORDNUNG;
  const funde = ausgabewegeSammeln(kernText);
  const uneingeordnet = [...funde.keys()].filter((n) => !Object.prototype.hasOwnProperty.call(t, n)).sort();
  const veraltet = Object.keys(t).filter((n) => !funde.has(n)).sort();
  const klasseFalsch = Object.keys(t).filter((n) => !KLASSEN.includes(t[n].klasse) || !String(t[n].grund || '').trim()).sort();
  return { ok: !uneingeordnet.length && !veraltet.length && !klasseFalsch.length, uneingeordnet, veraltet, klasseFalsch, funde };
}

module.exports = { ausgabewegeSammeln, ausgabewegePruefen, SENKEN };

if (require.main === module) {
  const i = process.argv.indexOf('--kern');
  const kernPfad = i > 0 ? process.argv[i + 1] : path.join(__dirname, '..', 'vivodepot.html');
  const r = ausgabewegePruefen(fs.readFileSync(kernPfad, 'utf8'));
  for (const n of r.uneingeordnet) console.log('UNEINGEORDNET  ' + n + '  Zeilen ' + r.funde.get(n).join(', '));
  for (const n of r.veraltet) console.log('VERALTET       ' + n);
  for (const n of r.klasseFalsch) console.log('KLASSE/GRUND   ' + n);
  console.log(r.ok ? 'ausgabewege: ' + r.funde.size + ' eingeordnet' : 'ausgabewege: ROT');
  process.exit(r.ok ? 0 : 1);
}
