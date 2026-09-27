'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-096 Block E — die KI-Verfügung wohnt an EINEM Ort.
   ────────────────────────────────────────────────────────────────────────
   TEST ZUERST, absichtlich vor dem Bau geschrieben und rot.

   Der Zustand vorher: `kiwiz` schrieb seine zwölf `ki_*`-Werte flach nach
   `verwaltung`, wo KEIN `ki_*`-Feld deklariert ist. Dieselben ids leben als
   Unterfelder der Instrument-Zeile in `vorsorge`. Die Werte waren damit
   gespeichert, aber nirgends darstellbar oder korrigierbar — nur der
   KI-Dokument-Generator las sie. Doppelablage, kein Korpus-Fall.

   Block E löst das nach E3 auf: EIN Ort, die Instrument-Liste. Dafür braucht
   der Wizard ein drittes Ziel neben `sektor` und `situation` — eine
   LISTEN-ZEILE, adressiert über Sektor + Liste + Typ. Das ist die Schreib-
   Seite der Adressierung, deren Lese-Seite U2-ADR-096 schon festgelegt hat
   (`liste:<listeId>:<typwert>:<unterfeldId>`).

   Die Zeile ist eindeutig, weil `ki-verfuegung` ein einzigartiger Typ ist —
   es kann sie höchstens einmal geben. Ohne diese Einzigartigkeit wäre
   „schreibe in DIE Zeile" nicht definiert; der Test prüft sie deshalb mit.

   Wenn dieser Test grün ist, MUSS die befristete kiwiz-Ausnahme in
   tests/wizard-schreibziele.test.js fallen — ihr Rückbau-Wächter erzwingt es.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert');
const { ladeKern } = require('./load-kern.js');

async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen('pw');
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

const kiZeile = (V) =>
  (((V.getData().sektoren.advanceCare || {}).provisionInstruments) || [])
    .find(r => r && r.instrument === 'ki-verfuegung');

test('[BlockE] kiwiz zielt auf die Instrument-Zeile, nicht mehr flach auf verwaltung', () => {
  const { V } = ladeKern();
  const z = V.WIZARD_BY_ID.kiwiz.ziel;
  assert.equal(z.sektor, 'advanceCare', 'die KI-Verfügung wohnt in Vorsorge, nicht in Verwaltung');
  assert.equal(z.liste, 'provisionInstruments', 'Ziel ist die geteilte Instrument-Liste');
  assert.equal(z.instrument, 'ki-verfuegung', 'und darin die Zeile dieses Typs');
});

test('[BlockE] alle zwölf kiwiz-Felder sind an der Liste deklariert — keines ohne Ort', () => {
  const { V } = ladeKern();
  const fehlend = (V.WIZARD_BY_ID.kiwiz.schritte || [])
    .map(s => s.feld.id)
    .filter(id => !V.feldDefFuer('advanceCare', 'liste:provisionInstruments:ki-verfuegung:' + id))
    .join(',');
  // Primitiv-Vergleich, kein deepEqual: die Arrays stammen aus der vm-Sandbox.
  assert.equal(fehlend, '',
    'Diese kiwiz-Schritte haben an der Instrument-Zeile kein Unterfeld — sie schrieben ins Nichts: ' + fehlend);
});

test('[BlockE] ein kiwiz-Schritt schreibt IN die Zeile und legt sie beim ersten Mal an', async () => {
  const { V } = await frischMitDepot();
  const i = V.WIZARD_BY_ID.kiwiz.schritte.findIndex(s => s.feld.id === 'basicDecision');
  const r = V.wizardSchrittSetzen('kiwiz', i, 'erlaubnis');
  assert.ok(r && r.ok !== false, 'Schritt wird angenommen');

  const zeile = kiZeile(V);
  assert.ok(zeile, 'beim ersten Schritt entsteht GENAU EINE ki-verfuegung-Zeile');
  assert.equal(zeile.basicDecision, 'erlaubnis', 'der Wert steht IN der Zeile');
  // Und nirgendwo sonst: kein Flachfeld-Schatten in verwaltung.
  assert.ok(!((V.getData().sektoren.administration || {}).basicDecision),
    'kein zweiter Ort — genau das war die Doppelablage');
});

test('[BlockE] zwei Schritte fuellen DIESELBE Zeile, es entsteht keine zweite', async () => {
  const { V } = await frischMitDepot();
  const idx = (id) => V.WIZARD_BY_ID.kiwiz.schritte.findIndex(s => s.feld.id === id);
  V.wizardSchrittSetzen('kiwiz', idx('basicDecision'), 'erlaubnis');
  V.wizardSchrittSetzen('kiwiz', idx('scope'), 'privat');

  const alle = ((V.getData().sektoren.advanceCare || {}).provisionInstruments || [])
    .filter(r => r && r.instrument === 'ki-verfuegung');
  assert.equal(alle.length, 1, 'genau eine KI-Zeile — ki-verfuegung ist ein einzigartiger Typ');
  assert.equal(alle[0].basicDecision, 'erlaubnis');
  assert.equal(alle[0].scope, 'privat');
});

test('[BlockE] der Wert ist ueber den Lese-Selektor wieder auffindbar (Schreib-/Leseseite passen)', async () => {
  const { V } = await frischMitDepot();
  const i = V.WIZARD_BY_ID.kiwiz.schritte.findIndex(s => s.feld.id === 'basicDecision');
  V.wizardSchrittSetzen('kiwiz', i, 'erlaubnis');
  // Der Sinn des Ganzen: was der Wizard schreibt, findet jeder Leser über U2-ADR-096 wieder.
  // Ohne diese Prüfung wäre „irgendwo gespeichert" von „am richtigen Ort" nicht zu unterscheiden.
  const roh = V.listenUnterfeldRoh('advanceCare', 'provisionInstruments', 'ki-verfuegung', 'basicDecision');
  assert.equal(roh.join(','), 'erlaubnis', 'der Lese-Selektor findet genau den geschriebenen Wert');
});

test('[BlockE] kiwiz erkennt Wiedereintritt an der Zeile („bearbeiten" statt „erstellen")', async () => {
  const { V } = await frischMitDepot();
  assert.equal(V.wizardHatDaten('kiwiz'), false, 'leeres Depot: noch nichts hinterlegt');
  const i = V.WIZARD_BY_ID.kiwiz.schritte.findIndex(s => s.feld.id === 'basicDecision');
  V.wizardSchrittSetzen('kiwiz', i, 'erlaubnis');
  assert.equal(V.wizardHatDaten('kiwiz'), true,
    'nach dem ersten Wert muss der Startknopf „bearbeiten" anbieten — sonst beginnt die Buergerin von vorn');
});
