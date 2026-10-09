'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   EIN Ort für die Bereinigung der Platz-Umgebung in Proben (08.10.2026, Befund PLATZ-UMGEBUNG-LECKT-IN-PROBEN).

   DER FUND: Proben der Platz-Werkzeuge bauten ihre Umgebung als { ...process.env, VD_SUITE_PLATZ_GEHALTEN: '' }.
   Damit erbten sie alles andere, was der umgebende Lauf setzt — die Zahl der Plätze (VD_SUITE_PLAETZE,
   VD_AIR_PLAETZE), den Kettenwagen-Schalter, die Lastgrenze, den Platz-Ordner. Eine Probe, die „zwei Plätze“
   prüft, prüfte dann unter der Platzzahl des Laufs, der sie startete.

   Entfernt wird über Muster, nicht über Einzelnamen: ein neuer Schalter derselben Familie fällt von selbst
   heraus. Muster nach dem Vorbild von tools/lib/ohne-git-umgebung.js; beide lassen sich verketten.
   ════════════════════════════════════════════════════════════════════════════ */

const PLATZ_MUSTER = Object.freeze([
  /^VD_SUITE_PLATZ/,                       // Platz-Ordner, geerbter Platz, Wartezeit
  /^VD_[A-Z_]*PLAETZE$/,                   // Zahl der Plätze je Platzart
  /^VD_KETTEN/,                            // Kettenwagen-Schalter und seine Familie
  /^VD_AIR(?:_|$)/,                        // Prüfrechner: Weiche und Marken
  /^VD_(?:[A-Z]+_)?LAST_GRENZE$/,          // Lastgrenze, auch die der Proben
  /^VD_[A-Z_]*(?:VORRANG|REIHE)[A-Z_]*$/,  // Vorrang- und Reihen-Marken
]);

function ohnePlatzUmgebung(basis = process.env) {
  const e = { ...basis };
  for (const k of Object.keys(e)) if (PLATZ_MUSTER.some((m) => m.test(k))) delete e[k];
  return e;
}

module.exports = { ohnePlatzUmgebung, PLATZ_MUSTER };
