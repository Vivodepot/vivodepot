'use strict';
/* ════════════════════════════════════════════════════════════════════════
   produkt-durchklick-messen.js — die Kandidaten-Erkennung, ohne Browser (17.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Das Durchklicken selbst braucht Playwright und läuft als Abnahme vor einer Auslieferung. Hier geprüft wird
   die reine Auswertung einer Aufnahme: jede mechanische Klasse findet ihren gepflanzten Fall, und ein
   sauberer Text bleibt stumm.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { kandidaten } = require('../tools/lib/produkt-durchklick-kandidaten.js');

const sicht = (text, ueberschriften = [], leereIcons = 0) => ({ sicht: 'probe', foto: '001-probe.png', text, ueberschriften, leereIcons });
const klassen = (k) => [...new Set(k.map((x) => x.klasse))].sort();

test('[Durchklick] ein sauberer englischer Text ohne Doppelung erzeugt keinen Kandidaten', () => {
  const k = kandidaten({ sprache: 'en', sichten: [sicht('Identity\nFirst name\nPhone and email', [{ tag: 'h1', text: 'Identity' }, { tag: 'h2', text: 'CONTACT DETAILS' }])] });
  assert.deepEqual(k, []);
});

test('[Durchklick·Rot-Beweis] jede Klasse findet ihren gepflanzten Fall', () => {
  const k = kandidaten({ sprache: 'en', sichten: [sicht(
    'official wording · keine\nBlock 2 — Deadlines and money\nWill (advanceCare)\nundefined\nHello {marke}',
    [{ tag: 'h2', text: 'ACCESS' }, { tag: 'h2', text: 'ACCESS' }, { tag: 'summary', text: '' }], 1)] });
  assert.deepEqual(klassen(k), ['icon-leer', 'kennung-oder-platzhalter', 'nummerierung-intern', 'sprache-gemischt', 'ueberschrift-doppelt', 'ueberschrift-leer']);
  assert.ok(k.some((x) => x.klasse === 'sprache-gemischt' && x.treffer.includes('keine')));
  assert.ok(k.some((x) => x.klasse === 'kennung-oder-platzhalter' && x.treffer.includes('advanceCare')));
});

test('[Durchklick] deutsche Wörter zählen nur im englischen Produkt', () => {
  const text = 'Dieser Auszug hilft Ihnen und bleibt deutsch';
  assert.equal(kandidaten({ sprache: 'de', sichten: [sicht(text)] }).length, 0);
  assert.ok(kandidaten({ sprache: 'en', sichten: [sicht(text)] }).some((x) => x.klasse === 'sprache-gemischt'));
});
