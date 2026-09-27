'use strict';
/* Fixture (Positivkontrolle) für tests/sektor-wortlisten-pruefen.test.js.
   Zwölf echte Sektor-IDs in der heutigen Schreibweise (Kennungs-Umbau, Bereichs-Tabelle in
   docs/umbau-englisch-vor-v1/kennung-mapping.json) — muss GRÜN bleiben. Nicht von Produktcode gelesen. */
const ECHTE_LISTE = [
  'identity', 'people', 'mobility', 'finance', 'health', 'education',
  'socialInsurance', 'advanceCare', 'administration', 'housing', 'emergencyPreparedness', 'personal',
];
module.exports = { ECHTE_LISTE };
