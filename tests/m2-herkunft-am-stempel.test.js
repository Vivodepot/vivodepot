'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — M2: Jeder Eintrag weiß, woher er kam (Auftrag M2/S4, 09.08.2026,
   Zug 1)
   ────────────────────────────────────────────────────────────────────────
   Additiv am bestehenden Provenance-Stempel (U2-ADR-005): `eingabeArt`
   trug bisher nur den Wert 'import' (importAnwenden). Diese Probe belegt
   den zweiten Wert 'wizard' (+ wizardId) an allen drei Wizard-Zielformen
   (Sektor/Situation/Liste) — und dass ein rein manueller Eintrag weiterhin
   KEIN eingabeArt-Feld trägt (Rückwärtskompatibilität, kein Schema-Bump,
   „manuell" bleibt implizit über Abwesenheit, wie 'import' es vorher
   schon war gegenüber dem unmarkierten Rest).

   Nicht Gegenstand dieser Probe (bewusst, s. Bericht): listenEintragAktualisieren
   stempelt heute GAR NICHT (auch nicht bei manueller Eingabe) — eine
   vorbestehende Asymmetrie, hier nicht repariert.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[M2·1] situationFeldSetzen nimmt jetzt extra entgegen und stempelt es mit', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('M2-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const stempel = V.situationFeldSetzen('ausst-krisenvorsorge', 'irgendfeld', 'x', { eingabeArt: 'wizard', wizardId: 'testwiz' });
  assert.equal(stempel.eingabeArt, 'wizard');
  assert.equal(stempel.wizardId, 'testwiz');
});

test('[M2·2] manuelles sektorFeldSetzen (kein extra) trägt weiterhin KEIN eingabeArt — Rückwärtskompatibilität', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('M2-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const stempel = V.sektorFeldSetzen('identity', 'givenName', 'Elisabeth');
  assert.equal(stempel.eingabeArt, undefined, 'manuell bleibt implizit, wie bisher');
  assert.ok(stempel.akteur, 'Kernfelder (akteur/zeitpunkt) unverändert vorhanden');
  assert.ok(stempel.zeitpunkt);
});

test('[M2·3] Wizard-Schreibweg (wizardZielSetzen → sektorFeldSetzen) stempelt eingabeArt:"wizard" + wizardId', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('M2-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const def = { id: 'pvwiz', ziel: { sektor: 'advanceCare' } };
  const stempel = V.wizardZielSetzen(def, 'pv_situationen', ['sterbeprozess']);
  assert.equal(stempel.eingabeArt, 'wizard');
  assert.equal(stempel.wizardId, 'pvwiz');
});

test('[M2·4] Wizard-Schreibweg auf eine Situation stempelt ebenfalls eingabeArt:"wizard"', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('M2-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const def = { id: 'testwiz', ziel: { situation: 'ausst-krisenvorsorge' } };
  const stempel = V.wizardZielSetzen(def, 'testfeld', 'y');
  assert.equal(stempel.eingabeArt, 'wizard');
  assert.equal(stempel.wizardId, 'testwiz');
});

test('[M2·5] Wizard-Schreibweg auf eine Listen-Zeile (Neuanlage, typ-Diskriminante) stempelt eingabeArt:"wizard"', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('M2-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const def = { id: 'pvwiz', ziel: { sektor: 'advanceCare', liste: 'provisionInstruments', instrument: 'living-will' } };
  const stempel = V.wizardZielSetzen(def, 'zusatz', 'x');
  assert.equal(stempel.eingabeArt, 'wizard');
  assert.equal(stempel.wizardId, 'pvwiz');
  const d = V.getData();
  assert.equal(d.sektoren.advanceCare.provisionInstruments.length, 1, 'Zeile wurde tatsächlich angelegt');
});

test('[M2·6] Import-Weg bleibt unverändert bei eingabeArt:"import" (bestehendes Verhalten nicht verdrängt)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('M2-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const stempel = V.sektorFeldSetzen('identity', 'givenName', 'Elisabeth', { eingabeArt: 'import', quelle: 'xöv-melderegister' });
  assert.equal(stempel.eingabeArt, 'import');
  assert.equal(stempel.quelle, 'xöv-melderegister');
});

test('[M2·Regel18] ein Assistenten-Eintrag UND ein Von-Hand-Eintrag, beide gespeichert, beide mit unterscheidbarer Quelle', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('M2-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  // Von Hand:
  V.sektorFeldSetzen('identity', 'givenName', 'Elisabeth');
  // Vom Assistenten:
  V.wizardZielSetzen({ id: 'pvwiz', ziel: { sektor: 'identity' } }, 'familyName', 'Beispiel');
  const d = V.getData();
  const vonHand = d.urheberschaft.identity.givenName[0];
  const vomAssistenten = d.urheberschaft.identity.familyName[0];
  assert.equal(vonHand.eingabeArt, undefined);
  assert.equal(vomAssistenten.eingabeArt, 'wizard');
  assert.equal(vomAssistenten.wizardId, 'pvwiz');
  assert.notEqual(vonHand.eingabeArt, vomAssistenten.eingabeArt, 'real unterscheidbar, nicht nur behauptet');
});
