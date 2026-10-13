'use strict';
/* Das Messwerkzeug tools/bereich-eigenschaften-lesestellen-messen.js: es erhebt die Eigenschaften einer Bereichsdefinition je Ebene
   und die Funktionen des Kerns, die sie lesen. Die Einordnung der Eigenschaften (bleibt oder fällt für einen Bereich „aus der
   Datei“) hält tests/mitschrift-bereich-nach-inhalt.test.js; hier steht, dass die Erhebung selbst stimmt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../tools/bereich-eigenschaften-lesestellen-messen.js');

test('[Bereich·Eigenschaften·Messung] Ebenen: Abschnitt, Feld, Unterfeld und Option werden getrennt erhoben', () => {
  const def = { id: 'b', sektionen: [{ id: 's', label: 'S', felder: [
    { id: 'f', typ: 'auswahl', marken: ['frist'], optionen: [{ wert: 'a', label: 'A' }] },
    { id: 'l', typ: 'liste', unterFelder: [{ id: 'u', typ: 'text', rolle: 'x', optionen: [{ wert: 'b', kurz: 'B' }] }] }] }] };
  const e = E.eigenschaftenJeEbene([def]);
  assert.deepEqual([...e.abschnitt].sort(), ['felder', 'id', 'label']);
  assert.deepEqual([...e.feld].sort(), ['id', 'marken', 'optionen', 'typ', 'unterFelder']);
  assert.deepEqual([...e.unterfeld].sort(), ['id', 'optionen', 'rolle', 'typ']);
  assert.deepEqual([...e.option].sort(), ['kurz', 'label', 'wert']);
  assert.deepEqual(E.definitionenAus({ modulTyp: 'bereich', bereiche: { b: def } }), [def]);
  assert.deepEqual(E.definitionenAus({ neu: { b: def } }), [def]);
});

test('[Bereich·Eigenschaften·Messung] Lesestellen: die umschließende Funktion und die Zeile, ohne Kommentar und Zeichenkette', () => {
  const kern = [
    "const LISTE = Object.freeze(['eins', 'zwei']);   // 'drei' steht nur im Kommentar",
    'function erste(f) {',
    '  /* f.marken im Kommentar */',
    "  return f.marken && 'f.marken als Text';",
    '}',
    'function zweite(f) { return f.marken.length + f.marken[0]; }',
    'function dritte(o) { return { marken: 1 }; }',
  ].join('\n');
  assert.deepEqual(E.schluesselListe(kern, 'LISTE'), ['eins', 'zwei']);
  const r = E.lesestellenImKern(kern, ['marken', 'fehlt']);
  assert.equal(r.marken.lesestellen, 3);
  assert.deepEqual(r.marken.funktionen, [{ name: 'erste', zeile: 4 }, { name: 'zweite', zeile: 6 }]);
  assert.equal(r.fehlt.lesestellen, 0);
});

test('[Bereich·Eigenschaften·Messung·Rot-Beweis] eine Eigenschaft, die nur als Schlüssel geschrieben oder nur im Kommentar genannt wird, ist keine Lesestelle', () => {
  const kern = ['function schreibt(o) { return { marken: [1], rolle: o }; }', 'function nennt(f) { /* f.marken, f.rolle */ return 1; }', 'function liest(f) { return f.rolle; }'].join('\n');
  const r = E.lesestellenImKern(kern, ['marken', 'rolle']);
  assert.equal(r.marken.lesestellen, 0, 'geschrieben und genannt, nie gelesen');
  assert.deepEqual(r.rolle.funktionen, [{ name: 'liest', zeile: 3 }], 'gelesen nur in der einen Funktion');
  /* Gegenstück: zählte man jedes Vorkommen des Namens, wären es je zwei bzw. drei Stellen. */
  assert.equal((kern.match(/marken/g) || []).length, 2);
  assert.equal((kern.match(/rolle/g) || []).length, 3);
});
