#!/usr/bin/env node
'use strict';
/* Konstanten-Lookup mit fremdem Schlüssel (26.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Eine Konstanten-Map (`const GROSS = Object.freeze({ … })` oder `= { … }`) ist ein gewöhnliches
   Objekt. `GROSS[schluessel]` findet darum auch, was sie ERBT: `constructor`, `toString`,
   `__proto__`. Ein Logikmodul mit dem Blocktyp `constructor` kam so durch
   `MODUL_BLOCK_HANDLER[blk.typ]` — die Zusicherung „nur geschlossene Enums“ hielt nicht.

   Die Klasse, nicht der Fall: jeder Lookup einer Konstanten-Map mit einem nicht-literalen Schlüssel
   läuft über `_eigenerWert(MAP, schluessel)` (eigene Eigenschaft oder undefined). Dieses Werkzeug
   findet die, die es nicht tun — auch den Folge-Lookup auf einem Map-WERT (`(_eigenerWert(M, a) || {})[b]`).
   Kommentarzeilen und Schreibstellen (`MAP[k] = …`) zählen nicht.

   Aufruf: node tools/konstanten-lookup-pruefen.js [--kern <pfad>]   (Exit 1 bei Funden)
   Probe:  tests/konstanten-lookup-eigen.test.js */
const fs = require('node:fs');
const path = require('node:path');

function konstantenMaps(text) {
  return new Set([...text.matchAll(/^(?:const|let|var) ([A-Z][A-Z0-9_]+) = (?:Object\.freeze\()?\{/gm)].map((m) => m[1]));
}

/* Schlüsselausdruck bis zur passenden schließenden Klammer (verschachtelte [] erlaubt). */
function schluesselEnde(zeile, start) {
  let tiefe = 1;
  for (let i = start; i < zeile.length; i++) {
    if (zeile[i] === '[') tiefe++;
    else if (zeile[i] === ']' && --tiefe === 0) return i;
  }
  return -1;
}

const istKommentar = (zeile) => /^\s*(\/\/|\*|\/\*)/.test(zeile);
const literal = (ausdruck) => /^\s*(['"`][^'"`]*['"`]|\d+)\s*$/.test(ausdruck);

function befunde(text) {
  const maps = konstantenMaps(text);
  const aus = [];
  text.split('\n').forEach((zeile, i) => {
    if (istKommentar(zeile)) return;
    const re = /\b([A-Z][A-Z0-9_]+)\[/g;
    let m;
    while ((m = re.exec(zeile))) {
      if (!maps.has(m[1])) continue;
      const ende = schluesselEnde(zeile, m.index + m[0].length);
      if (ende < 0) continue;
      const ausdruck = zeile.slice(m.index + m[0].length, ende);
      if (literal(ausdruck)) continue;
      if (/^\s*=(?!=)/.test(zeile.slice(ende + 1))) continue;   // Schreibstelle (eine Registry wie CODE_LISTEN), kein Lookup
      aus.push({ zeile: i + 1, map: m[1], ausdruck, text: zeile.trim().slice(0, 160) });
    }
    /* Folge-Lookup: der WERT einer Konstanten-Map ist selbst eine Map. `(_eigenerWert(M, a) || {})[b]`
       oder `_eigenerWert(M, a).x[b]` schlägt `b` wieder im Prototyp nach — gefunden an
       LISTEN_AUSWAHLFORM (26.09.2026), wo `constructor` als Auswahlform durchging. */
    const ruf = /_eigenerWert\(/g;
    let r;
    while ((r = ruf.exec(zeile))) {
      let j = r.index + r[0].length, tiefe = 1;
      for (; j < zeile.length && tiefe; j++) { if (zeile[j] === '(') tiefe++; else if (zeile[j] === ')') tiefe--; }
      const rest = zeile.slice(j);
      const folge = /^(\s*\|\|\s*(?:\{\}|\[\])\s*\))?((?:\.[A-Za-z_$][\w$]*)*)\[/.exec(rest);
      if (!folge) continue;
      const start = j + folge[0].length;
      const ende = schluesselEnde(zeile, start);
      if (ende < 0) continue;
      const ausdruck = zeile.slice(start, ende);
      if (literal(ausdruck)) continue;
      aus.push({ zeile: i + 1, map: '(Wert)', ausdruck, text: zeile.trim().slice(0, 160) });
    }
  });
  return aus;
}

module.exports = { befunde, konstantenMaps, schluesselEnde };

if (require.main === module) {
  const i = process.argv.indexOf('--kern');
  const kern = fs.readFileSync(i > 0 ? process.argv[i + 1] : path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const f = befunde(kern);
  for (const b of f) console.log(`${b.zeile}: ${b.map}[${b.ausdruck}]  ${b.text}`);
  console.log(f.length ? `${f.length} Lookup(s) ohne _eigenerWert` : 'keine Funde');
  process.exitCode = f.length ? 1 : 0;
}
