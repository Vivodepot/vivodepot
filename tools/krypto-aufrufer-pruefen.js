#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Krypto-Aufrufer außerhalb des gepinnten Blocks — Grundlinie (U2-ADR-430, 27.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Ziffer 4 der ADR: „kein dritter Ableitungsweg“. Die Zahl der Stellen, die AUSSERHALB des gepinnten
   Krypto-Blocks (SCRIPT 1) ableiten, auspacken, exportieren oder entschlüsseln, ist VOR dem Bau des
   Wiederherstellungs-Codes erhoben und festgeschrieben (tools/krypto-aufrufer-grundlinie.json). Ein Zuwachs
   ist nur benannt erlaubt (`--anheben <operation> --grund "…"`), nie still. Die Hülle des Codes braucht
   genau: einen `deriveMasterBits`-Aufruf mehr je Weg (Einwickeln, Öffnen), einen `encrypt` (Einwickeln),
   einen `unwrapKey` (Öffnen), einen `importKey('raw', …)` für den Code-Schlüssel.
   Kommentarzeilen zählen nicht.

   Aufruf: node tools/krypto-aufrufer-pruefen.js [--kern <pfad>]          prüft gegen die Grundlinie (Exit 1 bei Zuwachs)
           node tools/krypto-aufrufer-pruefen.js --messen                   druckt die Zahlen
           node tools/krypto-aufrufer-pruefen.js --anheben <op> --grund "…" schreibt einen benannten Zuwachs
   Probe:  tests/krypto-aufrufer-grundlinie.test.js */
const fs = require('node:fs');
const path = require('node:path');

const WURZEL = path.join(__dirname, '..');
const GRUNDLINIE = path.join(__dirname, 'krypto-aufrufer-grundlinie.json');

const OPERATIONEN = Object.freeze({
  deriveMasterBits: /\bderiveMasterBits\(/,
  // Ohne `subtle.` davor: auch ein Aufruf über einen Alias (`const o = crypto.subtle; o.encrypt(…)`) zählt.
  unwrapKey: /\.unwrapKey\(/,
  wrapKey: /\.wrapKey\(/,
  exportKey: /\.exportKey\(/,
  decrypt: /\.decrypt\(/,
  encrypt: /\.encrypt\(/,
  deriveBits: /\.deriveBits\(/,
  importKeyRaw: /\.importKey\(\s*['"]raw['"]/,
});

function blockGrenzen(zeilen) {
  const start = zeilen.findIndex((z) => /SCRIPT 1 — KRYPTO-KERN/.test(z));
  if (start < 0) throw new Error('gepinnter Block (SCRIPT 1 — KRYPTO-KERN) nicht gefunden');
  const ende = zeilen.findIndex((z, i) => i > start && /^<\/script>/.test(z));
  return [start, ende];
}

function messen(text) {
  const zeilen = text.split('\n');
  const [s, e] = blockGrenzen(zeilen);
  const raus = {};
  for (const [op, re] of Object.entries(OPERATIONEN)) {
    raus[op] = 0;
    zeilen.forEach((z, i) => {
      if (i >= s && i <= e) return;
      if (/^\s*(\/\/|\*|\/\*)/.test(z)) return;
      if (re.test(z)) raus[op]++;
    });
  }
  return raus;
}

function pruefen(gemessen, grundlinie) {
  const funde = [];
  for (const [op, n] of Object.entries(gemessen)) {
    const g = grundlinie.operationen[op];
    if (g === undefined) funde.push(op + ': nicht in der Grundlinie');
    else if (n > g.anzahl) funde.push(op + ': ' + g.anzahl + ' → ' + n + ' außerhalb des gepinnten Blocks — ein Zuwachs steht benannt mit Grund in der Grundlinie');
  }
  return funde;
}

module.exports = { messen, pruefen, blockGrenzen, OPERATIONEN, GRUNDLINIE };

if (require.main === module) {
  const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
  const kern = fs.readFileSync(arg('--kern') || path.join(WURZEL, 'vivodepot.html'), 'utf8');
  const m = messen(kern);
  if (process.argv.includes('--messen')) { console.log(JSON.stringify(m)); return; }
  const g = JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8'));
  const op = arg('--anheben');
  if (op) {
    const grund = arg('--grund');
    if (!grund) { console.error('--grund fehlt'); process.exitCode = 2; return; }
    g.operationen[op] = { anzahl: m[op], grund: ((g.operationen[op] && g.operationen[op].grund) || '') + ' · ' + grund };
    fs.writeFileSync(GRUNDLINIE, JSON.stringify(g, null, 1) + '\n');
    console.log('[krypto-aufrufer] ' + op + ' benannt auf ' + m[op]);
    return;
  }
  const f = pruefen(m, g);
  for (const x of f) console.log('ROT ' + x);
  console.log(f.length ? '[krypto-aufrufer] ROT' : '[krypto-aufrufer] OK — kein unbenannter Zuwachs');
  process.exitCode = f.length ? 1 : 0;
}
