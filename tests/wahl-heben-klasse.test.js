'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Wahl statt Schalter, die Klasse (VD-SEC-009 S5, 16.10.2026): jede Stelle, die die Modul-Objekte eines Depots ersetzt oder
   ein Depot neu in die Register bringt, hält die Wahl. Ein nicht gewähltes Modul ist ein Objekt in `_DEPOT_NICHT_GEWAEHLT`;
   ein neues Objekt mit demselben Inhalt steht dort nicht und wirkte still, wenn die ersetzende Stelle den Zustand nicht
   überträgt.

   Gemessene Stellen (Klassentabelle im Bericht zu S5): depotLaden markiert vor den Registern und nach depotNormalisieren
   (gehalten von den Proben [Sperre·…]); das Betreten eines Sub-Depots (tests/wahl-sub-depot-betreten.test.js);
   das Einlesen einer signierten Bündel-Liste, die alle Fächer aus einer Kopie neu setzt (diese Datei). Die übrigen Stellen,
   die `data` setzen, bringen keine mitgereisten Module mit (leeres Depot, Vorführung, Sicherungs-Tausch beim Speichern).

   Rot-Beweise: je Stelle ein Kern ohne die Übertragung, geladen über `htmlPfad`; dann wirkt das Modul ohne Wahl.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');

const PRODUKT = 'privat-de';
const ANKER_PW = 'wahl-heben-anker-pw-2026!';
const SUB_PW = 'wahl-heben-sub-pw-2026!';
const MESSPUNKT = 'strings:fussQuellcode.text';
const KERN = path.join(__dirname, '..', 'vivodepot.html');

/* Prüfanker der Proben (öffentlicher Testschlüssel, auch in tests/export-sensibel-subkontext-bereich.test.js). */
const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const OPTS = Object.freeze({ ankerJwk: { kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x }, jetzt: '2026-09-01T09:00:00Z' });

const fremdesModul = (herkunft) => ({ modulTyp: 'textsatz', moduleVersion: 1, sprache: 'fr', herkunft, texte: { [MESSPUNKT]: 'MITGEREIST-WAHL-PROBE' } });

async function signiertesBuendel(V, modul) {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const priv = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const cert = { '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId: 'institution/wahl-heben-probe', anbieterTyp: 'institution/test', anbieterName: 'Test-Anbieter', publicKeyJwk: pub } };
  const sign = async (p, jwk) => V._signJWS(p, await V._jwsImportSignKey(jwk), {});
  return { providerCredentialJws: await sign(cert, SENTINEL_PRIVATE_JWK), modulSignaturJws: await sign(modul, priv) };
}

/* Ein Kern, in dem Zeilen durch andere ersetzt sind — für die Rot-Beweise. `paare`: [[alt, neu], …]. */
function kernOhne(...paare) {
  let html = fs.readFileSync(KERN, 'utf8');
  for (const [alt, neu] of paare) {
    assert.equal(html.split(alt).length, 2, 'Vorbedingung: die Stelle steht genau einmal im Kern: ' + alt.trim());
    html = html.replace(alt, () => neu);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wahl-heben-'));
  const p = path.join(dir, 'kern.html');
  fs.writeFileSync(p, html);
  return { pfad: p, aufraeumen: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
const laden = (htmlPfad) => ladeKern(htmlPfad ? { produkt: PRODUKT, htmlPfad, backen: true } : { produkt: PRODUKT }).V;

/* ── Bündel-Liste ─────────────────────────────────────────────────────────── */

async function bundleNachOffenemFremdmodul(htmlPfad) {
  const Q = laden(htmlPfad);
  await Q.depotAnlegen(ANKER_PW);
  const d = JSON.parse(JSON.stringify(Q.getData()));
  d.textsatzModule = [fremdesModul('wahl-heben-mitgereist')];
  d.textsprache = 'fr';
  Q.setData(d);
  const umschlag = await Q.depotSerialisieren();
  const V = laden(htmlPfad);
  await V.depotLaden(JSON.parse(JSON.stringify(umschlag)), ANKER_PW);
  assert.equal(V.nichtGewaehlteDepotModule().length, 1, 'Vorbedingung: das mitgereiste Modul steht zur Wahl');
  assert.notEqual(V.textLesen(MESSPUNKT), 'MITGEREIST-WAHL-PROBE', 'Vorbedingung: es wirkt nicht');
  const anderes = { modulTyp: 'institutionsArt', sprache: 'de', herkunft: 'wahl-heben-signiert', name: 'Probe', moduleVersion: 1, arten: { a: 'A' } };
  const r = await V.modulBuendelListeEinlassenGeprueft([await signiertesBuendel(V, anderes)], null, OPTS);
  assert.equal(r.angenommen, true, 'Vorbedingung: das signierte Bündel wird angenommen — ' + JSON.stringify(r));
  V._moduleEinlassWirken(r);
  return V;
}

test('[Wahl·Bündel-Liste] eine eingelesene signierte Bündel-Liste macht ein nicht gewähltes Modul nicht still wirksam', async () => {
  const V = await bundleNachOffenemFremdmodul();
  assert.deepEqual(V.nichtGewaehlteDepotModule().map((g) => g.typ), ['textsatz'], 'das mitgereiste Modul steht weiter zur Wahl');
  assert.notEqual(V.textLesen(MESSPUNKT), 'MITGEREIST-WAHL-PROBE', 'und wirkt weiter nicht');
  assert.ok(V.eingelasseneModule().some((m) => m.typ === 'institutionsArt' && !m.nichtGewaehlt), 'das eben signiert eingelassene ist gewählt');
});

test('[Wahl·Bündel-Liste·Rot-Beweis] ohne die Übertragung wirkt das mitgereiste Modul nach dem Einlesen', async () => {
  const k = kernOhne(['else if (nichtGewaehlt.has(fp) && _DEPOT_NICHT_GEWAEHLT) _DEPOT_NICHT_GEWAEHLT.add(m);', '']);
  try {
    const V = await bundleNachOffenemFremdmodul(k.pfad);
    assert.deepEqual(V.nichtGewaehlteDepotModule(), []);
    assert.equal(V.textLesen(MESSPUNKT), 'MITGEREIST-WAHL-PROBE');
  } finally { k.aufraeumen(); }
});

/* ── Sub-Depot: Rot-Beweis zur Probe in tests/wahl-sub-depot-betreten.test.js ─ */

/* Beide Markierungen beim Betreten fehlen, also der Stand vor dem Fix. Die erste allein zu entfernen reicht nicht: die zweite,
   nach dem Normalisieren, fängt das Modul dann noch ab. Die erste steht trotzdem, damit kein Register das Modul je ohne Marke sieht. */
test('[Wahl·Sub-Depot·Rot-Beweis] ohne die Markierung beim Betreten wirkt das Modul des Subs ohne Wahl', async () => {
  const k = kernOhne(['  if (_ersteWahl) _depotModuleNichtGewaehltMarkieren(data);\n', '\n'],
    ['  if (_ersteWahl) { _depotModuleNichtGewaehltMarkieren(data); sess.wahlMarkiert = true;', '  if (_ersteWahl) { sess.wahlMarkiert = true;']);
  try {
    const V = laden(k.pfad);
    await V.depotAnlegen(ANKER_PW);
    V.akteurSelbstErklaeren('Tochter Reiter');
    const inhalt = { schemaVersion: V.SCHEMA_VERSION_AKTUELL, sektoren: {}, menschen: [], institutionen: [], textsprache: 'fr',
      textsatzModule: [fremdesModul('wahl-heben-sub')] };
    const e = await V.subDepotEinhaengen(V.blackboxDateiAusUmschlag(await V.subDepotVersiegeln(inhalt, SUB_PW)), { bezeichnung: 'Hedwig', inhaberin: 'Hedwig Brandt' });
    await V.subDepotVertrauenOeffnen(e.depotUUID, SUB_PW);
    V.subKontextBetreten(e.depotUUID);
    assert.equal(V.textLesen(MESSPUNKT), 'MITGEREIST-WAHL-PROBE');
  } finally { k.aufraeumen(); }
});
