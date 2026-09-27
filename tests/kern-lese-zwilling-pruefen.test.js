'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Kern↔Lese-App-Zwillinge: Form 1/2/3 generisch geprüft (17.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Landkarte, kein Halt: rund 35 handkopierte Stellen zwischen vivodepot.html
   und vivodepot-lesen.html, Auftrag Teil 2. Gemessen statt geraten — s. den
   Kopf-Kommentar an tools/kern-lese-zwilling-pruefen.js für die volle
   Begründung, welche drei Formen generisch gehen und welche fünf Fälle
   NICHT.

   ROT-BEWEIS je Vergleicher — mit ERFUNDENEN Paaren, unabhängig vom
   aktuellen Stand von Kern und Lese-App (der Strang, der dafür als Vorbild
   diente, wurde am 17.09.2026 auf ausdrückliche Entscheidung gestoppt und
   nie gelandet — kein Verweis mehr darauf): ein Objekt, das eine der drei
   Formen absichtlich verletzt, wird gefunden; dieselbe Verletzung
   zurückgenommen bleibt still.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  KONSTANTEN, NULLSTELLIG, EINFACHER_STRING,
  vergleicheKonstante, vergleicheNullstellig, vergleicheEinfacherString,
} = require('../tools/kern-lese-zwilling-pruefen.js');
const { ladeKern } = require('./load-kern.js');
const { ladeLesen } = require('./load-lesen.js');

test('[Zwilling] die heute eingetragenen Form-1/2/3-Paare weichen zwischen Kern und Lese-App nicht ab', () => {
  const { V: K } = ladeKern();
  const { V: L } = ladeLesen();
  const fehler = [];
  for (const e of KONSTANTEN) vergleicheKonstante(K, L, e, fehler);
  for (const e of NULLSTELLIG) vergleicheNullstellig(K, L, e, fehler);
  for (const e of EINFACHER_STRING) vergleicheEinfacherString(K, L, e, fehler);
  assert.deepEqual(fehler, []);
});

test('[Zwilling] alle eingetragenen Paare existieren wirklich in beiden Dateien — kein toter Eintrag', () => {
  const { V: K } = ladeKern();
  const { V: L } = ladeLesen();
  for (const e of [...KONSTANTEN, ...NULLSTELLIG, ...EINFACHER_STRING]) {
    const kernName = e.kern || e.lese;
    assert.ok(kernName in K, e.lese + ': Kern-Name "' + kernName + '" ist nicht exportiert (tests/load-kern.js).');
    assert.ok(e.lese in L, e.lese + ': nicht in der Lese-App exportiert (tests/load-lesen.js).');
  }
});

test('[Zwilling·Rot-Beweis] Form Konstante: eine abweichende Konstante wird gefunden', () => {
  const K = { X: Object.freeze([1, 2, 3]) };
  const L = { X: Object.freeze([1, 2, 4]) };
  const fehler = [];
  vergleicheKonstante(K, L, { lese: 'X' }, fehler);
  assert.equal(fehler.length, 1);
});

test('[Zwilling·Gegenprobe] Form Konstante: identische Konstanten bleiben still', () => {
  const K = { X: Object.freeze([1, 2, 3]) };
  const L = { X: Object.freeze([1, 2, 3]) };
  const fehler = [];
  vergleicheKonstante(K, L, { lese: 'X' }, fehler);
  assert.deepEqual(fehler, []);
});

test('[Zwilling·Rot-Beweis] Form Nullstellig: eine abweichende Ausgabe wird gefunden', () => {
  const K = { f: () => 'kern' };
  const L = { f: () => 'lese' };
  const fehler = [];
  vergleicheNullstellig(K, L, { lese: 'f' }, fehler);
  assert.equal(fehler.length, 1);
});

test('[Zwilling·Rot-Beweis] Form Nullstellig: unterschiedliche Stelligkeit wird gefunden, auch bei gleicher Ausgabe ohne Argument', () => {
  const K = { f: () => 'x' };
  const L = { f: (_a) => 'x' };
  const fehler = [];
  vergleicheNullstellig(K, L, { lese: 'f' }, fehler);
  assert.ok(fehler.some((f) => f.includes('Stelligkeit')));
});

test('[Zwilling·Gegenprobe] Form Nullstellig: identisches Verhalten bleibt still', () => {
  const K = { f: () => ({ a: 1 }) };
  const L = { f: () => ({ a: 1 }) };
  const fehler = [];
  vergleicheNullstellig(K, L, { lese: 'f' }, fehler);
  assert.deepEqual(fehler, []);
});

test('[Zwilling·Rot-Beweis] Form Einfacher-String: eine Probe aus dem Korpus deckt die Abweichung auf', () => {
  const K = { f: (s) => (s || '').toUpperCase() };
  const L = { f: (s) => (s || '').toLowerCase() }; // absichtlich falsch
  const fehler = [];
  vergleicheEinfacherString(K, L, { lese: 'f', korpus: ['abc'] }, fehler);
  assert.equal(fehler.length, 1);
  assert.match(fehler[0], /1 von 1 Proben/);
});

test('[Zwilling·Gegenprobe] Form Einfacher-String: identisches Verhalten über den ganzen Korpus bleibt still', () => {
  const fn = (s) => String(s == null ? '' : s).toUpperCase();
  const fehler = [];
  vergleicheEinfacherString({ f: fn }, { f: fn }, { lese: 'f', korpus: ['a', '', null, undefined, 'Ä'] }, fehler);
  assert.deepEqual(fehler, []);
});

test('[Zwilling·Rot-Beweis] Form Einfacher-String mit korpusPaare (mehrere Argumente): eine Abweichung wird gefunden', () => {
  const K = { f: (a, b) => a + '|' + b };
  const L = { f: (a, b) => a + '-' + b };
  const fehler = [];
  vergleicheEinfacherString(K, L, { lese: 'f', korpusPaare: [['x', 'y']] }, fehler);
  assert.equal(fehler.length, 1);
});

test('[Zwilling] ein fehlender Name in einer der beiden Dateien wird benannt gemeldet, nicht stillschweigend übersprungen', () => {
  const K = {};
  const L = { f: () => null };
  const fehlerNull = [];
  vergleicheNullstellig(K, L, { lese: 'f', kern: 'gibtEsNicht' }, fehlerNull);
  assert.equal(fehlerNull.length, 1);
  assert.match(fehlerNull[0], /fehlt in Kern \(gibtEsNicht\)/);
});
