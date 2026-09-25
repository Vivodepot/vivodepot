'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Der Umzugs-Assistent liest nicht, was nebenan steht" (12.08.2026), Zug 1.

   Zug 0 (Erhebung, Bericht) fand: der Auftrag rahmt diesen Fall als Cross-Sektor —
   „ein Assistent müsste lesen, was in einem ANDEREN Bereich steht" —, aber am Mechanismus
   geprüft ist das NICHT der Fall. `wizardSchrittZiel` liest je Schritt sein EIGENES `ziel`,
   nicht das Wizard-Standardziel. `umzug_mietverhaeltnis` und `umzug_kuendigung` tragen
   bereits `ziel: {sektor:'housing'}` — GENAU der Bereich, in dem auch `wohnung_typ` steht.
   `verborgenWenn` greift hier schon heute, ohne jede Erweiterung — „was Du ohne Vorlage
   bauen darfst" (Auftragsvorgabe Zug 1).

   Wer als Eigentümerin einzieht, bekommt keine Fragen mehr zum Mietverhältnis/zur
   Kündigung — Negativ-Form (U2-ADR-102): nur bei AKTIV gesetztem `wohnung_typ:'eigentum'`
   verborgen, unbeantwortet bleibt sichtbar.

   `umzug_auszug`/`umzug_uebergabe` bleiben UNVERÄNDERT sichtbar — „ausziehen" und
   „Übergabe" gelten für Eigentümerinnen genauso wie für Mieterinnen, nur das Mietverhältnis
   selbst und dessen Kündigung sind mieterspezifisch.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function umzwizSchritt(V, feldId) {
  const def = V.WIZARD_BY_ID.umzwiz;
  return def.schritte.find(s => s.feld && s.feld.id === feldId);
}

test('[Umzwiz·Zug1] umzug_mietverhaeltnis und umzug_kuendigung tragen verborgenWenn wohnung_typ=eigentum', () => {
  const { V } = ladeKern();
  for (const feldId of ['tenancyTerminationHandover', 'noticeDate']) {
    const s = umzwizSchritt(V, feldId);
    assert.ok(s, feldId + ' existiert weiterhin als Schritt');
    assert.deepEqual(s.verborgenWenn, { feld: 'ownedOrRented', wert: 'eigentum' }, feldId);
  }
});

test('[Umzwiz·Zug1] umzug_auszug und umzug_uebergabe bleiben UNVERÄNDERT — gelten für Eigentum wie Miete', () => {
  const { V } = ladeKern();
  for (const feldId of ['moveOutDate', 'handoverDateNewHome']) {
    const s = umzwizSchritt(V, feldId);
    assert.equal(s.verborgenWenn, undefined, feldId + ' bleibt immer sichtbar');
  }
});

test('[Umzwiz·Zug1] wizardSchrittVerborgen: eigentum verbirgt, unbeantwortet bleibt sichtbar (Negativ-Form)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('umzwiz-2026!');
  V.akteurSelbstErklaeren('Tester');
  const def = V.WIZARD_BY_ID.umzwiz;
  const miet = umzwizSchritt(V, 'tenancyTerminationHandover');

  // unbeantwortet → sichtbar
  assert.equal(V.wizardSchrittVerborgen(def, miet), false, 'unbeantwortetes wohnung_typ verbirgt nicht');

  // miete → weiterhin sichtbar
  V.sektorFeldSetzen('housing', 'ownedOrRented', 'miete');
  assert.equal(V.wizardSchrittVerborgen(def, miet), false, 'wohnung_typ=miete: Schritt bleibt sichtbar');

  // eigentum → verborgen
  V.sektorFeldSetzen('housing', 'ownedOrRented', 'eigentum');
  assert.equal(V.wizardSchrittVerborgen(def, miet), true, 'wohnung_typ=eigentum: Schritt wird verborgen');

  // zurück auf miete → wieder sichtbar (kein Einbahn-Effekt)
  V.sektorFeldSetzen('housing', 'ownedOrRented', 'miete');
  assert.equal(V.wizardSchrittVerborgen(def, miet), false, 'zurück auf miete: Schritt wieder sichtbar');
});

test('[Umzwiz·Zug1] verborgenWenn liest aus DEMSELBEN Ziel-Bereich wie der Schritt selbst schreibt (kein Cross-Sektor nötig)', () => {
  const { V } = ladeKern();
  const def = V.WIZARD_BY_ID.umzwiz;
  const miet = umzwizSchritt(V, 'tenancyTerminationHandover');
  assert.deepEqual(V.wizardSchrittZiel(def, miet), { sektor: 'housing' }, 'der Schritt schreibt nach wohnen');
  // wohnung_typ selbst liegt im Schema-Sektor wohnen — derselbe Bereich, den der Schritt beschreibt.
  let gefunden = false;
  for (const sek of (V.SEKTOR_BY_ID.housing.sektionen || [])) {
    for (const f of (sek.felder || [])) if (f.id === 'ownedOrRented') gefunden = true;
  }
  assert.equal(gefunden, true, 'wohnung_typ ist im Sektor wohnen deklariert — derselbe Zusammenhang');
});
