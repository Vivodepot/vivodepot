'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — W-2 („Die vier übrigen Wächter", 09.08.2026, Zug 2):
   Betrag ohne Einheit. Bauart wie tests/w1-betrag-ohne-zahl-pruefen.test.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  schemaHatEinheitenfeld, schluesselFund, gateBewerten, ermittleFunde,
} = require('../tools/w2-betrag-ohne-einheit-pruefen.js');
// F5 Posten 1 („F4 und F5", 09.08.2026): drei Betragsfelder bekamen ein
// eigenes Währungs-/Frequenzfeld daneben — W-2 prüft seither pro Nachbarschaft
// (Array-Adjazenz), nicht mehr über eine Existenzfrage im ganzen Schema.
const { ladeKern } = require('./load-kern.js');

const GRUNDLINIE = require('../tools/w2-betrag-ohne-einheit-grundlinie.json');

/* Die Werkzeuge lesen seit der Kampagne „eine Leseart statt dreiundvierzig"
   (09.09.2026) `bereicheAlle()` statt der Buendel-Liste — ein ab Werk gesaeter
   Bereich steht nur in der ersten. Diese Proben bauen einen KUENSTLICHEN Bestand
   fuer die Rot-Machbarkeit; sie liefern die vereinbarte Form jetzt ebenso. */

test('[W-2] jeder Grundlinien-Eintrag trägt einen der drei erlaubten Vermerke', () => {
  const erlaubt = new Set(['zu beheben', 'begründete Ausnahme', 'Entscheidung offen']);
  for (const f of GRUNDLINIE) {
    assert.ok(erlaubt.has(f.vermerk), 'unerlaubter Vermerk "' + f.vermerk + '" bei ' + schluesselFund(f));
    assert.ok(f.begruendung && f.begruendung.trim().length > 0, 'Begründung fehlt bei ' + schluesselFund(f));
  }
});

test('[W-2] echter Kern: kein neuer Fund gegen die Grundlinie, die diese nicht kennt', () => {
  const { V } = ladeKern();
  const funde = ermittleFunde(V);
  const { neu, rot } = gateBewerten(funde, GRUNDLINIE);
  assert.deepEqual(neu.map(schluesselFund), [], 'kein neuer Fund gegen die Grundlinie');
  assert.equal(rot, false);
});

test('[W-2] echter Kern: seit F5 Posten 1 existieren echte Einheitenfelder im Schema', () => {
  const { V } = ladeKern();
  assert.equal(schemaHatEinheitenfeld(V), true, 'unterhalt_waehrung/betrag_waehrung/miete_waehrung existieren');
});

test('[W-2·Rotmachbarkeit] Positivkontrolle: ein gepflanztes Betragsfeld ohne Einheit wird gefunden', () => {
  const SEKTOREN = [{ id: 'test', sektionen: [{ felder: [
    { id: 'test_betrag', label: 'Test-Betrag', typ: 'text', beispiel: '99 EUR' },
  ] }] }];
  const funde = ermittleFunde({ bereicheAlle: () => SEKTOREN });
  assert.equal(funde.length, 1);
  assert.equal(funde[0].id, 'test_betrag');
  const { rot } = gateBewerten(funde, GRUNDLINIE);
  assert.equal(rot, true, 'ein neuer Betrag-ohne-Einheit-Fund muss das Gate rot machen');
});

test('[W-2·Rotmachbarkeit] Negativkontrolle: ein Wortnetz-Wort ("Bewährung") ohne echtes Einheitenfeld löst NICHT den Umstellungs-Wurf aus', () => {
  const SEKTOREN = [{ id: 'test', sektionen: [{ felder: [
    { id: 'gdbReviewReAssessmentDate', label: 'GdB — Nachprüfung / Heilungsbewährung am', typ: 'text', beispiel: '2027-01-01' },
  ] }] }];
  assert.equal(schemaHatEinheitenfeld({ bereicheAlle: () => SEKTOREN }), false, 'Teilstring "währung" in "Heilungsbewährung" ist kein Wort-Treffer');
});

test('[W-2·Rotmachbarkeit] Pro-Nachbarschaft: ein UNMITTELBAR benachbartes Einheitenfeld befreit den Betrag', () => {
  const SEKTOREN = [{ id: 'test', sektionen: [{ felder: [
    { id: 'test_betrag', label: 'Test-Betrag', typ: 'text', beispiel: '99 EUR' },
    { id: 'test_waehrung', label: 'Währung', typ: 'text', beispiel: 'EUR' },
  ] }] }];
  assert.deepEqual(ermittleFunde({ bereicheAlle: () => SEKTOREN }), [], 'unmittelbarer Nachbar befreit — kein Fund mehr');
});

test('[W-2·Rotmachbarkeit] Pro-Nachbarschaft: ein Einheitenfeld in einer ANDEREN Sektion befreit NICHT (der ursprüngliche `housing.rentalDepositBankAmount`-Fund)', () => {
  const SEKTOREN = [{ id: 'test', sektionen: [{ felder: [
    { id: 'test_betrag', label: 'Test-Betrag', typ: 'text', beispiel: '99 EUR' },
    { id: 'unbeteiligt', label: 'Unbeteiligtes Feld', typ: 'text', beispiel: 'x' },
    { id: 'unbeteiligt2', label: 'Noch eins', typ: 'text', beispiel: 'y' },
    { id: 'test_waehrung', label: 'Währung', typ: 'text', beispiel: 'EUR' },
  ] }] }];
  const funde = ermittleFunde({ bereicheAlle: () => SEKTOREN });
  assert.equal(funde.length, 1, 'zwei Felder Abstand liegt außerhalb des Nachbarschaftsfensters — bleibt Fund');
  assert.equal(funde[0].id, 'test_betrag');
});
