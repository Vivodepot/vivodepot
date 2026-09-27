'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   vollmacht-vorsorge-amtliche-uebersetzung.js — „die Sprach-Spur",
   Punkt 1 (06.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Die englischen Gegenstücke der 35 (von 39) mechanisch belegten Kennungen —
   wörtlich aus den amtlichen zweisprachigen BMJ-Formularen abgeschrieben
   (tests/fixtures/bmj/*.pdf, Stand 15.01.2023), NICHT übersetzt. Jede Zeile
   ist gegen `tools/vollmacht-vorsorge-pdf-beleg-messen.js` geprüft — Beleg
   ist Pflicht, s. `tests/u2-adr-343-vollmacht-vorsorge-pdf-beleg.test.js`.

   OHNE ERFUNDENE INTERPUNKTION: wo das PDF keinen Schlusspunkt setzt (z. B.
   `mayGrantASubPowerOfAttorney.text`), steht hier auch keiner — ein hinzugefügter Punkt
   stünde nicht mehr wörtlich im Beleg und würde die eigene Probe brechen.
   Ausnahme: die vier `.satz`-Kennungen mit Platzhalter — sie bekommen wie im
   Deutschen einen abschließenden Punkt NACH dem eingesetzten Namen, das ist
   UNSERE Satzform, nicht die des Formulars (das endet dort mit Doppelpunkt vor
   dem Eintragsfeld) — dieselbe Begründung wie beim deutschen Pendant.

   NACHTRAG (06.09.2026 abends): `customaryGiftsWithinWhatCare.text` stand hier
   kurzzeitig auf dem amtlichen Kurztext, per Entscheidung "der Text
   des Formulars muss 1:1 sein" — dann zurückgenommen, als sich zeigte, dass
   `VOLLMACHT_MODUL`/`AB_WERK_TEXTSATZ_DE` nur EXTRAKTE der SIGNIERTEN Quelle
   sind (`STANDARD_VORLAGEN['vorsorgevollmacht'].wortlaut`, U2-ADR-040), und
   genau diese signierte Quelle noch die längere, erläuternde Fassung trägt.
   Ohne die signierte Quelle mitzuziehen, wären Extrakt und Signatur
   auseinandergelaufen. Die Korrektur läuft jetzt über eine Signatur-Zeremonie
   (Produktentscheidung, Treuhandschlüssel) als EIGENER, kleiner Zug NACH dieser
   Landung — s. Kommentar an `VOLLMACHT_MODUL` in vivodepot.html. Bis dahin
   bleibt die Kennung im Rückstand, wie ursprünglich gemessen.

   ZWEI KENNUNGEN FEHLEN GEGENÜBER DEN 39 IM RÜCKSTAND, ABSICHTLICH:
     dok:betreuungsverfuegung#1.titel, #4.titel
       eigene Gliederungs-Überschriften, nie amtlicher Wortlaut — gehören in
       die normale Übersetzungsmenge, nicht hierher (keine Belegpflicht).
   ZWEI WEITERE FEHLEN AUS ANDEREN GRÜNDEN:
     dok:vorsorgevollmacht#1/3.abschluss ("entscheiden.")
       das Deutsche steht im PDF, aber Englisch hat KEIN isoliertes Gegenstück
       — die vier Unterpunkte enden im Original alle vor "entscheiden.", die
       englische Fassung zieht die Bedeutung stattdessen VORNE in die
       Einleitung ("Where necessary, he / she can make decisions"). Eine
       erfundene Wortlaut-Ergänzung wäre schlimmer als eine belegte Lücke —
       bleibt darum im Rückstand, nicht weil das Deutsche unbelegt wäre,
       sondern weil das Englische es strukturell nicht sein kann.
     dok:vorsorgevollmacht#4/customaryGiftsWithinWhatCare.text
       echte Wortlaut-Abweichung der SIGNIERTEN Quelle vom amtlichen Formular
       — Korrektur läuft über eine Signatur-Zeremonie, s. o. Bleibt bis dahin
       befristet im Rückstand, mit benanntem Ende (die Zeremonie), nicht als
       endgültige Feststellung. */
const VOLLMACHT_VORSORGE_AMTLICHE_UEBERSETZUNG = Object.freeze({
  'dok:vorsorgevollmacht#1.titel': '1. Medical treatment / personal care',
  'dok:vorsorgevollmacht#1/healthCareGeneralDecision.text':
    'He / she can make decisions in all questions regarding my medical treatment and all details regarding my outpatient or (semi-)inpatient care. He / she is authorized to assert my wishes as specified in an advance healthcare directive.',
  'dok:vorsorgevollmacht#1/healthCareMedicalProcedures.text':
    'In particular, he / she can give, refuse or withdraw consent to me receiving medical examinations, treatment or operations, even if there is a risk that I will die or my health will suffer serious or long-term damage if the measure is carried out, withheld or discontinued (Section 1829 (1) and (2) of the German Civil Code).',
  'dok:vorsorgevollmacht#1/healthCareMedicalRecords.text':
    'He / she is entitled to see my medical records and to authorize their disclosure to third parties. I hereby release all the doctors and other medical staff involved in my care from the obligation to maintain professional confidentiality towards the trusted person acting as my agent. Furthermore, this person is entitled to release all the doctors and other medical staff involved in my care from the obligation to maintain professional confidentiality towards third parties.',
  'dok:vorsorgevollmacht#1/3.einleitung': 'Where necessary, he / she can make decisions',
  // #1/3.abschluss ("entscheiden.") — absichtlich nicht hier, s. Kopfkommentar.
  'dok:vorsorgevollmacht#2.titel': '2. Residence and housing matters',
  'dok:vorsorgevollmacht#2/determinePlaceOfResidence.text': 'He / she can determine the place of my residence.',
  'dok:vorsorgevollmacht#2/manageAnExistingTenancyWindUp.text':
    'He / she can administer the rights and obligations arising from the tenancy agreement for my housing (including termination of the agreement) and liquidate the contents of my household.',
  'dok:vorsorgevollmacht#2/concludeAndTerminateANew.text': 'He / she can conclude or terminate a new tenancy agreement.',
  'dok:vorsorgevollmacht#2/concludeAndTerminateHousingAnd.text':
    'He / she can conclude or terminate an agreement in accordance with the Act on Residential Homes and Care Contracts (previously the Act on Residential Accommodation).',
  'dok:vorsorgevollmacht#3.titel': '3. Authorities',
  'dok:vorsorgevollmacht#3/representationWithAuthorities.text':
    'He/she can represent me in dealings with the authorities, insurance companies, pension providers and social benefit agencies. This includes the granting of consent under data protection law.',
  'dok:vorsorgevollmacht#4.titel': '4. Property and financial assets',
  'dok:vorsorgevollmacht#4/assetManagementGeneral.text':
    'He / she can manage my assets, carrying out any legal acts and transactions in Germany and abroad, making and receiving any declarations, and filing, amending and withdrawing applications. In particular, this includes:',
  'dok:vorsorgevollmacht#4/disposeOfAssets.text': 'having rights of disposal over assets of any kind (please also refer to Note 1 below)',
  'dok:vorsorgevollmacht#4/acceptPaymentsAndValuables.text': 'receiving payments and objects of value',
  'dok:vorsorgevollmacht#4/enterIntoLiabilities.text': 'entering into obligations (please also refer to Note 1 below)',
  'dok:vorsorgevollmacht#4/accountsCustodyAccountsSafes.text':
    'making declarations of intent with regard to my accounts, depots and safes. He / she can represent me in transactions with credit institutions (please also refer to Note 2 below)',
  // customaryGiftsWithinWhatCare.text — absichtlich nicht hier, befristet im Rückstand bis zur
  // Signatur-Zeremonie, s. Kopfkommentar.
  'dok:vorsorgevollmacht#4/transactionsExpresslyExcluded.satz': 'He / she should not be able to perform the following transactions: {text}.',
  'dok:vorsorgevollmacht#4/7.text':
    'Notes:\n\n1. Make sure you have the required type of authorization for real estate transactions, commercial business, or taking out consumer loans (see Number 2.1 / 6 of the “Betreuungsrecht” brochure on guardianship law).\n\n2. In order to arrange a lasting power of attorney (LPA) for banking matters, please use the account / depot LPA provided by your bank or building society. This LPA entitles the authorized person (the “agent”) to carry out any transactions immediately related to the management of the account or depot. The agent is not granted any powers that are unnecessary for taking care of normal business (e. g. the conclusion of financial forward contracts). It is essential that you sign the account / depot LPA form on the premises of your bank or building society; this will allow you to dispel any subsequent doubts about the validity of the authorization. If you are unable to visit the premises of your bank or building society, ask them about other possible solutions.',
  'dok:vorsorgevollmacht#5.titel': '5. Post and telecommunications',
  'dok:vorsorgevollmacht#5/mailAndTelecommunications.text':
    'In the course of exercising this LPA, he / she can receive, open and read any post addressed to me. This also applies to e-mail. Furthermore, he / she can make decisions about telecommunications, including all forms of electronic communication. He / she can make any declarations required in this regard (e. g. the signing or termination of contracts).',
  'dok:vorsorgevollmacht#6.titel': '6. Representation in court',
  'dok:vorsorgevollmacht#6/representationInCourt.text': 'He / she can represent me in court and take procedural steps of any kind.',
  'dok:vorsorgevollmacht#7.titel': '7. Substitute power of attorney',
  'dok:vorsorgevollmacht#7/mayGrantASubPowerOfAttorney.text': 'He / she can delegate the power of attorney to another person',
  'dok:vorsorgevollmacht#8.titel': '8. Guardianship directive',
  'dok:vorsorgevollmacht#8/alsoProposeTheAuthorizedPerson.text':
    'If legal guardianship is necessary despite the existence of this LPA, I request that the trusted person designated above is appointed as my guardian.',
  'dok:vorsorgevollmacht#9.titel': '9. Validity after death',
  'dok:vorsorgevollmacht#9/appliesBeyondDeath.text': 'The LPA continues to be applicable after my death.',
  'dok:vorsorgevollmacht#10.titel': '10. Further arrangements',

  'dok:betreuungsverfuegung#1/proposedPerson.satz': 'The following person should be appointed as my guardian: {namen}.',
  'dok:betreuungsverfuegung#2/alternatePerson.satz':
    'If the above-mentioned person cannot be appointed as my guardian, the following person should be appointed: {namen}.',
  'dok:betreuungsverfuegung#3/whoShouldNotBeAppointed.satz':
    'Under no circumstances should the following person be appointed as my guardian: {namen}.',
  'dok:betreuungsverfuegung#4/whatTheCareArrangementShould.satz':
    'With regard to the management of my affairs by my guardian, I have the following wishes: {text}.',
});
module.exports = { VOLLMACHT_VORSORGE_AMTLICHE_UEBERSETZUNG };
