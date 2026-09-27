'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — W-1 („Die vier übrigen Wächter", 09.08.2026, Zug 1):
   Betrag ohne Zahl. Bauart wie tests/w8-doppelerfassung-pruefen.test.js —
   Grundlinie, nicht Nulltoleranz; Rotmachbarkeit mit gepflanzten Fällen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  betragFunde, schluesselFund, gateBewerten, ermittleFunde,
} = require('../tools/w1-betrag-ohne-zahl-pruefen.js');
const { ladeKern } = require('./load-kern.js');

const GRUNDLINIE = require('../tools/w1-betrag-ohne-zahl-grundlinie.json');

/* Die Werkzeuge lesen seit der Kampagne „eine Leseart statt dreiundvierzig"
   (09.09.2026) `bereicheAlle()` statt der Buendel-Liste — ein ab Werk gesaeter
   Bereich steht nur in der ersten. Diese Proben bauen einen KUENSTLICHEN Bestand
   fuer die Rot-Machbarkeit; sie liefern die vereinbarte Form jetzt ebenso. */

test('[W-1] jeder Grundlinien-Eintrag trägt einen der drei erlaubten Vermerke', () => {
  const erlaubt = new Set(['zu beheben', 'begründete Ausnahme', 'Entscheidung offen']);
  for (const f of GRUNDLINIE) {
    assert.ok(erlaubt.has(f.vermerk), 'unerlaubter Vermerk "' + f.vermerk + '" bei ' + schluesselFund(f));
    assert.ok(f.begruendung && f.begruendung.trim().length > 0, 'Begründung fehlt bei ' + schluesselFund(f));
  }
});

test('[W-1] echter Kern: kein neuer Fund gegen die Grundlinie, die diese nicht kennt', () => {
  const { V } = ladeKern();
  const funde = ermittleFunde(V);
  const { neu, rot } = gateBewerten(funde, GRUNDLINIE);
  assert.deepEqual(neu.map(schluesselFund), [], 'kein neuer Fund gegen die Grundlinie');
  assert.equal(rot, false);
});

test('[W-1] echter Kern: typ:"zahl" existiert nirgends im Schema — die eigentliche Aussage der Klasse', () => {
  const { V } = ladeKern();
  let zahlCount = 0;
  for (const s of V.SEKTOREN) for (const sek of s.sektionen || []) for (const f of sek.felder || []) {
    if (f.typ === 'zahl') zahlCount++;
    for (const u of f.unterFelder || []) if (u.typ === 'zahl') zahlCount++;
  }
  assert.equal(zahlCount, 0, 'kein Betragsfeld kann `zahl` tragen, solange der Typ nicht existiert');
});

test('[W-1·Rotmachbarkeit] Positivkontrolle: ein gepflanztes Feld mit Geldwert im Beispiel wird gefunden', () => {
  const SEKTOREN = [{ id: 'test', sektionen: [{ felder: [
    { id: 'test_betrag', label: 'Test-Betrag', typ: 'text', beispiel: '99 EUR' },
  ] }] }];
  const funde = betragFunde({ bereicheAlle: () => SEKTOREN });
  assert.equal(funde.length, 1);
  assert.equal(funde[0].id, 'test_betrag');
  const { rot } = gateBewerten(funde, GRUNDLINIE);
  assert.equal(rot, true, 'ein neuer Geldwert-Fund muss das Gate rot machen');
});

test('[W-1·Rotmachbarkeit] Negativkontrolle: ein Geld-Vokabular-Wort OHNE echten Geldwert bleibt grün', () => {
  const SEKTOREN = [{ id: 'test', sektionen: [{ felder: [
    { id: 'test_wert', label: 'Vermögenswert', typ: 'text', beispiel: 'Eigentumswohnung' },
  ] }] }];
  assert.deepEqual(betragFunde({ bereicheAlle: () => SEKTOREN }), [], 'Vokabular allein ("Wert") ohne Ziffernfolge+EUR/€ ist kein Fund — engeres Muster als ein Wortnetz');
});

test('[W-1·Rotmachbarkeit] Negativkontrolle: dasselbe Feld als typ:"zahl" bleibt grün (die eigentliche Behebung)', () => {
  const SEKTOREN = [{ id: 'test', sektionen: [{ felder: [
    { id: 'test_betrag', label: 'Test-Betrag', typ: 'zahl', beispiel: '99' },
  ] }] }];
  assert.deepEqual(betragFunde({ bereicheAlle: () => SEKTOREN }), []);
});
