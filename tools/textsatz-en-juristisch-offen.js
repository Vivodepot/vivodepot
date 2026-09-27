'use strict';
/* textsatz-en-juristisch-offen.js — die Luecke wird GEZAEHLT, nicht gefuellt
   (U2-ADR-333, 06.09.2026)
   ---------------------------------------------------------------------------
   U2-ADR-333 hat die Wortlaute der Vorsorge-Dokumente ueberschreibbar gemacht:
   Patientenverfuegung, Vorsorgevollmacht, Betreuungsverfuegung, KI-Verfuegung
   und die zwei BMJ-Schrittkataloge. Der Mechanismus traegt, im Rundlauf in
   beide Richtungen gemessen.

   WAS FEHLT, IST NICHT DER MECHANISMUS, SONDERN DIE UEBERSETZUNG — und sie ist
   nicht die Arbeit einer Sitzung. Es sind Rechtstexte in Dokumenten, die eine
   Buergerin einer Behoerde vorlegt:

     "Ich bin mir des Inhalts und der Konsequenzen meiner darin getroffenen
      Entscheidungen bewusst."
     "Auf keinen Fall soll zum Betreuer/zur Betreuerin bestellt werden: {namen}."

   Eine englische Fassung davon, die kein Jurist gesehen hat, waere schlimmer
   als keine: sie saehe amtlich aus.

   DARUM DIESE LISTE. Sie ist kein Freibrief, sondern ein RUECKSTAND mit einer
   Zahl daran — dieselbe Bauform wie das Rueckstands-Register aus U2-ADR-322.
   Der EN-Waechter zieht diese Kennungen ab und prueft sie getrennt:

     - jede hier gefuehrte Kennung MUSS im eingebauten Satz existieren
       (sonst ist der Eintrag tot und verdeckt nichts mehr),
     - die Menge darf NIE wachsen,
     - und sie SOLL schrumpfen: wer eine Uebersetzung mit juristischem Blick
       einsetzt, streicht ihre Kennung hier.

   WAS DIESE LISTE NICHT TUT: sie laesst den Text nicht auf Deutsch
   zurueckfallen. Ein Rueckfall machte die Luecke unsichtbar; hier ist sie
   sichtbar und gezaehlt. */

const OFFEN_JURISTISCH = Object.freeze([
  'dok:patientenverfuegung#1.titel',
  'dok:patientenverfuegung#1/applicableSituations.einleitung',
  'dok:patientenverfuegung#2.titel',
  'dok:patientenverfuegung#3.titel',
  'dok:patientenverfuegung#3/placeOfTreatmentOrDeath.prefix',
  'dok:patientenverfuegung#3/supportFromThesePersons.satz',
  'dok:patientenverfuegung#3/supportFromChurchOrCommunity.satz',
  'dok:patientenverfuegung#3/hospiceSupport.text',
  'dok:patientenverfuegung#4.titel',
  'dok:patientenverfuegung#4/confidentialityWaiverFor.satz',
  'dok:patientenverfuegung#5.titel',
  'dok:patientenverfuegung#5/0.texte[0]',
  'dok:patientenverfuegung#5/0.texte[1]',
  'dok:patientenverfuegung#5/whoseViewMattersIfUnregulated.einleitung',
  'dok:patientenverfuegung#5/whoseViewMattersIfDeviatingWill.einleitung',
  'dok:patientenverfuegung#6.titel',
  'dok:patientenverfuegung#6/0.text',
  'dok:patientenverfuegung#6/1.text',
  'dok:patientenverfuegung#7.titel',
  'dok:patientenverfuegung#7/authorizedPersons.einleitung',
  'dok:patientenverfuegung#7/authorizedPersons.besprochenEinleitung',
  'dok:patientenverfuegung#7/authorizedPersons.rollenLabel',
  'dok:patientenverfuegung#7/proposedPerson.einleitung',
  'dok:patientenverfuegung#7/proposedPerson.besprochenEinleitung',
  'dok:patientenverfuegung#7/proposedPerson.rollenLabel',
  'dok:patientenverfuegung#10/1.texte[0]',
  'dok:patientenverfuegung#10/1.texte[1]',
  'dok:patientenverfuegung#10/1.texte[2]',
  'dok:patientenverfuegung#10/1.texte[3]',
  'dok:patientenverfuegung#10/informationOrCounsellingReceived.satz',
  'dok:patientenverfuegung#11.titel',
  // U2-ADR-343 (06.09.2026): das Deutsche IST belegt (steht woertlich im BMJ-PDF, gemessen) —
  // nur die englische Seite hat kein isoliertes Gegenstueck: die vier Unterpunkte enden im
  // Original alle vor "entscheiden.", die englische Fassung zieht die Bedeutung stattdessen
  // VORNE in die Einleitung ("Where necessary, he / she can make decisions"). Eine erfundene
  // Ergaenzung waere schlimmer als die belegte Luecke.
  'dok:vorsorgevollmacht#1/3.abschluss',
  // U2-ADR-343-Nachtrag (06.09.2026 abends), DEUTSCHE SEITE GESCHLOSSEN (12.09.2026, A558-
  // Zeremonie): trug eine ECHTE Wortlaut-Abweichung — nicht nur in VOLLMACHT_MODUL/
  // AB_WERK_TEXTSATZ_DE, sondern bereits in der SIGNIERTEN Quelle (STANDARD_VORLAGEN
  // ['vorsorgevollmacht'].wortlaut, U2-ADR-040). Die Korrektur lief ueber eine Signatur-
  // Zeremonie (Produktentscheidung, Treuhandschluessel, tools/basistemplate-zeremonie-automat.js) —
  // das Deutsche ist jetzt belegt (s. tests/u2-adr-343-vollmacht-vorsorge-pdf-beleg.test.js).
  // Bleibt TROTZDEM hier: diese Liste ist der ENGLISCHE Rueckstand, und fuer diese Kennung
  // existiert weiterhin KEINE juristisch gepruefte englische Uebersetzung — ein geaenderter
  // deutscher Wortlaut allein streicht keine Kennung (s. Kopfkommentar der Datei: nur wer
  // eine Uebersetzung MIT JURISTISCHEM BLICK einsetzt, darf sie entfernen).
  'dok:vorsorgevollmacht#4/customaryGiftsWithinWhatCare.text',
  // U2-ADR-396 (08.09.2026): die 28 dok:ki-verfuegung#…/kiKorpus#…sektion-Kennungen sind
  // HERAUSGEWANDERT, nicht mehr Rueckstand — Produktentscheidung: die KI-Verfuegung ist
  // kein amtliches Muster, Vivodepot ist hier Autor, nicht Traeger, darf also selbst
  // uebersetzen. Echte Uebersetzung in tools/textsatz-en-396-ki-verfuegung-daten.js.
  'pvBmj#applicableSituations.sektion',
  'pvBmj#ownAdditionalSituation.sektion',
  'pvBmj#lifeSustainingMeasures.sektion',
  'pvBmj#painAndSymptomTreatment.sektion',
  'pvBmj#acceptsLifeShorteningFromPain.sektion',
  'pvBmj#artificialNutritionAndHydration.sektion',
  'pvBmj#resuscitationInDescribedSituations.sektion',
  'pvBmj#emergencyDoctorNotified.sektion',
  'pvBmj#resuscitationInAllCases.sektion',
  'pvBmj#artificialVentilation.sektion',
  'pvBmj#dialysis.sektion',
  'pvBmj#antibiotics.sektion',
  'pvBmj#bloodAndBloodProducts.sektion',
  'pvBmj#placeOfTreatmentOrDeath.sektion',
  'pvBmj#supportFromThesePersons.sektion',
  'pvBmj#supportFromChurchOrCommunity.sektion',
  'pvBmj#hospiceSupport.sektion',
  'pvBmj#confidentialityWaiverFor.sektion',
  'pvBmj#whoseViewMattersIfUnregulated.sektion',
  'pvBmj#whoseViewMattersOtherPersonName.sektion',
  'pvBmj#whoseViewMattersIfDeviatingWill.sektion',
  'pvBmj#whoseViewMattersIfDeviatingOther.sektion',
  'pvBmj#personalValuesOrFurtherDocuments.sektion',
  // U2-ADR-337-Nachtrag (06.09.2026): VOLLMACHT_BMJ — Wortlaute mit Rechtsfolge,
  // der Schlüssel-Weg ist gebaut, kein Jurist hat eine englische Fassung gesehen.
  //
  // ACHT `vollmacht:*.label`-KENNUNGEN FEHLEN HIER GEGENÜBER DEM URSPRÜNGLICHEN 75er-BAU,
  // ABSICHTLICH ENTFERNT (06.09.2026, U2-ADR-344-Nachtrag, REBASE-MERGE): der BMJ-Umzug ins
  // Bündel (U2-ADR-344) übersetzte diese acht kurzen Feldnamen (kein Rechtstext) bereits nach
  // tools/textsatz-en-optionswerte-daten.js, weil VOLLMACHT_BMJ.steps' natives `feld.label`
  // ihre einzige Auflösungsquelle war und ins Bündel zog. Die Übersetzung war real, der
  // Rückstands-Eintrag daneben war stehen geblieben — hier nachgezogen (vm_aufenthalt_
  // bestimmen, vm_vermoegen_verwalten/-verfuegen/-verbindlichkeiten/-ausschluss, vm_gericht,
  // vm_tod_hinaus, vm_weitere_regelungen — alle acht `.label`, keines `.sektion`/`.frage`).
  // U2-ADR-369 (08.09.2026): SIEBZEHN `vollmacht:vm_*.label`-KENNUNGEN
  // FEHLEN HIER GEGENUEBER DEM VORHERIGEN BAU, ABSICHTLICH ENTFERNT --: "sie sind
  // Wegweiser, kein wirksamer Text. Der wirksame Text steht in vollmachtBmj#...frage,
  // bleibt deutsch und traegt den Vermerk." Wegweisend ins Englische uebersetzt, nach
  // tools/textsatz-en-optionswerte-daten.js verschoben (derselbe Weg wie die acht Labels
  // aus dem U2-ADR-344-Nachtrag oben) -- kein Rechtstext, keine Feststellung noetig.
  "vollmachtBmj#healthCareGeneralDecision.sektion",
  "vollmachtBmj#healthCareGeneralDecision.frage",
  "vollmachtBmj#healthCareMedicalProcedures.sektion",
  "vollmachtBmj#healthCareMedicalProcedures.frage",
  "vollmachtBmj#healthCareMedicalRecords.sektion",
  "vollmachtBmj#healthCareMedicalRecords.frage",
  "vollmachtBmj#healthCarePlacementDepriving.sektion",
  "vollmachtBmj#healthCarePlacementDepriving.frage",
  "vollmachtBmj#healthCareMeasuresDepriving.sektion",
  "vollmachtBmj#healthCareMeasuresDepriving.frage",
  "vollmachtBmj#healthCareCompulsoryMedical.sektion",
  "vollmachtBmj#healthCareCompulsoryMedical.frage",
  "vollmachtBmj#healthCareAdmissionToHospital.sektion",
  "vollmachtBmj#healthCareAdmissionToHospital.frage",
  "vollmachtBmj#determinePlaceOfResidence.sektion",
  "vollmachtBmj#determinePlaceOfResidence.frage",
  "vollmachtBmj#manageAnExistingTenancyWindUp.sektion",
  "vollmachtBmj#manageAnExistingTenancyWindUp.frage",
  "vollmachtBmj#concludeAndTerminateANew.sektion",
  "vollmachtBmj#concludeAndTerminateANew.frage",
  "vollmachtBmj#concludeAndTerminateHousingAnd.sektion",
  "vollmachtBmj#concludeAndTerminateHousingAnd.frage",
  "vollmachtBmj#representationWithAuthorities.sektion",
  "vollmachtBmj#representationWithAuthorities.frage",
  "vollmachtBmj#assetManagementGeneral.sektion",
  "vollmachtBmj#assetManagementGeneral.frage",
  "vollmachtBmj#disposeOfAssets.sektion",
  "vollmachtBmj#disposeOfAssets.frage",
  "vollmachtBmj#acceptPaymentsAndValuables.sektion",
  "vollmachtBmj#acceptPaymentsAndValuables.frage",
  "vollmachtBmj#enterIntoLiabilities.sektion",
  "vollmachtBmj#enterIntoLiabilities.frage",
  "vollmachtBmj#accountsCustodyAccountsSafes.sektion",
  "vollmachtBmj#accountsCustodyAccountsSafes.frage",
  "vollmachtBmj#customaryGiftsWithinWhatCare.sektion",
  "vollmachtBmj#customaryGiftsWithinWhatCare.frage",
  "vollmachtBmj#transactionsExpresslyExcluded.sektion",
  "vollmachtBmj#transactionsExpresslyExcluded.frage",
  "vollmachtBmj#mailAndTelecommunications.sektion",
  "vollmachtBmj#mailAndTelecommunications.frage",
  "vollmachtBmj#representationInCourt.sektion",
  "vollmachtBmj#representationInCourt.frage",
  "vollmachtBmj#mayGrantASubPowerOfAttorney.sektion",
  "vollmachtBmj#mayGrantASubPowerOfAttorney.frage",
  "vollmachtBmj#alsoProposeTheAuthorizedPerson.sektion",
  "vollmachtBmj#alsoProposeTheAuthorizedPerson.frage",
  "vollmachtBmj#appliesBeyondDeath.sektion",
  "vollmachtBmj#appliesBeyondDeath.frage",
  "vollmachtBmj#furtherProvisions.sektion",
  "vollmachtBmj#furtherProvisions.frage",
]);

module.exports = { OFFEN_JURISTISCH };
