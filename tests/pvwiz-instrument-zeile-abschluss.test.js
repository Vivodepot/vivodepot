'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — „pvwiz und die ADR-Kollision" (10.08.2026), Zug 1.

   pvwiz.ziel bekommt liste+typ wie kiwiz — ABER anders als kiwiz bleiben alle
   27 amtlichen BMJ-Felder FLACH (jeder Schritt trägt jetzt sein EIGENES
   `schritt.ziel: {sektor:'advanceCare'}`, das das Wizard-Standardziel je Schritt
   überschreibt, s. wizardSchrittZiel()). Der Dokument-Generator liest weiter
   unverändert aus data.sektoren.advanceCare (golden-fixture-abgesichert,
   tests/fixtures/pv-golden.json) — das ist der Baustein/Sachverhalt-Schnitt
   aus der Entscheidungsvorlage (Weg 1): Bausteine bleiben flach, der
   SACHVERHALT „es gibt eine Patientenverfügung" entsteht jetzt generisch bei
   wizardAbschluss() (nicht mehr nur, wenn zufällig der Organspende-Schritt
   beantwortet wurde — der W-8-Zug-3-Fix deckte nur diesen einen Fall).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function frisch() {
  const { V } = ladeKern();
  await V.depotAnlegen('pvwiz-zeile-pw-999');
  V.akteurSelbstErklaeren('Maria');
  return V;
}

function pvZeile(V) {
  const vorsorge = V.getData().sektoren.advanceCare || {};
  const liste = vorsorge.provisionInstruments || [];
  return liste.find((r) => r && r.instrument === 'living-will');
}

function schrittIndex(V, feldId) {
  return V.WIZARD_BY_ID.pvwiz.schritte.findIndex((s) => s.feld.id === feldId);
}

test('[pvwiz-Zeile] wizardAbschluss legt die Instrument-Zeile an, auch OHNE Organspende beantwortet', async () => {
  const V = await frisch();
  V.wizardLauf('pvwiz');
  // Ein BMJ-Feld weit VOR dem Organspende-Schritt beantworten — bewusst NICHT organspende.
  const i = schrittIndex(V, 'lifeSustainingMeasures');
  assert.ok(i >= 0, 'Testvoraussetzung: lifeSustainingMeasures ist ein pvwiz-Schritt');
  const r = V.wizardSchrittSetzen('pvwiz', i, 'unterlassen');
  assert.equal(r.ok, true);
  assert.equal(pvZeile(V), undefined, 'vor Abschluss noch keine Zeile — nur der Abschluss legt sie an');

  V.wizardAbschluss();

  const zeile = pvZeile(V);
  assert.ok(zeile, 'nach Abschluss existiert die Instrument-Zeile, unabhängig von Organspende');
  assert.equal(zeile.organDonation, undefined, 'Organspende wurde nicht beantwortet — kein Wert erfunden');
});

test('[pvwiz-Zeile] die BMJ-Bausteine bleiben FLACH — der Generator sieht sie unverändert unter vorsorge', async () => {
  const V = await frisch();
  V.wizardLauf('pvwiz');
  const i = schrittIndex(V, 'lifeSustainingMeasures');
  V.wizardSchrittSetzen('pvwiz', i, 'unterlassen');
  V.wizardAbschluss();

  assert.equal(V.getData().sektoren.advanceCare.lifeSustainingMeasures, 'unterlassen',
    'flaches Feld bleibt an seinem alten Ort — der Generator liest von hier');
  const zeile = pvZeile(V);
  assert.equal(zeile.lifeSustainingMeasures, undefined,
    'der Baustein wandert NICHT in die Zeile — nur der Sachverhalt "vorhanden" tut das');
});

test('[pvwiz-Zeile] leerer Abschluss (kein einziger Schritt beantwortet) legt KEINE Zeile an', async () => {
  const V = await frisch();
  V.wizardLauf('pvwiz');
  V.wizardAbschluss();
  assert.equal(pvZeile(V), undefined, 'ein sofortiges "Fertig" ohne jede Eingabe erzeugt keine Behauptung');
});

test('[pvwiz-Zeile] zweimaliger Abschluss legt keine zweite Zeile an (Dedup-by-typ)', async () => {
  const V = await frisch();
  V.wizardLauf('pvwiz');
  const i = schrittIndex(V, 'lifeSustainingMeasures');
  V.wizardSchrittSetzen('pvwiz', i, 'unterlassen');
  V.wizardAbschluss();
  const nachErstemAbschluss = V.getData().sektoren.advanceCare.provisionInstruments.length;

  V.wizardLauf('pvwiz');
  V.wizardSchrittSetzen('pvwiz', i, 'ausschoepfen');
  V.wizardAbschluss();

  assert.equal(V.getData().sektoren.advanceCare.provisionInstruments.length, nachErstemAbschluss,
    'kein zweiter Datensatz desselben Typs');
});

test('[pvwiz-Zeile] Organspende-Seiteneffekt (W-8 Zug 3) bleibt unverändert erhalten, aktualisiert dieselbe Zeile', async () => {
  const V = await frisch();
  V.wizardLauf('pvwiz');
  const i = schrittIndex(V, 'organDonationDecision');
  V.wizardSchrittSetzen('pvwiz', i, 'zustimmung');
  V.wizardAbschluss();

  const zeile = pvZeile(V);
  assert.ok(zeile, 'die Zeile existiert');
  assert.equal(zeile.organDonation, 'ja', 'zustimmung → ja, unverändert seit W-8 Zug 3');
});
