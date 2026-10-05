'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — W-5 (Auftrag N1, 08.08.2026, Zug 2): Wizard-Instrument-Zeile
   ────────────────────────────────────────────────────────────────────────
   Teil A (Korpus-Freistellung, U2-ADR-089) bereits durch
   `tests/wizard-schreibziele.test.js` gedeckt — hier zusätzlich geprüft,
   dass die dortige Annahme („alle 29 pv_*-Felder sind NIRGENDS als
   Felddefinition vorhanden") weiterhin stimmt, sonst wäre die
   Korpus-Freistellung ein Loch, kein Fall.
   Teil B ist der reale, neue Fund dieses Auftrags: `pvwiz` bildet laut
   `WIZARD_DOKUMENT_MAP` das Instrument „Patientenverfügung" ab, legt aber
   nie eine `vorsorge_instrumente`-Zeile an — `kiwiz` (dieselbe Mechanik)
   tut es. Grundlinie enthält genau diesen einen bekannten Fall.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const {
  pvFestlegungenPruefen, pvFestlegungenLiteralImQuelltext, pvFestlegungenQuelltexte, wizardsOhneInstrumentZeile, gateBewerten,
} = require('../tools/w5-wizard-instrument-zeile-pruefen.js');

const GRUNDLINIE = require('../tools/w5-wizard-instrument-zeile-grundlinie.json');

/* Teil A, gedreht (27.09.2026, U2-ADR-440 löst U2-ADR-089 in diesem Punkt ab): die PV-Festlegungen SIND Felder des Bereichs
   Vorsorge — aber der Grund von 089 bleibt: sie entstehen AUSSCHLIESSLICH aus PV_BMJ.steps, nirgends steht eine literale
   Definition, weder im Kern noch in einem Bereichs-Template. */
test('[W-5·TeilA] die PV-Festlegungen sind Felder in living-will-decisions, abgeleitet aus PV_BMJ.steps — keine literale Definition, keine Doppelablage', () => {
  const { V } = ladeKern();
  assert.equal(V.PV_BMJ.steps.length, 30, 'Vorbedingung: die 30 Schritte des Assistenten');   // 29 → 30 (U2-ADR-459)
  assert.deepEqual(pvFestlegungenPruefen(V), { fehlen: [], anderswo: [], literal: [] });
  assert.deepEqual(pvFestlegungenLiteralImQuelltext(V, pvFestlegungenQuelltexte()), [],
    'eine literale Definition einer PV-Festlegung im Kern oder in einem Bereichs-Template — die zweite Quelle, die U2-ADR-089 verhindern wollte');
});

test('[W-5·TeilA·Rot-Beweis] eine von Hand eingefügte Felddefinition in living-will-decisions fällt — ebenso eine literale im Quelltext', () => {
  const { V } = ladeKern();
  const sektion = V.SEKTOR_BY_ID.advanceCare.sektionen.find((x) => x.id === 'living-will-decisions');
  const echt = sektion.felder[2];
  sektion.felder[2] = { id: echt.id, typ: echt.typ, label: 'von Hand', sensibel: true };
  try {
    assert.deepEqual(pvFestlegungenPruefen(V).literal, [echt.id], 'die von Hand eingefügte Definition muss gefunden werden');
  } finally { sektion.felder[2] = echt; }
  assert.deepEqual(pvFestlegungenPruefen(V).literal, [], 'Gegenprobe: zurückgesetzt ist sie wieder abgeleitet');
  const funde = pvFestlegungenLiteralImQuelltext(V, { 'tools/bereich-templates/x.json': '{ "id": "lifeSustainingMeasures", "typ": "auswahl" }', 'vivodepot.html': "felder: [{ id: 'artificialVentilation', typ: 'auswahl' }]" });
  assert.deepEqual(funde, ['tools/bereich-templates/x.json: lifeSustainingMeasures', 'vivodepot.html: artificialVentilation']);
  assert.deepEqual(pvFestlegungenLiteralImQuelltext(V, { 'vivodepot.html': "PV_BMJ.steps.find((x) => x.feld.id === 'lifeSustainingMeasures')" }), [],
    'Gegenprobe: ein Zugriff auf die Id ist keine Definition');
});

test('[W-5·TeilB] echter Kern: kein neuer instrument-loser Wizard gegen die Grundlinie', () => {
  const { V } = ladeKern();
  const funde = wizardsOhneInstrumentZeile(V);
  const { neu, rot } = gateBewerten(funde, GRUNDLINIE);
  assert.deepEqual(neu, []);
  assert.equal(rot, false);
});

// W-8 Zug 3 („W-8 Doppelerfassung", 09.08.2026): pvwiz legt seine Instrument-Zeile
// seither an (über einen gezielten Seiteneffekt am Organspende-Schritt, nicht über `def.ziel` —
// das bleibt flach, s. Kommentar in tools/w5-wizard-instrument-zeile-pruefen.js). Die Grundlinie
// ist damit leer — W-5 geht auf 0. Vorher stand hier „genau der eine bekannte Fall: pvwiz".
test('[W-5·TeilB] die Grundlinie ist leer — kein Wizard mehr ohne Instrument-Zeile bekannt (W-5 auf 0)', () => {
  assert.deepEqual(GRUNDLINIE, []);
});

test('[W-5·TeilB] kiwiz erfüllt die Bedingung — Positivmaßstab, sonst prüft der Wächter nichts', () => {
  const { V } = ladeKern();
  const w = V.WIZARDS.find((x) => x.id === 'kiwiz');
  assert.equal(w.ziel.liste, 'provisionInstruments');
  assert.equal(w.ziel.instrument, 'ki-verfuegung');
});

test('[W-5·Rotmachbarkeit] Positivkontrolle: ein gepflanzter Map-Eintrag ohne Instrument-Zeile wird gefunden', () => {
  const { V } = ladeKern();
  const VMitGepflanztemEintrag = Object.assign({}, V, {
    WIZARD_DOKUMENT_MAP: Object.assign({}, V.WIZARD_DOKUMENT_MAP, {
      anamwiz: { typ: 'will', sektorId: 'advanceCare' },   // anamwiz zielt real auf 'gesundheit', keine Instrument-Zeile
    }),
  });
  const funde = wizardsOhneInstrumentZeile(VMitGepflanztemEintrag);
  assert.ok(funde.some((f) => f.wizard === 'anamwiz' && f.typ === 'will'),
    'ein gepflanzter Map-Eintrag ohne passende Instrument-Zeile muss auffallen');
});

// W-8 Zug 3: pvwiz ist jetzt in SEITENEFFEKT_ERFUELLT (tools/w5-wizard-instrument-zeile-pruefen.js)
// und wird darum VOR der def.ziel-Prüfung übersprungen — der reale Kern bleibt funde-frei. Der
// Rotmachbarkeits-Beleg für die Ausnahme selbst steht in
// tests/w8-zug3-organspende-instrument-zeile.test.js (Ausnahme entfernt → pvwiz fällt wieder rot).
test('[W-5·Rotmachbarkeit] Negativkontrolle: derselbe Test ohne Pflanzung bleibt funde-frei', () => {
  const { V } = ladeKern();
  const funde = wizardsOhneInstrumentZeile(V);
  assert.deepEqual(funde.map((f) => f.wizard), []);
});
