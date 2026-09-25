'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-188 — „Die Registry folgt data"
   ────────────────────────────────────────────────────────────────────────
   Befund (01.09.2026), live nachgestellt (echtes Chromium,
   echte Ed25519-Signaturkette, der echte UI-Weg über modulEinlassenGeprueft
   + _moduleEinlassWirken, kein Direktaufruf): subKontextBetreten()/
   subKontextVerlassen() wechseln `data`, ohne die fünf Laufzeit-Registries
   (Bereiche, Code-Listen, Rechtsraum, Textsatz, Institutions-Arten) neu aus
   dem jeweils aktiven `data` aufzubauen — depotLaden() tut das bereits an
   allen sechs Stellen (:16650 ff.), war aber nie die einzige Stelle, an der
   `data` wechselt.

   PAAR A (subKontextBetreten/subKontextVerlassen): zwei Richtungen, nicht
   eine. Die Rückrichtung (Verlassen) ist die wichtigere der beiden — ihr
   Fehlen ist unauffällig, weil die Registry beim Verlassen „zufällig"
   richtig aussehen KANN, solange niemand zwischen Betreten und Verlassen
   andockt. Ohne einen Fix an beiden Enden trüge der Anker nach dem
   Verlassen die Beschriftungen des Sub — sähe aus wie eine Regression.

   PAAR B (_depotSpeicherZuruecksetzen): dieselbe Zusage beim Schliessen —
   ohne sie zeigt das NÄCHSTE, unbeteiligte Depot (auch ein frisch
   angelegtes) die Module des gerade geschlossenen. Genau das Muster, das
   U2-ADR-182 Task 4 für brandingAnwenden(null) schon einmal gelöst hat
   (dieselbe Stelle, eine Zeile daneben) — hier für die Modul-Registries
   nachgezogen, keine zweite Mechanik.

   Bündel-Aufbau identisch zu tests/vor-depot-konfiguration-anwenden.test.js
   und dem gleichnamigen Muster in der Sprachmodul-Vererbung (U2-ADR-189,
   Folge-Commit) — kein viertes Muster für dieselbe Sache.

   ROT-BEWEIS, von Hand geführt (A348 Zug 4 verlangt die Anwesenheit, nicht
   die Automatisierung): die Rückrichtungs-Probe wurde gegen den unbehobenen
   Stand gefahren — den neuen Aufruf in subKontextVerlassen() entfernt,
   `node --test` gegen genau diese Datei laufen lassen, den erwarteten
   Fehlschlag gesehen (Sub-Sektor blieb beim Anker sichtbar), den Aufruf
   wiederhergestellt, erneut grün. Dieselbe Rotprobe steht auch für den
   Zähler-Gate-Fix der Sprachmodul-Vererbung (U2-ADR-189, Folge-Commit).
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
const JETZT = '2026-09-01T09:00:00Z';
const OPTS = Object.freeze({ ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: JETZT });
const ANKER_PW = 'registry-folgt-data-anker-1!';
const SUB_PW = 'registry-folgt-data-sub-1!';

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
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/registry-folgt-data-probe', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  const modulSignaturJws = await signieren(V, modul, anbieter.privJwk);
  return { providerCredentialJws, modulSignaturJws };
}
async function bereichsModulEinlassen(V, herkunft, sektorId, label) {
  const modul = { modulTyp: 'bereich', sprache: 'de', moduleVersion: 1, herkunft, bereiche: { [sektorId]: { label, icon: 'star' } } };
  const buendel = await signiertesBuendel(V, modul);
  const r = await V.modulEinlassenGeprueft(JSON.stringify(buendel), null, OPTS);
  assert.equal(r.angenommen, true, 'Vorbedingung: das Test-Bereichsmodul muss angenommen werden — ' + JSON.stringify(r));
  V._moduleEinlassWirken(r);   // der echte UI-Weg, kein Direktaufruf der Registry-Funktion
  return r;
}
async function ankerMitSubAnlegen(V, sektorId, label) {
  await V.depotAnlegen(ANKER_PW);
  V.akteurSelbstErklaeren('Registry-Test Anker');
  const eintrag = await V.subDepotAnlegen({ vorname: 'Kind', nachname: 'Test', verwaltungsTyp: 'verwaltet' }, SUB_PW);
  await V.subDepotVertrauenOeffnen(eintrag.depotUUID, SUB_PW);
  V.subKontextBetreten(eintrag.depotUUID);
  await bereichsModulEinlassen(V, 'registry-folgt-data-sub-modul', sektorId, label);
  return eintrag;
}

test('[U2-ADR-188·Paar A, Hinrichtung] ein ins Sub gedocktes Bereichsmodul wirkt SOFORT — bereicheAlle() zeigt den neuen Sektor', async () => {
  const V = kern();
  await ankerMitSubAnlegen(V, 'sub-sektor-a', 'Sub-Sektor A');
  assert.ok(V.bereicheAlle().some((s) => s.id === 'sub-sektor-a'),
    'ohne den Fix an subKontextBetreten()/dem In-Session-Andocken bliebe der Sub-Sektor unsichtbar');
});

test('[U2-ADR-188·Paar A, Rückrichtung — die wichtigere der beiden] nach subKontextVerlassen() zeigt der ANKER den Sub-Sektor nicht mehr', async () => {
  const V = kern();
  await ankerMitSubAnlegen(V, 'sub-sektor-b', 'Sub-Sektor B');
  assert.ok(V.bereicheAlle().some((s) => s.id === 'sub-sektor-b'), 'Vorbedingung: der Sektor wirkt im Sub');

  await V.subKontextVerlassen();

  assert.ok(!V.bereicheAlle().some((s) => s.id === 'sub-sektor-b'),
    'ohne den Fix an subKontextVerlassen() trüge der Anker die Beschriftungen des verlassenen Sub — sähe aus wie eine Regression, ist aber die Hälfte, die man beim Bauen vergisst');
  assert.equal(Array.isArray(V.getData().bereichsModule) ? V.getData().bereichsModule.length : -1, 0,
    'der Anker selbst hatte nie ein eigenes Bereichsmodul — data war korrekt die ganze Zeit, nur die Registry lief hinterher');
});

test('[U2-ADR-188·Paar A, Textsatz] dieselbe Zusage gilt für die Textsatz-Registry, nicht nur für Bereiche', async () => {
  const V = kern();
  await V.depotAnlegen(ANKER_PW);
  V.akteurSelbstErklaeren('Registry-Test Anker Textsatz');
  const eintrag = await V.subDepotAnlegen({ vorname: 'Kind', nachname: 'Test', verwaltungsTyp: 'verwaltet' }, SUB_PW);
  await V.subDepotVertrauenOeffnen(eintrag.depotUUID, SUB_PW);
  V.subKontextBetreten(eintrag.depotUUID);

  const modul = { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'hu', herkunft: 'registry-folgt-data-sub-textsatz', texte: { 'strings:btnAbbrechen.text': 'Mégse' } };
  const buendel = await signiertesBuendel(V, modul);
  const r = await V.modulEinlassenGeprueft(JSON.stringify(buendel), null, OPTS);
  assert.equal(r.angenommen, true, 'Vorbedingung: das Test-Textsatzmodul muss angenommen werden — ' + JSON.stringify(r));
  V._moduleEinlassWirken(r);
  assert.equal(V.textLesen('strings:btnAbbrechen.text'), 'Mégse', 'Vorbedingung: wirkt im Sub');

  await V.subKontextVerlassen();

  assert.notEqual(V.textLesen('strings:btnAbbrechen.text'), 'Mégse',
    'nach dem Verlassen darf der Anker nicht mehr die Sub-Übersetzung lesen — die Textsatz-Registry muss mit zurückgesetzt sein');
});

test('[U2-ADR-188·Paar B] ein NEUES, unbeteiligtes Depot zeigt nicht die Bereiche eines vorher geschlossenen Depots', async () => {
  const V = kern();
  // Beleg gegen die Kollektor-Form unten (assert.deepEqual(…, [])): eine gepinnte, NICHT-leere
  // Zahl beweist im selben Testkörper, dass der Mechanismus nicht vom Start weg leer zählt.
  // 13 eingebaute Bereiche zum Zeitpunkt dieses Fixes (01.09.2026) — driftet die Zahl, meldet
  // sich die Vorbedingung zuerst, mit klarem Grund, statt die Zeile darunter stillschweigend zu verfälschen.
  assert.equal(V.bereicheAlle().length, 13, 'Vorbedingung: 13 eingebaute Bereiche vor jedem Andocken');
  await ankerMitSubAnlegen(V, 'depot-a-sektor', 'Depot-A-Sektor');
  // NICHT subKontextVerlassen(): Paar B prüft das Schliessen aus dem OFFENEN Sub-Kontext
  // heraus — genauso live nachgestellt (01.09.2026) — nicht nur den bereits von
  // Paar A abgedeckten Weg über den Anker zurück.
  assert.ok(V.bereicheAlle().some((s) => s.id === 'depot-a-sektor'), 'Vorbedingung: der Sektor wirkt, solange der Sub offen ist');
  assert.equal(V.bereicheAlle().length, 14, 'Vorbedingung: genau ein Sektor kam durch das Andocken dazu (13+1)');

  V._depotSpeicherZuruecksetzen();   // „Depot schliessen" — dieselbe Stelle wie brandingAnwenden(null)
  assert.equal(V.getData(), null, 'Vorbedingung: der Reset hat data genullt');

  await V.depotAnlegen('registry-folgt-data-depotB-1!');   // komplett neues, unbeteiligtes Depot B
  V.akteurSelbstErklaeren('Registry-Test Depot B');

  assert.ok(!V.bereicheAlle().some((s) => s.id === 'depot-a-sektor'),
    'ohne den Reset-Fix trüge das frische Depot B den Sektor des geschlossenen Depot A — live mit Screenshot nachgestellt (01.09.2026)');
  assert.deepEqual(V.getData().bereichsModule, [], 'Depot B selbst hat nie ein eigenes Bereichsmodul bekommen — der alte Sektor kam ausschliesslich aus der stehengebliebenen Registry');
});
