#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   json-doppelte-schluessel-pruefen.js — kein Objekt in einer JSON-Datei nennt einen Schlüssel zweimal
   ────────────────────────────────────────────────────────────────────────────
   Anlass (20.10.2026, Befund JSON-DOPPELTE-SCHLUESSEL): `JSON.parse` nimmt bei einem doppelten
   Schlüssel still den letzten Wert. Am Kanon 0ab7851bc standen in zwei Listen Schlüssel doppelt:
   die Kern-Ausnahmen des Zuschnitts führten drei Datei-Hashes je dreimal (gleiche Werte), die
   Befund-Ratsche zwei Nachtrag-Schlüssel je zweimal mit VERSCHIEDENEN Werten — wer sie las, sah für
   zwei geschlossene Befunde nur das Anheben. Vermutete Entstehung: zwei Zweige tragen denselben
   Schlüssel an verschiedenen Stellen ein, git führt ohne Konflikt zusammen.

   Geprüft wird jede versionierte `.json`-Datei (`git ls-files`; ohne git: alle `.json` unter der
   Wurzel außer node_modules und .git) — nicht nur Grundlinien und Positivlisten, die Klasse ist
   dieselbe. Ein eigener Leser zählt je Objekt die Schlüssel, nach dem Entschlüsseln der Escapes
   (`"ab"` und `"ab"` sind für `JSON.parse` derselbe Schlüssel).

   Aufruf:  node tools/json-doppelte-schluessel-pruefen.js [--wurzel <pfad>] [--datei <pfad> …]
            Exit 1 bei jedem Fund, Exit 2 bei einer Datei, die kein JSON ist.
   Probe:   tests/json-doppelte-schluessel.test.js
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('./lib/ohne-git-umgebung.js');

/* Liefert [{ pfad, schluessel, anzahl }] für jedes Objekt mit doppeltem Schlüssel. Wirft, wenn der Text
   kein gültiges JSON ist (geprüft mit JSON.parse vorab). */
function doppelteSchluessel(text) {
  JSON.parse(text);
  let i = 0;
  const funde = [];
  const leer = () => { while (i < text.length && ' \t\n\r'.includes(text[i])) i++; };
  const zeichenkette = () => {
    const anfang = i;
    i++;
    while (text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
    i++;
    return JSON.parse(text.slice(anfang, i));
  };
  function wert(pfad) {
    leer();
    const c = text[i];
    if (c === '{') {
      i++;
      const gesehen = new Map();
      leer();
      if (text[i] === '}') { i++; return; }
      for (;;) {
        leer();
        const k = zeichenkette();
        gesehen.set(k, (gesehen.get(k) || 0) + 1);
        leer();
        i++;   // ':'
        wert(pfad + '.' + k);
        leer();
        if (text[i++] === ',') continue;
        break;
      }
      for (const [k, n] of gesehen) if (n > 1) funde.push({ pfad: pfad || '$', schluessel: k, anzahl: n });
      return;
    }
    if (c === '[') {
      i++;
      leer();
      if (text[i] === ']') { i++; return; }
      for (let n = 0; ; n++) {
        wert(pfad + '[' + n + ']');
        leer();
        if (text[i++] === ',') continue;
        break;
      }
      return;
    }
    if (c === '"') { zeichenkette(); return; }
    while (i < text.length && !',]} \t\n\r'.includes(text[i])) i++;
  }
  wert('');
  return funde;
}

function jsonDateien(wurzel) {
  try {
    return execFileSync('git', ['-C', wurzel, 'ls-files', '-z', '--', '*.json'], { maxBuffer: 1 << 28, env: ohneGitUmgebung() })
      .toString().split('\0').filter(Boolean);
  } catch (_) {
    const aus = [];
    (function gehen(rel) {
      for (const e of fs.readdirSync(path.join(wurzel, rel), { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '.git') continue;
        const r = rel ? rel + '/' + e.name : e.name;
        if (e.isDirectory()) gehen(r);
        else if (e.name.endsWith('.json')) aus.push(r);
      }
    })('');
    return aus.sort();
  }
}

/* Prüft die Dateien; liefert { funde: [{ datei, pfad, schluessel, anzahl }], kaputt: [{ datei, grund }] }. */
function pruefen(wurzel, dateien = jsonDateien(wurzel)) {
  const funde = [];
  const kaputt = [];
  for (const d of dateien) {
    let text;
    try { text = fs.readFileSync(path.join(wurzel, d), 'utf8'); } catch (e) { kaputt.push({ datei: d, grund: e.code || e.message }); continue; }
    try { for (const f of doppelteSchluessel(text)) funde.push({ datei: d, ...f }); } catch (e) { kaputt.push({ datei: d, grund: e.message }); }
  }
  return { funde, kaputt };
}

function main() {
  const argv = process.argv.slice(2);
  const wi = argv.indexOf('--wurzel');
  const wurzel = path.resolve(wi >= 0 ? argv[wi + 1] : path.join(__dirname, '..'));
  const dateien = argv.flatMap((a, k) => (a === '--datei' ? [argv[k + 1]] : []));
  const { funde, kaputt } = pruefen(wurzel, dateien.length ? dateien : undefined);
  for (const k of kaputt) console.error('json-doppelte-schluessel: ' + k.datei + ' — kein JSON (' + k.grund + ')');
  for (const f of funde) console.error('json-doppelte-schluessel: ' + f.datei + ' ' + f.pfad + ' nennt „' + f.schluessel + '“ ' + f.anzahl + '-mal — JSON.parse nimmt still den letzten Wert');
  if (kaputt.length) process.exit(2);
  if (funde.length) process.exit(1);
  console.log('json-doppelte-schluessel: kein doppelter Schlüssel.');
}

if (require.main === module) main();

module.exports = { doppelteSchluessel, jsonDateien, pruefen };
