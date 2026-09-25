'use strict';
/* ════════════════════════════════════════════════════════════════════════
   F3 Zug 3 — `art` auf die Instrument-Ebene zurückführen („F3",
   09.08.2026). `gesundheit`/`general` waren nie eigene Instrumente, sondern
   UMFANG — längst als 22 `vm_*`-Kästchen gebaut (U2-ADR-089). Migration,
   kein Verlust: jeder Bestandseintrag wird überführt, nicht gelöscht.

   `gesundheit` → art:'vorsorge' + die drei Gesundheitssorge-Kästchen
   (vm_gesundheit_entscheiden/-eingriffe/-schweigepflicht: 'ja') + alle vier
   Freiheitsentzug-Optionen (vm_gesundheit_freiheitsentzug) — das ist exakt der
   Umfang, den „Gesundheitsvollmacht" laut BMJ-Wortlaut (Abschnitt 1) meinte.

   `general` → art:'vorsorge' + ALLE 19 ja/nein-Kästchen + alle vier
   Freiheitsentzug-Optionen — „General" heißt vollumfänglich. Die zwei
   Freitext-Kästchen (vm_vermoegen_ausschluss, vm_weitere_regelungen) sind
   keine Vollmachtsgewährung, sondern optionale Notizen — bleiben unangetastet.

   `betreuung` bleibt UNVERÄNDERT stehen (Auftragswortlaut: „wird nicht
   geraten" — kein eindeutiges Ziel, ein falsch geratener Umfang wäre
   schlimmer als eine offene Frage). Das Schema trägt stattdessen einen
   sichtbaren Prüfhinweis (eigener Test, s. Feld-Definition).

   Additiv/idempotent wie jede Migration dieses Auftrags — ein bereits
   überführter Eintrag (art bereits 'vorsorge') bleibt unangetastet, ein
   bereits vom Menschen gesetztes vm_*-Feld wird NICHT überschrieben (nur
   Lücken werden gefüllt — Verwaisungsregel-Geist: kein stiller Wertverlust,
   auch keine stille Wertkorrektur).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[F3] Migration: art="gesundheit" → vorsorge + die drei Gesundheitssorge-Kästchen + alle vier Freiheitsentzug-Optionen', () => {
  const { V } = ladeKern();
  const alt = {
    schemaVersion: 47,
    sektoren: { vorsorge: { vorsorge_instrumente: [
      { id: 'v1', typ: 'vorsorgevollmacht', art: 'gesundheit', ort: 'Ordner Vorsorge' },
    ] } },
    menschen: [],
  };
  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(alt)));
  const e = d.sektoren.advanceCare.provisionInstruments[0];
  assert.equal(d.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
  assert.equal(e.typeOfPowerOfAttorney, 'vorsorge');
  assert.equal(e.artMigriertAus, 'gesundheit');
  assert.equal(e.healthCareGeneralDecision, 'ja');
  assert.equal(e.healthCareMedicalProcedures, 'ja');
  assert.equal(e.healthCareMedicalRecords, 'ja');
  // „Nachlese F8/M1" (11.08.2026), Zug 1: die Schema-53-Migration läuft NACH dieser
  // F3-Migration im selben depotNormalisieren()-Durchlauf und überführt das von F3 gefüllte
  // Array in die vier neuen ☐ja/☐nein-Felder — das alte Feld existiert am Ende nicht mehr.
  assert.equal(e.vm_gesundheit_freiheitsentzug, undefined, 'vom Schema-53-Schritt geräumt');
  assert.equal(e.healthCarePlacementDepriving, 'ja');
  assert.equal(e.healthCareMeasuresDepriving, 'ja');
  assert.equal(e.healthCareCompulsoryMedical, 'ja');
  assert.equal(e.healthCareAdmissionToHospital, 'ja');
  assert.equal(e.determinePlaceOfResidence, undefined, 'kein Gesundheitssorge-Umfang — bleibt leer');
  assert.equal(e.assetManagementGeneral, undefined);
  assert.equal(e.storageLocation, 'Ordner Vorsorge', 'Bestandswert bleibt unangetastet (Verwaisungsregel)');
});

test('[F3] Migration: art="general" → vorsorge + ALLE 19 ja/nein-Kästchen + Freiheitsentzug, Freitextfelder unangetastet', () => {
  const { V } = ladeKern();
  const alt = {
    schemaVersion: 47,
    sektoren: { vorsorge: { vorsorge_instrumente: [
      { id: 'v1', typ: 'vorsorgevollmacht', art: 'general' },
    ] } },
    menschen: [],
  };
  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(alt)));
  const e = d.sektoren.advanceCare.provisionInstruments[0];
  assert.equal(e.typeOfPowerOfAttorney, 'vorsorge');
  assert.equal(e.artMigriertAus, 'general');
  const jaNein = [
    'healthCareGeneralDecision', 'healthCareMedicalProcedures', 'healthCareMedicalRecords',
    'determinePlaceOfResidence', 'manageAnExistingTenancyWindUp', 'concludeAndTerminateANew', 'concludeAndTerminateHousingAnd',
    'representationWithAuthorities', 'assetManagementGeneral', 'disposeOfAssets', 'acceptPaymentsAndValuables',
    'enterIntoLiabilities', 'accountsCustodyAccountsSafes', 'customaryGiftsWithinWhatCare',
    'mailAndTelecommunications', 'representationInCourt', 'mayGrantASubPowerOfAttorney', 'alsoProposeTheAuthorizedPerson', 'appliesBeyondDeath',
  ];
  assert.equal(jaNein.length, 19);
  for (const f of jaNein) assert.equal(e[f], 'ja', f + ' sollte "ja" sein');
  assert.equal(e.vm_gesundheit_freiheitsentzug, undefined, 'vom Schema-53-Schritt geräumt');
  assert.equal(e.healthCarePlacementDepriving, 'ja');
  assert.equal(e.healthCareMeasuresDepriving, 'ja');
  assert.equal(e.healthCareCompulsoryMedical, 'ja');
  assert.equal(e.healthCareAdmissionToHospital, 'ja');
  assert.equal(e.transactionsExpresslyExcluded, undefined, 'Freitext ist keine Vollmachtsgewährung, bleibt leer');
  assert.equal(e.furtherProvisions, undefined);
});

test('[F3] Migration: art="betreuung" bleibt UNVERÄNDERT (kein Raten — Auftragswortlaut)', () => {
  const { V } = ladeKern();
  const alt = {
    schemaVersion: 47,
    sektoren: { vorsorge: { vorsorge_instrumente: [
      { id: 'v1', typ: 'vorsorgevollmacht', art: 'betreuung', ort: 'Schublade' },
    ] } },
    menschen: [],
  };
  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(alt)));
  const e = d.sektoren.advanceCare.provisionInstruments[0];
  assert.equal(e.typeOfPowerOfAttorney, 'betreuung', 'unverändert — nicht migriert');
  assert.equal(e.artMigriertAus, undefined);
  assert.equal(e.healthCareGeneralDecision, undefined, 'kein geratener Umfang');
  assert.equal(e.storageLocation, 'Schublade');
});

test('[F3] Migration: art="vorsorge"/"bank" bleiben unangetastet (kein Migrationsbedarf)', () => {
  const { V } = ladeKern();
  const alt = {
    schemaVersion: 47,
    sektoren: { vorsorge: { vorsorge_instrumente: [
      { id: 'v1', typ: 'vorsorgevollmacht', art: 'vorsorge' },
      { id: 'v2', typ: 'vorsorgevollmacht', art: 'bank', zusatz: 'Sparkasse' },
    ] } },
    menschen: [],
  };
  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(alt)));
  assert.equal(d.sektoren.advanceCare.provisionInstruments[0].typeOfPowerOfAttorney, 'vorsorge');
  assert.equal(d.sektoren.advanceCare.provisionInstruments[0].artMigriertAus, undefined);
  assert.equal(d.sektoren.advanceCare.provisionInstruments[1].typeOfPowerOfAttorney, 'bank');
  assert.equal(d.sektoren.advanceCare.provisionInstruments[1].morePreciseDescription, 'Sparkasse');
});

test('[F3] Migration ist idempotent — ein zweiter Lauf ändert nichts mehr', () => {
  const { V } = ladeKern();
  const alt = { schemaVersion: 47, sektoren: { vorsorge: { vorsorge_instrumente: [
    { id: 'v1', typ: 'vorsorgevollmacht', art: 'gesundheit' },
  ] } }, menschen: [] };
  const einmal = V.depotNormalisieren(JSON.parse(JSON.stringify(alt)));
  const zweimal = V.depotNormalisieren(JSON.parse(JSON.stringify(einmal)));
  assert.deepEqual(zweimal.sektoren.advanceCare.provisionInstruments[0], einmal.sektoren.advanceCare.provisionInstruments[0]);
});

test('[F3] Migration überschreibt ein bereits abweichend gesetztes vm_*-Feld NICHT (nur Lücken werden gefüllt)', () => {
  const { V } = ladeKern();
  const alt = {
    schemaVersion: 47,
    sektoren: { vorsorge: { vorsorge_instrumente: [
      { id: 'v1', typ: 'vorsorgevollmacht', art: 'gesundheit', vm_gesundheit_eingriffe: 'nein' },
    ] } },
    menschen: [],
  };
  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(alt)));
  const e = d.sektoren.advanceCare.provisionInstruments[0];
  assert.equal(e.healthCareMedicalProcedures, 'nein', 'bewusst abweichender Bestandswert bleibt stehen');
  assert.equal(e.healthCareGeneralDecision, 'ja', 'Lücke wird trotzdem gefüllt');
});

test('[F3] Migration betrifft nur typ="vorsorgevollmacht" — andere Instrumente/Listen unangetastet', () => {
  const { V } = ladeKern();
  const alt = {
    schemaVersion: 47,
    sektoren: { vorsorge: { vorsorge_instrumente: [
      { id: 'v1', typ: 'will', art: 'gesundheit' },   // art wäre hier ohnehin fachfremd — defensiv geprüft
    ] } },
    menschen: [],
  };
  const d = V.depotNormalisieren(JSON.parse(JSON.stringify(alt)));
  const e = d.sektoren.advanceCare.provisionInstruments[0];
  assert.equal(e.typeOfPowerOfAttorney, 'gesundheit', 'nur vorsorgevollmacht-Einträge werden migriert');
  assert.equal(e.artMigriertAus, undefined);
});
