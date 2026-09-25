'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-285 — Gerüst-eigener Ladeweg fürs Rechtsraum-Modul "DE"
   ────────────────────────────────────────────────────────────────────────────
   Beweist den Mechanismus, mit einem Test-Schlüssel statt dem echten TA-Anker
   (wie basisVorlagenVerifizieren/STANDARD_VORLAGEN_CERTS es vormacht):
     1) Positivkontrolle — ein korrekt gegen einen Test-Anker signiertes Modul
        mit rechtsraum:'DE' wird über _rechtsraumGeruestModulLaden angenommen
        und ist danach über _rechtsraumKatalogLesen lesbar.
     2) Negativkontrolle/Rotmachbarkeit — ein fremd signiertes, ein manipuliertes
        und ein unbekanntes (kein-Cert-Eintrag) Modul werden abgelehnt.
     3) Der allgemeine Einlassweg (EINLASS_REGISTER) lehnt "DE" UNVERÄNDERT ab —
        die Öffnung gilt ausschließlich für den neuen, engen Ladeweg.
     4) Gegenprobe: die zwei Registries (Gerüst-verifiziert vs. Einlassweg) haben
        keine gemeinsame beschreibbare Fläche — ein Modul über den einen Weg
        rührt die Registry des anderen nicht an, und der eingebaute Katalog
        gewinnt in jedem Fall gegen beide.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

const TEST_ANKER_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const TEST_ANKER_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: TEST_ANKER_PRIVATE_JWK.x });
const JETZT = '2026-09-05T00:00:00Z';
const OPTS = { jetzt: JETZT, ankerJwk: TEST_ANKER_PUBLIC_JWK };

async function anbieterKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function baueGeruestCert(anbieterPubJwk) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-09-05T00:00:00Z', expirationDate: '2036-09-05T00:00:00Z',
    credentialSubject: { anbieterId: 'vivodepot-test', anbieterName: 'Vivodepot (Test-Zertifikat, U2-ADR-285)', publicKeyJwk: anbieterPubJwk },
  };
}
function deModul(extra) {
  return Object.assign({
    schemaVersion: 47, rechtsraum: 'DE', moduleVersion: 1, sprache: 'de',
    typen: { tpl_erbvertrag_sonderfall: { katalogVersion: 1, wortlaut: 'Test-Wortlaut', zweck: ['nachlass'] } },
  }, extra);
}

/* ── 1 · Positivkontrolle — der Mechanismus trägt ─────────────────────────────── */

test('[U2-ADR-285] ein korrekt gegen den Test-Anker signiertes DE-Modul wird über den Gerüst-Ladeweg angenommen', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(TEST_ANKER_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueGeruestCert(pubJwk), taSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const modulJws = await V._signJWS(deModul(), anbieterSign, {});
  const certs = { 'vivodepot-test': certJws };

  const r = await V._rechtsraumGeruestModulLaden('vivodepot-test', modulJws, OPTS, certs);
  assert.equal(r.geladen, true, 'geladen sollte true sein: ' + (r.grund || ''));

  assert.equal(V._rechtsraumKatalogLesen('tpl_erbvertrag_sonderfall', 'DE', 'wortlaut'), 'Test-Wortlaut',
    'der neue, tpl_-namensraum-geschützte Typ ist über den regulären Lesepfad sichtbar');
  assert.deepEqual(V.getRechtsraumGeruestRegistry().DE.tpl_erbvertrag_sonderfall.zweck, ['nachlass']);
});

test('[U2-ADR-285] validateRechtsraumModul lehnt "DE" ohne das Flag ab, solange das Gerüst-Fach belegt ist (Gerüst-Schnitt S3: an die Prämisse gebunden)', () => {
  const V = require('./load-kern-de-belegt.js').ladeKernDeBelegt();
  const m = deModul();
  assert.match(V.validateRechtsraumModul(m), /reserviert/);
  assert.equal(V.validateRechtsraumModul(m, { erlaubtGeruestEigenesDE: true }), '',
    'MIT dem Flag (das nur der Gerüst-Ladeweg selbst setzt) validiert dasselbe Modul');
});

/* ── 2 · Negativkontrolle / Rotmachbarkeit — ein fremdes Modul erreicht "DE" nicht ── */

test('[U2-ADR-285·Rotmachbarkeit] ein DE-Modul, signiert von einem FREMDEN Key, wird abgelehnt', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(TEST_ANKER_PRIVATE_JWK);
  const { pubJwk } = await anbieterKeypair();                 // dieser Key steht im Cert
  const { privJwk: fremdPriv } = await anbieterKeypair();      // ein ANDERER Key signiert das Modul
  const certJws = await V._signJWS(baueGeruestCert(pubJwk), taSign, {});
  const fremdSign = await V._jwsImportSignKey(fremdPriv);
  const modulJws = await V._signJWS(deModul(), fremdSign, {});
  const certs = { 'vivodepot-test': certJws };

  const r = await V._rechtsraumGeruestModulLaden('vivodepot-test', modulJws, OPTS, certs);
  assert.equal(r.geladen, false);
  assert.match(r.grund, /Signatur ungültig/);
  assert.deepEqual(V.getRechtsraumGeruestRegistry(), {}, 'die Registry bleibt leer — nichts wurde eingebettet');
});

test('[U2-ADR-285·Rotmachbarkeit] ein unbekannter anbieterId (kein Cert-Eintrag) wird abgelehnt', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(TEST_ANKER_PRIVATE_JWK);
  const { privJwk } = await anbieterKeypair();
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const modulJws = await V._signJWS(deModul(), anbieterSign, {});

  const r = await V._rechtsraumGeruestModulLaden('irgendein-fremder-anbieter', modulJws, OPTS, {});
  assert.equal(r.geladen, false);
  assert.equal(r.grund, 'kein-cert-fuer-anbieter');
});

test('[U2-ADR-285·Rotmachbarkeit] ein manipuliertes DE-Modul (rechtsraum nachträglich geändert) wird abgelehnt', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(TEST_ANKER_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueGeruestCert(pubJwk), taSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const modulJws = await V._signJWS(deModul(), anbieterSign, {});

  const teile = modulJws.split('.');
  const payload = JSON.parse(V._jwsB64uToString(teile[1]));
  payload.rechtsraum = 'FR';   // nachträglich manipuliert, Signatur bleibt die alte
  teile[1] = V._jwsB64uFromString(JSON.stringify(payload));
  const manipuliert = teile.join('.');
  const certs = { 'vivodepot-test': certJws };

  const r = await V._rechtsraumGeruestModulLaden('vivodepot-test', manipuliert, OPTS, certs);
  assert.equal(r.geladen, false);
  assert.match(r.grund, /Signatur ungültig/);
});

/* ── 3 · Der allgemeine Einlassweg bleibt unverändert ─────────────────────────── */

test('[U2-ADR-285] EINLASS_REGISTER (Einstellungen → Module → Einlassen) lehnt "DE" weiterhin ausnahmslos ab', () => {
  const { V } = ladeKern();
  const eintrag = V.EINLASS_REGISTER.find((e) => e.typ === 'rechtsraum');
  const r = eintrag.pruefen({ rechtsraum: 'DE', moduleVersion: 1, sprache: 'de',
    typen: { tpl_versuch: { katalogVersion: 1 } } });
  assert.equal(r.gueltig, false);
  assert.equal(r.grund, 'reserviert');
});

/* ── 4 · Gegenprobe — keine gemeinsame beschreibbare Fläche, der Katalog gewinnt immer ── */

test('[U2-ADR-285] ein geladenes Gerüst-Modul und eine (fingierte) Einlassweg-Registry überholen sich nicht gegenseitig', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('Test-Passwort-12345!');
  const taSign = await V._jwsImportSignKey(TEST_ANKER_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueGeruestCert(pubJwk), taSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const modulJws = await V._signJWS(deModul(), anbieterSign, {});
  const certs = { 'vivodepot-test': certJws };

  const r = await V._rechtsraumGeruestModulLaden('vivodepot-test', modulJws, OPTS, certs);
  assert.equal(r.geladen, true);

  // Dieselbe Manipulation wie in tests/rechtsraum-modul-vertrag.test.js („der eingebaute Katalog
  // hat IMMER Vorrang"): eine fingierte, direkt in die Depot-Daten geschriebene 'DE'-Einlassweg-
  // Registry (kann über den echten Einlassweg strukturell nicht entstehen) darf weder den
  // eingebauten Katalog noch das bereits geladene Gerüst-Modul verdrängen.
  V.getData().rechtsraumModule = [{ rechtsraum: 'DE', moduleVersion: 1, sprache: 'de',
    typen: { will: { katalogVersion: 999, fristenVorrang: { auswahlform: 'erfunden' } },
             tpl_erbvertrag_sonderfall: { katalogVersion: 999, wortlaut: 'GEFAELSCHT' } } }];
  V._rechtsraumModuleAusDepotAnmelden(V.getData());

  assert.equal(V._rechtsraumKatalogLesen('will', 'DE', 'fristenVorrang', 'auswahlform'), 'neueste',
    'der eingebaute Katalog gewinnt immer noch, auch gegen eine fingierte Einlassweg-Registry');
  assert.equal(V._rechtsraumKatalogLesen('tpl_erbvertrag_sonderfall', 'DE', 'wortlaut'), 'Test-Wortlaut',
    'das ECHTE, verifizierte Gerüst-Modul gewinnt gegen die fingierte, unverifizierte Einlassweg-Registry — ' +
    'die zwei Registries haben keine gemeinsame beschreibbare Fläche');
});
