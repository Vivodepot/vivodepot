'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — M1 Zug 2 („M1", 09.08.2026): gueltig_bis an vorsorge_instrumente.
   ────────────────────────────────────────────────────────────────────────
   F3-Kollisionsprüfung (im Auftrag verlangt, bevor gebaut wird): eine
   gerichtliche Betreuerbestellung für eine ANDERE Person (Schutzbefohlene)
   lebt vollständig getrennt, in meine-menschen.betreute_personen
   (art:'betreuter_erwachsener', Feld `bestellt_seit`, F3 Zug 2/U2-ADR-109) —
   nicht in vorsorge_instrumente. Kein typ-Wert in vorsorge_instrumente
   bildet eine Betreuerbestellung ab: `custodianship-declaration` ist die eigene
   VORAB-Willensäußerung der Inhaberin, wen das Gericht bestellen soll, nicht
   die Bestellung selbst. `art:'emergencyCarePersonContact'` (unter typ='enduring-power-of-attorney')
   ist seit F3 Zug 3 abgekündigt, aber immer noch ein selbstverfasstes
   Instrument, keine Bestellung. Ein befristet erteiltes Vollmacht-Datum
   dupliziert darum nichts, was `bestellt_seit` schon zählt.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function vorsorgeInstrumenteFeld(V) {
  const felder = V.SEKTOR_BY_ID.advanceCare.sektionen.flatMap(s => s.felder);
  return felder.find(f => f.id === 'provisionInstruments');
}

test('[M1] vorsorge_instrumente bekommt ein gueltig_bis-Unterfeld', () => {
  const { V } = ladeKern();
  const liste = vorsorgeInstrumenteFeld(V);
  const uf = liste.unterFelder.find(u => u.id === 'timeLimitedUntilIfAgreed');
  assert.ok(uf && uf.typ === 'datum');
});

test('[M1] gueltig_bis ist nur bei der Vollmacht sichtbar (typ=vorsorgevollmacht), nicht bei Testament/Patientenverfügung', () => {
  const { V } = ladeKern();
  const liste = vorsorgeInstrumenteFeld(V);
  const uf = liste.unterFelder.find(u => u.id === 'timeLimitedUntilIfAgreed');
  assert.deepEqual(uf.sichtbarWenn, { feld: 'instrument', wert: 'enduring-power-of-attorney' });
});

test('[M1] gueltig_bis trägt keine berechnete Vorschlagslogik — reines Eingabefeld wie datum', () => {
  const { V } = ladeKern();
  const liste = vorsorgeInstrumenteFeld(V);
  const uf = liste.unterFelder.find(u => u.id === 'timeLimitedUntilIfAgreed');
  assert.equal(uf.berechnet, undefined);
  assert.equal(uf.vorschlag, undefined);
});

test('[M1] die gerichtliche Betreuerbestellung (meine-menschen.betreute_personen, art=betreuter_erwachsener) bleibt eigenständig — bestellt_seit unverändert, kein gueltig_bis dort', () => {
  const { V } = ladeKern();
  const felder = V.SEKTOR_BY_ID['people'].sektionen.flatMap(s => s.felder);
  const liste = felder.find(f => f.unterFelder && f.unterFelder.some(u => u.id === 'validSince'));
  assert.ok(liste, 'Liste mit bestellt_seit muss weiterhin existieren');
  assert.equal(liste.unterFelder.find(u => u.id === 'timeLimitedUntilIfAgreed'), undefined,
    'keine Doppelerfassung — die Betreuerbestellung bekommt ihr eigenes Feld, nicht das Vollmacht-Unterfeld');
});
