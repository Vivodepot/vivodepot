'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Gebwiz Kind und Sub-Depot" (11.08.2026), Zug 4 — Regel 18.
   ────────────────────────────────────────────────────────────────────────
   Kernaussage des Auftrags: „Der Abschluss legt einen Eintrag in „Kinder und
   Schutzbefohlene" an — NUR, wenn mindestens ein Name vorliegt. Ohne Namen
   entsteht nichts; keine leere Zeile, kein Platzhalter, kein „Unbenannt"."
   Diese Datei ist die geforderte Probe, die ROT wird, wenn diese Schranke
   fällt — real gesehen: die Guard-Zeile `if (!name) return null;`
   (`_gebwizKindEintragErstellen`, vivodepot.html) auskommentiert, Lauf rot,
   zurückgesetzt, Lauf grün. Kein Fixture-Vergleich, echte Funktionsprobe.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function offenesDepot() {
  const { V } = ladeKern();
  await V.depotAnlegen('Werkzeug-Anker-2026!');
  V.akteurSelbstErklaeren('Bauwerkzeug');
  return V;
}

test('_gebwizKindEintragErstellen ohne Namen: kein Eintrag, keine leere Zeile', async () => {
  const V = await offenesDepot();
  V.sektorFeldSetzen('people', 'guidedBirthEntryChildsNameNot', '');
  V.sektorFeldSetzen('people', 'guidedBirthEntryDateOfBirthNot', '2027-01-01');
  V.sektorFeldSetzen('people', 'guidedBirthEntryRelationship', 'leiblich');
  const ergebnis = V._gebwizKindEintragErstellen();
  assert.equal(ergebnis, null, 'ohne Namen liefert die Funktion null');
  const kinder = (V.getData().sektoren.people || {}).childrenAndDependants || [];
  assert.equal(kinder.length, 0, 'keine Zeile entsteht — auch mit gesetztem Geburtsdatum/Verhältnis');
});

test('_gebwizKindEintragErstellen mit Namen: genau ein Eintrag, Person trägt Geburtsdatum', async () => {
  const V = await offenesDepot();
  V.sektorFeldSetzen('people', 'guidedBirthEntryChildsNameNot', 'Mia Testfrau');
  V.sektorFeldSetzen('people', 'guidedBirthEntryDateOfBirthNot', '2027-03-15');
  V.sektorFeldSetzen('people', 'guidedBirthEntryRelationship', 'adoptiert');
  const ergebnis = V._gebwizKindEintragErstellen();
  assert.ok(ergebnis && ergebnis.idx >= 0, 'ein Index kommt zurück');
  const data = V.getData();
  const kinder = data.sektoren.people.childrenAndDependants;
  const eintrag = kinder[ergebnis.idx];
  assert.equal(eintrag.type, 'adoptiert');
  const person = data.menschen.find(p => p.id === eintrag.person.ref);
  assert.equal(person.birthDate, '2027-03-15');
  // Staging-Felder sind geräumt (kein Karteileichen-Risiko).
  assert.equal(data.sektoren.people.guidedBirthEntryChildsNameNot, '');
  assert.equal(data.sektoren.people.guidedBirthEntryDateOfBirthNot, '');
  assert.equal(data.sektoren.people.guidedBirthEntryRelationship, '');
});

test('_gebwizKindEintragErstellen ein zweites Mal mit demselben Namen: keine Dublette', async () => {
  const V = await offenesDepot();
  V.sektorFeldSetzen('people', 'guidedBirthEntryChildsNameNot', 'Mia Testfrau');
  const erster = V._gebwizKindEintragErstellen();
  V.sektorFeldSetzen('people', 'guidedBirthEntryChildsNameNot', 'Mia Testfrau');
  const zweiter = V._gebwizKindEintragErstellen();
  assert.equal(zweiter.idx, erster.idx, 'derselbe Eintrag, kein zweiter');
  assert.equal(V.getData().sektoren.people.childrenAndDependants.length, 1);
});
