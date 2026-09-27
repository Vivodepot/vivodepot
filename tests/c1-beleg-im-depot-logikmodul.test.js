'use strict';
/* ════════════════════════════════════════════════════════════════════════
   C1 — "Der Beleg bleibt im Depot" (Auftrag, 06.09.2026)
   ────────────────────────────────────────────────────────────────────────
   GEMESSEN (Befund `lese-app-liest-statt-prueft-2026-09-06.md`, §6):
   `modulEinlassenGeprueft` verifizierte die Kette und reichte danach nur
   `tv.nutzlast` an `modulEinlassen` weiter — das JWS-Bündel selbst blieb auf
   der Strecke. Ein Empfänger konnte ein eingelassenes `logikModul` mit dem,
   was in der Datei stand, nicht nachprüfen.

   GEBAUT: dasselbe Muster wie `importierteVorlagen` (`_plan.beleg`,
   vivodepot.html — Vorbild, nicht neu erfunden). `beleg` gehört in DIESELBE
   erzwungene Gruppe wie `ungeprueft`/`anbieterIdGeprueft`/`pruefstufe`: ein
   Modul, das selbst ein `beleg`-Feld mitbringt, behauptet einen
   Prüfgegenstand, den niemand geprüft hat — erzwungen auf `null`, nur der
   EINE geprüfte Zweig in `modulEinlassen` darf ihn setzen, und nur mit dem
   Bündel DIESES Einlasses.

   Reine Kern-Prüfung, kein Schlüsselmaterial (Wegwerf-Sentinel-Anker,
   Wegwerf-Anbieter-Schlüssel — dasselbe Muster wie
   tests/modul-einlassen-geprueft.test.js).
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

function logikModulFixture(ueberschreibung) {
  return Object.assign({
    modulTyp: 'logikModul',
    id: 'test-logik-modul',
    titel: 'Test-Logik-Modul',
    sektor: 'advanceCare',
    herkunft: 'test-anbieter',
    datenSchema: { x: { typ: 'feld', sektor: 'identity', feld: 'maritalStatus' } },
    abschnitte: [{ titel: 'Abschnitt', bloecke: [
      { typ: 'frageAntwortOderLuecke', feldId: 'x', frage: 'Frage?', luecke: '— nicht erfasst —' },
    ] }],
    dokAusgabe: { h1: 'Test-Dokument', unterschrift: false, unterschriftErsatzHinweis: 'Ersatzhinweis.' },
  }, ueberschreibung || {});
}

test('[C1] ein signiertes logikModul trägt seinen Beleg mit ins Depot', async () => {
  const { V } = ladeKern();
  const anbieter = await wegwerfKeypair();
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/test-anbieter', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  const modulSignaturJws = await signieren(V, logikModulFixture(), anbieter.privJwk);
  const bundle = JSON.stringify({ providerCredentialJws, modulSignaturJws });

  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(bundle, d, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });

  assert.equal(r.angenommen, true, 'signiertes logikModul wird angenommen: ' + r.grund);
  const eintrag = d.logikModule[0];
  assert.ok(eintrag.beleg, 'der Beleg reist mit — nicht mehr nur die Nutzlast');
  assert.equal(eintrag.beleg.providerCredentialJws, providerCredentialJws, 'genau DAS Zertifikat dieses Einlasses');
  assert.equal(eintrag.beleg.modulSignaturJws, modulSignaturJws, 'genau DIE Modul-Signatur dieses Einlasses');
  assert.ok(Object.isFrozen(eintrag.beleg), 'eingefroren wie _plan.beleg bei importierteVorlagen — kein nachträgliches Verändern');
});

test('[C1·Rot-Beweis b] eine Selbstauskunft `beleg` im Modul-Inhalt überlebt den unsignierten Einlass nicht', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const r = V.modulEinlassen(JSON.stringify(logikModulFixture({
    beleg: { providerCredentialJws: 'erfunden', modulSignaturJws: 'erfunden' },
  })), d);

  assert.equal(r.angenommen, true, 'das Modul wird trotzdem angenommen — nur die Behauptung fällt');
  assert.equal(d.logikModule[0].beleg, null,
    'ein selbst behaupteter Beleg überlebt nicht — dieselbe erzwungene Gruppe wie anbieterIdGeprueft/pruefstufe');
  assert.equal(d.logikModule[0].ungeprueft, true, 'ohne geprüfte Quelle bleibt das Modul ungeprüft (Rot-Beweis c)');
});

test('[C1·Rot-Beweis b] `beleg` erscheint auch dann NICHT, wenn das Modul zusätzlich `ungeprueft: false` behauptet', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  V.modulEinlassen(JSON.stringify(logikModulFixture({
    ungeprueft: false,
    beleg: { providerCredentialJws: 'erfunden', modulSignaturJws: 'erfunden' },
  })), d);

  assert.equal(d.logikModule[0].ungeprueft, true, '`ungeprueft: false` OHNE echten Beleg bleibt ungeprueft — genau wie A467 es für anbieterIdGeprueft erzwingt');
  assert.equal(d.logikModule[0].beleg, null);
});

test('[C1] ein Modul ohne jede Beleg-Angabe (heutiger Bestand) bleibt gültig und gilt als ungeprüft', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  const r = V.modulEinlassen(JSON.stringify(logikModulFixture()), d);

  assert.equal(r.angenommen, true, 'rückwärtskompatibel — ein Depot ohne Beleg bleibt gültig');
  assert.equal(d.logikModule[0].beleg, null);
  assert.equal(d.logikModule[0].ungeprueft, true);
});

test('[C1] `beleg` ist Teil der Allowlist — kein "unbekannter Schlüssel" bei einem echten Einlass', async () => {
  const { V } = ladeKern();
  const anbieter = await wegwerfKeypair();
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/test-anbieter', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  const modulSignaturJws = await signieren(V, logikModulFixture(), anbieter.privJwk);
  const bundle = JSON.stringify({ providerCredentialJws, modulSignaturJws });

  const d = V.leeresDepot();
  const r = await V.modulEinlassenGeprueft(bundle, d, { ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });

  assert.equal(r.angenommen, true);
  assert.deepEqual(r.verworfene, [], 'kein verworfener Schlüssel — beleg ist in LOGIK_MODUL_SCHLUESSEL erwartet');
});
