'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   absaetze.js — EIN Absatz-Begriff, zwei Aufrufer (Auftrag, 12.09.2026).

   Ursprünglich in tools/basistemplate-zeremonie-automat.js gebaut (dort:
   welcher Absatz eines amtlichen Wortlauts hat sich geändert, muss darum an
   weiteren Trägern nachgezogen werden). tests/vor-umzug-a4-standard-vorlagen
   braucht denselben Begriff für denselben Zweck aus der Gegenrichtung: welcher
   Absatz ist gegenüber dem historischen Beleg VERSCHWUNDEN, statt nur an
   anderer Stelle im Dokument aufzutauchen. Kein Nachbau — EINE Fassung.
   ════════════════════════════════════════════════════════════════════════════ */
function absaetzeErheben(text) {
  return String(text || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
}

module.exports = { absaetzeErheben };
