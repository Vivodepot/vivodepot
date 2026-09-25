'use strict';
/* Register der Vor-Umzug-Achsen — jede Session traegt ihre eigene ein (06.09.2026: "ein Werkzeug mit der Achse als Argument entsteht genauso schnell
   wie eines ohne, die anderen sonst je eine Kopie bauen"). Neue Achse: Eintrag
   hier, keinen zweiten Erzeuger/Vergleicher schreiben. */
const { immerWerteA3, depotErgebnisA3, A3_DEPOT_FIXTUREN } = require('./vor-umzug-textwerte');
const {
  immerWerteA4StandardVorlagen, depotErgebnisA4StandardVorlagen, A4_STANDARD_VORLAGEN_DEPOT_FIXTUREN,
} = require('./vor-umzug-achse-a4-standard-vorlagen');

module.exports = {
  'a3-dokumentmodule': {
    beschreibung: 'U2-ADR-344 — PV_MODUL/KI_MODUL/VOLLMACHT_MODUL/BETREUUNG_MODUL, amtlicher ' +
      'Wortlaut (PV/KI/Vollmacht) hinter BUERGERMODUL_BUENDEL materialisiert. Fuer BETREUUNG_MODUL ' +
      'ist der amtliche Vergleich gegenstandslos (reiner Vivodepot-Generator-Text, kein migrierter ' +
      'BMJ-Wortlaut) — der Umzugs-/Regressions-Vergleich gilt trotzdem.',
    immerWerte: immerWerteA3,
    depotFixturen: A3_DEPOT_FIXTUREN,
    depotErgebnis: depotErgebnisA3,
  },
  'a1-situationen': require('./vor-umzug-achse-a1-situationen'),
  'a2-wizards': require('./vor-umzug-achse-a2-wizards'),
  'a4-standard-vorlagen': {
    beschreibung: 'U2-ADR-345 — STANDARD_VORLAGEN (patientenverfuegung/betreuungsverfuegung/' +
      'vorsorgevollmacht/organspende) hinter BUERGERMODUL_BUENDEL materialisiert. Ergaenzt ' +
      'a3-dokumentmodule (die vier Module selbst sind dort schon abgedeckt) um den einen Teil ' +
      'von U2-ADR-345, den a3 nicht beruehrt. Depot-unabhaengig, keine depotFixturen.',
    immerWerte: immerWerteA4StandardVorlagen,
    depotFixturen: A4_STANDARD_VORLAGEN_DEPOT_FIXTUREN,
    depotErgebnis: depotErgebnisA4StandardVorlagen,
  },
};
