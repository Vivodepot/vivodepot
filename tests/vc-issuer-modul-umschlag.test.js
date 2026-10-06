'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Modul-Umschlag im VC-Issuer ("Der Rückweg zum Kern",
   27.08.2026, Fund: der Modul-Erzeuger-Weg für die fünf
   additiven Register-Typen — institutionsArt/bereich/rechtsraum/format/
   branding — endet nicht im Kern. Der Generator signiert das Modul bereits
   selbst (`baue<Typ>Signiert`, Feld `modulSignaturJws` im Umschlag), aber der
   VC-Issuer kennt weder das Umschlag-Format noch verpackt er `modulSignaturJws`
   in die Auslieferung — `baueAuslieferungsBundle` kannte bislang nur
   `templateJws`. Ergebnis (Playwright-geprüft): die heruntergeladene Datei
   wird vom Kern mit "unbekannter-typ" abgelehnt.

   DER FUND, WARUM DER BESTEHENDE DURCHSTICH (zertifikatsbetrieb-durchstich.test.js,
   Schritt 5) DIE LÜCKE NICHT FING: er signiert das Modul dort mit rohem
   `_signJWS`/`_jwsImportSignKey` und baut das Bundle als Literal von Hand —
   nie über die echten Erzeuger-/Issuer-Funktionen. Dieser Test geht denselben
   Weg wie eine echte Bedienerin: Generator erzeugt den Umschlag, Issuer lädt
   ihn über die reale Upload-Funktion und baut das Bundle über die reale
   Bündel-Funktion.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { ladeGenerator } = require('./load-generator.js');
const { ladeIssuer } = require('./load-issuer.js');
const { ladeKern } = require('./load-kern.js');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60', key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });

async function wegwerfKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}

function fakeFile(text) { return { text: () => Promise.resolve(text) }; }

// ── Baustein 1: baueAuslieferungsBundle kennt bislang nur templateJws ──────

test('[Modul-Bundle] baueAuslieferungsBundle nimmt modulSignaturJws als drittes, additives Feld auf', () => {
  const { V } = ladeIssuer();
  const bundle = V.baueAuslieferungsBundle('cert-jws', null, 'modul-jws');
  assert.equal(bundle.providerCredentialJws, 'cert-jws');
  assert.equal(bundle.modulSignaturJws, 'modul-jws');
  assert.ok(!('templateJws' in bundle), 'ohne Template-JWS kein templateJws-Feld');
});

test('[Modul-Bundle] baueAuslieferungsBundle bleibt für bestehende Zwei-Argument-Aufrufe unverändert', () => {
  const { V } = ladeIssuer();
  const bundle = V.baueAuslieferungsBundle('cert-jws', 'template-jws');
  // JSON.stringify statt deepEqual: das Objekt kommt aus dem VM-Sandbox-Realm — ein
  // struktureller, kein Referenz-/Prototyp-Vergleich (bekannte Falle, s. Memory).
  assert.equal(JSON.stringify(bundle), JSON.stringify({ providerCredentialJws: 'cert-jws', templateJws: 'template-jws' }));
});

// ── Baustein 2, der eigentliche Rückweg: Generator → Issuer (echte Funktionen) → Kern ──

test('[Modul-Umschlag-Durchstich] institutionsArt-Modul, vom Generator signiert, über den echten Issuer-Upload gebündelt, vom Kern angenommen', async () => {
  const anbieter = await wegwerfKeypair();

  // 1) GENERATOR signiert das Modul selbst (bestehende Funktion, unveraendert).
  const { V: G } = ladeGenerator();
  const state = { institutionsArt: { arten: [{ kennung: 'pflege', label: 'Pflegeeinrichtung' }], sprache: 'de', moduleVersion: 1 }, publicKeyJwk: anbieter.pubJwk };
  const umschlag = await G.baueInstitutionsArtSigniert(state, anbieter.privJwk);
  assert.equal(umschlag.format, 'vivodepot-institutionsart@1');
  assert.ok(umschlag.modulSignaturJws, 'Generator: Umschlag traegt modulSignaturJws');

  // 2) ISSUER: die reale Upload-Funktion laedt den Umschlag, das reale onAusstellen
  //    baut das Bundle -- keine Handverdrahtung.
  const { V: I, document } = ladeIssuer();
  await I.onModulUmschlagDatei(fakeFile(JSON.stringify(umschlag)));
  assert.match(document.getElementById('modulUmschlagStatus').textContent, /institutionsart/);

  const res = await I._importGeprueftenPrivateJwk(Object.assign({}, SENTINEL_PRIVATE_JWK));
  I._uebernehmeGeladenenSchluessel(res);
  document.getElementById('anbieterId').value = 'institution/pflegeheim-test';
  document.getElementById('anbieterName').value = 'Pflegeheim Test gGmbH';
  document.getElementById('anbieterTyp').value = 'institution/pflege';
  document.getElementById('pubKeyText').value = JSON.stringify(anbieter.pubJwk);

  await I.onAusstellen();
  assert.doesNotMatch(document.getElementById('issueStatus').textContent, /fehlgeschlagen|ungueltig|ungültig/);

  const bundle = I._letztesBundleLesen();
  assert.ok(bundle, 'Issuer: Auslieferungs-Bundle wurde erzeugt');
  assert.ok(bundle.providerCredentialJws, 'Bundle traegt das Provider-Zertifikat');
  assert.equal(bundle.modulSignaturJws, umschlag.modulSignaturJws, 'Bundle traegt die Modul-Signatur aus dem Generator-Umschlag unveraendert');
  assert.ok(!('templateJws' in bundle), 'kein Template im Spiel -> kein templateJws-Feld');

  // 3) KERN: genau die Datei, die eine Bedienerin herunterladen wuerde -- angenommen,
  //    nicht mit "unbekannter-typ" abgelehnt (DAS war der gemeldete Fund).
  const { V: K } = ladeKern();
  const depot = K.leeresDepot();
  const angenommen = await K.modulEinlassenGeprueft(JSON.stringify(bundle), depot, { ankerJwk: SENTINEL_PUBLIC_JWK });
  assert.equal(angenommen.angenommen, true, 'Kern nimmt das Modul an: ' + angenommen.grund);
  assert.equal(angenommen.typ, 'institutionsArt');
  assert.equal(depot.institutionsArten[0].anbieterId, 'institution/pflegeheim-test');
  assert.equal(depot.institutionsArten[0].anbieterIdGeprueft, true);
  assert.equal(depot.institutionsArten[0].ungeprueft, false);
});

// ── Gegenprobe: eine verfaelschte Modul-Signatur wird VOR der Ausstellung gefangen ──

test('[Modul-Umschlag-Gegenprobe] Modul-Signatur passt nicht zum eingetragenen Anbieter-Public-Key -> onAusstellen bricht ab, kein Bundle', async () => {
  const anbieter = await wegwerfKeypair();
  const einAnderer = await wegwerfKeypair();

  const { V: G } = ladeGenerator();
  const state = { institutionsArt: { arten: [{ kennung: 'pflege', label: 'Pflegeeinrichtung' }], sprache: 'de', moduleVersion: 1 }, publicKeyJwk: anbieter.pubJwk };
  const umschlag = await G.baueInstitutionsArtSigniert(state, anbieter.privJwk);

  const { V: I, document } = ladeIssuer();
  await I.onModulUmschlagDatei(fakeFile(JSON.stringify(umschlag)));

  const res = await I._importGeprueftenPrivateJwk(Object.assign({}, SENTINEL_PRIVATE_JWK));
  I._uebernehmeGeladenenSchluessel(res);
  document.getElementById('anbieterId').value = 'institution/pflegeheim-test';
  document.getElementById('anbieterName').value = 'Pflegeheim Test gGmbH';
  document.getElementById('anbieterTyp').value = 'institution/pflege';
  // FALSCHER Public-Key eingetragen -- gehoert nicht zum Schluessel, der das Modul signiert hat.
  document.getElementById('pubKeyText').value = JSON.stringify(einAnderer.pubJwk);

  await I.onAusstellen();

  assert.match(document.getElementById('issueStatus').textContent, /[Ss]ignatur/);
  assert.equal(I._letztesBundleLesen(), null, 'kein Bundle, wenn die Modul-Signatur nicht zum eingetragenen Public-Key passt');
});

// ── Umschlag ohne modulSignaturJws (unsigniert) -> klare Fehlermeldung beim Laden ──

test('[Modul-Umschlag] Datei ohne modulSignaturJws wird beim Laden abgelehnt, nicht erst beim Ausstellen', async () => {
  const { V: I, document } = ladeIssuer();
  await I.onModulUmschlagDatei(fakeFile(JSON.stringify({ format: 'vivodepot-institutionsart@1', modul: { modulTyp: 'institutionsArt' } })));
  assert.match(document.getElementById('modulUmschlagStatus').textContent, /[Ss]ignatur/);
  assert.equal(I._letztesBundleLesen(), null);
});
