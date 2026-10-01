'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Dieselbe Datei gibt in Privat und Pro dieselben Daten-Antworten (16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Produktentscheidung vom 16.09.2026: Privat und Pro dürfen sich in der Sichtbarkeit
   unterscheiden, nicht in dem, was sie über Daten sagen. Werkzeug und Beschreibung:
   tools/privat-pro-daten-antworten.js. Diese Probe hält das Ergebnis gegen eine Grundlinie
   (tools/privat-pro-daten-antworten-grundlinie.json), in der jeder bekannte Fund mit seinem
   Befund steht.

   ROT WIRD SIE, wenn
     - ein Fund auftaucht, der nicht in der Grundlinie steht (neue Abweichung),
     - ein Fund der Grundlinie verschwindet (dann ist er behoben — die Grundlinie gehört
       nachgezogen, sonst liest sie jemand als offen),
     - eine Funktion beim Aufruf die Daten verändert und nicht auf der Ausnahmeliste steht,
     - eine Antwort zwischen zwei Aufrufen im selben Kern schwankt,
     - die Ausnahmeliste eine Funktion nennt, die es im Kern nicht mehr gibt.

   ROT-BEWEIS: die letzte Probe nimmt einen Katalog-Tausch vom selben Tag zurück (`bereichRolle`
   fragt wieder den Anzeige-Index) und verlangt, dass das Werkzeug genau daran neue Funde meldet.

   WAS HIER LÄUFT, UND WARUM (Entscheidung 16.09.2026): `leer` in Deutsch und Englisch, als Ratsche
   gegen die Grundlinie. Im leeren Depot ruhen die Bürger-Bereiche, dort zeigt sich die Klasse und
   dort feuert der Rot-Beweis. Englisch war zuerst ausgeschlossen, weil ein Lauf fünf bis sechs
   Minuten dauerte; die Ursache lag im Werkzeug (die Schreiberkennung serialisierte das in Englisch
   mitgeschriebene Sprachmodul bei jedem Aufruf), nicht im Produkt, und ist behoben — gemessen je
   unter 20 Sekunden. `voll` bleibt außerhalb: in Deutsch fand es nur, was `leer` auch findet; in
   Englisch zeigte es mehr Stellen der Klasse B3, die hält die Grundlinie fest. Die Grundlinie hält trotzdem die Funde ALLER vier Läufe fest;
   gefahren werden sie über das Werkzeug:
   node tools/privat-pro-daten-antworten.js --sprache en --szenario leer Die Funktionen werden aus dem
   Quelltext gesammelt, nicht aufgezählt — die Laufzeit wächst mit dem Kern, nicht mit dieser Datei.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { messe, fundSchluessel, sammleFunktionen } = require('../tools/privat-pro-daten-antworten.js');
const GRUNDLINIE = require('../tools/privat-pro-daten-antworten-grundlinie.json');

const ZEIT = { timeout: 15 * 60 * 1000 };

test('[Daten-Antworten·Sammlung] gesammelt wird aus dem Quelltext: oberste Ebene, Parameter sektorId, auch mit Struktur-Parametern', () => {
  const text = [
    'function a(sektorId, feldId) {}',
    'async function b({ x, y } = {}, sektorId) {}',
    '  function innen(sektorId) {}',
    'function c(bereichId) {}',
    'function d(sektorIdX) {}',
  ].join('\n');
  assert.deepEqual(sammleFunktionen(text).map((f) => f.name), ['a', 'b']);
  assert.deepEqual(sammleFunktionen(text)[1].params, ['__struktur', 'sektorId']);
});

for (const [sprache, szenario] of [['de', 'leer'], ['en', 'leer']]) {
  test('[Daten-Antworten·' + sprache + '·' + szenario + '] Privat und Pro antworten gleich — bis auf die benannten Funde der Grundlinie', ZEIT, async () => {
    const e = await messe({ sprache, szenario });
    assert.deepEqual(e.toteAusnahmen, [], 'die Ausnahmeliste nennt Funktionen, die es nicht mehr gibt');
    assert.deepEqual(e.unbenanntSchreibend, [], 'diese Funktionen schreiben beim Aufruf und stehen nicht auf der Ausnahmeliste');
    assert.deepEqual(e.instabil, [], 'diese Antworten schwanken im selben Kern — Zeitstempel oder Zufall, der nicht maskiert ist');
    assert.ok(e.gesammelt > 0 && e.aufrufe > 0, 'nichts gesammelt oder nichts aufgerufen — dann prüft diese Probe nichts');
    const ist = fundSchluessel(e);
    const soll = Object.keys(GRUNDLINIE.funde).filter((k) => k.startsWith(sprache + ' ' + szenario + ' ')).sort();
    const neu = ist.filter((k) => !soll.includes(k));
    const weg = soll.filter((k) => !ist.includes(k));
    assert.deepEqual(neu, [], 'NEUE Abweichung zwischen Privat und Pro — erst verstehen, dann beheben oder mit Befund in die Grundlinie');
    assert.deepEqual(weg, [], 'dieser Fund der Grundlinie tritt nicht mehr auf — behoben? Dann die Grundlinie nachziehen');
  });
}

test('[Daten-Antworten·Schreiberkennung·Gegenprobe] eine schreibende Funktion ohne Ausnahme fällt auf — in Deutsch und in Englisch', ZEIT, async () => {
  /* Die Schreiberkennung vergleicht den Datenstand vorher und nachher, OHNE den Text der Mitschrift
     (die trägt in Englisch das ganze Sprachmodul). Dass sie dabei nicht blind geworden ist, zeigt
     diese Probe: `_listeOder` legt eine fehlende Liste an und muss ohne Ausnahme gemeldet werden. */
  const ohne = Object.assign({}, require('../tools/privat-pro-daten-antworten.js').AUSNAHMEN);
  delete ohne._listeOder;
  for (const sprache of ['de', 'en']) {
    const e = await messe({ sprache, szenario: 'voll', nurFunktionen: ['_listeOder'], ausnahmen: ohne });
    assert.deepEqual(e.unbenanntSchreibend, ['_listeOder'], sprache + ': die Schreiberkennung sieht _listeOder nicht');
  }
});

test('[Daten-Antworten·Rot-Beweis] fragt bereichRolle wieder den Anzeige-Index, meldet das Werkzeug es', ZEIT, async () => {
  const VORHER = 'const s = _sektorAusKatalog(sektorId);   // Katalog, nicht Anzeige — Begründung an `bereichKann`';
  let angewandt = false;
  const kernPatch = (text) => {
    if (!text.includes(VORHER)) return text;
    angewandt = true;
    return text.replace(VORHER, 'const s = SEKTOR_BY_ID[sektorId];');
  };
  const e = await messe({ sprache: 'de', szenario: 'leer', kernPatch, nurFunktionen: ['bereichRolle'] });
  assert.ok(angewandt, 'der Rückbau griff nicht — die Zeile in bereichRolle hat sich geändert, der Rot-Beweis prüft nichts mehr');
  const funde = fundSchluessel(e).filter((k) => k.startsWith('de leer bereichRolle @ '));
  assert.ok(funde.length > 0, 'bereichRolle über den Anzeige-Index blieb unbemerkt');
});
