'use strict';
/* Die Grammatikfälle eines Erscheinungsbild-Werts (v894, Auflage B): je Fall Name, Ebene, Token, Wert. Eine Quelle für zwei
   Proben — die Prüfung in Kern und Bauweg (tests/erscheinungsbild-pruefung.test.js) und das Schema
   (tests/mit-modul/erscheinungsbild-modul-schema.test.js, eigene Datei, weil es ajv braucht: tests/schicht-1-ohne-lieferkette.test.js). */
module.exports = Object.freeze([
  ['url( im Wert (Auflage B)', 'basis', '--cream', 'url(https://x.invalid/a.png)'],
  ['öffnende Klammer im Wert', 'basis', '--line', '#000000}body{display:none'],
  ['schließende Klammer im Wert', 'basis', '--line', '#000000 }'],
  ['spitze Klammer im Wert', 'basis', '--line', '</style>'],
  ['Rückstrich im Wert', 'basis', '--line', '\\23 000000'],
  ['Semikolon im Wert', 'basis', '--line', '#000000; --ink: red'],
]);
