'use strict';
/* Die Bilder, die tools/screenshots-oeffentlich-erzeugen.js für publiccode.yml
   erzeugt: Dateiname und Klickweg ab dem Startbildschirm. Eigene Datei ohne
   playwright, damit tests/screenshots-oeffentlich.test.js die Liste in
   Schicht 1 lesen kann (tests/schicht-1-ohne-lieferkette.test.js). */
const BILDER = Object.freeze([
  { datei: 'vivodepot-start.png', klicks: [] },
  { datei: 'vivodepot-anlaesse.png', klicks: ['Was möchten Sie erledigen?'] },
  { datei: 'vivodepot-beispielansicht.png', klicks: ['Was möchten Sie erledigen?', 'Ich schaue mich erst einmal um'] },
]);

module.exports = { BILDER };
