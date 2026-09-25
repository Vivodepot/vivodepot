'use strict';
/* ════════════════════════════════════════════════════════════════════════
   F4 — sechs Felder tragen zwei Sachverhalte, erst trennen (Zug 3). Auftrag
   „F4 — die siebzehn verbliebenen Katalogfelder" (11.08.2026),
   Entscheidungsvorlage-Gruppe 2, AMENDIERT durch
   „Nachtrag 1 zu F4 und Befund Doppelte Kataloge" (11.08.2026, Teil 1):
   heirat_ehevertrag legt KEINEN neuen Güterstand-Katalog an — der existiert
   bereits (`identitaet.gueterstand`) — nur die Ehevertrag-Frage entsteht.

   Migrationsregel Zug 3 (bewusst einfacher als Zug 1): der alte Wert trägt
   IMMER zwei Sachverhalte gemischt in einem Freitext — kein Versuch, ihn zu
   trennen (Auftrag: „Es wird nicht geraten, welcher Teil welcher ist").
   Der GESAMTE Alt-Wert zieht ins `_frueher`-Rettungsfeld, beide neuen Felder
   starten leer.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');

test('[F4-Zug3] fuehrerschein: Klassen (mehrfachauswahl) + eigenes Ablageort-Feld', () => {
  const { V } = ladeKern();
  const klassen = V.feldDefFuer('mobility', 'drivingLicenceClasses');
  assert.equal(klassen.typ, 'mehrfachauswahl');
  assert.ok(klassen.optionen.some((o) => o.wert === 'B'));
  assert.ok(klassen.optionen.some((o) => o.wert === 'C1'), 'C1 (fünf Jahre Gültigkeit) muss auswählbar sein');
  const ort = V.feldDefFuer('mobility', 'drivingLicenceStorageLocation');
  assert.equal(ort.typ, 'text');
});

test('[F4-Zug3] schulabschluss: Abschluss (auswahl) + Jahr, schule_name unverändert', () => {
  const { V } = ladeKern();
  const abschluss = V.feldDefFuer('education', 'schoolLeavingQualification');
  assert.equal(abschluss.typ, 'auswahl');
  assert.ok(abschluss.optionen.some((o) => o.label === 'Abitur'));
  const jahr = V.feldDefFuer('education', 'schoolLeavingQualificationYear');
  assert.equal(jahr.typ, 'text');
  const schule = V.feldDefFuer('education', 'school');
  assert.equal(schule.typ, 'text');
});

test('[F4-Zug3] studium: Abschlussart (auswahl) + Fach/Hochschule/Jahr', () => {
  const { V } = ladeKern();
  const studium = V.feldDefFuer('education', 'universityDegreeType');
  assert.equal(studium.typ, 'auswahl');
  assert.ok(studium.optionen.some((o) => o.label === 'Master'));
  for (const f of ['universitySubject', 'universityInstitution', 'universityYear']) {
    assert.equal(V.feldDefFuer('education', f).typ, 'text', f);
  }
});

test('[F4-Zug3] heirat_ehevertrag wird NUR Ehevertrag-Frage — gueterstand NICHT dupliziert (Nachtrag 1)', () => {
  const { V } = ladeKern();
  const sit = V.SITUATION_BY_ID.hauskauf;
  const feldIds = sit.bloecke.flatMap((b) => b.eintraege).filter((e) => e.feld && typeof e.feld === 'object').map((e) => e.feld.id);
  assert.ok(feldIds.includes('heirat_ehevertrag_vorhanden'));
  assert.ok(feldIds.includes('heirat_ehevertrag_ort'));
  assert.ok(!feldIds.includes('heirat_ehevertrag'), 'alter gemischter Schlüssel entfällt');
  assert.ok(!feldIds.some((id) => id.startsWith('heirat_gueterstand') || id === 'gueterstand'),
    'kein zweiter Güterstand-Katalog im Situationsblatt');
  // Güterstand wird aus dem Bereich gezogen, nicht neu erfasst.
  const pulls = sit.bloecke.flatMap((b) => b.eintraege).filter((e) => e.quelle);
  assert.ok(pulls.some((p) => p.quelle === 'identity' && p.feld === 'maritalPropertyRegime'),
    'Güterstand wird als Verweis auf identity.maritalPropertyRegime gezogen, nicht kopiert');
});

test('[F4-Zug3] pflegegeld: Leistungsart (auswahl) + Betrag — KEIN zweites Pflegegrad-Feld', () => {
  const { V } = ladeKern();
  const leistungsart = V.feldDefFuer('socialInsurance', 'longTermCareAllowanceTypeOf');
  assert.equal(leistungsart.typ, 'auswahl');
  assert.ok(leistungsart.optionen.some((o) => o.label === 'Kombinationsleistung'));
  const betrag = V.feldDefFuer('socialInsurance', 'longTermCareAllowanceAmount');
  assert.equal(betrag.typ, 'text');
  // Pflegegrad existiert bereits eigenständig (pflwiz) — F4 legt keinen zweiten an.
  const pflegegradDefs = V.SEKTOR_BY_ID.socialInsurance.sektionen
    .flatMap((s) => s.felder).filter((f) => f.id.startsWith('longTermCareAllowance')
      && !['longTermCareAllowanceTypeOf', 'longTermCareAllowanceAmount', 'longTermCareAllowanceEarlier'].includes(f.id));
  assert.equal(pflegegradDefs.length, 0, 'kein zweites Pflegegrad-Feld an pflegegeld');
});

test('[F4-Zug3] bav_name bleibt Freitext (Anbietername), bav_durchfuehrungsweg ist neu und additiv', () => {
  const { V } = ladeKern();
  const name = V.feldDefFuer('finance', 'companyPensionSchemeBav');
  assert.equal(name.typ, 'text', 'bav_name bleibt Anbietername, kein Katalog');
  const weg = V.feldDefFuer('finance', 'companyPensionScheme');
  assert.equal(weg.typ, 'auswahl');
  assert.ok(weg.optionen.some((o) => o.label === 'Pensionskasse'));
});

test('[F4-Zug3] Migration: gemischter Alt-Wert zieht vollständig ins Rettungsfeld, nichts geraten', () => {
  const { V } = ladeKern();
  const roh = {
    schemaVersion: 56,
    sektoren: {
      mobilitaet: { fuehrerschein: 'B, BE — Klasse, Ablageort Geldbeutel' },
      sozialversicherung: { pflegegeld: 'Pflegegeld Pflegegrad 3, 599 EUR/Monat; Kombinationsleistung' },
    },
    situationen: { hauskauf: { heirat_ehevertrag: 'kein Ehevertrag → Zugewinngemeinschaft; sonst Ablageort notieren' } },
  };
  const migriert = V.depotNormalisieren(roh);
  assert.deepEqual(migriert.sektoren.mobility.drivingLicenceClasses, []);
  assert.equal(migriert.sektoren.mobility.drivingLicenceStorageLocation, '');
  assert.equal(migriert.sektoren.mobility.drivingLicenceEarlierEntry, 'B, BE — Klasse, Ablageort Geldbeutel');
  assert.equal(migriert.sektoren.socialInsurance.longTermCareAllowanceTypeOf, '');
  // longTermCareAllowanceAmount ist ein brandneues Feld, nie befüllt — undefined ist hier
  // gleichwertig zu '' (der Renderer liest beides als leer), keine explizite Default-Zuweisung nötig.
  assert.ok(!migriert.sektoren.socialInsurance.longTermCareAllowanceAmount);
  assert.equal(migriert.sektoren.socialInsurance.longTermCareAllowanceEarlier,
    'Pflegegeld Pflegegrad 3, 599 EUR/Monat; Kombinationsleistung');
  assert.equal(migriert.situationen.hauskauf.heirat_ehevertrag_vorhanden, '');
  assert.equal(migriert.situationen.hauskauf.heirat_ehevertrag_frueher,
    'kein Ehevertrag → Zugewinngemeinschaft; sonst Ablageort notieren');
  // Der Bestandswert nennt einen Güterstand — er wird NICHT nach identity.maritalPropertyRegime geschrieben.
  assert.equal(migriert.sektoren.identity, undefined,
    'die Migration rührt identity.maritalPropertyRegime nicht an — kein automatisches Schreiben');
  assert.ok(migriert.schemaVersion >= 57);
});

test('[F4-Zug3] echter Kern, real gefunden (Kampagne Ebene 16): ein gültiger Katalogwert übersteht ERNEUTES depotNormalisieren — nicht nur die erste Migration', () => {
  // depotNormalisieren() läuft bei JEDEM depotLaden() unconditionally erneut — auch auf einem
  // Depot, das längst auf Schema 57 steht. schulabschluss/studium/pflegegeld behalten denselben
  // Feld-Namen für Alt-Text UND Katalogwert (beides ein String) — ohne Options-Abgleich hätte ein
  // zweiter Normalisierungs-Lauf einen bereits gültigen Katalogwert wieder als „unmigrierten
  // Alt-Text" gelesen und stumm ins Rettungsfeld geräumt (real gefunden: Kampagne Ebene 16,
  // Sicherung/Wiederherstellung-Rundlauf, „abitur" -> ""). fuehrerschein (mehrfachauswahl, Array)
  // ist von dieser Fehlerklasse nicht betroffen — Array vs. String unterscheidet schon am Typ.
  const { V } = ladeKern();
  const einmalMigriert = {
    schemaVersion: 57,
    sektoren: {
      bildung: { schulabschluss: 'abitur', studium: 'diplom' },
      sozialversicherung: { pflegegeld: 'kombinationsleistung' },
    },
  };
  const zweimal = V.depotNormalisieren(V.depotNormalisieren(einmalMigriert));
  assert.equal(zweimal.sektoren.education.schoolLeavingQualification, 'abitur');
  assert.equal(zweimal.sektoren.education.universityDegreeType, 'diplom');
  assert.equal(zweimal.sektoren.socialInsurance.longTermCareAllowanceTypeOf, 'kombinationsleistung');
  assert.equal(zweimal.sektoren.education.schoolLeavingQualification2, undefined);
});
