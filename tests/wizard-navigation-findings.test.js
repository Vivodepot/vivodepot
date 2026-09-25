'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Wizard-Navigation — iOS-Gerätetest 05.07. (Bug 1 + Bug 2)
   ────────────────────────────────────────────────────────────────────────
   Bug 1: „Abbrechen" kehrt in den AUSGANGSBEREICH zurück (der Sektor, aus dem
   der Wizard gestartet wurde), nicht auf die Welcome-Page.
   Bug 2: Kein Scroll-/Fokus-Sprung nach oben auf Folge-Schritten — die Sicht
   bleibt am Schritt (Struktur-Pin; das echte Scroll-/Fokus-Verhalten ist nur
   am Gerät prüfbar, im headless DOM-Stub ist focus()/scroll ein no-op).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function editierbareSitzung() {
  const { V, document, src } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('B');
  V.Modus._setzeIntern('anker');   // darfBearbeiten() === true → wizardLauf läuft
  return { V, document, src };
}

test('[Bug 1] Wizard-Abbrechen kehrt in den Ausgangsbereich zurück — nicht auf Welcome', async () => {
  const { V } = await editierbareSitzung();
  V.oeffneSektor('advanceCare');                     // Ausgangsbereich (NICHT SEKTOREN[0]=identity)
  assert.equal(V.getViewState().aktiverSektorId, 'advanceCare');
  V.wizardLauf('pvwiz');                             // Wizard aus advanceCare starten
  assert.equal(V.getViewState().aktiveAnsicht, 'wizard', 'Wizard läuft');
  V.wizardAbbrechen();
  const vs = V.getViewState();
  assert.equal(vs.aktiveAnsicht, 'sektor', 'zurück in der Sektor-Sicht, nicht Welcome (aktiveAnsicht)');
  assert.equal(vs.aktiverSektorId, 'advanceCare', 'genau der Ausgangsbereich — nicht auf SEKTOREN[0] zurückgeworfen');
});

test('[Bug 1] Abbrechen aus einem anderen Ausgangsbereich landet dort — nicht immer identitaet', async () => {
  const { V } = await editierbareSitzung();
  V.oeffneSektor('health');
  V.wizardLauf('anamwiz');
  V.wizardAbbrechen();
  assert.equal(V.getViewState().aktiverSektorId, 'health', 'Ausgangsbereich health erhalten');
});

test('[Bug 2] renderContent nimmt den Wizard vom aggressiven Scroll-nach-oben aus (nur Schritt 1)', () => {
  const { src } = ladeKern();
  // Struktur-Pin: der finale Scroll-Reset läuft NICHT pauschal — für den Wizard nur bei Schritt 0.
  assert.match(src, /if\s*\(aktiveAnsicht === 'wizard'\)\s*\{\s*if\s*\(wizardSchrittIndex === 0\)\s*inhaltNachObenScrollen\(\);/,
    'Wizard-Guard vor dem pauschalen inhaltNachObenScrollen');
});

test('[Bug 2] renderWizard fokussiert das Schritt-Feld auf Folge-Schritten (Sicht bleibt am Schritt)', () => {
  const { src } = ladeKern();
  // Struktur-Pin: Fokus nur bei idx>0, auf ein Feld in .wizard-eingabe.
  assert.match(src, /if\s*\(idx > 0 && c\.querySelector\)/, 'Fokus-Block nur auf Folge-Schritten');
  assert.match(src, /querySelector\('input, select, textarea'\)/, 'fokussiert das Eingabefeld');
});
