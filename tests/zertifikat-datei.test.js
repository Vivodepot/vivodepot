'use strict';
/* tools/lib/zertifikat-datei.js — ein Zertifikat aus certJws, proof.jws oder providerCredentialJws (16.09.2026).
   Frei erfundene JWS-Formen, keine Signatur: der Leser prüft nicht, er findet nur das Feld. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { zertifikatJwsAusDatei, FELDER } = require('../tools/lib/zertifikat-datei.js');

const JWS = 'eyJhbGciOiJFZERTQSJ9.eyJ4IjoxfQ.c2lnbmF0dXI';
const ANDERE = 'eyJhbGciOiJFZERTQSJ9.eyJ4IjoyfQ.c2lnbmF0dXI';

test('[Zertifikatsdatei] alle drei Formen der Erzeuger liefern dieselbe JWS und nennen ihr Feld', () => {
  assert.deepEqual(FELDER, ['certJws', 'proof.jws', 'providerCredentialJws']);
  assert.deepEqual(zertifikatJwsAusDatei({ certJws: JWS }), { jws: JWS, feld: 'certJws' });
  assert.deepEqual(zertifikatJwsAusDatei({ issuer: 'did:web:vivodepot.de', credentialSubject: {}, proof: { type: 'JsonWebSignature2020', jws: JWS } }), { jws: JWS, feld: 'proof.jws' });
  assert.deepEqual(zertifikatJwsAusDatei({ providerCredentialJws: JWS, templateJws: ANDERE }), { jws: JWS, feld: 'providerCredentialJws' });
  assert.equal(zertifikatJwsAusDatei({ certJws: JWS, ausstellerZertifikatJws: ANDERE }).jws, JWS, 'das Kunden-Bündel: certJws, nicht das Aussteller-Zertifikat daneben');
  assert.equal(zertifikatJwsAusDatei({ certJws: JWS, providerCredentialJws: JWS }).jws, JWS, 'gleiche JWS in zwei Feldern ist eindeutig');
});

test('[Zertifikatsdatei·Rot-Beweis] keine JWS, eine kaputte JWS oder zwei verschiedene Zertifikate — benannter Abbruch', () => {
  assert.throws(() => zertifikatJwsAusDatei({ anbieterId: 'x' }), /kein Zertifikat: erwartet eine JWS in „certJws", „proof\.jws"[^]*„providerCredentialJws"/);
  assert.throws(() => zertifikatJwsAusDatei({ proof: { jws: 'nur.zwei' } }), /gefunden, aber keine JWS: proof\.jws/);
  assert.throws(() => zertifikatJwsAusDatei({ certJws: 'a.b.c d' }), /kein Zertifikat/);
  assert.throws(() => zertifikatJwsAusDatei(null), /kein JSON-Objekt/);
  assert.throws(() => zertifikatJwsAusDatei({ certJws: JWS, proof: { jws: ANDERE } }), /verschiedene Zertifikate in certJws und proof\.jws/);
});
