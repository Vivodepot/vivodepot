'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   schema-pruefer-schluesselwoerter.test.js — der kleine Schema-Prüfer kennt jedes Schlüsselwort, das seine Schemas benutzen
   ───────────────────────────────────────────────────────────────────────────
   Befund 13.10.2026: Studio und Ausgabestelle prüfen Einreichungen und Anfragen mit einem eigenen, abhängigkeitsfreien
   Prüfer (`_validateSchema`). Er kannte `minimum` nicht und überging es ohne Fehler: `"minimum": 1` an anfrageVersion
   und appVersion war toter Text, eine 0 ging durch. Diese Probe fand im selben Zug fünf weitere: oneOf,
   maxItems, minProperties, propertyNames und additionalProperties als Schema (das mehrsprachige feldname, das Muster
   der templatesJws, die Obergrenzen der Listen). Dasselbe war am 13.09.2026 mit `anyOf` geschehen.

   ZUGESICHERT, je mit Rot-Beweis:
     1 · Jedes Schlüsselwort, das ein vom Prüfer geprüftes Schema benutzt, wertet der Prüfer aus oder steht in der kurzen
         Liste der Angaben ohne Prüfwirkung (description, format …). Gelesen am Schema selbst, nicht aus einer Handliste.
         `additionalProperties` als Schema zählt eigens: das Wort allein kannte der Prüfer, nur die Form `false`.
     2 · Die nachgezogenen Schlüsselwörter greifen, in Studio und Ausgabestelle gleich, auch am echten Schema.
   ═══════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');
const { ladeIssuer } = require('./load-issuer.js');

const REPO = path.join(__dirname, '..');

/* Angaben, die ein Schema tragen darf, ohne dass der Prüfer sie auswertet. `format` ist ausdrücklich beratend. */
const OHNE_PRUEFWIRKUNG = new Set(['$schema', '$id', '$comment', 'title', 'description', 'format', 'examples', 'default']);

/* Alle Schlüsselwörter eines Schemas, rekursiv. Unter `properties` sind die Schlüssel Feldnamen, keine Schlüsselwörter. */
function schluesselwoerter(schema, aus = new Set()) {
  if (Array.isArray(schema)) { schema.forEach((s) => schluesselwoerter(s, aus)); return aus; }
  if (!schema || typeof schema !== 'object') return aus;
  for (const [k, v] of Object.entries(schema)) {
    aus.add(k);
    if (k === 'properties') Object.values(v).forEach((s) => schluesselwoerter(s, aus));
    else if (k !== 'enum' && k !== 'const' && k !== 'required' && k !== 'examples' && k !== 'default') schluesselwoerter(v, aus);
  }
  return aus;
}

/* Was der Prüfer auswertet: jedes `schema.<wort>` im Rumpf der Funktion, gelesen aus der Quelldatei. */
function ausgewertet(quelle, name) {
  const ab = quelle.indexOf('function ' + name + '(');
  assert.ok(ab > 0, name + ' gefunden');
  const rumpf = quelle.slice(ab, quelle.indexOf('\n}\n', ab));
  return new Set([...rumpf.matchAll(/\bschema\.(\w+)/g)].map((m) => m[1]));
}

function unbekannt(schemas, kennt) {
  const benutzt = new Set();
  schemas.forEach((s) => schluesselwoerter(s, benutzt));
  return [...benutzt].filter((k) => !kennt.has(k) && !OHNE_PRUEFWIRKUNG.has(k)).sort();
}

const PRUEFER = [
  ['Studio', 'vivodepot-studio.html', () => { const { V } = ladeGenerator(); return [V.SUBMISSION_SCHEMA, V.ANFRAGE_SCHEMA]; }],
  ['Ausgabestelle', 'vivodepot-vc-issuer.html', () => { const { V } = ladeIssuer(); return [V.SUBMISSION_SCHEMA]; }],
];

test('[Schema-Prüfer·Schlüsselwörter] jedes Schlüsselwort der geprüften Schemas wertet der Prüfer aus', () => {
  for (const [name, datei, schemas] of PRUEFER) {
    const kennt = ausgewertet(fs.readFileSync(path.join(REPO, datei), 'utf8'), '_validateSchema');
    assert.ok(kennt.has('minimum') && kennt.has('anyOf'), name + ': Kontrolle, die Auswertung wird gelesen');
    assert.deepEqual(unbekannt(schemas(), kennt), [], name + ': Schlüsselwörter, die der Prüfer still übergeht');
    const quelle = fs.readFileSync(path.join(REPO, datei), 'utf8');
    if (JSON.stringify(schemas()).includes('"additionalProperties":{')) {
      assert.ok(quelle.includes("typeof schema.additionalProperties === 'object'"), name + ': additionalProperties als Schema wird ausgewertet');
    }
  }
});

test('[Schema-Prüfer·Schlüsselwörter·Rot-Beweis] ein Schlüsselwort, das der Prüfer nicht kennt, fällt auf', () => {
  const kennt = ausgewertet(fs.readFileSync(path.join(REPO, 'vivodepot-studio.html'), 'utf8'), '_validateSchema');
  const schema = { type: 'object', properties: { minimum: { type: 'integer', exclusiveMinimum: 0 } } };
  assert.deepEqual(unbekannt([schema], kennt), ['exclusiveMinimum'], 'der Feldname „minimum“ zählt nicht, das Schlüsselwort schon');
  const ohneMinimum = new Set([...kennt].filter((k) => k !== 'minimum'));
  assert.deepEqual(unbekannt([{ type: 'integer', minimum: 1 }], ohneMinimum), ['minimum'], 'der Stand vor dem 13.10.2026');
});

test('[Schema-Prüfer·minimum/maximum] die Grenzen greifen, in Studio und Ausgabestelle gleich', () => {
  const pruefer = [ladeGenerator().V._validateSchema, ladeIssuer().V._validateSchema];
  const schema = { type: 'integer', minimum: 1, maximum: 9 };
  for (const pruefe of pruefer) {
    for (const [wert, gilt] of [[1, true], [9, true], [0, false], [10, false], [-1, false]]) {
      assert.equal(pruefe(schema, wert).length === 0, gilt, String(wert));
    }
  }
  // Am echten Schema: eine Anfrage mit anfrageVersion 0 fällt.
  const { V } = ladeGenerator();
  const anfrage = JSON.parse(JSON.stringify(V.ANFRAGE_SCHEMA.properties.anfrageVersion));
  assert.deepEqual(anfrage.minimum, 1, 'Kontrolle: das Schema verlangt mindestens 1');
  assert.ok(V._validateSchema(anfrage, 0).length > 0, 'anfrageVersion 0');
  assert.equal(V._validateSchema(anfrage, 1).length, 0, 'anfrageVersion 1');
});

test('[Schema-Prüfer·nachgezogen] oneOf, propertyNames, minProperties, additionalProperties als Schema und maxItems greifen am echten Schema', () => {
  for (const [name, V] of [['Studio', ladeGenerator().V], ['Ausgabestelle', ladeIssuer().V]]) {
    const vorlage = V.SUBMISSION_SCHEMA.properties.templates.items.properties;
    const feldname = vorlage.felder.items.properties.feldname;
    for (const [wert, gilt] of [['Name', true], ['', false], [{ de: 'Name', en: 'Name' }, true], [{}, false],
      [{ DE: 'Name' }, false], [{ de: '' }, false], [{ de: 3 }, false], [7, false]]) {
      assert.equal(V._validateSchema(feldname, wert).length === 0, gilt, name + ' feldname ' + JSON.stringify(wert));
    }
    const jws = V.SUBMISSION_SCHEMA.properties.templatesJws.items;
    for (const [wert, gilt] of [['a.b.c', true], [null, true], ['kein-jws', false], [3, false]]) {
      assert.equal(V._validateSchema(jws, wert).length === 0, gilt, name + ' templatesJws ' + JSON.stringify(wert));
    }
    const codeListen = vorlage.codeListen;
    assert.equal(codeListen.maxItems, 20, name + ': Kontrolle');
    assert.ok(V._validateSchema({ type: 'array', maxItems: 20 }, new Array(21).fill('x')).length > 0, name + ' maxItems');
    // oneOf heißt genau eine: passen zwei Alternativen, fällt der Wert.
    assert.ok(V._validateSchema({ oneOf: [{ type: 'string' }, { type: 'string', minLength: 1 }] }, 'x').length > 0, name + ' oneOf zwei Treffer');
  }
});
