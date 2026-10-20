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

   SIGNED REPLIES (U2-ADR-501). Since version v931 the reply inside the JWE is a JWS Compact (`cty` `JWT`), signed by the person
   with an Ed25519 key that exists only for your organisation. This file checks it: `typ` vivodepot-antwort+jwt, `alg` Ed25519
   (EdDSA still read), the public key in the header (OKP/Ed25519, no private part), `kid` = its RFC 7638 thumbprint if present, no
   `crit`, a valid signature, `iat`, `aud` and the case number. It then returns the data set without `iat`, `aud`, `anfrageAbdruck`.
   The signature shows that the entries are unchanged since signing and which key signed them; it does not prove who the person is.
   A reply that is not signed because the person's browser cannot create Ed25519 signatures carries `unsigniert: "browser"`; it is
   reported as such. Unsigned replies from versions that do not sign yet (plain JSON) open as before.

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
  const inhalt = new TextDecoder().decode(klar);
  if (typeof kopf.cty === 'string' && kopf.cty.toLowerCase() === 'jwt') return signierteAntwortPruefen(kopf, inhalt);
  const datensatz = JSON.parse(inhalt);
  if (datensatz && datensatz.unsigniert === 'browser') {
    delete datensatz.unsigniert;
    return { kopf, datensatz, signatur: { zustand: 'unsigniert-browser' } };
  }
  return { kopf, datensatz, signatur: { zustand: 'ohne' } };
}

const JWS_TYP = 'vivodepot-antwort+jwt';
const JWS_ANSPRUECHE = ['iat', 'aud', 'anfrageAbdruck'];
async function thumbprint(jwk) {
  const kanon = JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x });
  return Buffer.from(await subtle.digest('SHA-256', new TextEncoder().encode(kanon))).toString('base64url');
}
/* The signed reply (U2-ADR-501): every deviation is a refusal, and then no content is returned. */
async function signierteAntwortPruefen(kopf, jws) {
  const teile = String(jws).trim().split('.');
  if (teile.length !== 3) throw new Error('jws: not compact');
  const h = JSON.parse(Buffer.from(b64u(teile[0])).toString('utf8'));
  if (typeof h.typ !== 'string' || h.typ.toLowerCase() !== JWS_TYP) throw new Error('jws: wrong typ');
  if (h.crit !== undefined) throw new Error('jws: crit not accepted');
  if (h.alg !== 'Ed25519' && h.alg !== 'EdDSA') throw new Error('jws: unsupported alg');
  const j = h.jwk;
  if (!j || j.kty !== 'OKP' || j.crv !== 'Ed25519' || j.d !== undefined || typeof j.x !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(j.x)) {
    throw new Error('jws: header key must be a public Ed25519 key');
  }
  const abdruck = await thumbprint(j);
  if (h.kid !== undefined && h.kid !== abdruck) throw new Error('jws: kid is not the thumbprint of the key');
  const key = await subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: j.x }, { name: 'Ed25519' }, false, ['verify']);
  const ok = await subtle.verify({ name: 'Ed25519' }, key, b64u(teile[2]), new TextEncoder().encode(teile[0] + '.' + teile[1]));
  if (!ok) throw new Error('jws: signature does not match');
  const n = JSON.parse(Buffer.from(b64u(teile[1])).toString('utf8'));
  if (typeof n.iat !== 'number' || !(n.iat > 0)) throw new Error('jws: iat missing');
  if (typeof n.aud !== 'string' || !n.aud) throw new Error('jws: aud missing');
  if (!n.anfrage || n.anfrage.vorgang !== kopf.vorgang) throw new Error('jws: signed for a different case');
  const datensatz = {};
  for (const k of Object.keys(n)) if (!JWS_ANSPRUECHE.includes(k)) datensatz[k] = n[k];
  return { kopf, datensatz, signatur: { zustand: 'signiert', aud: n.aud, abdruck, signiertAm: new Date(n.iat * 1000).toISOString() } };
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
  const { kopf, datensatz, signatur } = await antwortOeffnen(fs.readFileSync(a.datei, 'utf8'), schluessel);
  // The case number is in the protected header and inside the data set. Compare it with the one you asked for.
  if (a.vorgang && kopf.vorgang !== a.vorgang) throw new Error('reply is for case "' + kopf.vorgang + '", not "' + a.vorgang + '"');
  console.log(JSON.stringify(datensatz, null, 2));
  // The signature as facts, never as a verified identity: unchanged since signing, by this key, for this recipient identifier.
  if (signatur.zustand === 'signiert') console.warn('signed for ' + signatur.aud + ' with key ' + signatur.abdruck + ' at ' + signatur.signiertAm);
  else if (signatur.zustand === 'unsigniert-browser') console.warn('note: not signed (the browser could not create an Ed25519 signature)');
  else console.warn('note: not signed; the version that created this reply does not sign replies yet');
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
