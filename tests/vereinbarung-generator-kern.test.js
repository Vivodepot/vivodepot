'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Angebot aus der App → Antwort aus dem Generator → Einlass in der App (MyTerms Teil D, 16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Die ganze Strecke offline, über beide echten Dateien: der Generator liest das Angebot mit seinem eigenen
   Leser, signiert mit dem Anbieter-Schlüssel, und der Kern prüft über Zertifikat und Anker.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { ladeGenerator } = require('./load-generator.js');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const OPTS = Object.freeze({ ankerJwk: { kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x }, jetzt: '2026-09-16T09:00:00Z' });

async function stelleUndAngebot() {
  const { V } = ladeKern();
  const { V: G } = ladeGenerator();
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pubJwk = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const privJwk = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const zertifikat = await V._signJWS({
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
    credentialSubject: { anbieterId: 'praxis/am-markt', anbieterTyp: 'institution/test', anbieterName: 'Praxis am Markt', publicKeyJwk: pubJwk },
  }, await V._jwsImportSignKey(SENTINEL_PRIVATE_JWK));
  await V.depotAnlegen('generator-kern-probe-lang-genug-2026');
  V._bedingungskatalogModuleAusDepotAnmelden({ bedingungskatalogModule: [] });
  const f = await V.bedingungFestlegen('SD-BASE', 'PDC-AI');
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Praxis am Markt', zweck: 'Behandlung', umfang: 'Medikation',
    vereinbarung: { angebot: { bevorzugt: f.bevorzugt, ausweich: f.ausweich }, status: 'angeboten' } });
  const angebotText = V.vereinbarungAlsText(V.vereinbarungAngebotErzeugen(e));
  const state = { anbieter: { anbieterId: 'praxis/am-markt', anbieterName: 'Praxis am Markt' }, publicKeyJwk: pubJwk, zertifikatJws: zertifikat };
  return { V, G, e, angebotText, state, privJwk };
}

test('[Strecke] Annahme im Generator signiert → in der App geprüft und frei', async () => {
  const { V, G, e, angebotText, state, privJwk } = await stelleUndAngebot();
  assert.equal(G.VEREINBARUNG_PRAEFIX, V.VEREINBARUNG_PRAEFIX, 'beide Seiten lesen dasselbe Präfix');
  const antwort = G.baueVereinbarungsAntwort(G.vereinbarungAusText(angebotText), 'angenommen', 'ausweich', 'Praxis am Markt');
  const umschlag = await G.baueVereinbarungsAntwortSigniert(antwort, state, privJwk);
  const r = await V.vereinbarungAntwortAnwenden(V.vereinbarungAusText(G.vereinbarungAlsText(umschlag)), OPTS);
  assert.deepEqual(r, { ergebnis: 'angenommen', grund: null, frei: true, kennung: e.kennung });
  assert.equal(V.vereinbarungAusgabeErlaubt(e), true);
});

test('[Strecke] Ablehnung im Generator → steht in der App im Protokoll', async () => {
  const { V, G, e, angebotText, state, privJwk } = await stelleUndAngebot();
  const umschlag = await G.baueVereinbarungsAntwortSigniert(G.baueVereinbarungsAntwort(G.vereinbarungAusText(angebotText), 'abgelehnt'), state, privJwk);
  const r = await V.vereinbarungAntwortAnwenden(V.vereinbarungAusText(G.vereinbarungAlsText(umschlag)), OPTS);
  assert.equal(r.ergebnis, 'abgelehnt');
  assert.equal(e.vereinbarung.ablehnung.geprueft, true);
});

test('[Strecke·Rot-Beweis] der Generator baut keine Antwort ohne Wahl und keine zu einem fremden Text; falscher Schlüssel wirft', async () => {
  const { G, angebotText, state } = await stelleUndAngebot();
  assert.throws(() => G.baueVereinbarungsAntwort(G.vereinbarungAusText(angebotText), 'angenommen', null), /wählen Sie/);
  assert.throws(() => G.baueVereinbarungsAntwort({ art: 'etwas-anderes' }, 'abgelehnt'), /kein Angebot/);
  const fremd = await webcrypto.subtle.exportKey('jwk', (await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])).privateKey);
  await assert.rejects(() => G.baueVereinbarungsAntwortSigniert(G.baueVereinbarungsAntwort(G.vereinbarungAusText(angebotText), 'abgelehnt'), state, fremd), /passt nicht/);
});
