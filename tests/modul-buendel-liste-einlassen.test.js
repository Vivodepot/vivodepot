'use strict';
/* ══════════════════════════════════════════════════════════════
   Eine Vorlage aus mehreren signierten Bündeln — modulBuendelListeEinlassenGeprueft (02.10.2026, U2-ADR-243 §8)
   ──────────────────────────────────────────────────────────────
   Wegwerf-Sentinel-Anker und Wegwerf-Anbieter-Schlüssel wie tests/modul-einlassen-geprueft.test.js. Kein Produktivschlüssel.
   Bedingungen der Entscheidung, je mit Probe:
   (a) alles oder nichts: fällt ein Bündel, bleibt nichts zurück — weder im Depot noch in der Merkliste belegter Sprachmodule,
       auch nicht das gute erste Bündel;
   (b) jedes Bündel läuft über genau den heutigen Prüfweg seines Registers (dasselbe Ergebnis wie einzeln eingelassen);
   (c) eine Obergrenze für die Zahl der Bündel;
   (d) Rot-Proben: gemischte Liste, Bündel ohne gültige Signatur, über der Grenze, Abbruch-Rückstand.
   Rot-Beweis (gemessen 02.10.2026): schreibt der Einlass direkt ins Depot statt in eine Kopie, wird die Probe zum
   Abbruch-Rückstand rot; setzt er das Bereichs-Register beim Abbruch nicht zurück, wird die Register-Probe rot.
   ══════════════════════════════════════════════════════════════ */
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
const OPTS = Object.freeze({ ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: '2026-08-23T12:00:00Z' });

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
  return V._signJWS(payload, await V._jwsImportSignKey(privJwk), {});
}

const TEXTSATZ = Object.freeze({ modulTyp: 'textsatz', sprache: 'hu', moduleVersion: 1, texte: { 'strings:depotPilleEigen.text': 'Üdvözöljük' } });
const BEREICH = Object.freeze({
  modulTyp: 'bereich', moduleVersion: 1, herkunft: 'test/beruf', sprache: 'de', kennung: 'test/beruf-probe',
  bereiche: { 'pro-probe-beruf': { id: 'pro-probe-beruf', label: 'Probe-Beruf', icon: 'folder',
    sektionen: [{ id: 'kanzlei', label: 'Kanzlei', felder: [{ id: 'tpl_probe_feld', typ: 'text', label: 'Probefeld' }] }] } },
});

async function umgebung() {
  const { V } = ladeKern();
  const anbieter = await wegwerfKeypair();
  const providerCredentialJws = await signieren(V, anbieterCertRohling('institution/test-anbieter', anbieter.pubJwk), SENTINEL_PRIVATE_JWK);
  const buendel = async (modul) => ({ providerCredentialJws, modulSignaturJws: await signieren(V, modul, anbieter.privJwk) });
  const fremd = await wegwerfKeypair();
  const falschSigniert = async (modul) => ({ providerCredentialJws, modulSignaturJws: await signieren(V, modul, fremd.privJwk) });
  return { V, buendel, falschSigniert };
}
const stand = (V, d) => JSON.stringify({ d, belegt: [...V._TEXTSATZ_BELEGT.entries()], bereiche: V.bereicheAlle().map((b) => b.id) });

test('[Liste] Regelfall: zwei signierte Bündel (Sprache und Bereich) werden zusammen angenommen', async () => {
  const { V, buendel } = await umgebung();
  const d = V.leeresDepot();
  const r = await V.modulBuendelListeEinlassenGeprueft([await buendel(TEXTSATZ), await buendel(BEREICH)], d, OPTS);
  assert.equal(r.angenommen, true, r.grund);
  assert.equal(d.textsatzModule.length, 1);
  assert.equal(d.bereichsModule.length, 1);
  assert.equal(d.bereichsModule[0].anbieterIdGeprueft, true, 'über den signierten Weg, mit geprüfter Kennung');
});

test('[Liste·gleicher Prüfweg] jedes Bündel bekommt dasselbe Ergebnis wie einzeln eingelassen', async () => {
  const { V, buendel } = await umgebung();
  const b = await buendel(BEREICH);
  const einzeln = await V.modulEinlassenGeprueft(JSON.stringify(b), V.leeresDepot(), OPTS);
  const liste = await V.modulBuendelListeEinlassenGeprueft([b], V.leeresDepot(), OPTS);
  const ohneZeit = (r) => JSON.parse(JSON.stringify(Object.assign({}, r, { eingelassenAm: undefined })));
  assert.deepEqual(ohneZeit(liste.ergebnisse[0]), ohneZeit(einzeln));
  const kaputt = Object.assign({}, BEREICH, { bereiche: 'kein Objekt' });
  const einzelnRot = await V.modulEinlassenGeprueft(JSON.stringify(await buendel(kaputt)), V.leeresDepot(), OPTS);
  const listeRot = await V.modulBuendelListeEinlassenGeprueft([await buendel(kaputt)], V.leeresDepot(), OPTS);
  assert.equal(einzelnRot.angenommen, false);
  assert.equal(listeRot.grund, einzelnRot.grund, 'dieselbe Prüfung lehnt mit demselben Grund ab');
});

test('[Liste·Rot·Abbruch-Rückstand] fällt das zweite Bündel, bleibt vom guten ersten nichts zurück — Depot und Merkliste', async () => {
  const { V, buendel, falschSigniert } = await umgebung();
  const d = V.leeresDepot();
  const vorher = stand(V, d);
  const r = await V.modulBuendelListeEinlassenGeprueft([await buendel(TEXTSATZ), await falschSigniert(BEREICH)], d, OPTS);
  assert.equal(r.angenommen, false);
  assert.equal(r.ergebnisse[0].angenommen, true, 'Vorbedingung: das erste Bündel allein wäre angenommen worden');
  assert.equal(stand(V, d), vorher, 'kein Rückstand im Depot und in der Merkliste');
});

test('[Liste·Rot·Abbruch-Rückstand·Register] ein guter Bereich zuerst, dann fällt das zweite Bündel: das Bereichs-Register ist wie vorher', async () => {
  const { V, buendel, falschSigniert } = await umgebung();
  const d = V.leeresDepot();
  const vorher = stand(V, d);
  const r = await V.modulBuendelListeEinlassenGeprueft([await buendel(BEREICH), await falschSigniert(TEXTSATZ)], d, OPTS);
  assert.equal(r.angenommen, false);
  assert.equal(r.ergebnisse[0].angenommen, true, 'Vorbedingung: der Bereich allein wäre angenommen worden');
  assert.ok(!V.bereicheAlle().some((b) => b.id === 'pro-probe-beruf'), 'der Bereich steht nicht im Register');
  assert.equal(stand(V, d), vorher);
});

test('[Liste·Rot·gemischt] ein unsigniertes Element verwirft die ganze Liste, bevor geprüft wird', async () => {
  const { V, buendel } = await umgebung();
  const d = V.leeresDepot();
  const vorher = stand(V, d);
  const r = await V.modulBuendelListeEinlassenGeprueft([await buendel(TEXTSATZ), BEREICH], d, OPTS);
  assert.equal(r.angenommen, false);
  assert.equal(r.grund, 'kein-signiertes-bundle');
  assert.deepEqual(r.ergebnisse, [], 'nichts wurde überhaupt geprüft');
  assert.equal(stand(V, d), vorher);
});

test('[Liste·Rot·ohne Signatur] ein Bündel mit fremder Signatur wird abgelehnt', async () => {
  const { V, falschSigniert } = await umgebung();
  const d = V.leeresDepot();
  const r = await V.modulBuendelListeEinlassenGeprueft([await falschSigniert(BEREICH)], d, OPTS);
  assert.equal(r.angenommen, false);
  assert.ok(/signatur/i.test(r.grund), r.grund);
  assert.equal((d.bereichsModule || []).length, 0);
});

test('[Liste·Rot·Grenze] mehr Bündel als erlaubt werden abgelehnt, ohne eines zu prüfen', async () => {
  const { V, buendel } = await umgebung();
  const b = await buendel(TEXTSATZ);
  const d = V.leeresDepot();
  const vorher = stand(V, d);
  const r = await V.modulBuendelListeEinlassenGeprueft(Array(V._MODUL_EINLASS_MAX_BUENDEL + 1).fill(b), d, OPTS);
  assert.equal(r.grund, 'zu-viele-buendel');
  assert.deepEqual(r.ergebnisse, []);
  assert.equal(stand(V, d), vorher);
  const genau = await V.modulBuendelListeEinlassenGeprueft(Array(V._MODUL_EINLASS_MAX_BUENDEL).fill(b), V.leeresDepot(), OPTS);
  assert.notEqual(genau.grund, 'zu-viele-buendel', 'an der Grenze selbst wird geprüft');
});

test('[Liste·Rot·keine Teilannahme] fällt ein Bündel, ist die ganze Liste ungeprüft — auch wenn das erste bestanden hat', async () => {
  const { V, buendel, falschSigniert } = await umgebung();
  const d = V.leeresDepot();
  const r = await V.modulBuendelListeEinlassenGeprueft([await buendel(TEXTSATZ), await falschSigniert(BEREICH)], d, OPTS);
  assert.equal(r.ergebnisse[0].angenommen, true, 'Vorbedingung: das erste Bündel hat die Prüfung bestanden');
  assert.equal(r.angenommen, false);
  assert.equal(r.ungeprueft, true, 'keine Teilannahme als geprüft');
  const gut = await V.modulBuendelListeEinlassenGeprueft([await buendel(TEXTSATZ), await buendel(BEREICH)], V.leeresDepot(), OPTS);
  assert.equal(gut.ungeprueft, false, 'Gegenprobe: erst wenn jedes Bündel besteht, gilt die Liste als geprüft');
});
