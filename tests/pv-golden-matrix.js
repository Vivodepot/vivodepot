'use strict';
/* ════════════════════════════════════════════════════════════════════════
   PV-Golden-Matrix (U2-ADR-068 · geteilter Dokument-Generator, Teil 2)
   ────────────────────────────────────────────────────────────────────────
   Konfigurations-Matrix für den BYTE-IDENTITÄTS-Nachweis der Patienten-
   verfügungs-Ausgabe bei der Extraktion in den geteilten Generator.

   Jeder Eintrag ist ein minimaler `data`-Zustand (sektoren.advanceCare +
   .identity + menschen), der EINEN Zweig des Ist-Generators trifft:
   Sentinel-Skips, refMehrfach (Override UND Register-Ref), Organspende-
   Vorrang-Guard, Frist-Inline in den Platzhalter, leerer Fall, Voll-Fall.

   Genutzt von: `tests/pv-generator-byte-identisch.test.js` — prüft den neuen Generator gegen
   `tests/fixtures/pv-golden.json`. **Korrektur 02.08.2026 (U2-106-Nachtrag):** hier stand
   zusätzlich ein Verweis auf `tools/pv-golden-erfassen.js` als Erfassungswerkzeug — diese Datei
   gab es nie, kein Commit dazu im Repo. Die Fixture wurde einmalig aus der Vor-Umbau-Ausgabe des
   Ist-Generators erfasst und ist committet; eine Änderung an Matrix oder Fixture ist bislang ein
   manueller Schritt, kein automatisiertes Werkzeug.

   Die Matrix ist die Vertragsdefinition der PV-Ausgabe: Änderungen hier ODER
   an der Fixture sind bewusste Wortlaut-Entscheidungen (anwaltliche Freigabe).

   "Englisch vor v1": die Feld-Ids sind auf die englischen PV_BMJ-Kennungen umgestellt (die
   Sektor-Ids ebenso) — die erzeugte DOKUMENT-AUSGABE (amtlicher deutscher Wortlaut) hängt nur an
   den WERTEN, nicht an den internen Feld-Namen, darum bleibt tests/fixtures/pv-golden.json
   (der eingefrorene Vergleichsmaßstab) unverändert gültig.
   ════════════════════════════════════════════════════════════════════════ */

// Alle 11 Maßnahmen-Felder auf einen nicht-Sentinel-Wert (für den Voll-Fall).
const MASSN_ALLE = {
  lifeSustainingMeasures: 'unterlassen',
  painAndSymptomTreatment: 'mit_daempfung',
  acceptsLifeShorteningFromPain: 'ja',
  artificialNutritionAndHydration: 'palliativ',
  resuscitationInDescribedSituations: 'nein',
  emergencyDoctorNotified: 'ja',
  resuscitationInAllCases: 'ab_ausser_op',
  artificialVentilation: 'nein',
  dialysis: 'nein',
  antibiotics: 'palliativ',
  bloodAndBloodProducts: 'nein',
};

const IDENT_VOLL = {
  givenName: 'Maria', familyName: 'Muster',
  birthDate: '1950-03-07',
  streetAddress: 'Beispielweg 3', postcodeCity: '10115 Berlin',
};

function eintrag(name, vorsorge, extra) {
  extra = extra || {};
  return {
    name,
    data: {
      schemaVersion: 31,
      sektoren: { advanceCare: vorsorge || {}, identity: extra.identity || {} },
      menschen: extra.menschen || [],
    },
  };
}

const PV_MATRIX = [
  // ── Grundfälle ──
  eintrag('leer', {}),
  eintrag('nur-eingangsformel-voll', {}, { identity: IDENT_VOLL }),
  eintrag('nur-eingangsformel-teil', {}, { identity: { givenName: 'Kai' } }),

  // ── Situationen (Mehrfachauswahl + eigene Beschreibung) ──
  eintrag('situationen-eine', { applicableSituations: ['sterbeprozess'] }),
  eintrag('situationen-mehrere', { applicableSituations: ['sterbeprozess', 'endstadium', 'hirnabbau'] }),
  eintrag('situation-eigene-nur', { ownAdditionalSituation: 'Wenn ich dauerhaft im Wachkoma liege.' }),
  eintrag('situationen-plus-eigene', { applicableSituations: ['endstadium'], ownAdditionalSituation: 'Ergänzung zur obigen Lage.' }),
  eintrag('situation-eigene-leerstring', { applicableSituations: ['sterbeprozess'], ownAdditionalSituation: '   ' }),

  // ── Maßnahmen (bezug + Baustein, Sentinel-Skip) ──
  eintrag('massn-lebenserhalt', { lifeSustainingMeasures: 'unterlassen' }),
  eintrag('massn-verkuerzung-sentinel', { acceptsLifeShorteningFromPain: 'nein' }),   // '(kein Zusatz)' → übersprungen
  eintrag('massn-verkuerzung-ja', { acceptsLifeShorteningFromPain: 'ja' }),
  eintrag('massn-notarzt-sentinel', { emergencyDoctorNotified: 'nein' }),     // Sentinel → übersprungen
  eintrag('massn-alle', Object.assign({}, MASSN_ALLE)),

  // ── Ort, Beistand, Schweigepflicht ──
  eintrag('ort-zuhause', { placeOfTreatmentOrDeath: 'zuhause' }),
  eintrag('beistand-personen-override', { supportFromThesePersons: [{ override: 'Klaus Meier' }, { override: 'Anna Schulz' }] }),
  eintrag('beistand-personen-ref', { supportFromThesePersons: [{ ref: 'p1' }, { ref: 'p2' }] },
    { menschen: [{ id: 'p1', name: 'Dr. Referenz' }, { id: 'p2', name: 'Eva Register' }] }),
  eintrag('beistand-kirche', { supportFromChurchOrCommunity: 'Evangelische Kirche' }),
  eintrag('beistand-hospiz-ja', { hospiceSupport: 'ja' }),
  eintrag('beistand-hospiz-nein', { hospiceSupport: 'nein' }),
  eintrag('schweigepflicht', { confidentialityWaiverFor: [{ override: 'Frau Dr. Berg' }] }),

  // ── Verbindlichkeit / Reichweite / Widerruf (Rolle, „andere" mit/ohne Name) ──
  eintrag('reichweite-bevoll', { whoseViewMattersIfUnregulated: 'bevollmaechtigt' }),
  eintrag('reichweite-andere-mit', { whoseViewMattersIfUnregulated: 'andere', whoseViewMattersOtherPersonName: 'mein Bruder Jonas' }),
  eintrag('reichweite-andere-ohne', { whoseViewMattersIfUnregulated: 'andere' }),          // Name leer → keine Zeile
  eintrag('widerruf-arzt', { whoseViewMattersIfDeviatingWill: 'arzt' }),
  eintrag('reichweite-und-widerruf', { whoseViewMattersIfUnregulated: 'betreuer', whoseViewMattersIfDeviatingWill: 'bevollmaechtigt' }),

  // ── Weitere Verfügungen (Verweis, keine Duplikation) ──
  eintrag('weitere-vollmachten-liste', { provisionInstruments: [{ instrument: 'enduring-power-of-attorney', art: 'vorsorge' }] }),
  eintrag('weitere-vollmacht-gate', { vollmacht_vorhanden: 'ja' }),
  eintrag('weitere-betreuung', { betreuungsverfuegung: 'ja' }),
  eintrag('weitere-beide', { provisionInstruments: [{ instrument: 'enduring-power-of-attorney', art: 'bank' }], betreuungsverfuegung: 'ja' }),

  // ── Wertvorstellungen ──
  eintrag('wertvorstellungen', { personalValuesOrFurtherDocuments: 'Menschenwürde und Selbstbestimmung sind mir am wichtigsten.' }),

  // ── Organspende (Vorrang-Guard: nur bei Zustimmung) ──
  eintrag('organspende-zustimmung-vorrang', { organDonationDecision: 'zustimmung', priorityIfOrganDonationConflict: 'organspende' }),
  eintrag('organspende-zustimmung-vorrang-pv', { organDonationDecision: 'zustimmung', priorityIfOrganDonationConflict: 'patientenverfuegung' }),
  eintrag('organspende-zustimmung-ohne-vorrang', { organDonationDecision: 'zustimmung' }),
  eintrag('organspende-ablehnung', { organDonationDecision: 'ablehnung' }),
  eintrag('organspende-ablehnung-vorrang-ignoriert', { organDonationDecision: 'ablehnung', priorityIfOrganDonationConflict: 'organspende' }),

  // ── Schlussbemerkungen (Verzicht + feste Texte + Beratung) ──
  eintrag('verzicht-ja', { waivesFurtherMedicalInformation: 'ja' }),
  eintrag('verzicht-nein', { waivesFurtherMedicalInformation: 'nein' }),
  eintrag('beratung', { informationOrCounsellingReceived: 'Hausärztin Dr. Klein' }),

  // ── Gültigkeit / Aktualisierung (Frist inline in den Platzhalter) ──
  eintrag('aktualisierung-unbefristet', { validityDuration: 'unbefristet' }),
  eintrag('aktualisierung-befristet-frist', { validityDuration: 'befristet', validityDurationDeadline: 'zwei Jahren' }),
  eintrag('aktualisierung-befristet-ohne-frist', { validityDuration: 'befristet' }),  // '(Zeitangabe)' bleibt

  // ── Voll-Fall (jede Sektion trägt) ──
  eintrag('voll', Object.assign({
    applicableSituations: ['sterbeprozess', 'endstadium', 'gehirnschaedigung', 'hirnabbau'],
    ownAdditionalSituation: 'Zusätzlich bei dauerhaftem Wachkoma.',
    placeOfTreatmentOrDeath: 'hospiz',
    supportFromThesePersons: [{ override: 'Klaus Meier' }, { ref: 'p1' }],
    supportFromChurchOrCommunity: 'Katholische Kirche',
    hospiceSupport: 'ja',
    confidentialityWaiverFor: [{ override: 'Frau Dr. Berg' }, { ref: 'p1' }],
    whoseViewMattersIfUnregulated: 'andere', whoseViewMattersOtherPersonName: 'meine Nichte',
    whoseViewMattersIfDeviatingWill: 'bevollmaechtigt',
    provisionInstruments: [{ instrument: 'enduring-power-of-attorney', art: 'vorsorge' }], betreuungsverfuegung: 'ja',
    personalValuesOrFurtherDocuments: 'Würde vor Lebensverlängerung.',
    organDonationDecision: 'zustimmung', priorityIfOrganDonationConflict: 'organspende',
    waivesFurtherMedicalInformation: 'ja',
    informationOrCounsellingReceived: 'Palliativärztin',
    validityDuration: 'befristet', validityDurationDeadline: 'drei Jahren',
  }, MASSN_ALLE), { identity: IDENT_VOLL, menschen: [{ id: 'p1', name: 'Dr. Referenz' }] }),
];

module.exports = { PV_MATRIX };
