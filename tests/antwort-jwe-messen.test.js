'use strict';
/* Das Messwerkzeug zu U2-ADR-449 läuft ohne Fremdmodul gegen den RFC-Vektor und die Rundläufe; die Gegenprobe mit `jose` ist
   nur mit --jose <pfad> von außerhalb möglich und gehört nicht in die Suite. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const W = require('../tools/antwort-jwe-messen.js');

test('[Antwort·JWE·Messwerkzeug] ohne Argument: Vektor aus RFC 7518 Anhang C und beide Rundläufe grün', async () => {
  const r = await W.messen({ jose: null });
  assert.equal(r.kdfVektor, true);
  assert.equal(r.rundlaufSchluesselpaar, true);
  assert.equal(r.rundlaufPasswort, true);
  assert.equal(r.jose, undefined);
});

test('[Antwort·JWE·Messwerkzeug·Rot-Beweis] ein unbekanntes Argument wird abgewiesen, nicht übergangen', () => {
  assert.throws(() => W.argumente(['--unbekannt']), /unbekanntes Argument/);
});
