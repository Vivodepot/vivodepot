'use strict';
/* Befund VC-DATEI-JSONWEBSIGNATURE2020 (MITTEL, 11.11.2026): Die VC-Datei des Zertifikators (Einzel-Download und Feld `vc`
   je Stapelzeile) trug das Credential im Klartext mit `proof: { type: 'JsonWebSignature2020', jws }`. Dieser Beweistyp ist
   kein W3C-Standard und im v2-Kontext nicht definiert; ein Prüfer nach ihm erwartet eine abgetrennte JWS über ein
   kanonisiertes Dokument.
   Quelle: W3C Verifiable Credentials Data Model v2.0, W3C Recommendation 15 May 2025, https://www.w3.org/TR/vc-data-model-2.0/,
   Abschnitt 4.13 „Securing Mechanism Specifications" bzw. „Enveloped Verifiable Credentials": ein umschlossenes Credential
   steht als `{ "@context", "id": "data:application/vc+jwt,<jws>", "type": "EnvelopedVerifiableCredential" }`.
   Die Signatur selbst ist VC-JOSE-COSE (W3C Recommendation 13.10.2026), `typ: vc+jwt`.
   Altbestand: schon ausgegebene Dateien mit `proof.jws` bleiben lesbar (tools/lib/zertifikat-datei.js). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeIssuer, webcrypto } = require('./load-issuer.js');
const { zertifikatJwsAusDatei } = require('../tools/lib/zertifikat-datei.js');

const V2 = 'https://www.w3.org/ns/credentials/v2';
const PRAEFIX = 'data:application/vc+jwt,';

function istUmschlag(datei, jws) {
  return !!datei && Array.isArray(datei['@context']) && datei['@context'][0] === V2
    && datei.type === 'EnvelopedVerifiableCredential' && datei.id === PRAEFIX + jws && !('proof' in datei);
}

async function schluessel() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  return { key: kp.privateKey, pub: { kty: pub.kty, crv: pub.crv, x: pub.x } };
}

test('[Umschlag·Einzel] die VC-Datei des Zertifikators ist ein EnvelopedVerifiableCredential, ohne JsonWebSignature2020', async () => {
  const { V } = ladeIssuer();
  assert.equal(typeof V.vcDateiForm, 'function', 'der Issuer hat eine Funktion für die Form der VC-Datei');
  const { key, pub } = await schluessel();
  const vc = V.baueProviderVC({ anbieterId: 'institution/umschlag', anbieterName: 'Umschlag', anbieterTyp: 'institution/test', publicKeyJwk: pub });
  const jws = await V.stelleProviderCredentialAus(vc, key);
  const datei = V.vcDateiForm(jws);
  assert.ok(istUmschlag(datei, jws), JSON.stringify(datei).slice(0, 200));
  assert.equal(JSON.stringify(datei).includes('JsonWebSignature2020'), false);
});

test('[Umschlag·Stapel] jede Stapelzeile trägt in `vc` den Umschlag ihrer certJws', async () => {
  const { V } = ladeIssuer();
  const { key, pub } = await schluessel();
  const template = { felder: [{ feldname: 'Feld', feldtyp: 'text', pflicht: false, bereich: 'gesundheit' }] };
  const templateJws = await V._signJWS(template, key);
  const einreichungJws = await V._signJWS({ submissionId: 's1' }, key);
  const zeilen = [{ nr: 1, gueltig: true, bestaetigt: true, daten: { anbieterId: 'institution/umschlag-de', anbieterName: 'U', anbieterTyp: 'institution/x-de', publicKeyJwk: pub, templates: [template], templatesJws: [templateJws], einreichungJws, submissionId: 's1' } }];
  const lauf = await V.stapelAusstellen(zeilen, (vc) => V.stelleProviderCredentialAus(vc, key), { anbieterPruefung: { abgeschaltet: true } });
  assert.equal(lauf.ausgestellt, 1, JSON.stringify(lauf.zeilen.map((z) => z.grund)));
  const z = lauf.zeilen[0];
  const certJws = z.bundle && (z.bundle.providerCredentialJws || z.bundle.certJws);
  assert.ok(certJws, 'Vorbedingung: das Bündel trägt die JWS');
  assert.ok(istUmschlag(z.vc, certJws), JSON.stringify(z.vc).slice(0, 200));
});

test('[Umschlag·Leser] zertifikat-datei liest die neue Form und weiter den Altbestand mit proof.jws', async () => {
  const { V } = ladeIssuer();
  const { key, pub } = await schluessel();
  const jws = await V.stelleProviderCredentialAus(V.baueProviderVC({ anbieterId: 'a/b', anbieterName: 'A', anbieterTyp: 'institution/test', publicKeyJwk: pub }), key);
  const neu = { '@context': [V2], id: PRAEFIX + jws, type: 'EnvelopedVerifiableCredential' };
  assert.deepEqual(zertifikatJwsAusDatei(neu), { jws, feld: 'id' });
  const alt = { '@context': [V2], issuer: 'did:web:vivodepot.de', proof: { type: 'JsonWebSignature2020', jws } };
  assert.deepEqual(zertifikatJwsAusDatei(alt), { jws, feld: 'proof.jws' });
});

test('[Umschlag·Rot-Beweis] die Regel fällt auf die alte Form und auf einen Umschlag mit fremdem Medientyp', () => {
  const jws = 'a.b.c';
  assert.equal(istUmschlag({ '@context': [V2], proof: { type: 'JsonWebSignature2020', jws } }, jws), false);
  assert.equal(istUmschlag({ '@context': [V2], id: 'data:application/jwt,' + jws, type: 'EnvelopedVerifiableCredential' }, jws), false);
  assert.throws(() => zertifikatJwsAusDatei({ id: 'data:application/jwt,a.b.c', type: 'EnvelopedVerifiableCredential' }), /kein Zertifikat/);
});
