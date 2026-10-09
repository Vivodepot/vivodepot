'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Persona P6 — Schwerbehinderte Seniorin, Pflegegrad 2
   ----------------------------------------------------------------------------
   Grundlage: die interne Spezifikation der Persona-Durchläufe vom 28.07.2026,
   **Rang 2** der Reihenfolge nach Deckungsgewinn (nach P3, Rang 1).

   ── ERZEUGT, NICHT GESCHRIEBEN ────────────────────────────────────────────
   Wie `persona-p3.js`: KEIN Datenobjekt, sondern eine Folge von Aufrufen der
   echten Schreibwege — `depotAnlegen`, `personHinzufuegen`,
   `institutionHinzufuegen`, `sektorFeldSetzen`, `listenEintragHinzufuegen`.
   Ein von Hand gepflegtes Objekt kann einen Zustand tragen, den die App nie
   herstellen kann, und eine Prüfung dagegen beweist etwas über ein unmögliches
   Depot. `tests/fixtures/referenzdepot.js` ist ein solches Objekt und setzt 19
   Felder, die `feldDefFuer` nicht kennt.

   ── WAS DIESE PERSONA PRÜFT, DAS HEUTE NICHTS PRÜFT ───────────────────────
   Gemessen an P3 (dem einzigen bestehenden Durchgang, 64 Felder in 10 von 12
   Bereichen): **P3 setzt im Bereich `vorsorge` NULL Felder und trägt NULL
   Vorsorge-Instrumente.**

   P6 ist damit die erste Persona, die
     · den Bereich `vorsorge` überhaupt betritt,
     · **ZWEI Vorsorge-Instrumente nebeneinander** trägt (Vorsorgevollmacht UND
       Betreuungsverfügung — das Dokument nennt sie ausdrücklich „die einzige
       Persona, bei der beide nebeneinander stehen"),
     · die Pflege-Kette vollständig führt (Pflegegrad, Bescheid, Pflegedienst,
       Pflegevertrag),
     · eine Schwerbehinderung mit Grad und Merkzeichen trägt,
     · eine Bevollmächtigte hat, die KEINE Verwandte ersten Grades ist.

   Das ist kein Zufall an der Rangfolge: `vorsorge` ist der Bereich, an dem die
   Aufträge 3 bis 8 der Kette hängen — Anlass-Ausgabe, freies Zusammenstellen,
   Anfrage und Rückweg tragen alle Vorsorge-Instrumente.

   ── DER UNTERLAGEN-BESTAND IST TEIL DES PRÜFSTOFFS ────────────────────────
   Wörtlich aus dem Personas-Dokument: „Schwerbehindertenausweis mit Grad und
   Merkzeichen, Pflegegrad-Bescheid, Medikamentenplan, Pflegedienstvertrag,
   Hilfsmittelverzeichnis, Vorsorgevollmacht, Betreuungsverfügung, Notfallkarte
   in der Handtasche." Was hineingeht, bestimmt dieser Bestand — nicht der
   Wunsch nach einer hohen Deckungszahl. Was die Persona NICHT hat, bleibt leer:
   kein Testament, keine KI-Verfügung, keine Erben-Liste, kein Betreuungsgericht
   (sie ist NICHT unter Betreuung — sie hat vorgesorgt, damit es nicht dazu
   kommt; das ist der Unterschied zwischen Betreuungsverfügung und
   Betreuerbestellung).

   ── ERFUNDEN ──────────────────────────────────────────────────────────────
   Alle Personen, Orte, Nummern und Daten sind erfunden. Das Repo ist öffentlich.
   ════════════════════════════════════════════════════════════════════════════ */

const PASSWORT = 'p6-hildegard-pw';

/* Die Nichte richtet ein, die Seniorin sieht zu — „Nichts allein" steht so im
   Dokument. Das Depot gehört trotzdem IHR: die Nichte ist Bevollmächtigte, nicht
   Inhaberin. Genau diese Unterscheidung prüft die Persona mit. */
const MENSCHEN = Object.freeze([
  { schluessel: 'nichte', name: 'Sabine Kertesz', beziehung: 'Nichte',
    tel: '030 5550171' },
  { schluessel: 'hausarzt', name: 'Jonas Weill', beziehung: 'Hausarzt',
    tel: '030 5550188' },
  { schluessel: 'nachbarin', name: 'Ayse Dörr', beziehung: 'Nachbarin',
    tel: '030 5550193' },
]);
const INSTITUTIONEN = Object.freeze([
  { schluessel: 'pflegedienst', name: 'Pflegedienst Lindenhof GmbH', tel: '030 5550200' },
  { schluessel: 'notariat', name: 'Notariat am Stadtpark' },
]);

/* Unterlagen, für die es KEIN Feld gibt — der wertvollste Ausgang des
   Personas-Papiers: „Ein fehlendes Feld findet man beim Ausfüllen, nicht beim
   Lesen." Sie sind hier benannt und NICHT still in ein passendes Feld gedrückt. */
const UNTERLAGEN_OHNE_FELD = Object.freeze([
  'Hilfsmittelverzeichnis (Rollator, Badewannenlift, Hausnotruf) — es gibt `vorsorge.hilfsmittel` '
  + 'als EINZEILIGES Textfeld; ein Verzeichnis mit Gegenstand, Kostenträger und Anschaffungsdatum '
  + 'hat dort keinen Platz. Hier bewusst als Freitext eingetragen, damit sichtbar bleibt, was fehlt.',
]);

async function baueDepot(V) {
  await V.depotAnlegen(PASSWORT);
  V.akteurSelbstErklaeren('Hildegard');

  const p = {};
  for (const m of MENSCHEN) p[m.schluessel] = V.personHinzufuegen(m);
  const inst = {};
  for (const i of INSTITUTIONEN) inst[i.schluessel] = V.institutionHinzufuegen(i);

  const setze = (sektor, felder) => {
    for (const [id, wert] of Object.entries(felder)) V.sektorFeldSetzen(sektor, id, wert);
  };
  // Array-Form — RICHTIG hier, weil ausschließlich für `emergencyContacts` genutzt
  // (Katalogtyp `refMehrfach`, unten Zeile ~113). Für `ref`-Felder (EIN Verweis, kein
  // Array) wird unten NICHT dieser Helfer verwendet, sondern bar gesetzt (Fund
  // 23.09.2026, s. tests/persona-fixtures-feldform.test.js) — derselbe Helfer für beide
  // Typen hätte einen der beiden immer falsch gemacht.
  const refMehrfach = (x) => [{ ref: (x && (x.id || x)) || '' }];
  const refBar = (x) => ({ ref: (x && (x.id || x)) || '' });

  /* ── Identität ──────────────────────────────────────────────────────────── */
  setze('identity', {
    givenName: 'Hildegard', familyName: 'Ostermann', birthDate: '1948-11-03',
    birthPlace: 'Neuruppin', nationality: 'deutsch',
    maritalStatus: 'verwitwet',
    streetAddress: 'Lindenhofstraße 12', postcodeCity: '10829 Berlin',
    telephone: '030 5550166',
  });

  /* ── Gesundheit ─────────────────────────────────────────────────────────────
     Medikamentenplan als Chip-Liste — derselbe Weg, den die Bürgerin geht
     (`chipAusEingabe` → Freitext-Chip, wenn kein Vorschlag passt). Das ist der
     Regelfall, weil die Kern-Listen zwölf Einträge tragen (s. A378). */
  setze('health', {
    bloodType: '0+',
    generalPractitioner: refBar(p.hausarzt),
    medicationOngoing: [{ text: 'Metoprolol 47,5 mg' }, { text: 'Torasemid 10 mg' },
                  { text: 'Calcium/Vitamin D' }],
    allergiesMedicationFoodOther: [{ text: 'Pflaster (Acrylatkleber)' }],
    chronicConditionsDiagnoses: [{ text: 'Herzinsuffizienz NYHA II' }, { text: 'Osteoporose' }],
    implantsProsthesesPacemakers: 'Hüft-TEP links (2019)',
    emergencyContacts: refMehrfach(p.nichte),
  });

  /* ── Sozialversicherung: die volle Pflege-Kette ─────────────────────────────
     Sie ist der Grund für Rang 2. P3 setzt hier zwei Felder; P6 führt die Kette
     von der Kasse über den Grad bis zum Vertrag. */
  setze('socialInsurance', {
    /* Verweis-Feld: `{override}` ist der Weg für eine Stelle, die nicht im Register steht —
       derselbe, den eine Bürgerin über die Chip-Eingabe geht (A43/U2-ADR-116). */
    longTermCareFund: { override: 'Pflegekasse der AOK Nordost' },
    longTermCareFundPhone: '030 5550210',
    careLevel: '2',
    careLevelSinceYear: '2024-03-01',
    noticeDated: '2024-02-14',
    longTermCareAllowanceTypeOf: 'ja',
    homeCareServiceNameContact: { ref: (inst.pflegedienst && (inst.pflegedienst.id || inst.pflegedienst)) || '' },
    careContractStorageLocation: 'Ordner „Pflege", oberstes Fach',
    /* Schwerbehinderung — Grad und Merkzeichen. Die Merkzeichen sind eine
       Mehrfachauswahl; G (Gehbehinderung) und B (Begleitperson) passen zur Lage. */
    degreeOfDisabilityGdb: '60',
    markers: ['G', 'B'],
  });
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): schwerbehindertenausweis_ort/_gueltig sind
  // zur mehrwertigen Liste `schwerbehindertenausweis` geworden — `sektorFeldSetzen` wirft dafür
  // seit U2-ADR-104.
  V.listenEintragHinzufuegen('socialInsurance', 'severeDisabilityCards',
    { system: '', storageLocation: 'Handtasche, Seitenfach', validUntil: '2028-03-31' });

  /* ── Vorsorge: ZWEI Instrumente nebeneinander ───────────────────────────────
     DER KERN DIESER PERSONA. P3 trägt hier nichts; hier stehen Vorsorgevollmacht
     UND Betreuungsverfügung nebeneinander, mit derselben Bevollmächtigten.
     Über `listenEintragHinzufuegen` — den echten Schreibweg der Instrument-Liste
     (U2-ADR-096), nicht über ein Flachfeld. */
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', {
    instrument: 'enduring-power-of-attorney',
    form: 'notariell',
    certifyingBody: 'Notariat am Stadtpark',
    storageLocation: 'Ordner „Vorsorge", vorne; Kopie bei der Nichte',
    dateOfLastChange: '2023-09-12',
    authorizedPersons: refMehrfach(p.nichte),
    howDoThePeopleRepresentYou: 'allein',
    healthCareGeneralDecision: 'ja',
    healthCareMedicalRecords: 'ja',
    determinePlaceOfResidence: 'ja',
    manageAnExistingTenancyWindUp: 'ja',
    representationWithAuthorities: 'ja',
    assetManagementGeneral: 'ja',
    accountsCustodyAccountsSafes: 'ja',
    mailAndTelecommunications: 'ja',
  });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', {
    instrument: 'custodianship-declaration',
    form: 'schriftlich',
    storageLocation: 'Ordner „Vorsorge", hinter der Vollmacht',
    dateOfLastChange: '2023-09-12',
    proposedPerson: refBar(p.nichte),
    whatTheCareArrangementShould: 'Wenn es je nötig wird: zu Hause bleiben, solange es geht. '
      + 'Keine Verlegung in ein Heim ausserhalb Berlins.',
  });
  setze('advanceCare', {
    dailyRoutineActivities: 'Morgens waschen, nicht duschen. Der Pflegedienst kommt zweimal täglich.',
    dietSpecialRequirements: 'Salzarm. Keine Sondenernährung, wenn keine Aussicht auf Besserung.',
    aidsEGWalkerHearingAid: 'Rollator, Badewannenlift, Hausnotruf — Verzeichnis liegt im Ordner „Pflege"',
    contentOfTheAdvanceDirective: 'ja',
    contentOfTheAdvanceDirective2: 'ja',
  });

  /* ── Wohnen, Finanzen, Krisenvorsorge — knapp, aber nicht leer ──────────── */
  setze('housing', {
    ownedOrRented: 'miete',
    landlordPropertyManagement: { override: 'Wohnungsgenossenschaft Lindenhof eG' },
    tenancyAgreementStorage: 'Ordner „Wohnen", vorne',
  });
  /* Das Girokonto läuft über die LISTE `konten`, nicht über ein Flachfeld — derselbe Weg,
     den Auftrag 1 der Kette für die IBAN-Prüfziffer benutzt. */
  V.listenEintragHinzufuegen('finance', 'accounts', {
    accountType: 'girokonto', institution: { override: 'Berliner Sparkasse' }, note: 'Rente und Pflegegeld',
  });

  return { p, inst };
}

module.exports = { PASSWORT, MENSCHEN, INSTITUTIONEN, UNTERLAGEN_OHNE_FELD, baueDepot };
