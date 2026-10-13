#!/usr/bin/env node
'use strict';
/* ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   suite-rot-zusammenfassung — trennt im Protokoll eines roten Suite-Laufs die echten Fehler von den erwarteten todo.
   ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   DER ANLASS (Befund ROT-BERICHT-MISCHT-TODO-UNTER-FEHLER, 08.10.2026): der Abschnitt „✖ failing tests:“ von node:test
   listet neben den echten Fehlern (✖) auch jeden todo-Test, der wie erwartet fehlschlägt (⚠ … # <Befund>). Die todo-Proben
   offener Befunde stehen darum in JEDEM roten Protokoll. Gelesen als „diese Proben sind rot“, sahen sieben todo-Proben wie
   eine Wechselwirkung im großen Lauf aus — gemessen über 118 rote Protokolle seit 06.10.2026: 167 ⚠-Zeilen, kein ✖.
   Rot gemacht hatten jeweils andere, echte Fehler der committenden Wagen. Eine Regel „rot mit genau diesen sieben gilt als
   bekannt“ hätte diese echten Fehler durchgewunken.

   DIESES WERKZEUG liest das Protokoll und gibt aus:
     Zeile 1:  [suite] ROT: <n> echte Fehler (✖)          — nur die Zahl der echten Fehler
     danach:   je echter Fehler eine Zeile „  ✖ <Name>“
     danach:   [suite] daneben <m> erwartete todo-Fehlschläge (⚠) — zählen nicht, ihre Befunde stehen in der Befund-Ratsche
   Die Hooks rufen es im roten Zweig vor UND nach der vollen Ausgabe (Kopf und Ende des Protokolls sind, was gelesen wird).

   Aufruf:
     node tools/suite-rot-zusammenfassung.js <protokoll>
   ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');

const KOPF = /^✖ failing tests:\s*$/;
const NAME = (zeile) => zeile.slice(2).replace(/\s+\(\d+(?:\.\d+)?m?s\)(?:\s+#.*)?$/, '').trim();

/* Der Abschnitt „failing tests“ beginnt an seinem letzten Kopf; gezählt wird je Name einmal. */
function zerlegen(text) {
  const zeilen = String(text).split(/\r?\n/);
  let ab = -1;
  zeilen.forEach((z, i) => { if (KOPF.test(z)) ab = i; });
  const fehler = new Set();
  const todo = new Set();
  if (ab >= 0) {
    for (const z of zeilen.slice(ab + 1)) {
      if (z.startsWith('✖ ') && !KOPF.test(z)) fehler.add(NAME(z));
      else if (z.startsWith('⚠ ')) todo.add(NAME(z));
    }
  }
  return { abschnitt: ab >= 0, fehler: [...fehler], todo: [...todo] };
}

function bericht(text) {
  const r = zerlegen(text);
  const aus = ['[suite] ROT: ' + r.fehler.length + ' echte Fehler (✖)'];
  for (const n of r.fehler) aus.push('  ✖ ' + n);
  if (!r.fehler.length) {
    aus.push(r.abschnitt
      ? '  kein ✖ im Abschnitt „failing tests“ — der Lauf ist an etwas anderem gescheitert; die volle Ausgabe lesen'
      : '  kein Abschnitt „failing tests“ — Abbruch außerhalb eines Tests; die volle Ausgabe lesen');
  }
  aus.push('[suite] daneben ' + r.todo.length + ' erwartete todo-Fehlschläge (⚠) — zählen nicht, ihre Befunde stehen in der Befund-Ratsche');
  return aus.join('\n');
}

function main(argv) {
  const pfad = argv[0];
  if (!pfad) { console.error('Aufruf: node tools/suite-rot-zusammenfassung.js <protokoll>'); return 2; }
  let text = '';
  try { text = fs.readFileSync(pfad, 'utf8'); } catch (e) { console.error('[suite-rot-zusammenfassung] Protokoll nicht lesbar: ' + pfad); return 2; }
  console.log(bericht(text));
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { zerlegen, bericht };
