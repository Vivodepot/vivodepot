'use strict';
/* Entschlüsselt eine SHL-JWE (alg:dir, enc:A256GCM, RFC 7516 compact) — Node-Crypto-Spiegel
   von shlUriBauen/shlProviderPayload aus vivodepot.html (U2-ADR-047). Kein Vivodepot-Code
   verändert; dieselbe Mathematik wie tests/shl-provider.test.js:jweDirDecrypt (dort bereits
   bewiesen: JWE-Klartext == importiertes Original, byte-genau). Hier für die Empfänger-Seite
   der Demo-Aufnahme genutzt, weil Vivodepot selbst keinen shlink:/-Konsumenten hat. */
const nodeCrypto = require('node:crypto');

const SHL_URI_PRAEFIX = 'shlink:/';

function b64uToBuf(s) {
  return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

// shlink:/-URI -> { url, key, flag, label, exp }.
function shlUriLesen(uri) {
  const s = String(uri || '');
  if (!s.startsWith(SHL_URI_PRAEFIX)) throw new Error('shlUriLesen: kein shlink:/-Präfix');
  return JSON.parse(b64uToBuf(s.slice(SHL_URI_PRAEFIX.length)).toString('utf8'));
}

// JWE compact (alg:dir, enc:A256GCM) -> Klartext-String.
function jweDirDecrypt(jwe, keyB64u) {
  const teile = String(jwe).split('.');
  const protHdr = teile[0], ivB = teile[2], ctB = teile[3], tagB = teile[4];
  const d = nodeCrypto.createDecipheriv('aes-256-gcm', b64uToBuf(keyB64u), b64uToBuf(ivB));
  d.setAAD(Buffer.from(protHdr, 'ascii'));
  d.setAuthTag(b64uToBuf(tagB));
  return Buffer.concat([d.update(b64uToBuf(ctB)), d.final()]).toString('utf8');
}

function sha256Hex(text) {
  return nodeCrypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

module.exports = { SHL_URI_PRAEFIX, b64uToBuf, shlUriLesen, jweDirDecrypt, sha256Hex };
