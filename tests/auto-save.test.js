'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Auto-Save bei Bereichs-Wechsel (UX-Spec VII „Sie können jederzeit pausieren")
   ────────────────────────────────────────────────────────────────────────
   Vor jeder Navigations-Aktion (Sektor-Wechsel, Verwaltung, Modus-Wechsel,
   Depot speichern) werden offene Edit-Eingaben wie ein „Fertig"-Klick übernommen:
   gestempelt (U2-ADR-005), Code-Slot angelegt (U2-ADR-006), persistent in `data`.

   Sektor-frei geprüft:
     1) bearbeitungSpeichern() existiert und liefert false im Default-Zustand (kein Edit-Modus).
     2) oeffneSektor + oeffneVerwaltung sind als Funktionen exportiert (Navigations-Anker).
     3) Direkter sektorFeldSetzen-Pfad bleibt unberührt (das war die bisherige Disziplin).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('1) bearbeitungSpeichern ist eine Funktion und nop im Default-Zustand', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('test-pw');
  assert.equal(typeof V.bearbeitungSpeichern, 'function');
  // Default: bearbeitungAn=false → bearbeitungSpeichern liefert false, ohne zu werfen
  const out = V.bearbeitungSpeichern();
  assert.equal(out, false, 'nop ohne aktiven Edit-Modus');
});

test('2) Navigations-Anker (oeffneSektor + oeffneVerwaltung) bleiben aufrufbar', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('test-pw');
  assert.equal(typeof V.oeffneSektor,     'function');
  assert.equal(typeof V.oeffneVerwaltung, 'function');
  // Aufruf sollte nicht werfen (auch ohne offenen Edit-Zustand)
  assert.doesNotThrow(() => V.oeffneSektor('identitaet'));
  assert.doesNotThrow(() => V.oeffneVerwaltung());
});

test('3) Direkter sektorFeldSetzen-Pfad ist unberührt: stempelt + persistiert wie bisher', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('test-pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  assert.equal(V.getData().sektoren.identity.givenName, 'Maria');
  assert.equal(V.liesUrheberschaft('identity', 'givenName').length, 1);
  assert.equal(V.liesCode('identity', 'givenName'), null);
});
