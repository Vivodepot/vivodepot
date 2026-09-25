'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — vivodepot-vc-issuer.html: Vor-Depot-Konfiguration (U2-ADR-182,
   xShare/IHE, 28.08.2026), direkter Anker-Weg ("vivodepot/kern")
   ────────────────────────────────────────────────────────────────────────
   Nutzt den bestehenden F-2-Schlüsselweg (onKeyDatei) — kein zweites
   Schlüssel-Feld. Signiert NUR den Modul-Inhalt neu; das "vivodepot/kern"-
   Zertifikat selbst ist ein fertig mitgebrachtes Ceremony-Ergebnis (hier im
   Test: gegen einen Wegwerf-Sentinel-Anker signiert, wie überall sonst).

   DER STÄRKSTE BELEG (letzter Test): das von dieser Seite erzeugte Bündel
   läuft durch den ECHTEN Kern-Weg (modulEinlassenGeprueft) und wird dort
   tatsächlich angenommen — Ausgabe des Issuers, Eingabe des Kerns, dieselbe
   Kette, kein Modell nachgebaut.

   Wegwerf-Schlüssel, Wegwerf-Sentinel-Anker. KEY tabu.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeIssuer } = require('./load-issuer.js');
const { ladeKern, webcrypto } = require('./load-kern.js');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });

async function wegwerfKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function kernZertRohling(anbieterId, anbieterTyp, publicKeyJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2036-01-01T00:00:00Z',
    credentialSubject: { anbieterId, anbieterTyp, anbieterName: 'Vivodepot (xShare)', publicKeyJwk },
  };
}
async function signieren(V, payload, privJwk) {
  const key = await V._jwsImportSignKey(privJwk);
  return V._signJWS(payload, key, {});
}
const EN_MODUL = Object.freeze({ modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1, anbieterId: 'vivodepot', texte: { 'strings:btnAbbrechen.text': 'Cancel' } });

test('[VorabKonf-Issuer] baueVorDepotBuendel signiert den Modul-Inhalt mit dem übergebenen Schlüssel', async () => {
  const { V } = ladeIssuer();
  const kp = await wegwerfKeypair();
  const signKey = await V._jwsImportSignKey(kp.privJwk);
  const buendel = await V.baueVorDepotBuendel(signKey, 'irgendeine.cert.jws', EN_MODUL);
  assert.equal(buendel.providerCredentialJws, 'irgendeine.cert.jws');
  const verifyKey = await V._jwsImportVerifyKey(kp.pubJwk);
  const pruef = await V._verifyJWS(buendel.modulSignaturJws, verifyKey, {});
  assert.equal(pruef.gueltig, true);
  // JSON-Vergleich statt deepEqual: ladeIssuer() laeuft in einem echten vm-Realm — Objekte von
  // dort tragen einen anderen Object.prototype, deepEqual faellt auf "same structure but not
  // reference-equal" auch bei inhaltlich identischen Werten (bekannte Falle dieses Harnischs).
  assert.equal(JSON.stringify(pruef.nutzlast), JSON.stringify(EN_MODUL));
});

test('[VorabKonf-Issuer] vorDepotKonfigurationDateiInhalt erzeugt GENAU eine simple Zuweisung, kein weiterer Code', () => {
  const { V } = ladeIssuer();
  const buendel = { providerCredentialJws: 'a.b.c', modulSignaturJws: 'd.e.f' };
  const inhalt = V.vorDepotKonfigurationDateiInhalt([buendel]);
  assert.match(inhalt, /^window\.__vorDepotKonfiguration = \[/);
  assert.doesNotMatch(inhalt, /function|=>|require\(|eval\(/,
    'Sicherheitsbedingung des ADR: kein Funktionsaufruf, kein dynamischer Code in der Datei');
  // Die Datei muss ihrerseits gültiges JSON tragen (nur die Zuweisung drumherum ist JS) —
  // genau das, was der Kern-Ladeweg am Ende auswertet.
  const jsonTeil = inhalt.slice(inhalt.indexOf('['), inhalt.lastIndexOf(']') + 1);
  assert.deepEqual(JSON.parse(jsonTeil), [buendel]);
});

test('[VorabKonf-Issuer] liesVordepotZertifikatJws: leer ist ein Fehler (Pflichtfeld, anders als die Zwischenstufe)', () => {
  const { V, document } = ladeIssuer();
  document.getElementById('vordepotZertifikatText').value = '';
  const r = V.liesVordepotZertifikatJws();
  assert.equal(r.ok, false);
});

test('[VorabKonf-Issuer] liesVordepotZertifikatJws: akzeptiert {certJws} UND die rohe JWS direkt', () => {
  const { V, document } = ladeIssuer();
  document.getElementById('vordepotZertifikatText').value = JSON.stringify({ certJws: 'a.b.c' });
  let r = V.liesVordepotZertifikatJws();
  assert.equal(r.ok, true); assert.equal(r.jws, 'a.b.c');
  document.getElementById('vordepotZertifikatText').value = 'x.y.z';
  r = V.liesVordepotZertifikatJws();
  assert.equal(r.ok, true); assert.equal(r.jws, 'x.y.z');
});

test('[VorabKonf-Issuer] onVordepotErzeugen: ohne geladenen Schlüssel (F-2) bricht ab', async () => {
  const { V, document } = ladeIssuer();
  document.getElementById('vordepotZertifikatText').value = 'a.b.c';
  await V.onVordepotModulDatei({ text: async () => JSON.stringify(EN_MODUL) });
  await V.onVordepotErzeugen();
  assert.match(document.getElementById('vordepotStatus').textContent, /F-2/);
  assert.equal(V._letztesVordepotBuendelLesen(), null);
});

test('[VorabKonf-Issuer] Regelfall: F-2-Schlüssel + passendes Zertifikat + Modul → Bündel wird gebaut, verifiziert gegen den Sentinel-Anker', async () => {
  const { V, document } = ladeIssuer();
  const kern = await wegwerfKeypair();
  await V.onKeyDatei({ text: async () => JSON.stringify(kern.privJwk) });
  assert.match(document.getElementById('keyStatus').textContent, /geladen/, 'Vorbedingung: Schlüssel geladen');

  const zertifikatJws = await signieren(V, kernZertRohling('vivodepot/kern', 'vivodepot/kern', kern.pubJwk), SENTINEL_PRIVATE_JWK);
  document.getElementById('vordepotZertifikatText').value = zertifikatJws;
  await V.onVordepotModulDatei({ text: async () => JSON.stringify(EN_MODUL) });
  assert.match(document.getElementById('vordepotModulStatus').textContent, /geladen/);

  await V.onVordepotErzeugen();
  assert.match(document.getElementById('vordepotStatus').textContent, /erzeugt/, document.getElementById('vordepotStatus').textContent);

  const buendel = V._letztesVordepotBuendelLesen();
  assert.ok(buendel, 'ein Bündel wurde erzeugt');
  assert.equal(buendel.providerCredentialJws, zertifikatJws);

  const verifyKey = await V._jwsImportVerifyKey(SENTINEL_PUBLIC_JWK);
  const zertPruef = await V._verifyJWS(buendel.providerCredentialJws, verifyKey, {});
  assert.equal(zertPruef.gueltig, true, 'das mitgereichte Zertifikat verifiziert gegen den (Sentinel-)Anker');
});

test('[VorabKonf-Issuer·Rot-Beweis] Zertifikat gehört NICHT zum geladenen Schlüssel → Abbruch, kein Bündel', async () => {
  const { V, document } = ladeIssuer();
  const kern = await wegwerfKeypair();
  const andererKern = await wegwerfKeypair(); // NICHT der geladene Schlüssel
  await V.onKeyDatei({ text: async () => JSON.stringify(kern.privJwk) });

  const zertifikatJws = await signieren(V, kernZertRohling('vivodepot/kern', 'vivodepot/kern', andererKern.pubJwk), SENTINEL_PRIVATE_JWK);
  document.getElementById('vordepotZertifikatText').value = zertifikatJws;
  await V.onVordepotModulDatei({ text: async () => JSON.stringify(EN_MODUL) });

  await V.onVordepotErzeugen();
  assert.match(document.getElementById('vordepotStatus').textContent, /gehört nicht zum geladenen Schlüssel/);
  assert.equal(V._letztesVordepotBuendelLesen(), null);
});

test('[VorabKonf-Issuer·DER BELEG] das erzeugte Bündel wird vom ECHTEN Kern (modulEinlassenGeprueft) tatsächlich angenommen', async () => {
  const { V: ISSUER, document } = ladeIssuer();
  const kern = await wegwerfKeypair();
  await ISSUER.onKeyDatei({ text: async () => JSON.stringify(kern.privJwk) });
  const zertifikatJws = await signieren(ISSUER, kernZertRohling('vivodepot/kern', 'vivodepot/kern', kern.pubJwk), SENTINEL_PRIVATE_JWK);
  document.getElementById('vordepotZertifikatText').value = zertifikatJws;
  await ISSUER.onVordepotModulDatei({ text: async () => JSON.stringify(EN_MODUL) });
  await ISSUER.onVordepotErzeugen();
  const buendel = ISSUER._letztesVordepotBuendelLesen();
  assert.ok(buendel);

  // Der Dateiinhalt, wie er tatsächlich als vorabkonfiguration.js herunterlädt.
  const dateiInhalt = ISSUER.vorDepotKonfigurationDateiInhalt([buendel]);
  const nachgebauteListe = JSON.parse(dateiInhalt.slice(dateiInhalt.indexOf('['), dateiInhalt.lastIndexOf(']') + 1));

  const { V: KERN } = ladeKern();
  const ziel = await KERN.vorDepotKonfigurationAnwenden(nachgebauteListe, null, { ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(ziel.textsatzModule.length, 1, 'der Kern muss das Bündel tatsächlich annehmen');
  assert.equal(ziel.textsatzModule[0].sprache, 'en');
  assert.equal(ziel.textsatzModule[0].pruefstufe, 'intern', 'vivodepot/kern → pruefstufe "intern" (U2-ADR-181)');
});
