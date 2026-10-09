#!/usr/bin/env node
'use strict';
/* Example: open the reply (Antwort) a Vivodepot user sent back to your request, without any Vivodepot software.

   The reply is a JWE in Compact Serialization (RFC 7516), file ending `.jwe`, media type `application/jose`
   (U2-ADR-449). `enc` is always A256GCM; `alg` is one of
     · ECDH-ES (direct key agreement, RFC 7518 §4.6) on P-256 — opened with your private key file, or
     · PBES2-HS512+A256KW (RFC 7518 §4.8) with p2c = 600000 exactly — opened with the one-time password.
   The protected header is readable and bound as AAD; it names the case (`vorgang`), never a value.

   Any JOSE library can open it. With `jose`, set `maxPBES2Count` to at least 600000. This file does it by hand with
   WebCrypto so you can see every step, and it applies the same checks as the Vivodepot read-only viewer:
   it refuses `zip`, any other `alg`, any other `p2c`, and an ECDH-ES reply that carries an encrypted key.

   Usage
     node antwort-oeffnen.js <reply.jwe> --schluessel <antwort-schluessel.privat.jwk> [--vorgang <case>]
     node antwort-oeffnen.js <reply.jwe> --passwort <one-time password>             [--vorgang <case>]

   Prints the decrypted data set as JSON. Node 22 or later, no dependencies. */
const fs = require('node:fs');
const { webcrypto } = require('node:crypto');

const subtle = webcrypto.subtle;
const TYP = 'vivodepot-antwort+jwe';
const PBES2 = 'PBES2-HS512+A256KW';
const P2C = 600000;

function b64u(text) {
  if (!/^[A-Za-z0-9_-]*$/.test(String(text))) throw new Error('jwe: not base64url');
  return new Uint8Array(Buffer.from(String(text), 'base64url'));
}
const verbinden = (...teile) => new Uint8Array(Buffer.concat(teile.map((t) => Buffer.from(t))));
function laenge32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b; }

/* Concat KDF (NIST SP 800-56A, RFC 7518 §4.6.2). One SHA-256 round gives the 256-bit content key. */
async function concatKdf(z, algName, apu, apv) {
  const alg = new TextEncoder().encode(algName);
  const other = verbinden(laenge32(alg.length), alg, laenge32(apu.length), apu, laenge32(apv.length), apv, laenge32(256));
  return new Uint8Array(await subtle.digest('SHA-256', verbinden(laenge32(1), z, other)));
}

/* Header only, nothing decrypted. Returns null if the text is not a Vivodepot reply. */
function kopfLesen(text) {
  const teile = String(text).trim().split('.');
  if (teile.length !== 5) return null;
  try {
    const kopf = JSON.parse(Buffer.from(b64u(teile[0])).toString('utf8'));
    return kopf && kopf.typ === TYP && kopf.enc === 'A256GCM' ? kopf : null;
  } catch (e) { return null; }
}

async function antwortOeffnen(text, schluessel) {
  const t = String(text).trim();
  const kopf = kopfLesen(t);
  if (!kopf) throw new Error('jwe: not a Vivodepot reply');
  if (kopf.zip !== undefined) throw new Error('jwe: zip is not supported');
  const [kB64, ekB64, ivB64, ctB64, tagB64] = t.split('.');
  const s = schluessel || {};
  let cek;
  if (kopf.alg === 'ECDH-ES') {
    if (!s.privateJwk || !kopf.epk || b64u(ekB64).length) throw new Error('jwe: key pair reply needs your private key');
    const priv = await subtle.importKey('jwk', s.privateJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
    const epk = await subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: kopf.epk.x, y: kopf.epk.y },
      { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const z = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: epk }, priv, 256));
    const roh = await concatKdf(z, 'A256GCM', kopf.apu ? b64u(kopf.apu) : new Uint8Array(0), b64u(kopf.apv || ''));
    try { cek = await subtle.importKey('raw', roh, { name: 'AES-GCM' }, false, ['decrypt']); }
    finally { z.fill(0); roh.fill(0); }
  } else if (kopf.alg === PBES2) {
    // A fixed count: a forged header with a huge p2c would otherwise stall the receiver.
    if (kopf.p2c !== P2C) throw new Error('jwe: unexpected p2c');
    if (typeof s.passwort !== 'string' || !s.passwort) throw new Error('jwe: password reply needs the one-time password');
    const pw = new TextEncoder().encode(s.passwort);
    let kw;
    try {
      const basis = await subtle.importKey('raw', pw, { name: 'PBKDF2' }, false, ['deriveKey']);
      kw = await subtle.deriveKey({ name: 'PBKDF2', salt: verbinden(new TextEncoder().encode(PBES2), [0], b64u(kopf.p2s)),
        iterations: P2C, hash: 'SHA-512' }, basis, { name: 'AES-KW', length: 256 }, false, ['unwrapKey']);
    } finally { pw.fill(0); }
    cek = await subtle.unwrapKey('raw', b64u(ekB64), kw, { name: 'AES-KW' }, { name: 'AES-GCM' }, false, ['decrypt']);
  } else {
    throw new Error('jwe: unsupported alg');
  }
  // The protected header, exactly as received, is the additional authenticated data (RFC 7516 §5.1 step 14).
  const klar = await subtle.decrypt({ name: 'AES-GCM', iv: b64u(ivB64), additionalData: new TextEncoder().encode(kB64), tagLength: 128 },
    cek, verbinden(b64u(ctB64), b64u(tagB64)));
  return { kopf, datensatz: JSON.parse(new TextDecoder().decode(klar)) };
}

function argumente(argv) {
  const a = { datei: null, schluessel: null, passwort: null, vorgang: null };
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) { a.datei = argv[i]; continue; }
    const k = argv[i].slice(2);
    if (!(k in a) || k === 'datei' || argv[i + 1] === undefined) throw new Error('unknown or incomplete argument: ' + argv[i]);
    a[k] = argv[++i];
  }
  if (!a.datei) throw new Error('name the reply file');
  return a;
}

async function hauptprogramm(argv) {
  const a = argumente(argv);
  const schluessel = a.schluessel ? { privateJwk: JSON.parse(fs.readFileSync(a.schluessel, 'utf8')) } : { passwort: a.passwort };
  const { kopf, datensatz } = await antwortOeffnen(fs.readFileSync(a.datei, 'utf8'), schluessel);
  // The case number is in the protected header and inside the data set. Compare it with the one you asked for.
  if (a.vorgang && kopf.vorgang !== a.vorgang) throw new Error('reply is for case "' + kopf.vorgang + '", not "' + a.vorgang + '"');
  console.log(JSON.stringify(datensatz, null, 2));
  /* A partial reply says so itself: `vollstaendig` false, `fehlend` and `unbekannt` name what is missing. Show it;
     never present a partial reply as a complete one. */
  if (datensatz.vollstaendig === false) console.warn('note: the reply is not complete (see fehlend / unbekannt / zurueckgehalten)');
  return 0;
}

if (require.main === module) {
  hauptprogramm(process.argv.slice(2)).then((code) => { process.exitCode = code; },
    (e) => { console.error('error: ' + e.message); process.exitCode = 1; });
}
module.exports = { kopfLesen, antwortOeffnen, concatKdf, argumente, hauptprogramm, P2C, PBES2, TYP };
