'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Die ROHE Quelle eines eingebauten Bereichs — aus beiden Quellen (Stufe 2, 09.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Mehrere Proben fragen: „wie sah dieser Bereich aus, BEVOR der Träger ihn angefasst hat?"
   Bis Stufe 2 war die Antwort immer `BUERGERMODUL_BUENDEL.bereiche[id]`, weil dort alle
   dreizehn standen.

   SEIT `wohnen` UMGEZOGEN IST, STIMMT DAS NICHT MEHR. Die Proben schrieben durchweg
   `if (!roh) continue;` — sie ÜBERSPRANGEN den migrierten Bereich stillschweigend und
   meldeten weiter grün, nur über zwölf statt dreizehn. Ihre Zählungen („alle dreizehn
   passieren den Träger") wurden dadurch falsch, ohne dass eine Zusicherung fiel.

   DARUM EINE STELLE, NICHT DREI: derselbe Grund wie bei `tools/lib/sektoren.js` — drei
   Kopien derselben Frage driften auseinander, und die dritte merkt es als letzte. Wer eine
   vierte Quelle hinzufügt, ändert sie hier und die Proben ziehen mit.
   ════════════════════════════════════════════════════════════════════════════ */

/* Die rohe Bereichs-Definition, wie sie VOR dem Träger aussieht — Bündel zuerst (der
   Regelfall), dann die eingebauten Ab-Werk-Quellen. `null`, wenn der Bereich aus keiner von
   beiden stammt: dann ist er ein echtes Fremdmodul und nicht Gegenstand dieser Proben. */
function rohQuelleFuer(V, id) {
  const ausBuendel = V.BUERGERMODUL_BUENDEL
    && V.BUERGERMODUL_BUENDEL.bereiche
    && V.BUERGERMODUL_BUENDEL.bereiche[id];
  if (ausBuendel) return ausBuendel;
  for (const name of ['BEREICH_QUELLEN_EINGEBAUT', 'AB_WERK_BEREICH_QUELLEN']) {
    for (const modul of (V[name] || [])) {
      if (modul && modul.bereiche && modul.bereiche[id]) return modul.bereiche[id];
    }
  }
  return null;
}

/* Alle IDs, die aus dem eingebauten Bestand stammen — Bündel plus Saat. Die Zahl, gegen die
   „alle dreizehn" gemessen wird; sie steht nicht als Literal in den Proben, damit ein
   vierzehnter eingebauter Bereich sie nicht still falsch macht. */
function eingebauteRohIds(V) {
  return V.bereicheAlle().map((b) => b.id).filter((id) => rohQuelleFuer(V, id) !== null);
}

module.exports = { rohQuelleFuer, eingebauteRohIds };
