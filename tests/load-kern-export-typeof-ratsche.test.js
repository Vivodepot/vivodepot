'use strict';
/* Klassenvorbeugung zu „renderAngehoerigenBlatt is not defined" (19.09.2026).
   `tests/load-kern.js` gibt den Kern über EXPORT_HOOK aus. Ein NACKTER Name darin (`foo,`) wirft beim Laden
   einen ReferenceError, sobald ein Test einen ÄLTEREN Kern lädt (kernVonCommit, umgelenkter Kern-Pfad), der `foo`
   noch nicht kennt — 37 Proben fielen so rot, erst im Volllauf sichtbar. Regel: ein NEUER Export steht als
   `foo: (typeof foo === 'function' ? foo : undefined)`.
   Die Grundlinie hält die heutigen nackten Namen fest (Positivliste, nur sinkend); jeder neue nackte Name ist ein Fund. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const QUELLE = path.join(__dirname, 'load-kern.js');
const GRUNDLINIE = path.join(__dirname, 'fixtures', 'load-kern-nackte-exporte-grundlinie.json');

function nackteExporte(text) {
  const von = text.indexOf(';__LOAD_KERN_EXPORT__ = {');
  assert.ok(von >= 0, 'EXPORT_HOOK gefunden');
  const namen = [];
  let tiefe = 0, tok = '', i = text.indexOf('{', von) + 1;
  const abschluss = () => { const t = tok.trim(); if (/^[A-Za-z_$][\w$]*$/.test(t)) namen.push(t); tok = ''; };
  for (; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (c === '/' && n === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i = text.indexOf('*/', i + 2) + 1; continue; }
    if (c === '\'' || c === '"') { const q = c; tok += c; i++; while (i < text.length && text[i] !== q) { if (text[i] === '\\') { tok += text[i]; i++; } tok += text[i]; i++; } tok += q; continue; }
    if (c === '(' || c === '[' || c === '{') { tiefe++; tok += c; continue; }
    if (c === ')' || c === ']' || c === '}') { if (tiefe === 0) { abschluss(); break; } tiefe--; tok += c; continue; }
    if (c === ',' && tiefe === 0) { abschluss(); continue; }
    tok += c;
  }
  return namen;
}

const gemessen = () => nackteExporte(fs.readFileSync(QUELLE, 'utf8'));

test('[Export-Ratsche] kein neuer nackter Name im EXPORT_HOOK — neue Exporte sind typeof-abgesichert', () => {
  const grund = new Set(JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8')).nackt);
  const neu = gemessen().filter((n) => !grund.has(n));
  assert.deepEqual(neu, [], 'nackte Exporte außerhalb der Grundlinie (ältere Kerne würfen ReferenceError): ' + neu.join(', ')
    + ' — als `name: (typeof name === \'function\' ? name : undefined)` schreiben');
});

test('[Export-Ratsche] die Grundlinie kann nur sinken: jeder Eintrag ist noch nackt', () => {
  const nackt = new Set(gemessen());
  const veraltet = JSON.parse(fs.readFileSync(GRUNDLINIE, 'utf8')).nackt.filter((n) => !nackt.has(n));
  assert.deepEqual(veraltet, [], 'Einträge, die nicht mehr nackt sind, aus der Grundlinie nehmen: ' + veraltet.join(', '));
});

test('[Export-Ratsche · Positivkontrolle] der Leser erkennt nackte Namen und ignoriert abgesicherte', () => {
  const probe = ';__LOAD_KERN_EXPORT__ = {\n  a, b, // c,\n  /* d, */ e: (typeof e === \'function\' ? e : undefined),\n  get f() { return 1; }, g, h: (x, y),\n};';
  assert.deepEqual(nackteExporte(probe), ['a', 'b', 'g']);
});

test('[Export-Ratsche · Rot-Beweis] ein neuer nackter Name im Text wird gefunden', () => {
  const text = fs.readFileSync(QUELLE, 'utf8').replace(';__LOAD_KERN_EXPORT__ = {', ';__LOAD_KERN_EXPORT__ = {\n  einNeuerNackterName,');
  assert.ok(nackteExporte(text).includes('einNeuerNackterName'));
});
