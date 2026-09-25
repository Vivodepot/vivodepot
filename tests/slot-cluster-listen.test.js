'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Phase 4 · Teil 1 (U2-ADR-073) — fünf verstreute Slot-Gruppen → je EINE `liste`.
   Fahrzeuge (mobilitaet: auto1/2/_ausweis/_leasing), Kreditkarten (finanzen:
   kreditkarte1/2), Haustiere (identitaet: tier_*), Personen-Briefe (persoenliches:
   brief_1/2/3), Weitere Wohnungen (wohnen: zw_*, Hybrid — Hauptwohnung bleibt).
   Geprüft: Feld-Defs (liste + Unterfelder, Alt-Slots weg), Migration 34→35
   verlustfrei (stabile id, leere Werte weg, Alt-Schlüssel entfernt, idempotent),
   gekoppelte Singletons unangetastet (Hauptwohnung, Szenario-Briefe), B16-Nachzug
   (Fahrzeuge/Haustiere in Listen-Form; die anderen hatten keine Aliase).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function feld(V, sek, id) {
  return V.SEKTOR_BY_ID[sek].sektionen.flatMap(s => s.felder || []).find(f => f.id === id);
}
function migriere(V, sektorPatch) {
  const d = V.leeresDepot();
  d.schemaVersion = 34;
  for (const [sek, patch] of Object.entries(sektorPatch)) {
    d.sektoren[sek] = Object.assign({}, d.sektoren[sek], patch);
  }
  V.depotNormalisieren(d);
  return d;
}

/* ── Feld-Definitionen ───────────────────────────────────────────────────── */
test('Feld-Defs: fünf Listen mit den erwarteten Unterfeldern; Alt-Slots weg', () => {
  const { V } = ladeKern();
  const erwartet = {
    vehicles: ['mobility', 'registrationPlate,vehicleRegistrationDocument,leaseAgreementStorageLocation'],
    creditCards: ['finance', 'providerLast4Digits,validUntil'],
    pets: ['identity', 'petNameSpecies,emergencyCarePersonContact,vetNameContact,medication,otherNotes'],
    personalLettersWordsToPeople: ['personal', 'toWhom,words'],
    furtherHomes: ['housing', 'streetHouseNumber,postcodeCity,ownedOrRented,propertyManagement,landlordPhone,landlordEmail,serviceCharges,rentalDepositBankAmount,tenancyAgreementStorage,tenancyAgreementFixedTermUntil,specialLivingSituation'],
  };
  for (const [id, [sek, subIds]] of Object.entries(erwartet)) {
    const f = feld(V, sek, id);
    assert.ok(f, id + ' existiert in ' + sek);
    assert.equal(f.typ, 'liste', id + ' ist eine liste');
    assert.equal((f.unterFelder || []).map(u => u.id).join(','), subIds, id + ' Unterfelder');
  }
  // Alt-Slots existieren nirgends mehr als Feld.
  const alleFeldIds = [];
  for (const sid of Object.keys(V.SEKTOR_BY_ID)) {
    for (const sek of V.SEKTOR_BY_ID[sid].sektionen) for (const f of (sek.felder || [])) alleFeldIds.push(f.id);
  }
  for (const alt of ['auto1', 'auto2', 'auto1_ausweis', 'auto2_leasing', 'kreditkarte1', 'kreditkarte2', 'tier_name', 'tier_betreuung', 'brief_1', 'brief_2', 'brief_3', 'zw_strasse', 'zw_typ', 'zw_vermieter']) {
    assert.ok(!alleFeldIds.includes(alt), 'Alt-Slot ' + alt + ' entfernt');
  }
});

test('gekoppelte Singletons bleiben (Heuristik): Hauptwohnung + Szenario-Briefe unangetastet', () => {
  const { V } = ladeKern();
  // Hauptwohnung-Felder (wohnung_typ→Situationsblatt, umzug_mietverhaeltnis→umzwiz) bleiben Skalare.
  for (const id of ['ownedOrRented', 'landlordPropertyManagement', 'monthlyRentServiceCharges', 'rentalDepositBankAmount', 'tenancyTerminationHandover']) {
    const f = feld(V, 'housing', id);
    assert.ok(f && f.typ !== 'liste', 'Hauptwohnung-Feld ' + id + ' bleibt Singleton');
  }
  // Szenario-Briefe (drei speisen Situationsblätter) bleiben feste textarea-Felder.
  for (const id of ['letterForTheEmergencyDoctor', 'letterForTheHospitalScenario', 'letterForTheCareHomeAdmission', 'letterForTheDeathScenario']) {
    const f = feld(V, 'personal', id);
    assert.ok(f && f.typ === 'textarea', 'Szenario-Brief ' + id + ' bleibt fest');
  }
});

/* ── Migration 34→35 (verlustfrei) ───────────────────────────────────────── */
test('Migration: Fahrzeuge — auto1/_ausweis + auto2/_leasing → zwei Einträge, Slots weg', () => {
  const { V } = ladeKern();
  const d = migriere(V, { mobilitaet: { auto1: 'VW Golf, M-AB 1', auto1_ausweis: 'Handschuhfach', auto2: 'Skoda', auto2_leasing: 'Ordner Auto' } });
  assert.equal(d.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
  const liste = d.sektoren.mobility.vehicles;
  assert.equal(liste.length, 2);
  assert.equal(liste[0].registrationPlate, 'VW Golf, M-AB 1');
  assert.equal(liste[0].vehicleRegistrationDocument, 'Handschuhfach');
  assert.equal(liste[1].registrationPlate, 'Skoda');
  assert.equal(liste[1].leaseAgreementStorageLocation, 'Ordner Auto');
  assert.ok(liste.every(e => typeof e.id === 'string' && e.id.length > 0), 'stabile id');
  for (const k of ['auto1', 'auto2', 'auto1_ausweis', 'auto2_leasing']) assert.ok(!(k in d.sektoren.mobility), k + ' entfernt');
});

test('Migration: Kreditkarten/Briefe — leere Slots fallen weg', () => {
  const { V } = ladeKern();
  const d = migriere(V, { finanzen: { kreditkarte1: 'Visa …4521', kreditkarte2: '' }, persoenliches: { brief_1: 'An Anna', brief_2: '', brief_3: 'An Sarah' } });
  assert.equal(d.sektoren.finance.creditCards.length, 1, 'leere kreditkarte2 weg');
  assert.equal(d.sektoren.finance.creditCards[0].providerLast4Digits, 'Visa …4521');
  assert.equal(d.sektoren.personal.personalLettersWordsToPeople.length, 2, 'leerer brief_2 weg');
  assert.equal(d.sektoren.personal.personalLettersWordsToPeople[0].words, 'An Anna');
  assert.equal(d.sektoren.personal.personalLettersWordsToPeople[1].words, 'An Sarah');
});

test('Migration: Haustiere — der eine tier_*-Satz → ein Eintrag; leere Felder weg', () => {
  const { V } = ladeKern();
  const d = migriere(V, { identitaet: { tier_name: 'Felix, Katze', tier_futter: 'trocken 2x', tier_betreuung: '' } });
  const liste = d.sektoren.identity.pets;
  assert.equal(liste.length, 1);
  assert.equal(liste[0].petNameSpecies, 'Felix, Katze');
  assert.equal(liste[0].medication, 'trocken 2x');
  assert.ok(!('emergencyCarePersonContact' in liste[0]), 'leeres Feld nicht im Eintrag');
});

test('Migration: Weitere Wohnungen (Hybrid) — zw_*-Satz → ein Eintrag, ref erhalten; Hauptwohnung bleibt', () => {
  const { V } = ladeKern();
  const d = migriere(V, { wohnen: {
    wohnung_typ: 'miete', miete: '1.250 EUR',          // Hauptwohnung (Singleton) bleibt
    zw_strasse: 'Seestr 12', zw_plz_ort: '83209 Prien', zw_typ: 'eigentum', zw_vermieter: { ref: 'pV', override: '' },
  } });
  const w = d.sektoren.housing;
  assert.equal(w.ownedOrRented, 'miete', 'Hauptwohnung unberührt');
  assert.equal(w.monthlyRentServiceCharges, '1.250 EUR');
  assert.equal(w.furtherHomes.length, 1);
  assert.equal(w.furtherHomes[0].streetHouseNumber, 'Seestr 12');
  assert.equal(w.furtherHomes[0].ownedOrRented, 'eigentum');
  assert.deepEqual(w.furtherHomes[0].propertyManagement, { ref: 'pV', override: '' }, 'ref-Unterfeld erhalten');
  for (const k of Object.keys(w)) assert.ok(k.indexOf('zw_') !== 0, 'kein zw_-Rest: ' + k);
});

test('Migration: leere Slots → keine Liste; idempotent bei erneutem Lauf', () => {
  const { V } = ladeKern();
  const d = migriere(V, { finanzen: { kreditkarte1: '' }, identitaet: { tier_name: '' } });
  assert.ok(!('creditCards' in d.sektoren.finance), 'keine Liste ohne Daten');
  assert.ok(!('kreditkarte1' in d.sektoren.finance), 'leerer Slot dennoch entfernt');
  assert.ok(!('pets' in d.sektoren.identity));
  // Idempotenz: bereits migriert (Liste vorhanden) bleibt unverändert.
  const d2 = V.leeresDepot();
  d2.schemaVersion = 35;
  d2.sektoren.finanzen = Object.assign({}, d2.sektoren.finanzen, { kreditkarten: [{ id: 'x1', karte: 'Visa …1' }] });
  V.depotNormalisieren(d2);
  assert.equal(d2.sektoren.finance.creditCards.length, 1);
  assert.equal(d2.sektoren.finance.creditCards[0].id, 'x1', 'id nicht neu vergeben');
});

/* ── B16-Import-Nachzug (Fahrzeuge + Haustiere) ──────────────────────────── */
test('B16-Import: auto*/tier_* → Fahrzeug-/Haustier-Liste; kein Skalar, nichts in der Sammel-Notiz', () => {
  const { V } = ladeKern();
  const out = V._b16Felder({ data: { auto1: 'BMW, M-XY 9', auto1_ausweis: 'Handschuhfach', tier_name: 'Bello, Hund', tier_tierarzt: 'Dr. Vet' } });
  const fahr = out.listen.find(l => l.sektorId === 'mobility' && l.feldId === 'vehicles');
  assert.ok(fahr && fahr.eintraege.length === 1, 'Fahrzeug-Liste im Import');
  assert.equal(fahr.eintraege[0].registrationPlate, 'BMW, M-XY 9');
  assert.equal(fahr.eintraege[0].vehicleRegistrationDocument, 'Handschuhfach');
  const tiere = out.listen.find(l => l.sektorId === 'identity' && l.feldId === 'pets');
  assert.ok(tiere && tiere.eintraege.length === 1, 'Haustier-Liste im Import');
  assert.equal(tiere.eintraege[0].petNameSpecies, 'Bello, Hund');
  assert.equal(tiere.eintraege[0].vetNameContact, 'Dr. Vet');
  // Kein Skalar-Ziel, nichts in der Sammel-Notiz.
  assert.equal(out.felder.filter(f => /^(auto|tier_)/.test(f.feldId)).length, 0, 'kein Skalar-Feld');
  const notiz = out.felder.find(f => f.feldId === 'furtherDetails');
  assert.ok(!notiz || !/BMW|Bello|Dr\. Vet/.test(String(notiz.wert)), 'nicht in Sammel-Notiz');
});

/* ── Teil 2: „Wer hängt von mir ab?" (abhaengige_personen) → Liste ──────────── */
test('Teil 2: abhaengige_personen ist eine liste {wer · hinweis}; id bleibt (crossSektor-Anker)', () => {
  const { V } = ladeKern();
  const f = feld(V, 'personal', 'whoDependsOnMe');
  assert.ok(f, 'abhaengige_personen existiert');
  assert.equal(f.typ, 'liste');
  assert.equal((f.unterFelder || []).map(u => u.id).join(','), 'whoDependsOnYou,whatToBearInMind');
});

test('Teil 2 Migration 35→36: Freitext → EIN Eintrag {wer:<ganzer Text>} (keine ";"-Trennung); leer→weg', () => {
  const { V } = ladeKern();
  const d = migriere(V, { persoenliches: { abhaengige_personen: 'Mutter (87) im Pflegeheim; Katze Felix' } });
  assert.equal(d.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
  const liste = d.sektoren.personal.whoDependsOnMe;
  assert.ok(Array.isArray(liste) && liste.length === 1, 'ein Eintrag');
  assert.equal(liste[0].whoDependsOnYou, 'Mutter (87) im Pflegeheim; Katze Felix', 'ganzer Text erhalten, nicht getrennt');
  assert.ok(typeof liste[0].id === 'string' && liste[0].id.length > 0, 'stabile id');
  const leer = migriere(V, { persoenliches: { abhaengige_personen: '   ' } });
  assert.ok(!('whoDependsOnMe' in leer.sektoren.personal), 'leer → Feld entfällt');
});

test('Teil 2: crossSektor-Projektion bleibt registriert + rendert die Liste typ-generisch', () => {
  const { V } = ladeKern();
  // Der Anmelder ist beim Boot registriert (feld:'whoDependsOnMe', ziel:'people').
  const reg = V.CROSS_SEKTOR_FELDER.find(e => e.quelle === 'personal' && e.feld === 'whoDependsOnMe' && e.ziel === 'people');
  assert.ok(reg, 'crossSektor-Anmeldung unverändert (id bleibt)');
  // Der Projektions-Pfad rendert über feldWertHTML mit der Feld-Def → Liste sauber, kein rohes Array.
  const f = feld(V, 'personal', 'whoDependsOnMe');
  const html = V.feldWertHTML(f, [{ id: 'x', whoDependsOnYou: 'Mutter (87)', whatToBearInMind: 'im Pflegeheim' }]);
  assert.ok(html.includes('Mutter (87)') && html.includes('im Pflegeheim'), 'beide Werte projiziert');
  assert.ok(!html.includes('[') && !html.includes('{'), 'kein rohes Array/JSON');
});

// KERN-BEFUND (s. Abschlussbericht des Umbaus, nicht Fixture-Sache): der b16-Zweig in
// vivodepot.html prueft `hasOwnProperty(d, 'whoDependsOnMe')` (NEUER Name), liest den Wert
// aber weiterhin aus `d.abhaengige_personen` (ALTER Name) — mit KEINER Eingabe-Kombination
// (alt/alt, alt/neu, neu/neu) liefert `_b16Felder` hier einen Treffer. Bleibt bewusst rot.
test('Teil 2 B16: Freitext → fachgerechter Listen-Eintrag {wer}; kein Skalar-Ziel', () => {
  const { V } = ladeKern();
  const out = V._b16Felder({ data: { abhaengige_personen: 'Mutter (87); Katze Felix' } });
  const l = out.listen.find(x => x.sektorId === 'personal' && x.feldId === 'whoDependsOnMe');
  assert.ok(l && l.eintraege.length === 1, 'Listen-Eintrag im Import');
  assert.equal(l.eintraege[0].wer, 'Mutter (87); Katze Felix');
  assert.equal(out.felder.filter(x => x.feldId === 'whoDependsOnMe').length, 0, 'kein Skalar-Ziel mehr');
});
