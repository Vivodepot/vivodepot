'use strict';
/* Das Messwerkzeug zu U2-ADR-457 läuft ohne Fremdmodul gegen die Normvektoren und die eigene Ausgabe; die Gegenprobe mit
   `jose` ist nur mit --jose <pfad> von außerhalb möglich und gehört nicht in die Suite. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const W = require('../tools/sdjwt-selbstsignatur-messen.js');

test('[SD-JWT·Selbstsignatur·Messwerkzeug] ohne Argument: RFC-8037- und RFC-9901-Vektoren und die eigene Ausgabe grün', async () => {
  const r = await W.messen({ jose: null });
  assert.equal(r.thumbprintVektor, true);
  assert.equal(r.signaturVektor, true);
  assert.equal(r.digestVektor, true);
  assert.equal(r.kernPrueftSelbst, true);
  assert.match(r.ausstellerVertrauen, /nicht gegeben/);
  assert.equal(r.jose, undefined);
});

test('[SD-JWT·Selbstsignatur·Messwerkzeug·Rot-Beweis] ein unbekanntes Argument wird abgewiesen, nicht übergangen', () => {
  assert.throws(() => W.argumente(['--unbekannt']), /unbekanntes Argument/);
});
