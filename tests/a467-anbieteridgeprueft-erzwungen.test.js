'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A467 (Laufzettel Nacht 22./23.08.2026, Posten 13) — Schicht 3:
   `anbieterIdGeprueft` überlebt die Selbstauskunft nicht mehr
   ────────────────────────────────────────────────────────────────────────────
   GEMESSEN am 21.08. (Stresstest 1, [S1·6b]): ein Modul, das
   `anbieterIdGeprueft: true` über sich selbst behauptete, wurde angenommen,
   und die Behauptung stand danach unverändert im gespeicherten Slot — anders
   als `ungeprueft`/`eingelassenAm`, die `modulEinlassen` schon immer erzwang.
   „Heute folgenlos" (kein Leser im ausgelieferten Bestand), aber eine
   Behauptung, die niemand widerlegt, ist keine Prüfung.

   GEBAUT: dieselbe erzwungene Gruppe — `anbieterIdGeprueft` wird beim Einlass
   IMMER auf `false` gesetzt, unabhängig davon, was das Modul selbst behauptet.
   Nur wenn `modulEinlassen` seinen eigenen dritten Parameter (die GEPRÜFTE
   Quelle, noch ungenutzt) bekommt, wird sie auf `true` gehoben.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[A467] eine Selbstauskunft `anbieterIdGeprueft: true` wird beim Einlass verworfen', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const r = V.modulEinlassen(JSON.stringify({ modulTyp: 'textsatz', sprache: 'hu', moduleVersion: 1,
    texte: {}, anbieterId: 'vivodepot-gmbh', anbieterIdGeprueft: true }), d);
  assert.equal(r.angenommen, true, 'das Modul wird trotzdem angenommen — nur die Behauptung fällt');
  assert.equal(d.textsatzModule[0].anbieterIdGeprueft, false,
    'die Selbstauskunft überlebt nicht — dieselbe erzwungene Gruppe wie ungeprueft/eingelassenAm');
  assert.equal(d.textsatzModule[0].anbieterId, 'vivodepot-gmbh',
    'die Kennung selbst bleibt (geglaubt, aber als ungeprüft markiert) — Gegenprobe zu [S1·5]');
});

test('[A467] ein Modul OHNE jede Angabe bekommt trotzdem anbieterIdGeprueft:false, nicht undefined', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.modulEinlassen(JSON.stringify({ modulTyp: 'textsatz', sprache: 'hu', moduleVersion: 1, texte: {} }), d);
  assert.equal(d.textsatzModule[0].anbieterIdGeprueft, false,
    'ein explizites false, kein stilles Fehlen — sonst könnte ein späterer Lesecode "falsy heißt ungeprüft" annehmen und sich irren, sobald jemand undefined mit false verwechselt');
});

test('[A467·Gegenprobe] der geprüfte Quelle-Weg (dritter Parameter) hebt die Marke weiterhin auf true', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const r = V.modulEinlassen(JSON.stringify({ modulTyp: 'textsatz', sprache: 'hu', moduleVersion: 1,
    texte: {}, anbieterId: 'behauptet-sich-selbst' }), d, 'echte-kammer');
  assert.equal(r.angenommen, true);
  assert.equal(d.textsatzModule[0].anbieterId, 'echte-kammer', 'die geprüfte Kennung gewinnt über die Selbstauskunft');
  assert.equal(d.textsatzModule[0].anbieterIdGeprueft, true, 'und NUR dieser Weg darf die Marke heben');
});
