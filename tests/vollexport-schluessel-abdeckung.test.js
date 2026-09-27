'use strict';
/* ════════════════════════════════════════════════════════════════════════
   vollexport-schluessel-abdeckung.test.js — „Herausgabe ohne Auswahl" (13.08.2026), Zug 3
   ────────────────────────────────────────────────────────────────────────
   Zwei Wächter, „Rot sehen" für beide belegt (Regel 18):

   1) Jeder EXPORT_FORMATE-Eintrag nimmt einen Erzeuger, der `opt` entgegennimmt (Befund 1 —
      s. auch export-drei-erzeuger-ohne-opt.test.js, dort feiner aufgelöst je Format).
   2) Jeder Schlüssel oberster Ebene in `leeresDepot()` ist entweder in
      VOLLEXPORT_ZURUECKHALTEN_SCHLUESSEL oder VOLLEXPORT_STRUKTURELL_SCHLUESSEL benannt — ein
      neuer Schlüssel ohne Klassifikation reißt DIESEN Test, statt lautlos ungefiltert
      mitzugehen (genau der Fehler hinter Befund 2).

   NACHTRAG („Die Mappe bleibt drin — und der Kontakt bekommt eine Markierung",
   13.08.2026): `VOLLEXPORT_MAPPE_AUSNAHME` ist entfallen — `mappe` steht jetzt in
   `VOLLEXPORT_ZURUECKHALTEN_SCHLUESSEL`, keine dritte Klasse mehr nötig.

   NACHTRAG 2 (M1 Zug 5 / Zug 5, 18.08.2026): Jetzt DOCH eine dritte Klasse, und aus einem
   anderen Grund als damals. `VOLLEXPORT_FELDWEISE_SCHLUESSEL` ist keine Ausnahme für EINEN
   Schlüssel, sondern eine eigene Aussage: „wird je EINTRAG entschieden". `feldGueltigkeit`
   trägt nach dem Umzug vierzehn Feldwerte, und die tragen dieselben Schlüssel wie ein
   Bereichsfeld — sie sind einzeln über `feldIstSensibel` klassifizierbar. Eine pauschale
   Einstufung entschiede über etwas, das die Bürgerin heute feldweise steuert.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('Wächter 1: jeder EXPORT_FORMATE-Eintrag benennt einen Erzeuger, der opt entgegennimmt', () => {
  const { V } = ladeKern();
  const ohneOpt = V.EXPORT_FORMATE.filter(def => def.baue.length < 1).map(def => def.id);
  assert.deepEqual(ohneOpt, [], 'Erzeuger ohne opt-Parameter: ' + ohneOpt.join(', '));
});

test('[Rot-Beweis] Wächter 1 schlägt an, wenn ein Erzeuger ohne opt eingesetzt wird', () => {
  const { V } = ladeKern();
  const fingiert = V.EXPORT_FORMATE.concat([{ id: 'fingiert-ohne-opt', baue: () => 'x' }]);
  const ohneOpt = fingiert.filter(def => def.baue.length < 1).map(def => def.id);
  assert.deepEqual(ohneOpt, ['fingiert-ohne-opt'], 'Wächter 1 ist blind für einen opt-losen Erzeuger');
});

test('Wächter 2: jeder Schlüssel aus leeresDepot() ist klassifiziert (zurückgehalten oder strukturell)', () => {
  const { V } = ladeKern();
  const bekannt = new Set([
    ...V.VOLLEXPORT_ZURUECKHALTEN_SCHLUESSEL,
    ...V.VOLLEXPORT_STRUKTURELL_SCHLUESSEL,
    ...V.VOLLEXPORT_FELDWEISE_SCHLUESSEL,
  ]);
  const unklassifiziert = Object.keys(V.leeresDepot()).filter(k => !bekannt.has(k));
  assert.deepEqual(unklassifiziert, [],
    'neue(r) Schlüssel im Grundgerüst ohne Klassifikation: ' + unklassifiziert.join(', ') +
    ' — in VOLLEXPORT_ZURUECKHALTEN_SCHLUESSEL, VOLLEXPORT_STRUKTURELL_SCHLUESSEL oder' +
    ' VOLLEXPORT_FELDWEISE_SCHLUESSEL eintragen');
});

test('mappe ist in VOLLEXPORT_ZURUECKHALTEN_SCHLUESSEL, keine eigene Ausnahme-Klasse mehr', () => {
  const { V } = ladeKern();
  assert.ok(V.VOLLEXPORT_ZURUECKHALTEN_SCHLUESSEL.includes('mappe'));
  assert.equal(V.VOLLEXPORT_MAPPE_AUSNAHME, undefined, 'VOLLEXPORT_MAPPE_AUSNAHME ist entfallen');
});

test('[Rot-Beweis] Wächter 2 schlägt an, wenn ein neuer, unklassifizierter Schlüssel ins Grundgerüst kommt', () => {
  const { V } = ladeKern();
  const bekannt = new Set([
    ...V.VOLLEXPORT_ZURUECKHALTEN_SCHLUESSEL,
    ...V.VOLLEXPORT_STRUKTURELL_SCHLUESSEL,
    ...V.VOLLEXPORT_FELDWEISE_SCHLUESSEL,
  ]);
  const fingiertesDepot = Object.assign({}, V.leeresDepot(), { neuesFeldFingiert: [] });
  const unklassifiziert = Object.keys(fingiertesDepot).filter(k => !bekannt.has(k));
  assert.deepEqual(unklassifiziert, ['neuesFeldFingiert'], 'Wächter 2 ist blind für einen neuen unklassifizierten Schlüssel');
});

test('[M1·Zug5·Zug5] `feldGueltigkeit` wird JE EINTRAG entschieden, nicht als Ganzes', () => {
  const { V } = ladeKern();
  /* NACHGEZOGEN 19.08.2026 (A363): `ausdruecklichKeine` ist dazugekommen — dieselbe Bauart und
     derselbe Grund, je Eintrag entschieden statt als Ganzes. Er stand vorher als STRUKTURELL und
     ging damit auch ohne sensible Daten vollständig mit, obwohl alle fünf Felder, die diesen
     Zustand kennen, `sensibel: true` tragen. */
  assert.deepEqual(Array.from(V.VOLLEXPORT_FELDWEISE_SCHLUESSEL), ['feldGueltigkeit', 'ausdruecklichKeine'],
    'die dritte Klasse trägt genau die Schlüssel, für die sie begründet ist');
  assert.equal(V.VOLLEXPORT_STRUKTURELL_SCHLUESSEL.includes('ausdruecklichKeine'), false,
    'als STRUKTURELL eingestuft reiste die Absenz-Aussage über ein zurückgehaltenes Feld mit');
  assert.equal(V.VOLLEXPORT_ZURUECKHALTEN_SCHLUESSEL.includes('feldGueltigkeit'), false,
    'als GANZER Schlüssel eingestuft, verschwänden sechs heute exportierte Ablaufdaten ohne Entscheidung');
});

test('kein Schlüssel steht in mehr als einer Klasse (Klassifikation ist eindeutig)', () => {
  const { V } = ladeKern();
  const alle = [
    ...V.VOLLEXPORT_ZURUECKHALTEN_SCHLUESSEL,
    ...V.VOLLEXPORT_STRUKTURELL_SCHLUESSEL,
    ...V.VOLLEXPORT_FELDWEISE_SCHLUESSEL,
  ];
  const dubletten = alle.filter((k, i) => alle.indexOf(k) !== i);
  assert.deepEqual(dubletten, [], 'Schlüssel in mehr als einer Klasse: ' + dubletten.join(', '));
});
