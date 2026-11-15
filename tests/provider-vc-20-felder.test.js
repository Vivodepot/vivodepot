'use strict';
/* Probe PROVIDER-VC-DATUMSFELDER (Befund MITTEL, 11.11.2026).
   Quelle: W3C Verifiable Credentials Data Model v2.0, W3C Recommendation 15 May 2025, https://www.w3.org/TR/vc-data-model-2.0/,
   Abschnitt 4.9 „Validity Period“: Der Gültigkeitszeitraum steht in `validFrom` und `validUntil`. `issuanceDate` und
   `expirationDate` sind Begriffe aus VC Data Model v1.1 und im Kontext https://www.w3.org/ns/credentials/v2 nicht definiert.
   Der VC-Issuer setzt den v2-Kontext. Darum muss das Zertifikat die v2-Namen tragen.
   Altbestand: Schon ausgestellte Zertifikate tragen die alten Namen. Der Kern liest beide und lässt beide ablaufen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { ladeIssuer, webcrypto } = require('./load-issuer.js');

const V2 = 'https://www.w3.org/ns/credentials/v2';
const ALTE_NAMEN = ['issuanceDate', 'expirationDate'];

// Dieselbe Regel, die der Bau erfüllen muss: Wer den v2-Kontext setzt, trägt keine v1.1-Namen und hat `validFrom`.
function v2Datumsfehler(vc) {
  const ctx = Array.isArray(vc['@context']) ? vc['@context'] : [vc['@context']];
  if (!ctx.includes(V2)) return [];
  const fehler = ALTE_NAMEN.filter((k) => k in vc).map((k) => k + ' im v2-Kontext');
  if (!('validFrom' in vc)) fehler.push('validFrom fehlt');
  return fehler;
}

async function zertifikat(ISSUER, vcAendern) {
  const anker = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const kunde = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  let vc = ISSUER.baueProviderVC({
    issuer: 'did:web:vivodepot.de', anbieterId: 'institution/test-vc20', anbieterName: 'Test VC 2.0', anbieterTyp: 'institution/test',
    publicKeyJwk: await webcrypto.subtle.exportKey('jwk', kunde.publicKey),
    issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
  });
  if (vcAendern) vc = vcAendern(JSON.parse(JSON.stringify(vc)));
  const jws = await ISSUER.stelleProviderCredentialAus(vc, await ISSUER._jwsImportSignKey(await webcrypto.subtle.exportKey('jwk', anker.privateKey)));
  return { vc, jws, ankerPub: await webcrypto.subtle.exportKey('jwk', anker.publicKey) };
}

test('[VC20·Datum] das ausgestellte Zertifikat trägt im v2-Kontext validFrom und validUntil, keine v1.1-Namen', () => {
  const ISSUER = ladeIssuer().V;
  const vc = ISSUER.baueProviderVC({
    issuer: 'did:web:vivodepot.de', anbieterId: 'institution/x', anbieterName: 'X', anbieterTyp: 'institution/test',
    publicKeyJwk: { kty: 'OKP', crv: 'Ed25519', x: 'AA' }, issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
  });
  assert.ok(vc['@context'].includes(V2), 'Vorbedingung: der Issuer setzt den v2-Kontext');
  assert.deepEqual(v2Datumsfehler(vc), []);
  assert.equal(vc.validFrom, '2026-01-01T00:00:00Z');
  assert.equal(vc.validUntil, '2027-01-01T00:00:00Z');
});

test('[VC20·Rot-Beweis] die Regel fällt auf ein Objekt mit v1.1-Namen und lässt das richtige durch', () => {
  assert.deepEqual(v2Datumsfehler({ '@context': [V2], issuanceDate: 'a', expirationDate: 'b' }),
    ['issuanceDate im v2-Kontext', 'expirationDate im v2-Kontext', 'validFrom fehlt']);
  assert.deepEqual(v2Datumsfehler({ '@context': [V2], validFrom: 'a', validUntil: 'b' }), []);
  assert.deepEqual(v2Datumsfehler({ '@context': ['https://www.w3.org/2018/credentials/v1'], issuanceDate: 'a' }), [], 'v1.1 bleibt v1.1');
});

test('[VC20·Kreislauf] der Kern nimmt das neue Zertifikat an und lässt es nach validUntil ablaufen', async () => {
  const ISSUER = ladeIssuer().V;
  const { jws, ankerPub } = await zertifikat(ISSUER);
  const { V } = ladeKern();
  const gilt = await V.verifiziereProviderCredential(jws, { ankerJwk: ankerPub, jetzt: '2026-06-01T00:00:00Z' });
  assert.equal(gilt.gueltig, true, String(gilt.grund || ''));
  const ab = await V.verifiziereProviderCredential(jws, { ankerJwk: ankerPub, jetzt: '2027-06-01T00:00:00Z' });
  assert.equal(ab.gueltig, false, 'nach validUntil abgelaufen');
});

test('[VC20·Altbestand] ein Zertifikat mit den alten Namen wird weiter geprüft und läuft ab', async () => {
  const ISSUER = ladeIssuer().V;
  const alt = (vc) => {
    const von = vc.validFrom || vc.issuanceDate; const bis = vc.validUntil || vc.expirationDate;
    delete vc.validFrom; delete vc.validUntil;
    return Object.assign(vc, { issuanceDate: von, expirationDate: bis });
  };
  const { jws, ankerPub } = await zertifikat(ISSUER, alt);
  const { V } = ladeKern();
  assert.equal((await V.verifiziereProviderCredential(jws, { ankerJwk: ankerPub, jetzt: '2026-06-01T00:00:00Z' })).gueltig, true);
  assert.equal((await V.verifiziereProviderCredential(jws, { ankerJwk: ankerPub, jetzt: '2027-06-01T00:00:00Z' })).gueltig, false);
});
