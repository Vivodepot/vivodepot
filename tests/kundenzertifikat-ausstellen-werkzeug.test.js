'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — tools/kundenzertifikat-ausstellen.js („Zertifikatsbetrieb", 23.08.2026)
   ────────────────────────────────────────────────────────────────────────
   Wegwerf-Ausgabe-Schlüssel (als .vdkey), Wegwerf-Ausstellerzertifikat
   (mit dem Test-Sentinel als „Anker" signiert), Wegwerf-Kundenschlüssel.
   KEY tabu.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ladeKern, webcrypto } = require('./load-kern.js');
const { ladeIssuer } = require('./load-issuer.js');
const { lauf } = require('../tools/kundenzertifikat-ausstellen.js');

const SENTINEL_PRIVATE_JWK = Object.freeze({
  kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519',
  d: '-XFGcY2Rd9PBxjiBwWXGsOdiSGj5Vf1L90l09_FW4NE',
  x: 'kmz5gD4oi4pZe0CdR7FhXahRnjZqrAkKCe0VNskNf60',
  key_ops: ['sign'], ext: true,
});
const SENTINEL_PUBLIC_JWK = Object.freeze({ kty: 'OKP', crv: 'Ed25519', alg: 'Ed25519', x: SENTINEL_PRIVATE_JWK.x });

function mitTmpVerzeichnis(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kundenzertifikat-ausstellen-test-'));
  return Promise.resolve(fn(tmp)).finally(() => fs.rmSync(tmp, { recursive: true, force: true }));
}

async function wegwerfKeypair() {
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return { pubJwk: await webcrypto.subtle.exportKey('jwk', kp.publicKey), privJwk: await webcrypto.subtle.exportKey('jwk', kp.privateKey) };
}

async function ausstellerZertifikatBauen(ISSUER, ausgabePubJwk) {
  const signKey = await ISSUER._jwsImportSignKey(SENTINEL_PRIVATE_JWK);
  const vc = ISSUER.baueProviderVC({
    issuer: 'did:web:vivodepot.de', anbieterId: 'vivodepot/ausgabestelle-test', anbieterName: 'Test-Ausgabestelle',
    anbieterTyp: ISSUER.AUSGABESTELLE_ANBIETERTYP, publicKeyJwk: ausgabePubJwk,
    issuanceDate: '2026-01-01T00:00:00Z', expirationDate: '2027-01-01T00:00:00Z',
  });
  return ISSUER.stelleProviderCredentialAus(vc, signKey);
}

async function aufbauen(tmp) {
  const ISSUER = ladeIssuer().V;
  const ausgabe = await wegwerfKeypair();
  const vdkeyWrapper = await ISSUER.schuetzeSchluesselJwk(ausgabe.privJwk, 'wegwerf-ausgabe-passphrase');
  const vdkeyPfad = path.join(tmp, 'ausgabe.vdkey.json');
  fs.writeFileSync(vdkeyPfad, JSON.stringify(vdkeyWrapper), 'utf8');

  const ausstellerZertifikatJws = await ausstellerZertifikatBauen(ISSUER, ausgabe.pubJwk);
  const ausstellerPfad = path.join(tmp, 'ausstellerzertifikat.json');
  fs.writeFileSync(ausstellerPfad, JSON.stringify({ certJws: ausstellerZertifikatJws }), 'utf8');

  const kunde = await wegwerfKeypair();
  const subjektPfad = path.join(tmp, 'kunde-public.jwk.json');
  fs.writeFileSync(subjektPfad, JSON.stringify(kunde.pubJwk), 'utf8');

  return { ausgabe, vdkeyPfad, ausstellerPfad, kunde, subjektPfad };
}

test('[kundenzertifikat-ausstellen] Regelfall: Kundenzertifikat verifiziert über die Zwischenstufe gegen den Anker', async () => {
  await mitTmpVerzeichnis(async (tmp) => {
    const { vdkeyPfad, ausstellerPfad, kunde, subjektPfad } = await aufbauen(tmp);
    const ausgabePfad = path.join(tmp, 'kundenzertifikat.json');

    const ok = await lauf({
      anbieterId: 'institution/test-kunde', anbieterName: 'Test-Kunde GmbH', anbieterTyp: 'institution/test',
      subjektPublicJwkPfad: subjektPfad, ausgabeSchluesselVdkeyPfad: vdkeyPfad, passphrase: 'wegwerf-ausgabe-passphrase',
      ausstellerZertifikatPfad: ausstellerPfad, ausgabeDateiArg: ausgabePfad,
    });

    assert.equal(ok, true, 'Werkzeug meldet Erfolg');
    const ergebnis = JSON.parse(fs.readFileSync(ausgabePfad, 'utf8'));
    assert.ok(!/"d"\s*:/.test(fs.readFileSync(ausgabePfad, 'utf8')), 'keine Ausgabedatei enthält Schlüsselmaterial');

    const { V } = ladeKern();
    const res = await V.verifiziereProviderCredential(ergebnis.certJws, {
      ankerJwk: SENTINEL_PUBLIC_JWK, jetzt: '2026-06-01T00:00:00Z', ausstellerZertifikatJws: ergebnis.ausstellerZertifikatJws,
    });
    assert.equal(res.gueltig, true, 'Kundenzertifikat verifiziert über die volle Kette: ' + (res.grund || ''));
    assert.equal(res.nutzlast.credentialSubject.anbieterId, 'institution/test-kunde');
  });
});

test('[kundenzertifikat-ausstellen·Gegenprobe] falsches Ausstellerzertifikat (anderer Ausgabe-Schlüssel) → Abbruch vor jeder Signatur', async () => {
  await mitTmpVerzeichnis(async (tmp) => {
    const { vdkeyPfad, subjektPfad } = await aufbauen(tmp);
    const ISSUER = ladeIssuer().V;
    const einAndererAusgabeSchluessel = await wegwerfKeypair();
    const falschesAusstellerZertifikatJws = await ausstellerZertifikatBauen(ISSUER, einAndererAusgabeSchluessel.pubJwk);
    const falscherAusstellerPfad = path.join(tmp, 'falsches-ausstellerzertifikat.json');
    fs.writeFileSync(falscherAusstellerPfad, JSON.stringify({ certJws: falschesAusstellerZertifikatJws }), 'utf8');
    const ausgabePfad = path.join(tmp, 'kundenzertifikat.json');

    const vorherExitCode = process.exitCode;
    const ok = await lauf({
      anbieterId: 'institution/test-kunde', anbieterName: 'Test-Kunde GmbH', anbieterTyp: 'institution/test',
      subjektPublicJwkPfad: subjektPfad, ausgabeSchluesselVdkeyPfad: vdkeyPfad, passphrase: 'wegwerf-ausgabe-passphrase',
      ausstellerZertifikatPfad: falscherAusstellerPfad, ausgabeDateiArg: ausgabePfad,
    });
    process.exitCode = vorherExitCode;

    assert.equal(ok, false, 'Werkzeug meldet Abbruch, wenn Ausstellerzertifikat nicht zum geladenen Ausgabe-Schlüssel passt');
    assert.ok(!fs.existsSync(ausgabePfad), 'keine Ausgabedatei bei Abbruch');
  });
});

test('[kundenzertifikat-ausstellen] falsche Passphrase → Abbruch, kein Leck', async () => {
  await mitTmpVerzeichnis(async (tmp) => {
    const { vdkeyPfad, ausstellerPfad, subjektPfad } = await aufbauen(tmp);
    const ausgabePfad = path.join(tmp, 'kundenzertifikat.json');

    let geloggt = '';
    const origError = console.error;
    console.error = (...args) => { geloggt += args.join(' ') + '\n'; };
    const vorherExitCode = process.exitCode;
    let ok;
    try {
      ok = await lauf({
        anbieterId: 'institution/test-kunde', anbieterName: 'Test-Kunde GmbH', anbieterTyp: 'institution/test',
        subjektPublicJwkPfad: subjektPfad, ausgabeSchluesselVdkeyPfad: vdkeyPfad, passphrase: 'falsche-passphrase',
        ausstellerZertifikatPfad: ausstellerPfad, ausgabeDateiArg: ausgabePfad,
      });
    } finally {
      console.error = origError;
      process.exitCode = vorherExitCode;
    }

    assert.equal(ok, false, 'Werkzeug meldet Abbruch bei falscher Passphrase');
    assert.ok(!fs.existsSync(ausgabePfad), 'keine Ausgabedatei bei Abbruch');
    assert.ok(!geloggt.includes('falsche-passphrase'), 'die Passphrase erscheint in keiner Fehlermeldung');
  });
});

test('[kundenzertifikat-ausstellen] Ausgabe-Schlüssel == Subjekt-Schlüssel → Abbruch', async () => {
  await mitTmpVerzeichnis(async (tmp) => {
    const { ausgabe, vdkeyPfad, ausstellerPfad } = await aufbauen(tmp);
    const subjektPfad = path.join(tmp, 'kunde-public.jwk.json');
    fs.writeFileSync(subjektPfad, JSON.stringify(ausgabe.pubJwk), 'utf8'); // derselbe Schlüssel als "Kunde"
    const ausgabePfad = path.join(tmp, 'kundenzertifikat.json');

    const vorherExitCode = process.exitCode;
    const ok = await lauf({
      anbieterId: 'institution/test-kunde', anbieterName: 'Test-Kunde GmbH', anbieterTyp: 'institution/test',
      subjektPublicJwkPfad: subjektPfad, ausgabeSchluesselVdkeyPfad: vdkeyPfad, passphrase: 'wegwerf-ausgabe-passphrase',
      ausstellerZertifikatPfad: ausstellerPfad, ausgabeDateiArg: ausgabePfad,
    });
    process.exitCode = vorherExitCode;

    assert.equal(ok, false, 'Werkzeug meldet Abbruch, wenn Ausgabe-Schlüssel und Subjekt gleich sind');
    assert.ok(!fs.existsSync(ausgabePfad), 'keine Ausgabedatei bei Abbruch');
  });
});
