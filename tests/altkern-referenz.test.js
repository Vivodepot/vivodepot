'use strict';
/* Die Referenz der Altkern-Probe wandert mit der letzten Auslieferung (tools/lib/altkern-referenz.js, v894). */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const { referenzWaehlen, referenzLesen } = require('../tools/lib/altkern-referenz.js');

const Z = (fassung, produkt, kanonCommit) => ({ fassung, produkt, kanonCommit, datum: '2026-10-01', sha256: 'x', herkunft: 'probe' });

test('[Altkern-Referenz] die höchste Fassung des Produkts gewinnt, nicht die letzte Zeile', () => {
  const r = referenzWaehlen([Z('v857', 'privat-de', 'aaaaaaa'), Z('v843', 'privat-de', 'bbbbbbb'), Z('v860', 'pro-de', 'ccccccc')]);
  assert.deepEqual(r, { fassung: 'v857', kanonCommit: 'aaaaaaa', produkt: 'privat-de' });
});

test('[Altkern-Referenz·Rot-Beweis] eine letzte Zeile ohne kanonCommit bricht ab, statt still auf eine ältere zu fallen', () => {
  const zeilen = [Z('v843', 'privat-de', 'bbbbbbb'), Z('v857', 'privat-de', undefined)];
  assert.throws(() => referenzWaehlen(zeilen), /v857 von privat-de trägt keinen kanonCommit/);
  assert.equal(referenzWaehlen(zeilen.slice(0, 1)).fassung, 'v843', 'Gegenprobe: mit kanonCommit wird gewählt');
});

test('[Altkern-Referenz·Rot-Beweis] ein Produkt ohne Auslieferung bricht ab', () => {
  assert.throws(() => referenzWaehlen([Z('v843', 'pro-de', 'bbbbbbb')]), /keine Auslieferung von privat-de/);
});

test('[Altkern-Referenz] das echte Register liefert eine Referenz', () => {
  const r = referenzLesen('privat-de');
  assert.match(r.fassung, /^v\d+$/);
  assert.match(r.kanonCommit, /^[0-9a-f]{7,40}$/);
});

test('[Altkern-Referenz] fehlt das Register, bricht das Lesen benannt ab statt mit ENOENT', () => {
  assert.throws(() => referenzLesen('privat-de', '/gibt/es/nicht/fassungen-register.json'), /nur im privaten Repo/);
});
