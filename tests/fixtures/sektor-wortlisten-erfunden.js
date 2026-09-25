'use strict';
/* Fixture (Rot-Beleg) für tests/sektor-wortlisten-pruefen.test.js.
   Derselbe Fehler wie im Anlass (22.08.2026): 'versicherungen' und 'arbeit'
   statt 'sozialversicherung' und 'vorsorge'. Muss ROT werden. Nicht von
   Produktcode gelesen. */
const ERFUNDENE_LISTE = [
  'identitaet', 'gesundheit', 'wohnen', 'persoenliches', 'meine-menschen', 'finanzen',
  'bildung', 'verwaltung', 'mobilitaet', 'versicherungen', 'arbeit', 'krisenvorsorge',
];
module.exports = { ERFUNDENE_LISTE };
