'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Ein Beispiel-Depot für den Abschnitt Advance Directives im IPS-Export (U2-ADR-466)
   ────────────────────────────────────────────────────────────────────────
   EINE Stelle für die Probe (tests/fhir-ips-vorsorge.test.js), den Validator-Fall in
   tests/konformitaet/externe-validatoren.mjs und das Werkzeug tools/ips-vorsorge-validieren.js —
   drei Kopien desselben Depots wären drei Stände. Die Personen sind erfunden.

   Was drinsteht, und warum:
     · eine Vorsorgevollmacht mit zwei Bevollmächtigten (eine davon „Privat“ markiert), befristet,
       beglaubigt, mit erteilten und ausdrücklich nicht erteilten Gesundheitsbefugnissen und einem Ablageort
     · eine Bankvollmacht — ausgenommen, sie darf nicht erscheinen
     · eine Patientenverfügung und eine Betreuungsverfügung
     · ein Testament — ausgenommen
     · der Widerspruch gegen die Notvertretung durch den Ehegatten, mit eingetragenem Ehegatten
   ════════════════════════════════════════════════════════════════════════ */

async function vorsorgeDepotAnlegen(V) {
  await V.depotAnlegen('vorsorge-beispiel-2026!');
  V.akteurSelbstErklaeren('Maria Mustermann');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  V.sektorFeldSetzen('identity', 'birthDate', '1950-03-14');
  V.sektorFeldSetzen('identity', 'maritalStatus', 'verh');
  const tochter = V.personHinzufuegen({ name: 'Anna Mustermann', familyName: 'Mustermann', givenName: 'Anna', beziehung: 'Tochter', tel: '+49 170 0000001', email: 'anna@example.org' });
  const sohn = V.personHinzufuegen({ name: 'Jonas Mustermann', beziehung: 'Sohn', tel: '+49 170 0000002', nichtMitgeben: true });
  const ehegatte = V.personHinzufuegen({ name: 'Paul Mustermann' });
  V.sektorFeldSetzen('people', 'spouseOrCivilPartner', { ref: ehegatte });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', {
    instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', form: 'beglaubigt',
    dateOfLastChange: '2025-03-01', timeLimitedUntilIfAgreed: '2031-05-01',
    authorizedPersons: [{ ref: tochter }, { ref: sohn }], howDoThePeopleRepresentYou: 'nacheinander',
    storageLocation: 'Schreibtisch, oberste Schublade',
    healthCareGeneralDecision: 'ja', healthCareMedicalProcedures: 'ja', healthCareMedicalRecords: 'ja',
    healthCarePlacementDepriving: 'nein', healthCareCompulsoryMedical: 'nein',
  });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', {
    instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'bank', authorizedPersons: [{ ref: tochter }], storageLocation: 'Bankfiliale',
  });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', {
    instrument: 'living-will', form: 'privat', dateOfLastChange: '2024-11-20', storageLocation: 'Hausarztpraxis',
  });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', {
    instrument: 'custodianship-declaration', form: 'privat', dateOfLastChange: '2024-11-20',
  });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'will', storageLocation: 'Amtsgericht' });
  V.sektorFeldSetzen('advanceCare', 'spousalRepresentationObjection', 'ja');
  V.sektorFeldSetzen('advanceCare', 'spousalRepresentationObjectionSince', '2024-06-01');
  return { tochter, sohn, ehegatte };
}

module.exports = { vorsorgeDepotAnlegen };
