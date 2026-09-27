'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-189 — depotLaden() muss SEKTOREN auch dann neu füllen, wenn DIESES
   Depot keine eigenen Textsatz-Module mitbringt
   ────────────────────────────────────────────────────────────────────────
   Fund (01.09.2026), herausgearbeitet: eine ANDERE Ursache
   als die Sprachmodul-Vererbung (U2-ADR-189, Teil 1) und als U2-ADR-188
   (Registry folgt data) — kein Registry-Problem, sondern ein zu eng
   gedachtes Gate. depotLaden() rief textsatzNeuAnwenden() bislang nur, wenn
   `_textsatzModuleAusDepotAnmelden(data) > 0` — also nur, wenn DAS GERADE
   GELADENE Depot selbst Textsatz-Module mitbringt. Falsch: die SEKTOREN-
   Fill-Runde muss immer neu laufen, wenn sich die aktive Sprache seit dem
   letzten Fill geändert haben könnte — unabhängig davon, WELCHES Depot
   diese Änderung ausgelöst hat. Beleg, dass ein Zähler-Gate hier nie nötig
   war: textsatzSchreibrichtungAnwenden()/textsatzSprachkennungAnwenden()
   liefen an genau derselben Stelle schon immer unbedingt.

   DIESER Test isoliert GENAU die depotLaden-Bedingung von U2-ADR-188
   (Sub-Kontext-Wechsel) und von Teil 1 (Vor-Depot-Vererbung) — zwei
   sequentielle depotLaden()-Aufrufe in DERSELBEN Kern-Instanz, kein
   Sub-Kontext, kein Vor-Depot-Modul beim zweiten Depot. Bündel-Aufbau
   identisch zu den Geschwisterdateien.

   ROT-BEWEIS, von Hand geführt: das `> 0`-Zähler-Gate an dieser Stelle in
   vivodepot.html wiederhergestellt, `node --test` gegen genau diese Datei
   laufen lassen, den erwarteten Fehlschlag gesehen (SEKTOREN blieb auf
   „Egészség" stehen statt „Gesundheit" — actual/expected im Lauf-Protokoll),
   den Fix wiederhergestellt, erneut grün.
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
const OPTS = Object.freeze({ ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: '2026-09-01T09:00:00Z' });
const PW_HU = 'depotladen-sprachwechsel-hu-1!';
const PW_DE = 'depotladen-sprachwechsel-de-1!';

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
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/depotladen-sprachwechsel-probe', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  const modulSignaturJws = await signieren(V, modul, anbieter.privJwk);
  return { providerCredentialJws, modulSignaturJws };
}

test('[U2-ADR-189·depotLaden] ein zweites, sprachlich unbeteiligtes Depot setzt SEKTOREN zurück, statt die Sprache des ERSTEN stehen zu lassen', async () => {
  // Depot 1 (Hungarian, eigenes Textsatz-Modul IN-DEPOT gedockt) bauen und serialisieren.
  const bauer1 = kern();
  await bauer1.depotAnlegen(PW_HU);
  bauer1.akteurSelbstErklaeren('Bauer Eins');
  const modul = { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'hu', herkunft: 'depotladen-sprachwechsel-hu-modul', texte: { 'health.label': 'Egészség' } };
  const buendel = await signiertesBuendel(bauer1, modul);
  const rEinlass = await bauer1.modulEinlassenGeprueft(JSON.stringify(buendel), null, OPTS);
  assert.equal(rEinlass.angenommen, true, 'Vorbedingung: das Hungarian-Testmodul muss angenommen werden — ' + JSON.stringify(rEinlass));
  bauer1._moduleEinlassWirken(rEinlass);
  bauer1.getData().textsprache = 'hu';   // wie im echten In-Depot-Weg (_moduleEinlassWirken selbst setzt es nur für r.typ==='textsatz', hier zur Klarheit explizit)
  // Beleg gegen die Kollektor-Form weiter unten (deepEqual(…, [])): eine gepinnte, NICHT-leere
  // Zahl im selben Testkörper beweist, dass die Prüfung nicht von Anfang an leer zählt.
  assert.equal(bauer1.getData().textsatzModule.length, 1, 'Vorbedingung: Bauer Eins trägt sein eigenes Modul');
  const umschlagHu = await bauer1.depotSerialisieren();

  // Depot 2 (plain Deutsch, KEIN eigenes Textsatz-Modul) bauen und serialisieren — eigene
  // Kern-Instanz, damit Depot 2 nachweislich nichts von Depot 1 geerbt hat.
  const bauer2 = kern();
  await bauer2.depotAnlegen(PW_DE);
  bauer2.akteurSelbstErklaeren('Bauer Zwei');
  assert.deepEqual(bauer2.getData().textsatzModule, [], 'Vorbedingung: Depot 2 hat kein eigenes Textsatz-Modul');
  const umschlagDe = await bauer2.depotSerialisieren();

  // Eine DRITTE Kern-Instanz lädt BEIDE nacheinander — genau der Fall, der die Bedingung prüft:
  // der zweite depotLaden()-Aufruf trifft auf ein bereits Hungarian gefülltes SEKTOREN.
  const leser = kern();
  await leser.depotLaden(umschlagHu, PW_HU);
  assert.equal(leser.SEKTOREN.find((s) => s.id === 'health').label, 'Egészség', 'Vorbedingung: Depot 1 füllt SEKTOREN auf Hungarian — das ist der bereits bekannte Weg (Teil 1)');

  await leser.depotLaden(umschlagDe, PW_DE);

  assert.equal(leser.textsatzSpracheAktiv(), 'de', 'Vorbedingung: die aktive Sprache selbst wechselt korrekt zurück auf Deutsch');
  assert.equal(leser.SEKTOREN.find((s) => s.id === 'health').label, 'Gesundheit',
    'ohne den Fix bliebe SEKTOREN auf "Egészség" stehen (der Zähler-Gate sah 0 eigene Module in Depot 2 und übersprang die Fill-Runde) — genau der Widerspruch, der am 01.09.2026 gefunden wurde: aktive Sprache und angezeigte Beschriftung liefen auseinander');
});
