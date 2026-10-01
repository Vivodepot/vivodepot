#!/usr/bin/env node
'use strict';
/* Messwerkzeug zu U2-ADR-449: die Antwort als JWE, geprüft gegen den Vektor aus RFC 7518 Anhang C, im Rundlauf Kern → Lese-App
   und — nur mit `--jose <pfad>` — gegen die unabhängige Bibliothek `jose` in beide Richtungen.
   `jose` kommt NICHT ins Repo (U2-ADR-434): der Pfad zeigt auf ein Paket außerhalb (etwa ein `npm i jose` im Scratchpad).
   Ohne Pfad läuft nur, was ohne Fremdmodul geht; so prüft es die Suite (tests/antwort-jwe-messen.test.js).

   Aufruf:
     node tools/antwort-jwe-messen.js                    Vektor und Rundläufe, Ausgabe als JSON
     node tools/antwort-jwe-messen.js --jose <pfad>      dazu die Gegenprobe mit jose (Paketordner oder dessen Einstieg) */
const path = require('node:path');
const { ladeKern, webcrypto } = require('../tests/load-kern.js');
const { ladeLesen } = require('../tests/load-lesen.js');

const VEKTOR = {
  alice: { kty: 'EC', crv: 'P-256', x: 'gI0GAILBdu7T53akrFmMyGcsF3n5dO7MmwNBHKW5SV0', y: 'SLW_xSffzlPWrHEVI30DHM_4egVwt3NQqeUD7nMFpps', d: '0_NxaRPUMQoAJt50Gz8YiTr8gRTwyEaCumd-MToTmIo' },
  bob: { kty: 'EC', crv: 'P-256', x: 'weNJy2HscCSM6AEDTDg04biOvhFhyyWvOHQfeF_PxMQ', y: 'e8lnCO-AlStT-NJVX-crhB7QRYhiix03illJOVAOyck' },
  erwartet: 'VqqN6vgjbSBcIijNcacQGg',
};

function argumente(argv) {
  const a = { jose: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--jose' && argv[i + 1]) a.jose = argv[++i];
    else throw new Error('unbekanntes Argument: ' + argv[i]);
  }
  return a;
}

async function messen(opt) {
  const K = ladeKern().V;
  const L = ladeLesen().V;
  const s = webcrypto.subtle;
  const raus = {};
  const z = new Uint8Array(await s.deriveBits(
    { name: 'ECDH', public: await s.importKey('jwk', VEKTOR.bob, { name: 'ECDH', namedCurve: 'P-256' }, false, []) },
    await s.importKey('jwk', VEKTOR.alice, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']), 256));
  const k = await L._jweConcatKdf(z, 'A128GCM', new TextEncoder().encode('Alice'), new TextEncoder().encode('Bob'), 128);
  raus.kdfVektor = Buffer.from(k).toString('base64url') === VEKTOR.erwartet;

  const kp = await s.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const pub = await s.exportKey('jwk', kp.publicKey);
  const priv = await s.exportKey('jwk', kp.privateKey);
  const klar = JSON.stringify({ probe: 'antwort-jwe-messen', n: 1 });
  const tE = await K.antwortJweSchluessel(klar, pub, { vorgang: 'MESSUNG' });
  const tP = await K.antwortJwePasswort(klar, 'Messung-Passwort-9xQ', { vorgang: 'MESSUNG' });
  raus.rundlaufSchluesselpaar = (await L.antwortJweOeffnen(tE, { privateJwk: priv })).klartext === klar;
  raus.rundlaufPasswort = (await L.antwortJweOeffnen(tP, { passwort: 'Messung-Passwort-9xQ' })).klartext === klar;
  raus.laengen = { schluesselpaar: tE.length, passwort: tP.length };

  if (opt.jose) {
    // eslint-disable-next-line import/no-dynamic-require
    const jose = require(path.resolve(opt.jose));
    const enc = new TextEncoder(), dec = new TextDecoder();
    const jE = await jose.compactDecrypt(tE, await jose.importJWK(priv, 'ECDH-ES'));
    const jP = await jose.compactDecrypt(tP, enc.encode('Messung-Passwort-9xQ'),
      { keyManagementAlgorithms: ['PBES2-HS512+A256KW'], maxPBES2Count: 600000 });
    let ohneGrenze = 'gelesen';
    try { await jose.compactDecrypt(tP, enc.encode('Messung-Passwort-9xQ'), { keyManagementAlgorithms: ['PBES2-HS512+A256KW'] }); }
    catch (e) { ohneGrenze = e.code || e.message; }
    const vonJoseE = await new jose.CompactEncrypt(enc.encode(klar))
      .setProtectedHeader({ alg: 'ECDH-ES', enc: 'A256GCM', typ: 'vivodepot-antwort+jwe' })
      .setKeyManagementParameters({ apv: enc.encode('MESSUNG') }).encrypt(await jose.importJWK(pub, 'ECDH-ES'));
    const vonJoseP = await new jose.CompactEncrypt(enc.encode(klar))
      .setProtectedHeader({ alg: 'PBES2-HS512+A256KW', enc: 'A256GCM', typ: 'vivodepot-antwort+jwe' })
      .setKeyManagementParameters({ p2c: 600000 }).encrypt(enc.encode('Messung-Passwort-9xQ'));
    raus.jose = {
      version: (() => { try { return require(path.join(path.resolve(opt.jose), 'package.json')).version; } catch (e) { return null; } })(),
      liestUnsereSchluesselpaar: dec.decode(jE.plaintext) === klar,
      liestUnserPasswort: dec.decode(jP.plaintext) === klar,
      ohneMaxPBES2Count: ohneGrenze,
      wirLesenJoseSchluesselpaar: (await L.antwortJweOeffnen(vonJoseE, { privateJwk: priv })).klartext === klar,
      wirLesenJosePasswort: (await L.antwortJweOeffnen(vonJoseP, { passwort: 'Messung-Passwort-9xQ' })).klartext === klar,
    };
  }
  return raus;
}

async function main(argv) {
  const r = await messen(argumente(argv));
  process.stdout.write(JSON.stringify(r, null, 2) + '\n');
  const ok = r.kdfVektor && r.rundlaufSchluesselpaar && r.rundlaufPasswort
    && (!r.jose || (r.jose.liestUnsereSchluesselpaar && r.jose.liestUnserPasswort && r.jose.wirLesenJoseSchluesselpaar && r.jose.wirLesenJosePasswort));
  return ok ? 0 : 1;
}

if (require.main === module) {
  main(process.argv.slice(2)).then((c) => { process.exitCode = c; }, (e) => { process.stderr.write(String(e && e.message || e) + '\n'); process.exitCode = 2; });
}
module.exports = { messen, argumente, main };
