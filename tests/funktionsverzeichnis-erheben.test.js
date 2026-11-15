'use strict';
/* Probe zu tools/funktionsverzeichnis-erheben.js (Zulieferung an den Umbau, 13.11.2026).
   ROT-BEWEIS: vor dem Bau fehlt das Werkzeug; die Probe bricht dann beim Laden ab.
   Gepflanzter Wegfall: ein Knopf wird aus dem Fixture entfernt, die Messung muss die Lücke melden. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const W = require(path.join(__dirname, '..', 'tools', 'funktionsverzeichnis-erheben.js'));

test('[Funktionsverzeichnis] das Fixture ergibt genau die gepflanzten Einträge', () => {
  const z = W.messeStelle(W.FIXTURE_QUELLTEXT, 'renderFixture');
  const kennungen = z.eintraege.map((e) => e.art + ':' + e.kennung).sort();
  assert.deepEqual(kennungen, ['feld:feldX', 'flow:flowFixture', 'knopf:btnA', 'knopf:btnB', 'menue:menuE']);
  assert.equal(z.fundort_alt, '5', 'fundort_alt ist die Zeile der Funktion (Fixture Z. 5)');
});

test('[Funktionsverzeichnis] ein gepflanzter Wegfall (Knopf btnB entfernt) wird als Lücke gemeldet', () => {
  const basis = W.messeStelle(W.FIXTURE_QUELLTEXT, 'renderFixture');
  const text = W.FIXTURE_QUELLTEXT.replace(/.*btnB.*\n/, '');
  const nachher = W.messeStelle(text, 'renderFixture');
  const weg = W.lueckenVergleich(basis, nachher);
  assert.deepEqual(weg.fehlt, ['knopf:btnB']);
  assert.deepEqual(weg.neu, []);
});

test('[Funktionsverzeichnis] eine unbekannte Stelle bricht ab', () => {
  assert.throws(() => W.messeStelle(W.FIXTURE_QUELLTEXT, 'gibtEsNicht'), /nicht gefunden/);
});
