'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Der Abschluss-Knopf steht am letzten SICHTBAREN Schritt, nicht am letzten
   in der Reihe („Die zwei roten E2E-Proben", 17.08.2026, Zug 2)
   ────────────────────────────────────────────────────────────────────────
   DER FUND, den diese Probe festhält: `wizardWeiter` navigiert seit
   U2-ADR-102 über `wizardSichtbareIndizes` — der Knopf-Text wurde damals
   nicht mitgezogen und las weiter `idx === def.schritte.length - 1`.

   Seit A247 (`c634f81`) trägt pvwiz zwei Schlussschritte, die ohne
   hinterlegten Verweis verborgen sind. Damit stand am letzten sichtbaren
   Schritt „Weiter", und der Klick darauf beendete den Assistenten: der Knopf
   versprach eine weitere Frage und schloss statt dessen ab. Für die Bürgerin
   ist das ein gebrochenes Versprechen an der empfindlichsten Stelle des
   Laufs; für die E2E-Abnahme war es ein Timeout ohne Diagnose.

   Die Fortschrittsanzeige („Schritt X von Y") zählte schon immer NUR die
   sichtbaren Schritte (`wizardFortschritt`) — sie ist die Quelle, aus der
   der Knopf jetzt mitliest. Kein zweiter Sichtbarkeits-Durchlauf.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

function knopfText(k) {
  const html = String(k.document.getElementById('content').innerHTML || '');
  const m = html.match(/id="wiz-weiter">([^<]*)</);
  return m ? m[1] : null;
}

// Bis zum letzten sichtbaren Schritt vorrücken, ohne ihn zu verlassen.
function bisZumLetztenSichtbaren(V, wizardId) {
  const def = V.WIZARD_BY_ID[wizardId];
  const sichtbar = V.wizardSichtbareIndizes(def);
  const ziel = sichtbar[sichtbar.length - 1];
  let n = 0;
  while (V.getWizardState().wizardSchrittIndex < ziel && n++ < 200) V.wizardWeiter();
  assert.equal(V.getWizardState().wizardSchrittIndex, ziel, 'am letzten sichtbaren Schritt angekommen');
  return { def, sichtbar, ziel };
}

test('pvwiz: der letzte SICHTBARE Schritt trägt „Fertig", obwohl zwei Schritte dahinter verborgen sind', async () => {
  const k = await frischMitDepot();
  const { V } = k;
  V.wizardLauf('pvwiz');
  const { def, sichtbar, ziel } = bisZumLetztenSichtbaren(V, 'pvwiz');

  // Vorbedingung — ohne sie liefe die Probe leer: es MUSS verborgene Schritte hinter dem
  // letzten sichtbaren geben, sonst prüft sie den trivialen Fall.
  assert.ok(sichtbar.length < def.schritte.length,
    'Vorbedingung: pvwiz hat verborgene Schritte (ohne hinterlegten Verweis)');
  assert.ok(ziel < def.schritte.length - 1,
    'Vorbedingung: der letzte sichtbare Schritt ist NICHT der letzte in der Reihe');

  V.renderWizard();
  assert.equal(knopfText(k), V.STRINGS.wizFertig,
    'der Knopf sagt „Fertig", weil der Klick den Assistenten abschliesst');
});

test('pvwiz: ein Schritt davor sagt weiterhin „Weiter" (die Probe ist nicht pauschal)', async () => {
  const k = await frischMitDepot();
  const { V } = k;
  V.wizardLauf('pvwiz');
  const { sichtbar, ziel } = bisZumLetztenSichtbaren(V, 'pvwiz');
  const vorletzter = sichtbar[sichtbar.indexOf(ziel) - 1];
  V.wizardZurueck();
  assert.equal(V.getWizardState().wizardSchrittIndex, vorletzter, 'einen sichtbaren Schritt zurück');
  V.renderWizard();
  assert.equal(knopfText(k), V.STRINGS.wizWeiter, 'vorletzter sichtbarer Schritt: „Weiter"');
});

test('pvwiz: der Klick am letzten sichtbaren Schritt schliesst wirklich ab — Wort und Wirkung fallen zusammen', async () => {
  const k = await frischMitDepot();
  const { V } = k;
  V.wizardLauf('pvwiz');
  bisZumLetztenSichtbaren(V, 'pvwiz');
  V.renderWizard();
  const wort = knopfText(k);
  V.wizardWeiter();
  const zu = V.getWizardState().aktiverWizardId == null;
  assert.equal(wort, V.STRINGS.wizFertig, 'der Knopf hat den Abschluss angekündigt');
  assert.ok(zu, 'und der Klick hat den Assistenten geschlossen');
});

test('ein Assistent ohne verborgene Schritte bleibt unverändert: „Fertig" am letzten Schritt', async () => {
  const k = await frischMitDepot();
  const { V } = k;
  // Kontrolle gegen die Gegenrichtung: irgendein Assistent, bei dem heute ALLE Schritte
  // sichtbar sind — dort muss der letzte Schritt weiterhin „Fertig" tragen.
  const kandidat = V.WIZARDS.find(w =>
    V.wizardSichtbareIndizes(w).length === w.schritte.length && w.schritte.length > 1);
  assert.ok(kandidat, 'Vorbedingung: es gibt einen Assistenten ohne verborgene Schritte');
  V.wizardLauf(kandidat.id);
  bisZumLetztenSichtbaren(V, kandidat.id);
  V.renderWizard();
  assert.equal(knopfText(k), V.STRINGS.wizFertig, kandidat.id + ': letzter Schritt trägt „Fertig"');
});
