'use strict';
/* ═══════════════════════════════════════════════════════════════════════
   Klassenwächter: kein Test pinnt die Zahl der Einlass-Register, und die Beispielliste hat einen Ort
   ───────────────────────────────────────────────────────────────────────
   Am 19.09.2026 landete ANG1 als fünfzehntes Register; vier Tests brachen, weil sie „zwölf“ oder „vierzehn“ Register festhielten
   oder eine eigene Kopie der Beispielliste führten (tests/u2-adr-252…, tests/u2-adr-258…, tests/u2-adr-267…, dazu
   tests/vor-depot-konfiguration-alle-register.test.js). Die Zahl sagte nichts, was die Schleife darunter nicht ohnehin prüft.
   Regel: die Register kommen aus V.EINLASS_REGISTER; eine Beispielliste gibt es einmal (tests/helfer/register-beispiele.js).
   Die Muster stehen aus Teilen gefügt da — der Wächter darf sich nicht selbst finden.
   ═══════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ZAHL_GEPINNT = new RegExp('(?:register' + 'Typen|EINLASS_' + 'REGISTER[^\\n;]{0,40})\\.length\\s*,\\s*\\d+');
const EIGENE_LISTE = new RegExp('^const ALLE_' + 'REGISTER_BEISPIELE\\s*=\\s*\\[', 'm');
const EINE_LISTE = 'register-beispiele.js';

function befunde(dateien) {
  const f = [];
  for (const [name, text] of dateien) {
    if (ZAHL_GEPINNT.test(text)) f.push(name + ': pinnt die Zahl der Register');
    if (EIGENE_LISTE.test(text) && !name.endsWith(EINE_LISTE)) f.push(name + ': führt eine eigene Beispielliste');
  }
  return f;
}
function testDateien() {
  const dirs = ['tests', 'tests/helfer'];
  const aus = [];
  for (const d of dirs) {
    for (const n of fs.readdirSync(path.join(__dirname, '..', d))) {
      if (/\.(test\.js|js)$/.test(n) && fs.statSync(path.join(__dirname, '..', d, n)).isFile()) aus.push([d + '/' + n, fs.readFileSync(path.join(__dirname, '..', d, n), 'utf8')]);
    }
  }
  return aus;
}

test('[Register-Zahl] kein Test pinnt die Zahl der Register, und die Beispielliste steht nur in tests/helfer/register-beispiele.js', () => {
  const dateien = testDateien();
  assert.ok(dateien.length > 1000, 'Vorbedingung: die Tests werden gelesen');
  assert.ok(dateien.some(([n]) => n.endsWith(EINE_LISTE)), 'Vorbedingung: die eine Liste existiert');
  assert.deepEqual(befunde(dateien), []);
});

test('[Register-Zahl·Rot-Beweis] eine gepinnte Zahl und eine zweite Beispielliste werden gemeldet, die eine Liste nicht', () => {
  const pin = 'assert.equal(register' + 'Typen.length, 15, "x");';
  const kopie = 'const ALLE_' + 'REGISTER_BEISPIELE = [\n];';
  assert.equal(befunde([['tests/a.test.js', pin]]).length, 1);
  assert.equal(befunde([['tests/b.test.js', kopie]]).length, 1);
  assert.deepEqual(befunde([['tests/helfer/' + EINE_LISTE, kopie]]), []);
  assert.deepEqual(befunde([['tests/c.test.js', 'assert.ok(register' + 'Typen.length >= 14);']]), [], 'eine Untergrenze ist keine Pinnung');
});
