'use strict';
/* Ein Modul so ausliefern, wie eine Institution es mit der Anwendung ausliefert: als Vor-Depot-Konfiguration, signiert,
   gegen den Anker geprüft (`vorDepotKonfigurationAnwenden`). Anker und Anbieter sind Wegwerf-Schlüssel, die nur im
   Arbeitsspeicher dieser Probe entstehen. Gebraucht von Proben, die den legitimen Auslieferungsweg als Gegenstück zum
   roh ins Depot gelegten Modul zeigen (Währung nur aus der Saat). */
const { webcrypto } = require('node:crypto');

async function wegwerfKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
async function signieren(V, payload, privJwk) {
  return V._signJWS(payload, await V._jwsImportSignKey(privJwk), {});
}
async function vorDepotAusliefern(V, modul, anbieterId) {
  const anker = await wegwerfKeypair();
  const anbieter = await wegwerfKeypair();
  const providerCredentialJws = await signieren(V, {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId: anbieterId || 'institution/auslieferung-probe', anbieterTyp: 'institution/test', anbieterName: 'Test-Anbieter', publicKeyJwk: anbieter.pubJwk },
  }, anker.privJwk);
  const modulSignaturJws = await signieren(V, modul, anbieter.privJwk);
  const opts = { ankerJwk: { kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: anker.pubJwk.x }, jetzt: '2026-08-28T09:00:00Z' };
  return V.vorDepotKonfigurationAnwenden([{ providerCredentialJws, modulSignaturJws }], null, opts);
}

module.exports = { vorDepotAusliefern };
