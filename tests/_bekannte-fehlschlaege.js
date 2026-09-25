'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Bekannte Fehlschläge des Vorsorge-Umbaus — eingefrorene Allowlist.
   ────────────────────────────────────────────────────────────────────────
   WARUM: Solange die Suite rot ist, ist sie kein Netz — ein neuer Fehler
   verschwindet im Rauschen der alten. Genau so lag der Lese-App-Defekt zwei
   Commits unbemerkt im Baum. Diese Liste stellt das Signal wieder her, OHNE
   auf Grün zu warten: Jeder Fehlschlag AUSSERHALB der Liste ist ein Stopp.

   REGEL: Die Liste schrumpft nur. Ein Eintrag wird gestrichen, sobald sein
   Test umgestellt ist — nie ergänzt, um einen neuen Fehler ruhigzustellen.
   Wer hier etwas hinzufügt, hebt den Zweck der Liste auf.

   Erzeugt am 22.07.2026 aus dem Stand nach a11a0e1 (31 Fehlschläge).
   Ziel: leere Liste = Umbau fertig.
   ════════════════════════════════════════════════════════════════════════ */
module.exports = {
  BEKANNTE_FEHLSCHLAEGE: new Set([
  ]),
};
