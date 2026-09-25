'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   VD-CR-L3 — Wächter für drei Sprachleck-Reparaturen ohne eigene Probe
   ────────────────────────────────────────────────────────────────────────────
   Befund L3 (code-review-74-sprachleck-ae0f75b2-2026-09-16.md:74, MITTEL,
   Bestandsaufnahme notierte-befunde-bestandsaufnahme-2026-09-18.md): drei
   Reparaturen (modulKarteStatus, instrumentZeileOptionen, flowPersonRegisterNeu —
   STRINGS.instrumentVorhanden/STRINGS.refNeuePersonOption statt hartkodiertem
   deutschen Literal) hatten keinen Wächter. GEMESSEN (18.09.2026, am Kanon
   dceab851): jede der drei Zeilen einzeln auf ihr Literal zurückgedreht, die
   einzigen vier Testdateien gefahren, die die Funktionsnamen überhaupt
   erwähnen (tests/erbschein-modul-mechanik.test.js, tests/regal-sprungziele.
   test.js, tests/bild-c-regal-projektion.test.js, tests/bereich-stellen-
   register.test.js) plus tests/textsatz-en-ueberall.test.js und tests/
   textsatz-en-modul-erzeugen.test.js — 66 von 66 bleiben grün. Der Befund war
   am 18.09.2026 noch offen, nicht nur am 16.09. Diese Datei ist der
   nachgetragene Wächter.
   ════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
// S1 (20.09.2026, U2-ADR-426): gemessen wird bei aktivem Englisch — das Gerüst trägt keinen englischen Satz mehr, darum das englische Standardprodukt; Assertions unverändert.
process.env.VD_TEST_PRODUKT = 'privat-en';
const { ladeKern } = require('./load-kern.js');

test('[VD-CR-L3·Rot-Beweis] modulKarteStatus liest STRINGS.instrumentVorhanden, kein deutsches Literal', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('vd-cr-l3-pw');
  const data = V.getData();
  data.sektoren = data.sektoren || {};
  data.sektoren.advanceCare = { provisionInstruments: [{ instrument: 'custodianship-declaration', id: 'x1' }] };
  const modul = V.VORSORGE_MODUL_BY_ID['betreuungsverfuegung'];
  assert.equal(V.modulKarteStatus(modul), V.STRINGS.instrumentVorhanden,
    'liefert nicht den aktuell aktiven STRINGS-Wert — ein hartkodiertes Literal wäre sprachblind');
  data.textsprache = 'en';
  V.textsatzNeuAnwenden();
  assert.equal(V.modulKarteStatus(modul), 'present',
    'im englischen Modus muss modulKarteStatus() "present" liefern, nicht das deutsche Literal "vorhanden"');
});

test('[VD-CR-L3·Rot-Beweis] instrumentZeileOptionen (über instrumentZeileModell) liest STRINGS.instrumentVorhanden, kein deutsches Literal', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('vd-cr-l3-pw');
  const data = V.getData();
  assert.equal(V.instrumentZeileModell('custodianship-declaration').feld.optionen[0].label, V.STRINGS.instrumentVorhanden,
    'liefert nicht den aktuell aktiven STRINGS-Wert — ein hartkodiertes Literal wäre sprachblind');
  data.textsprache = 'en';
  V.textsatzNeuAnwenden();
  assert.equal(V.instrumentZeileModell('custodianship-declaration').feld.optionen[0].label, 'present',
    'im englischen Modus muss instrumentZeileOptionen() "present" liefern, nicht "vorhanden"');
});

test('[VD-CR-L3·Rot-Beweis] flowPersonRegisterNeu liest STRINGS.refNeuePersonOption, kein deutsches Literal', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('vd-cr-l3-pw');
  const data = V.getData();
  let titelGesehen = null;
  V.ui.modal = (opt) => { titelGesehen = opt.titel; };
  V.flowPersonRegisterNeu();
  assert.equal(titelGesehen, V.STRINGS.refNeuePersonOption,
    'Modal-Titel entspricht nicht dem aktuell aktiven STRINGS-Wert — ein hartkodiertes Literal wäre sprachblind');
  data.textsprache = 'en';
  V.textsatzNeuAnwenden();
  V.flowPersonRegisterNeu();
  assert.equal(titelGesehen, 'New person',
    'im englischen Modus muss der Modal-Titel "New person" lauten, nicht "Neue Person"');
});
