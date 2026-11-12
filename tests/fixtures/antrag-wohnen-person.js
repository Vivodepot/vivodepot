'use strict';
/* Erfundene Person für den Lauf eines Antrags zum Wohnen (M4, 05.11.2026): Mieterin einer kleinen Wohnung, verwitwet, Rente.
   Nur Felder des Depots, keine Kennung und kein Name eines fremden Schemas. Der KoSIT-Adapter baut daraus das Depot, wenn ein
   echtes Format-Modul läuft (VD_FIM_MODUL) und keine eigenen Werte (VD_FIM_WERTE) gegeben sind. */
const WERTE = Object.freeze({
  'identity.familyName': 'Muster', 'identity.givenName': 'Erika', 'identity.birthName': 'Gabler', 'identity.gender': 'w',
  'identity.birthDate': '1964-08-12', 'identity.birthPlace': 'Bonn', 'identity.nationality': 'deutsch',
  'identity.maritalStatus': 'verwitwet', 'identity.telephone': '0221 555010',
  'identity.street': 'Heidestraße', 'identity.houseNumber': '17', 'identity.postalCode': '51147', 'identity.city': 'Köln',
  'education.typeOfIncome': ['rente_pension'],
  'housing.ownedOrRented': 'miete', 'housing.monthlyRentServiceCharges': '640.00', 'housing.commercialUseArea': '0',
  'assets.homeSize': '54',
});

/** Setzt die Werte ins offene Depot des Kerns `V` (Bereich.Feld → Wert). */
async function baueDepot(V) {
  V.setData(V.leeresDepot());
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Probe');
  V.betreteApp();
  for (const [k, wert] of Object.entries(WERTE)) {
    const [bereich, feld] = k.split('.');
    V.sektorFeldSetzen(bereich, feld, wert);
  }
}

module.exports = { WERTE, baueDepot };
