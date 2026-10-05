'use strict';
/* Die Ausgabeformate, die das Standards-Register kennt (Feld `exportwege` aller Registerzeilen in tools/standards-register/).
   Proben, die den Bestand der Ausgabeformate halten, leiten ihre erwartete Menge hieraus ab statt eine feste Zahl zu führen:
   ein neues Format kommt mit seiner Registerzeile, ein erfundenes ohne Zeile fällt auf (05.10.2026, U2-ADR-471). */
const { registerLesen } = require('../standards-register-pruefen.js');

function registerExportwege(dateien = registerLesen()) {
  const wege = new Set();
  for (const { inhalt } of dateien) for (const s of (inhalt.standards || [])) for (const w of (s.exportwege || [])) wege.add(w);
  return wege;
}

/** Abweichungen zwischen den Kennungen der Ausgabeformate und dem Register — leer heißt deckungsgleich. */
function exportwegeAbgleich(formatIds, wege = registerExportwege()) {
  const ids = new Set(formatIds);
  return {
    ohneRegister: [...ids].filter((i) => !wege.has(i)).sort(),
    ohneFormat: [...wege].filter((w) => !ids.has(w)).sort(),
  };
}

module.exports = { registerExportwege, exportwegeAbgleich };
