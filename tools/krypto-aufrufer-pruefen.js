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
   Probe:  tests/krypto-aufrufer-grundlinie.test.js

   WEITERE DATEIEN (09.10.2026): Anwendungen ohne gepinnten Block (zuerst das Studio, das seit dem Öffnen der Antworten den
   gemeinsamen Antwort-JWE-Block trägt) werden ganz gemessen, je Datei mit eigener Grundlinie unter `weitereDateien`.
   Dieselbe Regel: ein Zuwachs nur benannt.
           node tools/krypto-aufrufer-pruefen.js --anheben <op> --datei vivodepot-studio.html --grund "…"

   SIGNIEREN UND PRÜFEN (11.10.2026): `verify` und `sign` zählen mit. Bis dahin sah kein Krypto-Wächter eine neue Stelle, die
   eine Signatur nachrechnet oder erzeugt; ein zweiter Prüfweg neben dem JWS-Block wäre still entstanden. Lese-App und
   VC-Issuer werden seitdem ebenfalls ganz gemessen: die Lese-App rechnet dieselben Signaturen nach wie der Kern, der Issuer
   stellt Zertifikate aus.
           node tools/krypto-aufrufer-pruefen.js --aufnehmen --datei <weitere Datei> --grund "…"   schreibt den Bestand ALLER
                                                                 Operationen einer neu gemessenen Datei (nur, wenn sie noch keine Grundlinie hat) */
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
  // U2-ADR-457, Nachtrag v865: die Stelle, die die eingebettete noble-ed25519 in die Ableitung des Halter-Schlüssels reicht
  // (Übergabe ohne Aufrufklammer). Genau eine; eine zweite hieße, eine Funktion sieht den geheimen Seed.
  halterOeffentlichAusSeed: /\b_ed25519OeffentlichAusSeed\b(?!\s*\()/,
  // Signatur nachrechnen und erzeugen (auch HMAC), ebenfalls ohne `subtle.` davor. `Math.sign(` ist keine Signatur.
  verify: /\.verify\(/,
  sign: /(?<!Math)\.sign\(/,
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

// Eine Datei ohne gepinnten Block: jede Zeile außer Kommentaren zählt.
function messenGanz(text) {
  const zeilen = text.split('\n');
  const raus = {};
  for (const [op, re] of Object.entries(OPERATIONEN)) {
    raus[op] = 0;
    for (const z of zeilen) { if (/^\s*(\/\/|\*|\/\*)/.test(z)) continue; if (re.test(z)) raus[op]++; }
  }
  return raus;
}
const WEITERE_DATEIEN = Object.freeze(['vivodepot-studio.html', 'vivodepot-lesen.html', 'vivodepot-vc-issuer.html']);

function pruefen(gemessen, grundlinie) {
  const funde = [];
  for (const [op, n] of Object.entries(gemessen)) {
    const g = grundlinie.operationen[op];
    if (g === undefined) funde.push(op + ': nicht in der Grundlinie');
    else if (n > g.anzahl) funde.push(op + ': ' + g.anzahl + ' → ' + n + ' außerhalb des gepinnten Blocks — ein Zuwachs steht benannt mit Grund in der Grundlinie');
  }
  return funde;
}

function pruefenWeitere(lesen, grundlinie) {
  const funde = [];
  for (const datei of WEITERE_DATEIEN) {
    const g = grundlinie.weitereDateien && grundlinie.weitereDateien[datei];
    if (!g) { funde.push(datei + ': keine Grundlinie unter weitereDateien'); continue; }
    for (const f of pruefen(messenGanz(lesen(datei)), g)) funde.push(datei + ' · ' + f);
  }
  return funde;
}

module.exports = { messen, messenGanz, pruefen, pruefenWeitere, blockGrenzen, OPERATIONEN, GRUNDLINIE, WEITERE_DATEIEN };

if (require.main === module) {
  const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
  const kern = fs.readFileSync(arg('--kern') || path.join(WURZEL, 'vivodepot.html'), 'utf8');
  const m = messen(kern);
  if (process.argv.includes('--messen')) { console.log(JSON.stringify(m)); return; }
  const g = JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8'));
  const lesen = (rel) => fs.readFileSync(path.join(WURZEL, rel), 'utf8');
  if (process.argv.includes('--messen-weitere')) { for (const d of WEITERE_DATEIEN) console.log(d + ' ' + JSON.stringify(messenGanz(lesen(d)))); return; }
  const op = arg('--anheben');
  const datei = arg('--datei');
  if (process.argv.includes('--aufnehmen')) {
    const grund = arg('--grund');
    if (!grund || WEITERE_DATEIEN.indexOf(datei) < 0) { console.error('--grund fehlt oder die Datei ist keine der weiteren'); process.exitCode = 2; return; }
    g.weitereDateien = g.weitereDateien || {};
    if (g.weitereDateien[datei]) { console.error(datei + ' hat schon eine Grundlinie — ein Zuwachs geht über --anheben'); process.exitCode = 2; return; }
    const mw = messenGanz(lesen(datei));
    g.weitereDateien[datei] = { operationen: Object.fromEntries(Object.entries(mw).map(([o, n]) => [o, { anzahl: n, grund }])) };
    fs.writeFileSync(GRUNDLINIE, JSON.stringify(g, null, 1) + '\n');
    console.log('[krypto-aufrufer] ' + datei + ' aufgenommen ' + JSON.stringify(mw));
    return;
  }
  if (op && datei) {
    const grund = arg('--grund');
    if (!grund || WEITERE_DATEIEN.indexOf(datei) < 0) { console.error('--grund fehlt oder die Datei ist keine der weiteren'); process.exitCode = 2; return; }
    const mw = messenGanz(lesen(datei));
    g.weitereDateien = g.weitereDateien || {};
    const gd = g.weitereDateien[datei] = g.weitereDateien[datei] || { operationen: {} };
    gd.operationen[op] = { anzahl: mw[op], grund: [gd.operationen[op] && gd.operationen[op].grund, grund].filter(Boolean).join(' · ') };
    fs.writeFileSync(GRUNDLINIE, JSON.stringify(g, null, 1) + '\n');
    console.log('[krypto-aufrufer] ' + datei + ' · ' + op + ' benannt auf ' + mw[op]);
    return;
  }
  if (op) {
    const grund = arg('--grund');
    if (!grund) { console.error('--grund fehlt'); process.exitCode = 2; return; }
    g.operationen[op] = { anzahl: m[op], grund: [g.operationen[op] && g.operationen[op].grund, grund].filter(Boolean).join(' · ') };
    fs.writeFileSync(GRUNDLINIE, JSON.stringify(g, null, 1) + '\n');
    console.log('[krypto-aufrufer] ' + op + ' benannt auf ' + m[op]);
    return;
  }
  const f = pruefen(m, g).concat(pruefenWeitere(lesen, g));
  for (const x of f) console.log('ROT ' + x);
  console.log(f.length ? '[krypto-aufrufer] ROT' : '[krypto-aufrufer] OK — kein unbenannter Zuwachs');
  process.exitCode = f.length ? 1 : 0;
}
