'use strict';
/* Anführungszeichen gelten als gleich — für Vergleiche gegen eingefrorene Belege (16.09.2026).
   ANLASS: die Reintext-Regel verwirft ein ASCII-Anführungszeichen (v1-Blocker Sicherheit, Review
   des XSS-Fixes, X2). Die eigenen Textsätze sind darum typografisch umgestellt: DE „…“, EN “…”. Belege,
   die vor diesem Tag eingefroren wurden, tragen den alten Wortlaut mit ASCII ". Sie bleiben unangetastet
   — ein nachgebesserter Beleg misst nichts mehr.
   DIE AUSNAHME IST ENG: nur „ “ ” und " werden zum selben Zeichen, beidseitig. Jede andere Abweichung
   (ein Wort, ein Satzzeichen, ein fehlendes Feld) bleibt sichtbar. Der Apostroph ist nicht betroffen. */
const ANFUEHRUNG = /[„“”]/g;

function anfuehrungGleich(wert) {
  if (typeof wert === 'string') return wert.replace(ANFUEHRUNG, '"');
  if (Array.isArray(wert)) return wert.map(anfuehrungGleich);
  if (wert && typeof wert === 'object') {
    const raus = {};
    for (const k of Object.keys(wert)) raus[k] = anfuehrungGleich(wert[k]);
    return raus;
  }
  return wert;
}

module.exports = { anfuehrungGleich };
