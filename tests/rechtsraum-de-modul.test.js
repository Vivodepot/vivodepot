'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Rechtsraum DE als Modul — (07.09.2026), Zug 1
   ────────────────────────────────────────────────────────────────────────────
   Die Definition of Done nennt fünf Modulachsen: Gerüst + Modul
   privat + Modul Sprache deutsch + Modul Rechtsraum deutsch + Branding/UX.
   Rechtsraum war die einzige, die nicht als Modul existierte — Deutschland lag
   als nativer `AB_WERK_RECHTSRAUM_DE` im Kern. Dieser Zug macht sie sichtbar,
   OHNE den nativen Katalog anzutasten:

     1) der frühere Erzeuger rechtsraum-de-modul-erzeugen liest AB_WERK_RECHTSRAUM_DE und
        schreibt eine unsignierte Modul-Nutzlast — erfindet nichts.
     2) Weg A (_rechtsraumGeruestModulLaden, U2-ADR-285) nimmt diese Nutzlast
        an, WENN sie gegen einen TA-Anker signiert ist — hier mit dem
        bestehenden Test-Zertifikat bewiesen, wie basisVorlagenVerifizieren.
     3) Boot-Verdrahtung (_rechtsraumGeruestModulBooten) ruft Weg A jetzt
        tatsächlich auf — bleibt aber ein sicherer Leerlauf, weil sowohl die
        Cert-Tabelle als auch die eingebettete JWS-Konstante leer sind.
     4) Der native Katalog gewinnt UNVERÄNDERT (_rechtsraumKatalogLesen fragt
        ihn zuerst) — das ausgelieferte deutsche Produkt ändert sich um nichts,
        auch wenn das Modul geladen ist.

   ROTER BEWEIS für den ganzen Zug: das TESTZERTIFIKAT lädt das Modul
   erfolgreich (nachgewiesen, nicht behauptet) — ein VERFÄLSCHTES Zertifikat
   wird abgelehnt, das Produkt fällt auf den nativen Katalog zurück, UND DAS
   WIRD GESAGT (`r.grund` benennt den Ablehnungsgrund, kein stiller Fallback).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');
// Gerüst-Schnitt S3: das DE-Modul ist die Datei selbst (kein Erzeuger mehr).
const baueModul = () => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'rechtsraum-de-modul.json'), 'utf8'));

const TEST_ANKER_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const TEST_ANKER_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: TEST_ANKER_PRIVATE_JWK.x });
const JETZT = '2026-09-07T00:00:00Z';
const OPTS = { jetzt: JETZT, ankerJwk: TEST_ANKER_PUBLIC_JWK };

async function anbieterKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}
function baueGeruestCert(anbieterPubJwk, anbieterId) {
  return {
    '@context': ['https://www.w3.org/ns/credentials/v2'], type: ['VerifiableCredential', 'VivodepotProviderCredential'],
    issuer: 'did:web:vivodepot.de', issuanceDate: '2026-09-07T00:00:00Z', expirationDate: '2036-09-07T00:00:00Z',
    credentialSubject: { anbieterId, anbieterName: 'Vivodepot (Test-Zertifikat, Rechtsraum-DE-Modul)', publicKeyJwk: anbieterPubJwk },
  };
}

/* ── 1 · Der Erzeuger erfindet nichts — jeder Typ deckungsgleich mit dem Katalog ── */

test('[Modul-Datei] das gebackene Produkt trägt genau die Typen der Datei — keiner verworfen', () => {
  const { V } = ladeKern();
  const modul = baueModul();
  assert.equal(modul.rechtsraum, 'DE');
  assert.equal(modul.modulTyp, 'rechtsraum');
  assert.deepEqual(Object.keys(V.getRechtsraumModulRegistry().DE).sort(), Object.keys(modul.typen).sort());
});

test('[Modul-Datei] die Datei besteht validateRechtsraumModul mit und ohne Gerüst-Flag (Gerüst-Fach leer)', () => {
  const { V } = ladeKern();
  const modul = baueModul();
  assert.equal(V.validateRechtsraumModul(modul, { erlaubtGeruestEigenesDE: true }), '');
  assert.equal(V.validateRechtsraumModul(modul), '');
});

/* ── 2 · Weg A end-to-end: Testzertifikat trägt, Fälschung fällt ─────────────── */

test('[Weg A] mit dem Testzertifikat: das erzeugte DE-Modul wird angenommen und ist lesbar', async () => {
  const { V } = ladeKern();
  const modul = baueModul();
  const taSign = await V._jwsImportSignKey(TEST_ANKER_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueGeruestCert(pubJwk, 'vivodepot'), taSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const modulJws = await V._signJWS(modul, anbieterSign, {});
  const certs = { vivodepot: certJws };

  const r = await V._rechtsraumGeruestModulLaden('vivodepot', modulJws, OPTS, certs);
  assert.equal(r.geladen, true, 'geladen sollte true sein: ' + (r.grund || ''));
  assert.deepEqual(V.getRechtsraumGeruestRegistry().DE.will,
    modul.typen.will, 'über die Registry direkt lesbar');
});

test('[Weg A·Rot-Beweis] ein VERFÄLSCHTES Zertifikat wird abgelehnt — benannt, nicht verschwiegen', async () => {
  const { V } = ladeKern();
  const modul = baueModul();
  const taSign = await V._jwsImportSignKey(TEST_ANKER_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const echtesCertJws = await V._signJWS(baueGeruestCert(pubJwk, 'vivodepot'), taSign, {});
  // Verfälschung: der Payload-Teil des JWS wird nach der Signatur verändert (Anbieter-Name),
  // die Signatur bleibt dieselbe — dieselbe Fälschungsform wie im U2-ADR-285-Präzedenzfall.
  const teile = echtesCertJws.split('.');
  const kopf = JSON.parse(Buffer.from(teile[1], 'base64url').toString('utf8'));
  kopf.credentialSubject.anbieterName = 'Verfälscht';
  const verfaelschtesCertJws = teile[0] + '.' + Buffer.from(JSON.stringify(kopf)).toString('base64url') + '.' + teile[2];
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const modulJws = await V._signJWS(modul, anbieterSign, {});
  const certs = { vivodepot: verfaelschtesCertJws };

  const r = await V._rechtsraumGeruestModulLaden('vivodepot', modulJws, OPTS, certs);
  assert.equal(r.geladen, false, 'ein verfälschtes Zertifikat darf NIE tragen');
  assert.ok(r.grund, 'der Ablehnungsgrund wird benannt, kein stiller Fallback: ' + r.grund);
  assert.equal(V.getRechtsraumGeruestRegistry().DE, undefined, 'die Registry bleibt unberührt');
});

test('[Ab-Werk-Saat] ohne jedes Weg-A-Modul liefert der Lesepfad bereits den Ab-Werk-Inhalt', () => {
  const { V } = ladeKern();
  assert.equal(V.getRechtsraumModulRegistry().DE.will.katalogVersion,
    baueModul().typen.will.katalogVersion,
    'die Ab-Werk-Saat trägt den nativen Inhalt bereits, ohne Weg A');
  assert.equal(V._rechtsraumKatalogLesen('will', 'DE', 'katalogVersion'),
    baueModul().typen.will.katalogVersion);
});

test('[Weg A] U2-ADR-382 — ein ECHT signiertes Weg-A-Modul für DE schlägt die Ab-Werk-Saat (Stufe 2 > Stufe 1)', async () => {
  const { V } = ladeKern();
  const modul = baueModul();
  const taSign = await V._jwsImportSignKey(TEST_ANKER_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueGeruestCert(pubJwk, 'vivodepot'), taSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  const modulJws = await V._signJWS(modul, anbieterSign, {});
  const r = await V._rechtsraumGeruestModulLaden('vivodepot', modulJws, OPTS, { vivodepot: certJws });
  assert.equal(r.geladen, true);
  // Vor U2-ADR-382 galt: der native Katalog gewinnt IMMER, ein geladenes Weg-A-Modul liegt
  // inhaltsgleich daneben, ohne je gelesen zu werden. Seit dem Besitz-Zug ist die Ab-Werk-Saat
  // selbst NUR Stufe 1 — ein echtes, TA-signiertes Weg-A-Modul (Stufe 2) überholt sie jetzt
  // wirklich, exakt wie es Drei-Stufen-Rangfolge verlangt.
  assert.equal(V._rechtsraumKatalogLesen('will', 'DE', 'katalogVersion'),
    modul.typen.will.katalogVersion,
    'Weg A muss jetzt tatsächlich gelesen werden, nicht nur strukturell vorhanden sein');
});

test('[Ab-Werk-Saat·Koexistenz] ein zweiter, echter Rechtsraum über Weg A kommt neben der Ab-Werk-Saat an — keiner überschreibt den anderen', async () => {
  const { V } = ladeKern();
  const taSign = await V._jwsImportSignKey(TEST_ANKER_PRIVATE_JWK);
  const { pubJwk, privJwk } = await anbieterKeypair();
  const certJws = await V._signJWS(baueGeruestCert(pubJwk, 'ein-fremder-anbieter'), taSign, {});
  const anbieterSign = await V._jwsImportSignKey(privJwk);
  // Ein synthetisches FR-Modul — bewusst NICHT Österreich/Schweden (U2-ADR-382 Auflage 1: keine
  // zweite Rechtsordnung bauen), nur der Beweis, dass die Registry zwei Fächer gleichzeitig trägt.
  const frModul = {
    rechtsraum: 'FR', moduleVersion: 1, anbieterId: 'ein-fremder-anbieter',
    typen: { will: { katalogVersion: 1, wortlaut: null, formvorschriften: null, fristenVorrang: { auswahlform: 'erfunden' }, zweck: null } },
  };
  const frModulJws = await V._signJWS(frModul, anbieterSign, {});
  const r = await V._rechtsraumGeruestModulLaden('ein-fremder-anbieter', frModulJws, OPTS, { 'ein-fremder-anbieter': certJws });
  assert.equal(r.geladen, true, 'geladen sollte true sein: ' + (r.grund || ''));

  // Die Ab-Werk-Saat für DE bleibt unberührt vom FR-Modul.
  assert.equal(V._rechtsraumKatalogLesen('will', 'DE', 'katalogVersion'),
    baueModul().typen.will.katalogVersion,
    'ein fremder, andersrechtsraumiger Weg-A-Eintrag darf die Ab-Werk-Saat für DE nicht verdrängen');
  // Und FR ist über denselben Lesepfad erreichbar, unabhängig von DE.
  assert.equal(V._rechtsraumKatalogLesen('will', 'FR', 'fristenVorrang', 'auswahlform'), 'erfunden',
    'ein echter zweiter Rechtsraum muss über denselben Lesepfad ankommen, den auch DE nutzt');
});

/* ── 3 · Boot-Verdrahtung: verdrahtet, aber sicher folgenlos ohne echtes Zertifikat ── */

test('[Boot] _rechtsraumGeruestModulBooten() ist verdrahtet, bleibt aber ein Leerlauf ohne echte Nutzlast', async () => {
  const { V } = ladeKern();
  assert.equal(typeof V._rechtsraumGeruestModulBooten, 'function', 'die Boot-Funktion existiert und ist aufrufbar');
  assert.equal(V._RECHTSRAUM_GERUEST_MODUL_VIVODEPOT_DE_JWS, null,
    'Platzhalter bis zur echten Ausstellung — wie templateJws:null bei STANDARD_VORLAGEN');
  const r = await V._rechtsraumGeruestModulBooten();
  assert.equal(r.geladen, false);
  assert.equal(r.grund, 'keine-nutzlast-eingebettet');
  assert.equal(V.getRechtsraumGeruestRegistry().DE, undefined, 'kein Boot-Nebeneffekt ohne echte Nutzlast');
});

test('[Boot] die Cert-Tabelle ist weiterhin leer — zwei unabhängige Leerstellen, nicht eine', () => {
  const { V } = ladeKern();
  assert.deepEqual(V._RECHTSRAUM_GERUEST_MODUL_CERTS, {},
    'erst mit dem echten TA-Zertifikat füllt sich diese Tabelle');
});
