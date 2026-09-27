'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — U2-ADR-182 Task 5: alle zehn Registertypen über den Vor-Depot-Weg
   (U2-ADR-246, 04.09.2026: `situation` als achtes Register ergänzt ·
   U2-ADR-250, 04.09.2026: `wizard` als neuntes Register ergänzt ·
   U2-ADR-251, 04.09.2026: `ereignisAchse` als zehntes Register ergänzt)
   ────────────────────────────────────────────────────────────────────────
   Belegt, dass JEDER Typ (nicht nur branding/textsatz aus Task 3/4) über
   modulEinlassenGeprueft im Vor-Depot-Ziel landet — derselbe Weg, den
   vorDepotKonfigurationAnwenden tatsächlich fährt (Weg B: signierte
   Bündel, volle Zertifikatskette, s. tests/vor-depot-konfiguration-
   anwenden.test.js). Die Beispiel-Payloads sind gegen die tatsächlichen
   *ModulPruefen-Anforderungen geprüft, nicht aus dem ursprünglichen
   Umsetzungsplan übernommen — der Plan selbst warnte, dass seine Beispiele
   Korrektur brauchen könnten (u. a. textsatz.sprache:'de' ist reserviert,
   format.zuordnung:[] ist leer, logikModul fehlten id/sektor/datenSchema/
   dokAusgabe komplett, rechtsraum fehlte das Feld `rechtsraum` selbst).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

function kern() { return ladeKern().V; }

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-08-28T09:00:00Z';
const OPTS = Object.freeze({ ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });

async function wegwerfKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function anbieterCertRohling(anbieterId, publicKeyJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId, anbieterTyp: 'institution/test', anbieterName: 'Test-Anbieter', publicKeyJwk },
  };
}
async function signieren(V, payload, privJwk) {
  const key = await V._jwsImportSignKey(privJwk);
  return V._signJWS(payload, key, {});
}
async function signiertesBuendel(V, modul) {
  const anbieter = await wegwerfKeypair();
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/alle-register-probe', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  const modulSignaturJws = await signieren(V, modul, anbieter.privJwk);
  return { providerCredentialJws, modulSignaturJws };
}

const { ALLE_REGISTER_BEISPIELE } = require('./helfer/register-beispiele.js');   // eine Liste für beide Tests

for (const r of ALLE_REGISTER_BEISPIELE) {
  test('[VDK-Alle-Register] ' + r.typ + ': signiertes Bündel landet über vorDepotKonfigurationAnwenden im richtigen Slot', async () => {
    const V = kern();
    const buendel = await signiertesBuendel(V, r.modul);
    const ziel = await V.vorDepotKonfigurationAnwenden([buendel], null, OPTS);
    assert.equal(ziel[r.slot].length, 1, r.typ + ' landete nicht im erwarteten Slot ' + r.slot);
  });
}

test('[VDK-Alle-Register·Gegenprobe] dieselbe Schleife mit einer VERFÄLSCHTEN Signatur lässt keinen der zwölf Typen landen', async () => {
  const V = kern();
  for (const r of ALLE_REGISTER_BEISPIELE) {
    const buendel = await signiertesBuendel(V, r.modul);
    const [head, payload, sig] = buendel.modulSignaturJws.split('.');
    buendel.modulSignaturJws = head + '.' + payload + '.' + (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1);
    const ziel = await V.vorDepotKonfigurationAnwenden([buendel], null, OPTS);
    assert.equal(ziel[r.slot].length, 0, r.typ + ' hätte mit verfälschter Signatur NICHT landen dürfen — die Schleife oben belegt also wirklich Verifikation, nicht nur Struktur');
  }
});

test('[VDK-Alle-Register] alle EINLASS_REGISTER-Typen sind in der Beispiel-Liste vertreten', () => {
  const V = kern();
  const registerTypen = V.EINLASS_REGISTER.map((r) => r.typ).sort();
  const beispielTypen = ALLE_REGISTER_BEISPIELE.map((r) => r.typ).sort();
  assert.deepEqual(beispielTypen, registerTypen,
    'Ein neuer Registertyp wurde ergänzt, ohne dieser Liste ein Beispiel hinzuzufügen — sonst deckt dieser Test ihn still nicht ab.');
});
