'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Funktionskörper aus Quelltext ziehen — klammerbalanciert, nicht regex-lazy.
   ────────────────────────────────────────────────────────────────────────────
   Herausgelöst aus `tools/ausfuehrer-schreibweg-messen.js` (dort seit 30.07.2026
   inline), weil B-Zug 1 (Auftrag Drei_Fehlende_Waechter, 06.08.2026) einen
   zweiten Aufrufer bekommt (`tests/konformitaet/offline-garantie.mjs`, §10-Probe
   gegen `_swRegistrierenErlaubt`/`_installBlockHTML`). Ein lazy Regex
   (`\{[\s\S]*?\n\}`) trifft bei einer verschachtelten Funktion die ERSTE
   unindentierte `}`-Zeile, nicht zwingend die eigene — hier läuft stattdessen
   ein echter Klammerzähler über den Quelltext. Der bestehende Aufrufer bleibt
   unverändert (kein Umbau eines fremden Postens für diesen Auftrag); nur der
   zweite Aufrufer importiert von hier.
   ════════════════════════════════════════════════════════════════════════════ */

/** Körper von `function <name>(...) { ... }` — von `function` bis zur balancierten `}`. null, wenn nicht gefunden. */
function funktionsKoerper(quelle, name) {
  const start = quelle.indexOf('function ' + name + '(');
  if (start < 0) return null;
  const i = quelle.indexOf('{', start);
  if (i < 0) return null;
  let tiefe = 0;
  for (let j = i; j < quelle.length; j++) {
    const ch = quelle[j];
    if (ch === '{') tiefe++;
    else if (ch === '}') { tiefe--; if (tiefe === 0) return quelle.slice(start, j + 1); }
  }
  return null;
}

module.exports = { funktionsKoerper };
