'use strict';
/* marke-eigene-herkunft.test.js — die eigene Marke wird am Inhalt erkannt, nie an einem Herkunftsfeld (Befund MARKE-EIGENE-HERKUNFT-FAERBT-KOPFZEILE,
   07.10.2026). Ein Vor-Depot-Bündel mit Vivodepots eigener Marke ergibt das native Bild (die Kopfzeile bleibt so, wie das Erscheinungsbild sie
   zeichnet); ein Bündel, das sich nur als Vivodepot ausgibt, färbt weiter wie jede Fremdmarke. Dieselbe Klasse wie die Herkunft der Ab-Werk-Module:
   Herkunft nur aus dem eingebauten Fingerabdruck. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Eigene Marke] der eingebaute Inhalt ist die eigene Marke', () => {
  const { V } = ladeKern();
  assert.equal(V._istEigeneMarkeInhalt(Object.assign({}, V.AB_WERK_BRANDING)), true);
  assert.equal(V._istEigeneMarkeInhalt(Object.assign({}, V.AB_WERK_BRANDING, { eingelassenAm: '2026-10-07', ungeprueft: false })), true, 'Merkmale des Ladewegs zählen nicht');
});

test('[Eigene Marke·Rot-Beweis] ein Bündel, das die Vivodepot-Herkunft nur behauptet, ist keine eigene Marke', () => {
  const { V } = ladeKern();
  assert.equal(V._istEigeneMarkeInhalt(Object.assign({}, V.AB_WERK_BRANDING, { farbePrimaer: '#8b1a2b' })), false, 'andere Farbe');
  assert.equal(V._istEigeneMarkeInhalt({ modulTyp: 'branding', moduleVersion: 1, herkunft: 'vivodepot', farbePrimaer: '#8b1a2b' }), false, 'nur das Herkunftsfeld');
  assert.equal(V._istEigeneMarkeInhalt(Object.assign({}, V.AB_WERK_BRANDING, { herkunft: 'test-institut' })), false, 'fremde Herkunft');
  assert.equal(V._istEigeneMarkeInhalt(null), false);
});
