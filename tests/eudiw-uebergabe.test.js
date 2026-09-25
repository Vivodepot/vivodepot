'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — An EUDI-Wallet übergeben (Best-Effort SD-JWT-VC-Serialisierung)
   ────────────────────────────────────────────────────────────────────────
   BEST-EFFORT gegen den aktuellen SD-JWT-VC-/EUDI-Entwurf (NICHT garantiert
   interoperabel). Prüft: die Übergabe erzeugt die erwartete SD-JWT-VC-Struktur
   (JWT ~ Disclosures ~), die Digests stimmen mit dem _sd-Array überein,
   QR und Datei tragen denselben Text (Konsistenz), die sensible-Felder- und
   Transparenz-Logik der bestehenden Builder wird honoriert, alles read-only,
   und die Krypto bleibt unberührt (nur base64url-Helfer des JWS-Blocks).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const nodeCrypto = require('node:crypto');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

// Unabhängige Referenz: base64url(SHA-256(utf8(str))) — wie der SD-JWT-_sd-Digest.
function refDigest(str) {
  return nodeCrypto.createHash('sha256').update(str, 'utf8').digest('base64url');
}
function b64uToString(s) {
  return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

async function identMitDaten(V) {
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Muster');
  V.sektorFeldSetzen('identity', 'birthDate', '1980-05-17');
}

test('1) eudiwDefFuerSektor: nur SD-JWT-VC-Bereiche (Identität, Finanzen) sind EUDI-fähig', async () => {
  const { V } = await frischMitDepot();
  assert.equal(V.eudiwDefFuerSektor('identity').id, 'sd-jwt-vc-identitaet');
  assert.equal(V.eudiwDefFuerSektor('finance').id, 'sd-jwt-vc-finanzen');
  assert.equal(V.eudiwDefFuerSektor('health'), null);
  assert.equal(V.eudiwDefFuerSektor('administration'), null);
});

test('2) SD-JWT-VC-Serialisierung: <JWT>~<Disclosure…>~  mit alg:none, typ dc+sd-jwt', async () => {
  const { V } = await frischMitDepot();
  await identMitDaten(V);
  const vc = V.sdJwtVcIdentitaet();
  const res = await V.eudiwSdJwtVcSerialisieren(vc);

  // Form: endet auf „~", enthält Tilden, JWT ist der erste „~"-Abschnitt.
  assert.ok(res.serialisierung.endsWith('~'), 'endet mit ~ (kein Key-Binding-JWT)');
  const teile = res.serialisierung.split('~');
  // letztes Element ist '' (trailing ~) → JWT + N Disclosures
  assert.equal(teile[teile.length - 1], '');
  const jwt = teile[0];
  const jwtTeile = jwt.split('.');
  assert.equal(jwtTeile.length, 3, 'JWS Compact (3 Teile)');
  assert.equal(jwtTeile[2], '', 'alg:none → leere Signatur');

  const header = JSON.parse(b64uToString(jwtTeile[0]));
  assert.equal(header.alg, 'none');
  assert.equal(header.typ, 'dc+sd-jwt');
  assert.equal(header.typ, V.EUDIW_SD_JWT_TYP);
});

test('3) JWT-Nutzlast: Pflicht-Metadaten + sortiertes _sd-Array + _sd_alg sha-256', async () => {
  const { V } = await frischMitDepot();
  await identMitDaten(V);
  const vc = V.sdJwtVcIdentitaet();
  const res = await V.eudiwSdJwtVcSerialisieren(vc);
  const p = res.jwtPayload;

  assert.equal(p.vct, 'urn:vivodepot:identitaet');
  assert.equal(p.iss, 'urn:vivodepot:selbstauskunft');
  assert.equal(typeof p.iat, 'number');
  assert.equal(p._sd_alg, 'sha-256');
  assert.ok(Array.isArray(p._sd) && p._sd.length >= 3, 'mind. given_name/family_name/birthdate');
  const aktuell = [...p._sd];
  const sortiert = [...p._sd].sort();
  assert.deepEqual(aktuell, sortiert);
  // Claims sind NICHT im JWT (nur als Disclosure offenbarbar).
  assert.equal(p.given_name, undefined);
  assert.equal(p.claims, undefined);
});

test('4) Disclosures dekodieren zu [salt,name,wert]; Digests == _sd-Einträge (Referenz-SHA-256)', async () => {
  const { V } = await frischMitDepot();
  await identMitDaten(V);
  const vc = V.sdJwtVcIdentitaet();
  const res = await V.eudiwSdJwtVcSerialisieren(vc);

  const namen = [];
  for (const disc of res.disclosures) {
    const arr = JSON.parse(b64uToString(disc));
    assert.equal(arr.length, 3, '[salt, name, wert]');
    assert.equal(typeof arr[0], 'string');          // salt
    namen.push(arr[1]);
    // Digest dieser Disclosure muss im _sd-Array stehen (unabhängige Referenz).
    assert.ok(res.jwtPayload._sd.includes(refDigest(disc)), 'Digest im _sd: ' + arr[1]);
  }
  assert.ok(namen.includes('given_name'));
  assert.ok(namen.includes('family_name'));
  assert.ok(namen.includes('birthdate'));
});

// Test 5 (qrTeileZusammensetzen-Rundlauf) entfernt, U2-ADR-085 §5, 14.07.2026: die Funktion
// ist gestrichen (kein Aufrufer — die EUDIW-Wallet setzt mit eigener Implementierung
// zusammen, nie Vivodepot-Code). qrTeilePacken bleibt über export-durchgang.test.js Test 17
// geprüft.

test('6) OID4VP-Vorschau-Wrapper: trägt die Serialisierung als vp_token, ehrlich markiert', async () => {
  const { V } = await frischMitDepot();
  await identMitDaten(V);
  const vc = V.sdJwtVcIdentitaet();
  const res = await V.eudiwSdJwtVcSerialisieren(vc);
  const w = V.eudiwOid4vpWrapper(res.serialisierung, res.jwtPayload.vct);
  assert.equal(w.vp_token, res.serialisierung);
  assert.equal(w.format, 'dc+sd-jwt');
  assert.equal(w.vct, 'urn:vivodepot:identitaet');
  assert.ok(/Vorläufig|abzustimmen|offline|Live-Protokoll/i.test(w._hinweis), 'ehrlicher Hinweis');
});

test('7) Finanzen: sensible Felder (IBAN) standardmäßig zurückgehalten, mit Zustimmung enthalten', async () => {
  const { V } = await frischMitDepot();
  // U2-ADR-074: konto_haupt_* entfielen aus dem Finanz-VC (Konten sind Liste, VC ruht). Der
  // Sensibel-Mechanismus wird jetzt an private_av_nr (pension_provider_contract_number,
  // sensibel:true) + private_av_institut (pension_provider, nicht-sensibel) geprüft.
  // Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `steuerid` (tax_id) diente hier vorher als
  // sensibler Beleg — die Mapping-Zeile ist mit dem Umbau der Liste `steuerid` weggelassen
  // (vivodepot.html:17295-17297, dokumentierter Gap), darum ersetzt durch private_av_nr, das
  // dieselbe Sensibel-Eigenschaft unverändert trägt.
  V.sektorFeldSetzen('finance', 'privatePensionProvision', 'Cosmos Direkt');
  V.sektorFeldSetzen('finance', 'policyContractNumber', 'POL-772-4493');

  // Ohne Zustimmung: sensible Disclosure (pension_provider_contract_number) fehlt.
  const ohne = await V.eudiwSdJwtVcSerialisieren(V.sdJwtVcFinanzen({ sensibel: false }));
  const namenOhne = ohne.disclosures.map(d => JSON.parse(b64uToString(d))[1]);
  assert.ok(namenOhne.includes('pension_provider'));
  assert.ok(!namenOhne.includes('pension_provider_contract_number'), 'Vertragsnummer ohne Zustimmung zurückgehalten');

  // Mit Zustimmung: sensible Disclosure vorhanden.
  const mit = await V.eudiwSdJwtVcSerialisieren(V.sdJwtVcFinanzen({ sensibel: true }));
  const namenMit = mit.disclosures.map(d => JSON.parse(b64uToString(d))[1]);
  assert.ok(namenMit.includes('pension_provider_contract_number'), 'Vertragsnummer mit Zustimmung enthalten');
});

test('7b) tax_id fehlt im Finanz-VC — Mapping-Zeile entfallen, nicht der Umbau schuld', async () => {
  const { V } = await frischMitDepot();
  V.listenEintragHinzufuegen('finance', 'taxIdsTaxNumbers', { system: 'DE', taxNumber: '12 345 678 901' });
  const claims = V.sdJwtVcFinanzen({ sensibel: true }).claims;
  assert.equal(claims.tax_id, undefined, 'kein Mapping mehr auf steuerid — Liste statt Skalar');
});

test('8) Salt ist je Disclosure frisch (zufällig) — zwei Läufe ergeben andere Disclosures, gleiche Claims', async () => {
  const { V } = await frischMitDepot();
  await identMitDaten(V);
  const vc = V.sdJwtVcIdentitaet();
  const a = await V.eudiwSdJwtVcSerialisieren(vc);
  const b = await V.eudiwSdJwtVcSerialisieren(vc);
  assert.notEqual(a.disclosures[0], b.disclosures[0], 'frischer Salt → andere Disclosure-Bytes');
  // Aber die offenbarten Claim-Namen/-Werte sind identisch.
  const valsA = a.disclosures.map(d => JSON.parse(b64uToString(d)).slice(1)).sort();
  const valsB = b.disclosures.map(d => JSON.parse(b64uToString(d)).slice(1)).sort();
  assert.deepEqual(valsA, valsB);
});

test('9) read-only: Erzeugen + Flow verändern die Laufzeitdaten nicht', async () => {
  const { V } = await frischMitDepot();
  await identMitDaten(V);
  const vorher = JSON.stringify(V.getData());
  const vc = V.sdJwtVcIdentitaet();
  await V.eudiwSdJwtVcSerialisieren(vc);
  V.eudiwOid4vpWrapper('x', 'y');
  V.flowEudiwUebergabe('identity');                   // keine qrcode-Lib im Harness → Hinweis, kein Wurf
  assert.equal(JSON.stringify(V.getData()), vorher);
});

test('10) flowEudiwUebergabe wirft nicht — leer (Hinweis) und mit Daten (ohne qrcode-Lib)', async () => {
  const { V } = await frischMitDepot();
  assert.doesNotThrow(() => V.flowEudiwUebergabe('identity'));       // leer → später Hinweis
  assert.doesNotThrow(() => V.flowEudiwUebergabe('health'));         // kein EUDI-Format → Hinweis
  await identMitDaten(V);
  assert.doesNotThrow(() => V.flowEudiwUebergabe('identity'));       // Daten, keine Lib → Hinweis
});

test('11) leere Disclosure-Liste → „<JWT>~" (keine Tilde-Doppelung)', async () => {
  const { V } = await frischMitDepot();
  const res = await V.eudiwSdJwtVcSerialisieren({ vct: 'urn:test', iss: 'urn:test', iat: 1, claims: {} });
  assert.ok(res.serialisierung.endsWith('.~'), 'JWT endet auf „.", dann genau ein „~"');
  assert.equal(res.disclosures.length, 0);
  assert.equal(res.jwtPayload._sd.length, 0);
});
