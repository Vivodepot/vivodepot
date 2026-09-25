'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — B1 (25.07.2026): die „heute"-Grenze der Datums-Plausibilität wird LOKAL
   gerechnet, nicht UTC. Regress-Schutz für den Geräte-Blocker: zwischen lokal
   00:00 und ~02:00 (CEST) war der lokale Tag dem UTC-Tag voraus; ein heute
   gewählter Tag galt als Zukunft und wurde von `keineZukunft` abgelehnt
   (generischer feldFehlerDatum-Toast meldete fälschlich „Format").

   Deterministisch OHNE Abhängigkeit von der realen Uhr: feste Zeitzone (Berlin =
   CEST/UTC+2 im Juli) + eine eingefrorene „jetzt"-Zeit von 2026-07-24T23:30:00Z.
   In Berlin ist das der 25.07. 01:30 — also lokaler Tag = 25., UTC-Tag = 24.,
   genau die Grenze, an der der alte UTC-Code den heutigen Pick ablehnte.
   ════════════════════════════════════════════════════════════════════════ */
process.env.TZ = 'Europe/Berlin';   // muss VOR jeder Date-Nutzung stehen (eigener Test-Prozess)

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Eingefrorene „jetzt"-Zeit an der Tagesgrenze: UTC 24.07. 23:30 == Berlin 25.07. 01:30.
const FROZEN_MS = Date.parse('2026-07-24T23:30:00Z');
class FakeDate extends Date {
  constructor(...args) {
    if (args.length === 0) super(FROZEN_MS);   // `new Date()` → eingefrorenes jetzt
    else super(...args);                        // `new Date(iso)` etc. unverändert
  }
  static now() { return FROZEN_MS; }
}

function kernMitUhr() {
  const k = ladeKern({ Date: FakeDate });
  return k.V;
}

test('B1: _datumHeuteIso() rechnet die heutige Grenze LOKAL (Berlin 25.), nicht UTC (24.)', () => {
  const V = kernMitUhr();
  assert.equal(V._datumHeuteIso(), '2026-07-25', 'lokaler Tag');
  assert.notEqual(V._datumHeuteIso(), '2026-07-24', 'NICHT der UTC-Tag (alter Bug)');
});

test('B1: ein heute (lokal) gewählter Tag gilt NICHT als Zukunft — keineZukunft lässt ihn durch', () => {
  const V = kernMitUhr();
  // Genau der Fall aus dem Geräte-Befund: Feld zeigt/hält den lokalen heutigen Tag.
  assert.equal(V._datumPlausibel('2026-07-25', true), true, 'heute (lokal) ist gültig');
  // Und der native max-Attribut-Pfad (bearbeitungSpeichern) — max stammt aus derselben Funktion.
  const inp = { min: '1800-01-01', max: V._datumHeuteIso() };
  assert.equal(V._datumEingabePlausibel(inp, '2026-07-25'), true, 'heute besteht auch den max-Attribut-Pfad');
});

test('B1: keineZukunft bleibt scharf — ein echter Zukunftstag wird weiter abgelehnt', () => {
  const V = kernMitUhr();
  assert.equal(V._datumPlausibel('2026-07-26', true), false, 'morgen ist Zukunft → abgelehnt');
  const inp = { min: '1800-01-01', max: V._datumHeuteIso() };
  assert.equal(V._datumEingabePlausibel(inp, '2026-07-26'), false, 'morgen scheitert am max-Attribut');
});
