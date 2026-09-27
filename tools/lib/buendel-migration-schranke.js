'use strict';
/* Schranke für die erledigten Bündel-Migrationen (21.09.2026).
   tools/wizards-ins-buendel-schreiben.js, dokumentmodule-ins-buendel-schreiben.js,
   zugang-recht-vorlagen-ins-buendel-schreiben.js und situationen-ins-buendel-schreiben.js schrieben Inhalte IN
   das eingebettete Bündel `BUERGERMODUL_BUENDEL`. Der Schnitt hat es geleert: in vivodepot.html steht
   `const BUERGERMODUL_BUENDEL = null;` (seit dem 18.09.2026). Ihr Ziel gibt es nicht mehr.

   Ohne diese Schranke enden drei mit einem Absturz beim Lesen (TypeError/SyntaxError) und eines, das
   situationen-ins-buendel-schreiben --check, mit Exit 0 und "nichts geschrieben", ohne dass sein Ziel je
   angesehen würde: ein grüner Lauf ohne Gegenstand. Beides lädt zur falschen Reparatur ein: wer den Absturz
   behebt, macht den Lauf wieder möglich, und der schriebe in ein Bündel, das es nicht mehr gibt.

   DIE SCHRANKE MELDET UND BRICHT AB, mit Exit 1, VOR jedem Lesen und Schreiben. Sie ist kein Provisorium ohne
   Ende: bei der ADR-Durchsicht (U2-ADR-345/346/352/367 zeigen auf diese Werkzeuge) gilt „gegenstandslos → weg,
   und die Verweise darauf im selben Commit"; dann gehen die Werkzeuge und diese Datei mit. */
const fs = require('node:fs');

const ERLEDIGT = /^const BUERGERMODUL_BUENDEL = null;/m;

/** Ist das Bündel in diesem Kern-Text schon geleert (null)? */
function buendelLeer(htmlText) {
  return ERLEDIGT.test(htmlText);
}

/** Wahr, wenn die Datei das Bündel als `null` führt: die Migration ist erledigt. */
function erledigt(htmlPfad) {
  return buendelLeer(fs.readFileSync(htmlPfad, 'utf8'));
}

/** Meldet die erledigte Migration und setzt Exit 1; liest und schreibt nichts weiter. */
function abbrechen(werkzeug) {
  console.error('[' + werkzeug + '] ERLEDIGT: BUERGERMODUL_BUENDEL ist in vivodepot.html null, das Bündel wurde geleert, die Migration ist '
    + 'abgeschlossen. Ein Lauf würde in ein Ziel schreiben, das es nicht mehr gibt. Abgebrochen, nichts gelesen, nichts geschrieben. '
    + 'Diese Schranke nicht entfernen, um den Lauf zu „reparieren"; das Werkzeug geht bei der ADR-Durchsicht ganz weg.');
  process.exitCode = 1;
}

/** Der Einstieg jedes der vier Werkzeuge: prüft die Schranke, sonst läuft `weiter`. */
function starten(werkzeug, htmlPfad, weiter) {
  if (erledigt(htmlPfad)) { abbrechen(werkzeug); return undefined; }
  return weiter();
}

module.exports = { buendelLeer, erledigt, abbrechen, starten, ERLEDIGT };
