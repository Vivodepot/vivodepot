'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — U2-ADR-182 Task 4: Branding wird erstmals tatsächlich als CSS angewendet
   ────────────────────────────────────────────────────────────────────────
   Lücke aus dem ADR-Kontext: brandingModulPruefen validiert farbePrimaer/
   farbeSekundaer/schriftart/logo/name, aber NICHTS wendet die Werte je als
   CSS an — selbst ein erfolgreich eingelassenes Branding-Modul blieb
   unsichtbar. Dieser Task schließt die Lücke für BEIDE Fälle (Vor-Depot UND
   normal ins Depot eingelassenes Branding, s. verdrahteEinstellungen), über
   eine gemeinsame Anwendungsfunktion — kein zweiter Anwendungsort.

   Fund (28.08.2026): beim Depot-Wechsel innerhalb derselben
   Subdomain-Sitzung (z. B. privates deutsches + Pro-ungarisches Depot auf
   demselben Gerät) darf das Branding des einen nicht ins andere durchbluten
   — _depotSpeicherZuruecksetzen() setzt darum auch das Branding zurück.

   CSS-Variablennamen bewusst NEU (--vd-branding-*, nicht --akzent/--vm-*
   wiederverwenden) — die bestehenden Tokens sind an Sub-Depot-/Tag-Nacht-
   Logik gebunden, eine Vermischung wäre ein zweiter, verdeckter
   Bedeutungsträger für dieselbe Variable.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');

function kern() { return ladeKern().V; }

function fakeRoot() {
  return { style: { _werte: {}, setProperty(k, v) { this._werte[k] = v; }, removeProperty(k) { delete this._werte[k]; } } };
}

test('[Branding-CSS] brandingAnwenden setzt farbePrimaer als CSS-Custom-Property', () => {
  const V = kern();
  const root = fakeRoot();
  V.brandingAnwenden({ farbePrimaer: '#112233', farbeSekundaer: null, schriftart: null }, root);
  assert.equal(root.style._werte['--vd-branding-primaer'], '#112233');
});

test('[Branding-CSS] brandingAnwenden setzt alle drei Werte, wenn vorhanden', () => {
  const V = kern();
  const root = fakeRoot();
  V.brandingAnwenden({ farbePrimaer: '#112233', farbeSekundaer: '#445566', schriftart: 'Inter' }, root);
  assert.equal(root.style._werte['--vd-branding-primaer'], '#112233');
  assert.equal(root.style._werte['--vd-branding-sekundaer'], '#445566');
  assert.equal(root.style._werte['--vd-branding-schriftart'], 'Inter');
});

test('[Branding-CSS] brandingAnwenden ohne farbePrimaer setzt nichts, wirft nicht', () => {
  const V = kern();
  const root = fakeRoot();
  V.brandingAnwenden({ farbePrimaer: null, farbeSekundaer: null, schriftart: null }, root);
  assert.deepEqual(root.style._werte, {});
});

test('[Branding-CSS] brandingAnwenden mit ungültigem Objekt wirft nicht (defensiv)', () => {
  const V = kern();
  const root = fakeRoot();
  assert.doesNotThrow(() => V.brandingAnwenden(null, root));
  assert.doesNotThrow(() => V.brandingAnwenden(undefined, root));
});

test('[Branding-CSS] brandingAnwenden(null, root) räumt zuvor gesetzte Werte weg — der Reset-Weg', () => {
  const V = kern();
  const root = fakeRoot();
  V.brandingAnwenden({ farbePrimaer: '#112233', farbeSekundaer: '#445566', schriftart: 'Inter' }, root);
  assert.equal(root.style._werte['--vd-branding-primaer'], '#112233', 'Vorbedingung: Werte stehen');
  V.brandingAnwenden(null, root);
  assert.deepEqual(root.style._werte, {}, 'ein Reset (kein Branding mehr aktiv) muss die alten Werte entfernen, nicht nur keine neuen setzen — sonst blutet Institution A ins Depot von Institution B durch');
});

/* Ende-zu-Ende: ein signiertes Vor-Depot-Branding-Bündel wirkt nach vorDepotKonfigurationAnwenden als CSS. */
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
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/branding-probe', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  const modulSignaturJws = await signieren(V, modul, anbieter.privJwk);
  return { providerCredentialJws, modulSignaturJws };
}

test('[VDK-Integration] ein eingelassenes Vor-Depot-Branding-Bündel wirkt nach vorDepotKonfigurationAnwenden als CSS', async () => {
  const V = kern();
  const modul = { modulTyp: 'branding', moduleVersion: 1, herkunft: 'probe', sprache: 'de', farbePrimaer: '#abcdef' };
  const buendel = await signiertesBuendel(V, modul);
  const root = fakeRoot();
  await V.vorDepotKonfigurationAnwenden([buendel], root, OPTS);
  assert.equal(root.style._werte['--vd-branding-primaer'], '#abcdef');
});

test('[VDK-Integration·Rot-Beweis] ein UNSIGNIERTES Branding-Bündel wirkt NICHT als CSS (branding ist nurGeprueft)', async () => {
  const V = kern();
  const modul = { modulTyp: 'branding', moduleVersion: 1, herkunft: 'probe', sprache: 'de', farbePrimaer: '#abcdef' };
  const root = fakeRoot();
  // Kein Bündel, direkt das rohe Modul — modulEinlassenGeprueft() erwartet ein
  // {providerCredentialJws, modulSignaturJws}-Objekt, kann so gar nicht parsen und weist ab.
  await V.vorDepotKonfigurationAnwenden([modul], root, OPTS);
  // Auftrag „White Label bis ins PDF" (10.09.2026): seit `_letztesBrandingOderAbWerk`
  // fällt ein leeres `ziel.brandingModule` nicht mehr auf `undefined`, sondern auf
  // `_AB_WERK_BRANDING` zurück (Fall 2, derselbe Rückfall wie bei `_markeName()`) — das ist
  // die BEABSICHTIGTE Folge des Zugs, nicht ein Loch in diesem Rot-Beweis. Die SCHARFE
  // Zusicherung bleibt unverändert und wird jetzt PRÄZISER geprüft: der eingeschleuste,
  // ungeprüfte Wert ('#abcdef') darf NIE ankommen — nur der native Rückfall darf.
  assert.notEqual(root.style._werte['--vd-branding-primaer'], '#abcdef', 'ungeprüftes Branding darf nie wirken (nurGeprueft)');
  assert.equal(root.style._werte['--vd-branding-primaer'], V.AB_WERK_BRANDING.farbePrimaer,
    'ohne ein geprüftes Modul gilt Vivodepots eigener nativer Rückfall, wie bei _markeName()');
});

/* Fund (28.08.2026): Depot-Wechsel innerhalb derselben Sitzung darf kein Branding
   durchbluten lassen. _depotSpeicherZuruecksetzen() ist der bestehende RAM-Wipe (U2-ADR-103) —
   dort muss der Branding-Reset mitlaufen, kein separater Vorgang. Der reale globalThis.document
   liegt in DIESEM Test-Harnisch bereit (documentStub, s. tests/load-kern.js) — kein fakeRoot
   nötig, brandingAnwenden() fällt ohne übergebenes root auf document.documentElement zurück,
   genau wie im Produkt. */
test('[VDK-Reset] _depotSpeicherZuruecksetzen() räumt zuvor gesetztes Branding-CSS weg', async () => {
  const { V, document: dok } = ladeKern();
  const root = dok.documentElement;
  V.brandingAnwenden({ farbePrimaer: '#112233', farbeSekundaer: null, schriftart: null }, root);
  assert.equal(root.style.getPropertyValue('--vd-branding-primaer'), '#112233', 'Vorbedingung: Branding steht');
  V._depotSpeicherZuruecksetzen();
  // Auftrag „White Label bis ins PDF" (10.09.2026): der Reset räumt Institution A weg,
  // fällt aber seither auf `_AB_WERK_BRANDING` zurück statt auf ein hartes Leer — sonst bliebe
  // ein konfektioniertes Branding-Produkt zwischen zwei Depots kurz unmarkiert. Die Zusage aus
  // diesem Fund bleibt: Institution A darf NICHT mehr stehen.
  assert.notEqual(root.style.getPropertyValue('--vd-branding-primaer'), '#112233', 'Institution A darf nach dem Reset nicht mehr stehen');
  assert.equal(root.style.getPropertyValue('--vd-branding-primaer'), V.AB_WERK_BRANDING.farbePrimaer,
    'der Reset fällt auf Vivodepots eigenen nativen Rückfall zurück, nicht auf ein hartes Leer');
});
