'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — U2-ADR-182 Task 3 (Weg B, Korrektur 28.08.2026): Vor-Depot-Konfiguration
   vor dem Willkommensschirm anwenden — MIT voller Signaturprüfung
   ────────────────────────────────────────────────────────────────────────
   Produktentscheidung, 28.08.2026: der <script>-Kanal (Weg B) verschafft
   den gelieferten Daten KEINEN Vertrauensvorschuss — jedes Bündel läuft durch
   modulEinlassenGeprueft (volle Zertifikatskette), genau wie ein normal
   eingelassenes signiertes Modul. Reine Struktur-Bündel ohne Signatur
   (wie im ursprünglichen Task-1-Entwurf) werden hier bewusst NICHT mehr
   getestet — das wäre der falsche, ungeprüfte Weg.

   Fund (28.08.2026, vor dem Bau geprüft): textsatzSpracheAktiv()
   las bislang NUR data.textsprache — ein Feld, das im ganzen Kern nirgends
   gesetzt wird. Fix: _vorDepotSpracheAktiv, gesetzt von
   vorDepotKonfigurationAnwenden(), VOR dem eingebauten Rückfall geprüft.

   Test-Helfer (wegwerfKeypair/anbieterCertRohling/signieren) sind derselbe
   Aufbau wie tests/modul-einlassen-geprueft.test.js — kein zweites Muster
   für dieselbe Sache.
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
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/vor-depot-probe', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  const modulSignaturJws = await signieren(V, modul, anbieter.privJwk);
  return { providerCredentialJws, modulSignaturJws };
}

test('[VDK-Anwenden] ein signiertes textsatz-Vor-Depot-Bündel setzt die aktive Sprache', async () => {
  const V = kern();
  // Eine Kennung, die der Kern kennt (lauter erfundene werden seit 22.09.2026 abgelehnt, das Modul wäre `leer`): der Test prüft, dass die Sprache eines signierten
  // Bündels wirkt, nicht die Texte. Die erfundene Kennung 'strings:xyz.text' steht in den Tests darunter weiter, wo das Bündel ohnehin scheitern soll.
  const modul = { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'it', texte: { 'strings:btnAbbrechen.text': 'Prova' } };
  const buendel = await signiertesBuendel(V, modul);
  await V.vorDepotKonfigurationAnwenden([buendel], null, OPTS);
  assert.equal(V.textsatzSpracheAktiv(), 'it');
});

test('[VDK-Anwenden] ohne Vor-Depot-Bündel bleibt die eingebaute Sprache (de) unverändert', async () => {
  const V = kern();
  await V.vorDepotKonfigurationAnwenden([], null, OPTS);
  assert.equal(V.textsatzSpracheAktiv(), 'de');
});

test('[VDK-Anwenden] die Textsatz-Registry selbst wird ebenfalls befüllt — textLesen() findet einen Vor-Depot-Text', async () => {
  const V = kern();
  const modul = { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'it', texte: { 'strings:btnAbbrechen.text': 'Annulla' } };
  const buendel = await signiertesBuendel(V, modul);
  await V.vorDepotKonfigurationAnwenden([buendel], null, OPTS);
  assert.equal(V.textLesen('strings:btnAbbrechen.text'), 'Annulla',
    'die Registry-Befüllung muss über denselben Weg laufen wie ein normal eingelassenes Modul');
});

/* Fund (28.08.2026, xShare-Beleg): SEKTOREN (die Sektor-/Feld-Struktur) wird beim
   Kern-Laden EINMAL mit textsatzNeuAnwenden() gefüllt — kein dynamischer Lesepfad, ein
   Fill-Lauf. Ein Textsatz-Modul, das NUR die Registry befüllt (_textsatzModuleAusDepotAnmelden)
   OHNE textsatzNeuAnwenden() erneut aufzurufen, lässt SEKTOREN beim alten (deutschen) Stand
   stehen — genau die Lücke, die ein eigenes Testskript beim xShare-Beleg zeigte (dort in
   anderer Reihenfolge: Sprache NACH dem Import gesetzt, derselbe Effekt). Beide bestehenden
   Post-Depot-Einlasswege rufen textsatzNeuAnwenden() bereits mit (Zeile ~16369, ~35771) — der
   Vor-Depot-Weg fehlte. */
test('[VDK-Anwenden] ein signiertes textsatz-Vor-Depot-Bündel füllt auch SEKTOREN neu — nicht nur die Registry', async () => {
  const V = kern();
  const vorher = V.SEKTOREN.find((s) => s.id === 'health').label;
  assert.equal(vorher, 'Gesundheit', 'Vorbedingung: SEKTOREN startet auf Deutsch');
  const modul = { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'en', texte: { 'health.label': 'Health' } };
  const buendel = await signiertesBuendel(V, modul);
  await V.vorDepotKonfigurationAnwenden([buendel], null, OPTS);
  assert.equal(V.SEKTOREN.find((s) => s.id === 'health').label, 'Health',
    'SEKTOREN muss nach dem Vor-Depot-Einlass denselben Fill-Lauf durchlaufen wie beim Post-Depot-Einlassweg (textsatzNeuAnwenden) — sonst bleiben Feldbeschriftungen bis zum nächsten Ereignis auf Deutsch stehen');
});

test('[VDK-Anwenden·Rot-Beweis] ein UNSIGNIERTES Bündel (kein modulSignaturJws) wird verworfen — keine Sprache übernommen', async () => {
  const V = kern();
  const modul = { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'it', texte: { 'strings:xyz.text': 'Prova' } };
  // Kein Bündel, direkt das rohe Modul — genau der ungeprüfte Weg, den Weg B ausdrücklich NICHT
  // gewähren darf, nur weil der Kanal jetzt script-src statt connect-src ist.
  await V.vorDepotKonfigurationAnwenden([modul], null, OPTS);
  assert.equal(V.textsatzSpracheAktiv(), 'de', 'ein unsigniertes Bündel darf NICHT wirken');
});

test('[VDK-Anwenden·Rot-Beweis] ein Bündel mit VERFÄLSCHTER Signatur wird verworfen', async () => {
  const V = kern();
  const modul = { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'it', texte: { 'strings:xyz.text': 'Prova' } };
  const buendel = await signiertesBuendel(V, modul);
  const [head, payload, sig] = buendel.modulSignaturJws.split('.');
  buendel.modulSignaturJws = head + '.' + payload + '.' + (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1);
  await V.vorDepotKonfigurationAnwenden([buendel], null, OPTS);
  assert.equal(V.textsatzSpracheAktiv(), 'de', 'eine verfälschte Signatur darf NICHT wirken');
});

test('[VDK-Anwenden] ein kaputtes Bündel verwirft nur sich selbst — ein gültiges Bündel daneben wirkt trotzdem', async () => {
  const V = kern();
  const gutesModul = { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'it', texte: { 'strings:btnAbbrechen.text': 'Prova' } };   // eine Kennung, die der Kern kennt (s. oben)
  const gutesBuendel = await signiertesBuendel(V, gutesModul);
  const kaputtesBuendel = { providerCredentialJws: 'kein-jws', modulSignaturJws: 'auch-kein-jws' };
  await V.vorDepotKonfigurationAnwenden([kaputtesBuendel, gutesBuendel], null, OPTS);
  assert.equal(V.textsatzSpracheAktiv(), 'it', 'das kaputte Bündel darf das gültige nicht verhindern');
});

