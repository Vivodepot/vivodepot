'use strict';
/* Die Namen der Codelisten-Einträge je Sprache (U2-ADR-480, Befund WAEHRUNG-FEST-EUR, Option iii). Im Gerüst steht je Eintrag
   nur der Code (code-listen/<systemId>.json, anzeigeName = Code); den Namen liefert das Sprachmodul unter
   `codeliste:<systemId>/<Code>.anzeige`. Fehlt der Eintrag in einem Modul, zeigt der Kern den Code — nie leer, nie eine Kennung.
   Gelesen von tools/textsatz-de-modul-erzeugen.js und tools/textsatz-en-modul-erzeugen.js; Probe tests/codeliste-iso4217.test.js. */
const TEXTSATZ_DE_CODELISTEN = Object.freeze({
  'codeliste:iso4217/EUR.anzeige': 'Euro',
  'codeliste:iso4217/USD.anzeige': 'US-Dollar',
  'codeliste:iso4217/GBP.anzeige': 'Pfund Sterling',
  'codeliste:iso4217/CHF.anzeige': 'Schweizer Franken',
});
const TEXTSATZ_EN_CODELISTEN = Object.freeze({
  'codeliste:iso4217/EUR.anzeige': 'euro',
  'codeliste:iso4217/USD.anzeige': 'US dollar',
  'codeliste:iso4217/GBP.anzeige': 'pound sterling',
  'codeliste:iso4217/CHF.anzeige': 'Swiss franc',
});
module.exports = { TEXTSATZ_DE_CODELISTEN, TEXTSATZ_EN_CODELISTEN };
