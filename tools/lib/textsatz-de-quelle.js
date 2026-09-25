'use strict';
/* Der EINE Leser des deutschen Sprachsatzes für Werkzeuge (S8, U2-ADR-428).
   Bis S8 stand der deutsche Satz als Konstante `AB_WERK_TEXTSATZ_DE` im Kern, und rund dreißig Werkzeuge lasen ihn von dort. Seit S8 ist Deutsch
   ein Sprachmodul wie Englisch, und QUELLE ist die Moduldatei `tools/textsatz-de-modul.json` — nicht der Kern. Ein Werkzeug, das den deutschen
   Satz braucht, liest ihn HIER; keine Datei außer dieser nennt die alte Konstante (Wächter: tests/textsatz-de-quelle-ein-leser.test.js). */
const fs = require('node:fs');
const { DE_MODUL_PFAD } = require('./vier-produkte.js');

let _modul = null;
function deModul() {
  // TEXTSATZ_DE_QUELLE_PFAD: nur für Proben, die eine Verletzung in eine KOPIE der Quelle pflanzen (tools/waechter-register.js); dann kein Zwischenspeicher.
  if (process.env.TEXTSATZ_DE_QUELLE_PFAD) return JSON.parse(fs.readFileSync(process.env.TEXTSATZ_DE_QUELLE_PFAD, 'utf8'));
  if (!_modul) _modul = JSON.parse(fs.readFileSync(DE_MODUL_PFAD, 'utf8'));
  return _modul;
}
/* Kennung → deutscher Text (dasselbe Objekt wie früher `AB_WERK_TEXTSATZ_DE.texte`). */
function deTexte() { return deModul().texte; }

module.exports = { deModul, deTexte, DE_MODUL_PFAD };
