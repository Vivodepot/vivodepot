'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Die Ereignis-Achse" (13.08.2026), Zug 3 — Die Auslöser.
   ────────────────────────────────────────────────────────────────────────
   Familienstandswechsel: beim Setzen von identity.maritalStatus markiert,
   wenn ein ehepartner referenziert ist. Tod einer referenzierten Person:
   BEREITS gemessen (Kommentar vivodepot.html:8127, Zug 0 Punkt 5 eines
   früheren Auftrags) — kein Sterbedatum-/„verstorben"-Feld im Datenmodell,
   also kein automatischer Auslöser. Nicht Gegenstand dieser Tests (Nicht-
   Fall, nichts zu bauen). Betreuungsbeginn: ein neuer betreuerbestellung-
   Eintrag markiert die vorhandenen Instrumente (§ 1820 Abs. 1 BGB).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'ereignis-zug3-pw';

async function depot() {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  return V;
}

test('[Zug3·Familienstand] sektorFeldSetzen(identitaet,familienstand) markiert die Vollmacht des referenzierten Ehepartners — bei einem ECHTEN Wechsel', async () => {
  const V = await depot();
  const partnerId = V.personHinzufuegen({ name: 'Jonas Partner' });
  V.sektorFeldSetzen('identity', 'maritalStatus', 'verh');   // Erstbefüllung — kein Ereignis
  V.sektorFeldSetzen('people', 'spouseOrCivilPartner', { ref: partnerId });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', authorizedPersons: [{ ref: partnerId }] });
  const zeile = V.getData().sektoren.advanceCare.provisionInstruments[0];
  assert.equal(V.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', zeile.id).length, 0, 'Vorbedingung: noch kein Anlass');

  V.sektorFeldSetzen('identity', 'maritalStatus', 'getrennt');   // der echte Wechsel

  const [doc] = V.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', zeile.id);
  assert.ok(doc, 'ROT ERWARTET, wenn falsch: der Familienstandswechsel muss ein Dokument erzeugt/markiert haben');
  assert.ok(doc.ereignisAnlaesse.some(a => a.typ === 'familienstand'));
});

test('[Zug3·Familienstand] die ERSTBEFÜLLUNG (undefined → Wert) ist KEIN Ereignis — echter Fund (Render-Charakterisierung schlug hier an)', async () => {
  const V = await depot();
  const partnerId = V.personHinzufuegen({ name: 'Jonas Partner' });
  V.sektorFeldSetzen('people', 'spouseOrCivilPartner', { ref: partnerId });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', authorizedPersons: [{ ref: partnerId }] });
  V.sektorFeldSetzen('identity', 'maritalStatus', 'verh');   // erstes Eintragen, kein Wechsel
  assert.equal((V.getData().dokumente || []).length, 0,
    'ROT ERWARTET, wenn falsch: die Erstbefüllung darf keinen Ereignis-Anlass erzeugen (kein Wechsel aus Leere)');
});

test('[Zug3·Familienstand] ohne referenzierten ehepartner (kein .ref, z. B. nur Freitext) passiert nichts — kein Wurf', async () => {
  const V = await depot();
  V.sektorFeldSetzen('identity', 'maritalStatus', 'verh');
  V.sektorFeldSetzen('people', 'spouseOrCivilPartner', { override: 'Nur ein Name, kein Register-Eintrag' });
  assert.doesNotThrow(() => V.sektorFeldSetzen('identity', 'maritalStatus', 'geschieden'));
  assert.equal((V.getData().dokumente || []).length, 0, 'kein Dokument aus dem Nichts erzeugt');
});

test('[Zug3·Betreuungsbeginn] ein neuer betreuerbestellung-Eintrag markiert die bestehende Vollmacht', async () => {
  const V = await depot();
  const bevollmaechtigterId = V.personHinzufuegen({ name: 'Anna Bevollmächtigte' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', authorizedPersons: [{ ref: bevollmaechtigterId }] });
  const vollmachtZeile = V.getData().sektoren.advanceCare.provisionInstruments[0];
  assert.equal(V.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', vollmachtZeile.id).length, 0);

  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'custodian-appointment' });

  const [doc] = V.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', vollmachtZeile.id);
  assert.ok(doc, 'ROT ERWARTET, wenn falsch: die Vollmacht muss durch den Betreuungsbeginn markiert sein');
  assert.ok(doc.ereignisAnlaesse.some(a => a.typ === 'betreuung'));
});

test('[Zug3·Betreuungsbeginn] die betreuerbestellung-Zeile selbst wird NICHT markiert (kein Selbstbezug)', async () => {
  const V = await depot();
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'custodian-appointment' });
  assert.equal((V.getData().dokumente || []).length, 0,
    'kein Dokument entsteht — die einzige Zeile ist die neue selbst, die ausgenommen ist');
});

test('[Zug3·Betreuungsbeginn] ein weiterer betreuerbestellung-Eintrag markiert Instrumente OHNE befülltes betreuung-Unterfeld nicht', async () => {
  const V = await depot();
  // Sorgerechtsverfügung trägt KEIN 'betreuung' in ihren Ereignissen (Registry: nur familienstand/tod) —
  // muss unberührt bleiben.
  const kindId = V.personHinzufuegen({ name: 'Kind Muster' });
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
    { instrument: 'guardian-nomination', proposedPerson2: { ref: kindId } });
  const srvZeile = V.getData().sektoren.advanceCare.provisionInstruments[0];
  V.listenEintragHinzufuegen('advanceCare', 'provisionInstruments', { instrument: 'custodian-appointment' });
  assert.equal(V.dokumenteFuerEintrag('advanceCare', 'provisionInstruments', srvZeile.id).length, 0,
    'Sorgerechtsverfügung reagiert nicht auf Betreuungsbeginn (nicht in ihren registrierten Ereignissen)');
});

test('[Zug3·Tod, Nicht-Fall] kein Sterbedatum-/„verstorben"-Feld im Datenmodell — bereits gemessen, hier nur bestätigt', async () => {
  const V = await depot();
  const alleFelder = V._ereignisAlleEntitaetPersonFelder();
  const verstorbenFeld = alleFelder.find(f => /verstorben|sterbedatum/i.test(f.feldId));
  assert.equal(verstorbenFeld, undefined,
    'Gegenprobe: taucht ein solches Feld künftig auf, ist die Tod-Messung neu zu bewerten (dieser Test wird dann bewusst rot).');
});

test('[Zug3·Familienstand] beide Schreibpfade verdrahtet (sektorFeldSetzen + bearbeitungSpeichern) — echter Fund: nur EINER war es zunächst', async () => {
  const { src } = ladeKern();
  // Muster wie U2-ADR-017 (tests/provenienz-name-bruecke.test.js): kernAPI.schreibBereich läuft
  // NICHT über sektorFeldSetzen — ein Hook allein deckt nur den programmatischen Weg
  // (Wizard/Import/Tests), nicht den echten „Bereich bearbeiten"-Klickweg. Playwright
  // (tests/e2e/ereignis-achse-abnahme.spec.js) fand genau das: ohne den zweiten Hook blieb die
  // Prüftermine-Sicht nach einem echten Familienstand-Edit leer.
  /* ANKER NACHGEZOGEN (Nachtrag „Vier Häufungen", 17.08.2026): beide Pfade fragen jetzt die
     Rolle `familienstandFeld`, die der Bereich mitbringt, statt `sektorId === 'identitaet'`.
     Aussage unverändert; darunter der Beleg, dass die Rolle auf dasselbe Feld zeigt. */
  assert.ok(/bereichFeldHatRolle\(sektorId, feldId, 'familienstandFeld'\)/.test(src), 'granularer Pfad (sektorFeldSetzen)');
  assert.ok(/bereichFeldHatRolle\(stempelNs, f, 'familienstandFeld'\)/.test(src), 'Inline-Pfad (bearbeitungSpeichern/_faltContainer)');
  const { V } = ladeKern();
  assert.equal(V.bereichRolle('identity', 'familienstandFeld'), 'maritalStatus',
    'die Rolle zeigt auf genau das Feld, das der Anker früher wörtlich nannte');
});
