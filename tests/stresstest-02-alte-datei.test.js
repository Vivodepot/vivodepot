'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   STRESSTEST 2 · Das fünfzehn Jahre alte Depot — die Kette am Stück
   ────────────────────────────────────────────────────────────────────────────
   Laufzettel „zehn Stresstests" (21.08.2026), Posten 2.
   Messwerkzeug: `tools/alte-datei-migrationskette-messen.js`.

   WARUM JETZT: Der eine Schnitt bringt drei weitere Stufen. Danach ist die
   Antwort teurer, und die Kette bleibt für immer in jeder Datei.

   DER BEFUND IN EINEM SATZ: Die Kette trägt. 50 Stufen, Schema 22 auf 73, unter
   zwei Millisekunden, idempotent, und über 345 gepflanzte Werte geht keiner
   still verloren — eine Stufe RETTET sogar einen unbekannten Auswahlwert in das
   freie Ergänzungsfeld, statt ihn wegzuwerfen.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const M = require('../tools/alte-datei-migrationskette-messen.js');

function gemessen() { return M.messen(ladeKern().V); }

test('[S2] die Kette läuft von der ältesten Fassung bis heute durch', () => {
  const m = gemessen();
  assert.equal(m.vonFassung, 22, 'die älteste Fassung, die `depotNormalisieren` behandelt');
  assert.equal(m.nachFassung, ladeKern().V.SCHEMA_VERSION_AKTUELL,
    'und sie endet auf der heutigen — nicht auf einer Zwischenstufe');
});

test('[S2] wie viele Stufen eine Datei trägt: gezählt, nicht geschätzt', () => {
  const m = gemessen();
  assert.ok(m.hebungen >= 50, 'mindestens 50 Hebungen; die Zahl wächst mit jedem Schnitt');
  assert.equal(m.hebungen, m.nachFassung - m.vonFassung - 1,
    'jede Fassung ab 24 hebt genau einmal — keine Stufe fehlt und keine ist doppelt');
});

test('[S2] die Kette ist idempotent — ein zweiter Lauf ändert nichts', () => {
  /* Sonst wäre jede Öffnung eine neue Migration, und ein Verlust käme in Raten
     statt auf einmal. Das ist die Eigenschaft, die man erst vermißt, wenn sie
     fehlt. */
  assert.equal(gemessen().idempotent, true);
});

test('[S2·DIE FRAGE] kein Wert geht still verloren — über 345 gepflanzte Werte', () => {
  const m = gemessen();
  assert.deepEqual(m.verloren, [], 'schmaler Prüfstoff');
  assert.deepEqual(m.breit.verloren, [], 'jedes Feld des Katalogs gefüllt');
  assert.ok(m.breit.werte > 300, 'und der breite Prüfstoff ist wirklich breit: ' + m.breit.werte);
});

test('[S2·POSITIVKONTROLLE] ein gepflanzter Verlust WIRD gefunden', () => {
  /* Ohne sie ist „nichts verloren" nicht von „die Messung sieht nichts" zu
     unterscheiden — und dieselbe Messung hat in ihrer ersten Fassung zwei
     Verluste gemeldet, die keine waren. */
  assert.deepEqual(gemessen().kontrolleFindetGepflanztenVerlust, ['W-vorname']);
});

test('[S2·DIE STELLE, DIE MEHR TUT ALS SIE MUSS] ein unbekannter Auswahlwert wird gerettet, nicht verworfen', () => {
  /* Das ist der Grund, warum die Verlust-Messung nach TEILzeichenketten sucht:
     die Sorgerecht-Stufe hängt einen unbekannten Wert an das freie
     Ergänzungsfeld an. Ein Vergleich exakter Blattwerte meldete das als Verlust
     — und wäre damit genau falsch herum gelaufen. */
  const { V } = ladeKern();
  const d = V.leeresDepot();
  d.schemaVersion = 22;
  d.sektoren = { 'meine-menschen': { kinder: [{ name: 'Kind A', art: 'kind',
    sorgerecht_kind: 'ein-unbekannter-wert', sorgerecht_kind_zusatz: 'Teilsorge' }] } };
  const n = V.depotNormalisieren(d);
  const zeile = n.sektoren['people'].childrenAndDependants[0];
  assert.match(String(zeile.custodyAdditionalDetailPartial), /ein-unbekannter-wert/,
    'der unbekannte Wert steht im Freitext — er ist nicht fort');
  assert.equal(zeile.legalRepresentationParental, undefined, 'und der ungültige Auswahlwert ist geräumt');
});
