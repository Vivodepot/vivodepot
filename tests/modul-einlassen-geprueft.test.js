'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — modulEinlassenGeprueft ("Zertifikatsbetrieb", Zug 4,
   23.08.2026): der durchgehende Weg für ein signiertes Modul.
   ────────────────────────────────────────────────────────────────────────
   Wegwerf-Sentinel-Anker, Wegwerf-Anbieter-Schlüssel. KEY tabu. Reine
   Kern-Prüfung (kein Werkzeug) — der volle Anker→Ausgabe→Kunde→Modul-
   Durchstich mit den echten Werkzeugen steht in
   tests/zeremonie-kette-durchstich.test.js.
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

const TEXTSATZ_MODUL = Object.freeze({ modulTyp: 'textsatz', sprache: 'hu', moduleVersion: 1, texte: { 'strings:depotPilleEigen.text': 'Üdvözöljük' } });   // eine Kennung, die der Kern kennt: ein Modul mit lauter unbekannten wird abgelehnt (leer), und dieser Test prüft die Signaturkette, nicht die Texte

test('[modulEinlassenGeprueft] Regelfall: signiertes Modul wird angenommen und trägt eine geprüfte Anbieterkennung', async () => {
  const { V } = ladeKern();
  const anbieter = await wegwerfKeypair();
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/test-anbieter', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  const modulSignaturJws = await signieren(V, TEXTSATZ_MODUL, anbieter.privJwk);
  const bundle = JSON.stringify({ providerCredentialJws, modulSignaturJws });

  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(bundle, d, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });

  assert.equal(r.angenommen, true, 'signiertes Modul wird angenommen: ' + r.grund);
  assert.equal(d.textsatzModule[0].anbieterId, 'institution/test-anbieter');
  assert.equal(d.textsatzModule[0].anbieterIdGeprueft, true, 'die Kennung ist kryptografisch geprüft, nicht selbst behauptet');
  assert.equal(d.textsatzModule[0].ungeprueft, false, 'ein signiertes Modul zeigt sich der Bürgerin NICHT mehr als ungeprüft (A467 zu Ende geführt)');
});

test('[modulEinlassenGeprueft] Selbstauskunft im Modul-Inhalt gewinnt NICHT — Inhalt kommt nur aus der verifizierten Signatur', async () => {
  const { V } = ladeKern();
  const anbieter = await wegwerfKeypair();
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/test-anbieter', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  // Signiert wird der ECHTE Inhalt — eine im Bundle zusätzlich behauptete Selbstauskunft gibt es
  // in diesem Bundle-Format gar nicht (der Inhalt lebt ausschließlich in der Signatur).
  const modulSignaturJws = await signieren(V, Object.assign({}, TEXTSATZ_MODUL, { anbieterId: 'behauptet-sich-selbst', anbieterIdGeprueft: true }), anbieter.privJwk);
  const bundle = JSON.stringify({ providerCredentialJws, modulSignaturJws });

  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(bundle, d, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });

  assert.equal(r.angenommen, true);
  assert.equal(d.textsatzModule[0].anbieterId, 'institution/test-anbieter', 'die geprüfte Kennung aus dem Zertifikat gewinnt über die Selbstauskunft im Modul');
});

test('[modulEinlassenGeprueft·Rot-Beweis] eine verfälschte Modul-Signatur wird abgelehnt', async () => {
  const { V } = ladeKern();
  const anbieter = await wegwerfKeypair();
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/test-anbieter', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  let modulSignaturJws = await signieren(V, TEXTSATZ_MODUL, anbieter.privJwk);
  const [head, payload, sig] = modulSignaturJws.split('.');
  modulSignaturJws = head + '.' + payload + '.' + (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1);
  const bundle = JSON.stringify({ providerCredentialJws, modulSignaturJws });

  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(bundle, d, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });

  assert.equal(r.angenommen, false, 'eine verfälschte Signatur wird NICHT angenommen');
  assert.equal((d.textsatzModule || []).length, 0, 'kein Modul im Depot');
});

test('[modulEinlassenGeprueft] über die Zwischenstufe: Kundenzertifikat + Ausgabestellen-Zertifikat', async () => {
  const { V } = ladeKern();
  const ausgabe = await wegwerfKeypair();
  const kunde = await wegwerfKeypair();
  const ausstellerZertifikatJws = await signieren(V,
    Object.assign(anbieterCertRohling('vivodepot/ausgabestelle-2026', ausgabe.pubJwk), { credentialSubject: Object.assign({}, anbieterCertRohling('x', ausgabe.pubJwk).credentialSubject, { anbieterTyp: V.AUSGABESTELLE_ANBIETERTYP, anbieterId: 'vivodepot/ausgabestelle-2026' }) }),
    SENTINEL_PRIVATE_JWK);
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/test-kunde', kunde.pubJwk), ausgabe.privJwk);
  const modulSignaturJws = await signieren(V, TEXTSATZ_MODUL, kunde.privJwk);
  const bundle = JSON.stringify({ providerCredentialJws, modulSignaturJws, ausstellerZertifikatJws });

  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(bundle, d, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });

  assert.equal(r.angenommen, true, 'signiertes Modul über die Zwischenstufe wird angenommen: ' + r.grund);
  assert.equal(d.textsatzModule[0].anbieterId, 'institution/test-kunde');
  assert.equal(d.textsatzModule[0].anbieterIdGeprueft, true);
});

/* ── U2-ADR-181 (27.08.2026, Markenneutralitäts-/Prüfstellen-Ausbau) — `pruefstufe`:
   drei Werte, aus dem geprüften anbieterTyp der Kette abgeleitet, nicht gespeichert/
   migriert (additiv, keine Bestandsdaten betroffen). Judgment-Call, dokumentiert: ein
   direkt ankersigniertes Zertifikat, dessen anbieterTyp WEDER vivodepot/kern NOCH eine
   Zwischenstufe ist (heute nur als Bestandsfall in tests/zwischenstufe-ausgabestelle.
   test.js belegt, für Modul-Einlass praktisch nicht vorgesehen), fällt defensiv auf
   'extern-ungeprueft' — nie eine höhere Vertrauensstufe behaupten, als die Kette
   tatsächlich hergibt. ── */
test('[modulEinlassenGeprueft·pruefstufe] vivodepot/kern-Zertifikat (direkt gegen den Anker) → "intern"', async () => {
  const { V } = ladeKern();
  const kern = await wegwerfKeypair();
  const providerCredentialJws = await signieren(V,
    Object.assign(anbieterCertRohling('vivodepot/kern', kern.pubJwk), { credentialSubject: Object.assign({}, anbieterCertRohling('vivodepot/kern', kern.pubJwk).credentialSubject, { anbieterTyp: V.VIVODEPOT_KERN_ANBIETERTYP }) }),
    SENTINEL_PRIVATE_JWK);
  const modulSignaturJws = await signieren(V, TEXTSATZ_MODUL, kern.privJwk);
  const bundle = JSON.stringify({ providerCredentialJws, modulSignaturJws });

  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(bundle, d, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });
  assert.equal(r.angenommen, true, r.grund);
  assert.equal(d.textsatzModule[0].pruefstufe, 'intern');
});

test('[modulEinlassenGeprueft·pruefstufe] über vivodepot/ausgabestelle, KEIN eigenes rolle-Feld → "extern-geprueft:herausgeber" (Default)', async () => {
  const { V } = ladeKern();
  const ausgabe = await wegwerfKeypair();
  const kunde = await wegwerfKeypair();
  const ausstellerZertifikatJws = await signieren(V,
    Object.assign(anbieterCertRohling('vivodepot/ausgabestelle-2026', ausgabe.pubJwk), { credentialSubject: Object.assign({}, anbieterCertRohling('x', ausgabe.pubJwk).credentialSubject, { anbieterTyp: V.AUSGABESTELLE_ANBIETERTYP, anbieterId: 'vivodepot/ausgabestelle-2026' }) }),
    SENTINEL_PRIVATE_JWK);
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/test-kunde', kunde.pubJwk), ausgabe.privJwk);
  const modulSignaturJws = await signieren(V, TEXTSATZ_MODUL, kunde.privJwk);
  const bundle = JSON.stringify({ providerCredentialJws, modulSignaturJws, ausstellerZertifikatJws });

  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(bundle, d, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });
  assert.equal(r.angenommen, true, r.grund);
  assert.equal(d.textsatzModule[0].pruefstufe, 'extern-geprueft:herausgeber');
});

test('[modulEinlassenGeprueft·pruefstufe] über vivodepot/pruefstelle MIT rolle:"pruefer" → "extern-geprueft:pruefer"', async () => {
  const { V } = ladeKern();
  const pruefstelle = await wegwerfKeypair();
  const kunde = await wegwerfKeypair();
  const ausstellerZertifikatJws = await signieren(V,
    Object.assign(anbieterCertRohling('vivodepot/pruefstelle-2026', pruefstelle.pubJwk), { credentialSubject: Object.assign({}, anbieterCertRohling('x', pruefstelle.pubJwk).credentialSubject, { anbieterTyp: V.VIVODEPOT_PRUEFSTELLE_ANBIETERTYP, anbieterId: 'vivodepot/pruefstelle-2026', rolle: 'pruefer' }) }),
    SENTINEL_PRIVATE_JWK);
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/test-kunde', kunde.pubJwk), pruefstelle.privJwk);
  const modulSignaturJws = await signieren(V, TEXTSATZ_MODUL, kunde.privJwk);
  const bundle = JSON.stringify({ providerCredentialJws, modulSignaturJws, ausstellerZertifikatJws });

  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(bundle, d, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });
  assert.equal(r.angenommen, true, r.grund);
  assert.equal(d.textsatzModule[0].pruefstufe, 'extern-geprueft:pruefer');
});

test('[modulEinlassenGeprueft·pruefstufe] über den dritten Zwischenstufen-Typ vivodepot/institution → "extern-geprueft:herausgeber" (Default, U2-ADR-181-Nachtrag)', async () => {
  const { V } = ladeKern();
  const behoerde = await wegwerfKeypair();
  const kunde = await wegwerfKeypair();
  const ausstellerZertifikatJws = await signieren(V,
    Object.assign(anbieterCertRohling('vivodepot/institution-2026', behoerde.pubJwk), { credentialSubject: Object.assign({}, anbieterCertRohling('x', behoerde.pubJwk).credentialSubject, { anbieterTyp: V.VIVODEPOT_INSTITUTION_ANBIETERTYP, anbieterId: 'vivodepot/institution-2026' }) }),
    SENTINEL_PRIVATE_JWK);
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/test-kunde', kunde.pubJwk), behoerde.privJwk);
  const modulSignaturJws = await signieren(V, TEXTSATZ_MODUL, kunde.privJwk);
  const bundle = JSON.stringify({ providerCredentialJws, modulSignaturJws, ausstellerZertifikatJws });

  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(bundle, d, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });
  assert.equal(r.angenommen, true, r.grund);
  assert.equal(d.textsatzModule[0].pruefstufe, 'extern-geprueft:herausgeber');
});

test('[modulEinlassenGeprueft·pruefstufe] direkt ankersigniertes Zertifikat ohne Zwischenstufe, NICHT vivodepot/kern → "extern-ungeprueft" (Judgment-Call, defensiv)', async () => {
  const { V } = ladeKern();
  const anbieter = await wegwerfKeypair();
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/test-anbieter', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  const modulSignaturJws = await signieren(V, TEXTSATZ_MODUL, anbieter.privJwk);
  const bundle = JSON.stringify({ providerCredentialJws, modulSignaturJws });

  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(bundle, d, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });
  assert.equal(r.angenommen, true, r.grund);
  assert.equal(d.textsatzModule[0].pruefstufe, 'extern-ungeprueft');
});

test('[modulEinlassenGeprueft·pruefstufe·Gegenprobe] selbst eingelassenes Modul (kein Zertifikat) trägt GAR KEIN pruefstufe-Feld', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.modulEinlassen(JSON.stringify(TEXTSATZ_MODUL), d);
  assert.equal('pruefstufe' in d.textsatzModule[0], false,
    'additiv: ein Modul ohne Zertifikat bekommt kein pruefstufe-Feld, keinen stillschweigenden Default');
});
