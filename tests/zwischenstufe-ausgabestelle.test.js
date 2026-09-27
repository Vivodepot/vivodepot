'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Zwischenstufe (U2-ADR-172, "Zertifikatsbetrieb", 23.08.2026)
   ────────────────────────────────────────────────────────────────────────
   Der Anker zertifiziert einen Ausgabe-Schluessel, der Ausgabe-Schluessel
   zertifiziert Kunden. `verifiziereProviderCredential(kundenCertJws, {
   ausstellerZertifikatJws })` prueft beide Stufen. Wegwerf-Sentinel-Anker,
   KEY tabu.

   Vier Eigenschaften, die eine echte Pruefung ausmachen und nicht nur eine
   Geste: (1) der Regelfall funktioniert, (2) ein GEWOEHNLICHES Zertifikat
   kann sich NICHT selbst zur Ausgabestelle erklaeren (Rechte-Erweiterung),
   (3) ein abgelaufener Ausgabe-Schluessel reisst seine Kundenzertifikate mit
   — durch Konstruktion, keine zweite Buchfuehrung, (4) ein WIDERRUFENER
   Ausgabe-Schluessel ebenso, ueber dieselbe WIDERRUFS_LISTE wie jeder andere
   Anbieter.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });
const JETZT = '2026-08-23T12:00:00Z';

async function wegwerfKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}

function vcRohling(anbieterId, anbieterName, anbieterTyp, publicKeyJwk, issuanceDate, expirationDate) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate, expirationDate,
    credentialSubject: { anbieterId, anbieterTyp, anbieterName, publicKeyJwk },
  };
}

async function zertifikatSignieren(V, vc, signPrivJwk) {
  const signKey = await V._jwsImportSignKey(signPrivJwk);
  return V._signJWS(vc, signKey, {});
}

test('[Zwischenstufe] Regelfall: Ausgabestellen-Zertifikat + Kundenzertifikat verifizieren zusammen', async () => {
  const { V } = ladeKern();
  const ausgabe = await wegwerfKeypair();
  const kunde = await wegwerfKeypair();
  const ausgabeCertJws = await zertifikatSignieren(V,
    vcRohling('vivodepot/ausgabestelle-2026', 'Vivodepot Ausgabestelle', V.AUSGABESTELLE_ANBIETERTYP, ausgabe.pubJwk, '2026-01-01T00:00:00Z', '2027-01-01T00:00:00Z'),
    SENTINEL_PRIVATE_JWK);
  const kundeCertJws = await zertifikatSignieren(V,
    vcRohling('institution/test-kunde', 'Test-Kunde GmbH', 'institution/test', kunde.pubJwk, '2026-06-01T00:00:00Z', '2027-06-01T00:00:00Z'),
    ausgabe.privJwk);

  const res = await V.verifiziereProviderCredential(kundeCertJws, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT, ausstellerZertifikatJws: ausgabeCertJws });
  assert.equal(res.gueltig, true, 'Kundenzertifikat verifiziert über die Zwischenstufe: ' + (res.grund || ''));
  assert.equal(res.nutzlast.credentialSubject.anbieterId, 'institution/test-kunde');
});

test('[Zwischenstufe·Rechte-Erweiterung·Gegenprobe] ein gewöhnliches Zertifikat kann sich nicht selbst zur Ausgabestelle erklären', async () => {
  const { V } = ladeKern();
  const nichtAusgabe = await wegwerfKeypair();
  const kunde = await wegwerfKeypair();
  // Gültig vom Anker signiert, aber anbieterTyp ist KEINE Ausgabestelle.
  const fremdCertJws = await zertifikatSignieren(V,
    vcRohling('institution/fremd', 'Fremde Institution', 'institution/fremd', nichtAusgabe.pubJwk, '2026-01-01T00:00:00Z', '2027-01-01T00:00:00Z'),
    SENTINEL_PRIVATE_JWK);
  const kundeCertJws = await zertifikatSignieren(V,
    vcRohling('institution/test-kunde', 'Test-Kunde GmbH', 'institution/test', kunde.pubJwk, '2026-06-01T00:00:00Z', '2027-06-01T00:00:00Z'),
    nichtAusgabe.privJwk);

  const res = await V.verifiziereProviderCredential(kundeCertJws, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT, ausstellerZertifikatJws: fremdCertJws });
  assert.equal(res.gueltig, false, 'ein Nicht-Ausgabestellen-Zertifikat darf niemals als Aussteller durchgehen');
  assert.match(res.grund, /Ausgabestellen-Zertifikat/);
});

test('[Zwischenstufe·Kaskade] ein ABGELAUFENER Ausgabe-Schlüssel reißt seine Kundenzertifikate mit', async () => {
  const { V } = ladeKern();
  const ausgabe = await wegwerfKeypair();
  const kunde = await wegwerfKeypair();
  const ausgabeCertJws = await zertifikatSignieren(V,
    vcRohling('vivodepot/ausgabestelle-2025', 'Vivodepot Ausgabestelle (abgelaufen)', V.AUSGABESTELLE_ANBIETERTYP, ausgabe.pubJwk, '2025-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
    SENTINEL_PRIVATE_JWK);
  // Das Kundenzertifikat selbst ist noch lange gültig — nur sein Aussteller ist es nicht mehr.
  const kundeCertJws = await zertifikatSignieren(V,
    vcRohling('institution/test-kunde', 'Test-Kunde GmbH', 'institution/test', kunde.pubJwk, '2025-06-01T00:00:00Z', '2030-06-01T00:00:00Z'),
    ausgabe.privJwk);

  const res = await V.verifiziereProviderCredential(kundeCertJws, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT, ausstellerZertifikatJws: ausgabeCertJws });
  assert.equal(res.gueltig, false, 'ein Kundenzertifikat ist nie gültiger als sein abgelaufener Aussteller');
  assert.equal(res.abgelaufen, true);
});

test('[Zwischenstufe·Kaskade] ein WIDERRUFENER Ausgabe-Schlüssel reißt seine Kundenzertifikate mit — dieselbe WIDERRUFS_LISTE', async () => {
  const { V } = ladeKern();
  const ausgabe = await wegwerfKeypair();
  const kunde = await wegwerfKeypair();
  const ausgabeCertJws = await zertifikatSignieren(V,
    vcRohling('vivodepot/ausgabestelle-2026', 'Vivodepot Ausgabestelle', V.AUSGABESTELLE_ANBIETERTYP, ausgabe.pubJwk, '2026-01-01T00:00:00Z', '2027-01-01T00:00:00Z'),
    SENTINEL_PRIVATE_JWK);
  const kundeCertJws = await zertifikatSignieren(V,
    vcRohling('institution/test-kunde', 'Test-Kunde GmbH', 'institution/test', kunde.pubJwk, '2026-06-01T00:00:00Z', '2027-06-01T00:00:00Z'),
    ausgabe.privJwk);
  const ausgabeThumbprint = await V._jwkThumbprint(ausgabe.pubJwk);

  const res = await V.verifiziereProviderCredential(kundeCertJws, {
    ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT, ausstellerZertifikatJws: ausgabeCertJws,
    widerrufsListe: [ausgabeThumbprint],
  });
  assert.equal(res.gueltig, false, 'ein widerrufener Ausgabe-Schlüssel reißt seine Kundenzertifikate mit');
  assert.equal(res.widerrufen, true);
});

test('[Zwischenstufe] der direkte Weg (Behörden-Bestand) läuft unverändert weiter, ohne ausstellerZertifikatJws', async () => {
  const { V } = ladeKern();
  const behoerde = await wegwerfKeypair();
  const certJws = await zertifikatSignieren(V,
    vcRohling('behoerde/test', 'Test-Behörde', 'behoerde', behoerde.pubJwk, '2026-01-01T00:00:00Z', '2036-01-01T00:00:00Z'),
    SENTINEL_PRIVATE_JWK);
  const res = await V.verifiziereProviderCredential(certJws, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });
  assert.equal(res.gueltig, true, 'ein direkt ankersigniertes Bestandszertifikat bleibt gültig — kein Bruch mit dem Bestand');
});

/* ── U2-ADR-181 (27.08.2026, Markenneutralitäts-/Prüfstellen-Ausbau): dieselbe Kette,
   ZWEI weitere anbieterTyp-Werte statt eines Parallelmechanismus. `vivodepot/pruefstelle`
   läuft als Zwischenstufe GENAU wie `vivodepot/ausgabestelle` — Mengenprüfung statt
   Einzelvergleich in verifiziereProviderCredential. `vivodepot/kern` ist KEINE
   Zwischenstufe (direkt gegen den Anker, wie ein Bestandszertifikat) — ein Versuch, ihn
   ALS Aussteller einzusetzen, muss genauso scheitern wie bei jedem gewöhnlichen
   Zertifikat (Rechte-Erweiterungs-Schutz gilt unverändert für den neuen Typ mit). ── */
test('[Zwischenstufe·Prüfstelle] Regelfall: Prüfstellen-Zertifikat + Kundenzertifikat verifizieren zusammen — dieselbe Kette wie Ausgabestelle', async () => {
  const { V } = ladeKern();
  const pruefstelle = await wegwerfKeypair();
  const kunde = await wegwerfKeypair();
  const pruefstelleCertJws = await zertifikatSignieren(V,
    vcRohling('vivodepot/pruefstelle-2026', 'Vivodepot Prüfstelle', V.VIVODEPOT_PRUEFSTELLE_ANBIETERTYP, pruefstelle.pubJwk, '2026-01-01T00:00:00Z', '2027-01-01T00:00:00Z'),
    SENTINEL_PRIVATE_JWK);
  const kundeCertJws = await zertifikatSignieren(V,
    vcRohling('institution/test-kunde', 'Test-Kunde GmbH', 'institution/test', kunde.pubJwk, '2026-06-01T00:00:00Z', '2027-06-01T00:00:00Z'),
    pruefstelle.privJwk);

  const res = await V.verifiziereProviderCredential(kundeCertJws, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT, ausstellerZertifikatJws: pruefstelleCertJws });
  assert.equal(res.gueltig, true, 'Kundenzertifikat verifiziert über die Prüfstellen-Zwischenstufe: ' + (res.grund || ''));
  assert.equal(res.nutzlast.credentialSubject.anbieterId, 'institution/test-kunde');
});

test('[Zwischenstufe·Prüfstelle·Rechte-Erweiterung·Gegenprobe] ein vivodepot/kern-Zertifikat kann sich NICHT selbst zur Zwischenstufe erklären', async () => {
  const { V } = ladeKern();
  const kern = await wegwerfKeypair();
  const kunde = await wegwerfKeypair();
  // Gültig vom Anker signiert (echtes vivodepot/kern-Zertifikat), aber KEIN Zwischenstufen-Typ.
  const kernCertJws = await zertifikatSignieren(V,
    vcRohling('vivodepot/kern', 'Vivodepot Kern', V.VIVODEPOT_KERN_ANBIETERTYP, kern.pubJwk, '2026-01-01T00:00:00Z', '2027-01-01T00:00:00Z'),
    SENTINEL_PRIVATE_JWK);
  const kundeCertJws = await zertifikatSignieren(V,
    vcRohling('institution/test-kunde', 'Test-Kunde GmbH', 'institution/test', kunde.pubJwk, '2026-06-01T00:00:00Z', '2027-06-01T00:00:00Z'),
    kern.privJwk);

  const res = await V.verifiziereProviderCredential(kundeCertJws, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT, ausstellerZertifikatJws: kernCertJws });
  assert.equal(res.gueltig, false, 'vivodepot/kern ist kein Zwischenstufen-Typ — direkt gegen den Anker, keine eigenen Aussteller-Rechte');
  assert.match(res.grund, /Ausgabestellen-Zertifikat/);
});

test('[Zwischenstufe·Prüfstelle·Kaskade] ein WIDERRUFENER Prüfstellen-Schlüssel reißt seine Kundenzertifikate mit — dieselbe WIDERRUFS_LISTE', async () => {
  const { V } = ladeKern();
  const pruefstelle = await wegwerfKeypair();
  const kunde = await wegwerfKeypair();
  const pruefstelleCertJws = await zertifikatSignieren(V,
    vcRohling('vivodepot/pruefstelle-2026', 'Vivodepot Prüfstelle', V.VIVODEPOT_PRUEFSTELLE_ANBIETERTYP, pruefstelle.pubJwk, '2026-01-01T00:00:00Z', '2027-01-01T00:00:00Z'),
    SENTINEL_PRIVATE_JWK);
  const kundeCertJws = await zertifikatSignieren(V,
    vcRohling('institution/test-kunde', 'Test-Kunde GmbH', 'institution/test', kunde.pubJwk, '2026-06-01T00:00:00Z', '2027-06-01T00:00:00Z'),
    pruefstelle.privJwk);
  const pruefstelleThumbprint = await V._jwkThumbprint(pruefstelle.pubJwk);

  const res = await V.verifiziereProviderCredential(kundeCertJws, {
    ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT, ausstellerZertifikatJws: pruefstelleCertJws,
    widerrufsListe: [pruefstelleThumbprint],
  });
  assert.equal(res.gueltig, false, 'ein widerrufener Prüfstellen-Schlüssel reißt seine Kundenzertifikate mit');
  assert.equal(res.widerrufen, true);
});

/* U2-ADR-181-Nachtrag (27.08.2026, Behörden-Briefing): dritter, rein technischer
   Zwischenstufen-Typ — keine Geschäftsmodell-Entscheidung, nur derselbe Mechanismus für einen
   dritten anbieterTyp offengehalten. */
test('[Zwischenstufe·Institution] Regelfall: ein vivodepot/institution-Zertifikat läuft als Zwischenstufe wie Ausgabestelle/Prüfstelle', async () => {
  const { V } = ladeKern();
  const behoerde = await wegwerfKeypair();
  const kunde = await wegwerfKeypair();
  const behoerdeCertJws = await zertifikatSignieren(V,
    vcRohling('vivodepot/institution-test', 'Test-Behörde als Zwischenstufe', V.VIVODEPOT_INSTITUTION_ANBIETERTYP, behoerde.pubJwk, '2026-01-01T00:00:00Z', '2027-01-01T00:00:00Z'),
    SENTINEL_PRIVATE_JWK);
  const kundeCertJws = await zertifikatSignieren(V,
    vcRohling('institution/test-kunde', 'Test-Kunde GmbH', 'institution/test', kunde.pubJwk, '2026-06-01T00:00:00Z', '2027-06-01T00:00:00Z'),
    behoerde.privJwk);

  const res = await V.verifiziereProviderCredential(kundeCertJws, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT, ausstellerZertifikatJws: behoerdeCertJws });
  assert.equal(res.gueltig, true, 'Kundenzertifikat verifiziert über die Institution-Zwischenstufe: ' + (res.grund || ''));
});

test('[Zwischenstufe·Kern] ein vivodepot/kern-Zertifikat verifiziert direkt gegen den Anker, wie ein Bestandszertifikat', async () => {
  const { V } = ladeKern();
  const kern = await wegwerfKeypair();
  const certJws = await zertifikatSignieren(V,
    vcRohling('vivodepot/kern', 'Vivodepot Kern', V.VIVODEPOT_KERN_ANBIETERTYP, kern.pubJwk, '2026-01-01T00:00:00Z', '2036-01-01T00:00:00Z'),
    SENTINEL_PRIVATE_JWK);
  const res = await V.verifiziereProviderCredential(certJws, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });
  assert.equal(res.gueltig, true, 'vivodepot/kern läuft ohne Zwischenstufe direkt gegen den Anker');
});
