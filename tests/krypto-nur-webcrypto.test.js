'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Krypto nur über crypto.subtle; die eine Ausnahme ist noble-ed25519 (30.10.2026)
   ────────────────────────────────────────────────────────────────────────
   validierung.html sagt: „Die Verschlüsselung des Depots läuft vollständig über die Kryptographie des Browsers. Eine Ausnahme
   ist eingebettet: noble-ed25519, in der Fassung, die Cure53 2022 geprüft hat.“ Die Herkunft der Bibliothek und ihren Pfad
   (nur getPublicKey, SHA-512 über crypto.subtle) halten schon tests/halter-schluessel-noble.test.js fest. Diese Probe ist der
   Wächter über den Rest des Kerns:
   - Eingebettet sind genau drei fremde Blöcke: jsPDF (mit pako), noble-ed25519 und qrcode-generator. Ein vierter fällt auf.
   - Außerhalb dieser drei steht kein Fingerabdruck einer eigenen Krypto-Umsetzung: keine Start- oder Rundenkonstanten von
     SHA-1/SHA-2/MD5, keine AES-S-Box, keine ChaCha-Konstante, keine Primzahl von Curve25519.
   - Keine PDF-Verschlüsselung über jsPDF (deren RC4/MD5 liefe an WebCrypto vorbei).
   - Die Depot-Verschlüsselung selbst ruft crypto.subtle.encrypt/decrypt mit AES-GCM: gemessen an einem echten Versiegeln und
     Entsiegeln eines Sub-Depots (derselbe Speicherweg _depotV4Schreiben wie jedes Depot).
   Grenze: Ein Fingerabdruck-Wächter sieht keine Umsetzung ohne bekannte Konstanten. Er deckt die Klasse „eine Bibliothek
   oder ein kopierter Primitiv-Code kommt herein“, nicht jede denkbare Eigenbau-Arithmetik.
   Rot-Beweis: eine SHA-256-Konstante außerhalb der Bibliotheken, ein vierter Bibliotheksblock und eine jsPDF-Verschlüsselung
   fallen auf.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto } = require('node:crypto');
const { ladeKern } = require('./load-kern.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

const FINGERABDRUECKE = Object.freeze([
  ['SHA-256/SHA-512 Startwert', /0x6a09e667|\b1779033703\b/i],
  ['SHA-256 Rundenkonstante', /0x428a2f98|\b1116352408\b/i],
  ['SHA-1/MD5 Startwert', /0x67452301|\b1732584193\b|0xefcdab89/i],
  ['MD5 Rundenkonstante', /0xd76aa478|\b3614090360\b/i],
  ['AES-S-Box', /0x63,\s*0x7c,\s*0x77,\s*0x7b|\b99,\s*124,\s*119,\s*123\b/i],
  ['ChaCha/Salsa-Konstante', /expand 32-byte k|0x61707865/i],
  ['Curve25519-Primzahl', /57896044618658097711785492504343953926634992332820282019728792003956564819949|0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed/i],
]);

function bloecke(text) {
  const aus = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(text))) aus.push({ attr: m[1], inhalt: m[2] });
  return aus;
}
function art(b) {
  if (/id="noble_ed25519_VivodepotInline"/.test(b.attr)) return 'noble';
  if (/id="qrcode_VivodepotInline"/.test(b.attr)) return 'qrcode';
  if (/^\s*\/\*\* @license\s*\n\s*\*\s*\n\s*\* jsPDF - PDF Document creation from JavaScript/.test(b.inhalt)) return 'jspdf';
  if (/@license|\/\*!/.test(b.inhalt.slice(0, 400))) return 'fremd-unbekannt';
  return 'eigen';
}

function urteil(text) {
  const raus = [];
  const zaehlung = { jspdf: 0, noble: 0, qrcode: 0 };
  for (const b of bloecke(text)) {
    const a = art(b);
    if (a === 'fremd-unbekannt') { raus.push('eingebettete Bibliothek außerhalb der Liste'); continue; }
    if (a !== 'eigen') { zaehlung[a]++; continue; }
    for (const [name, muster] of FINGERABDRUECKE) if (muster.test(b.inhalt)) raus.push('eigener Krypto-Code: ' + name);
    if (/\bencryption\s*:\s*\{|userPassword|ownerPassword/.test(b.inhalt)) raus.push('PDF-Verschlüsselung über jsPDF');
  }
  for (const [k, n] of Object.entries(zaehlung)) if (n !== 1) raus.push('Bibliothek ' + k + ' steht ' + n + '-mal da');
  return raus;
}

test('[Krypto·nur WebCrypto·Wächter] drei benannte Bibliotheken, außerhalb kein Krypto-Fingerabdruck und keine PDF-Verschlüsselung', () => {
  assert.deepEqual(urteil(KERN), []);
});

test('[Krypto·nur WebCrypto·Wächter·Rot-Beweis] SHA-256-Konstante, vierte Bibliothek und jsPDF-Verschlüsselung fallen auf', () => {
  const sha = KERN.replace('<script id="vertrauensregel">', '<script id="vertrauensregel">\nconst _K0 = 0x428a2f98;');
  assert.notEqual(sha, KERN, 'Vorbedingung: der Block steht so im Kern');
  assert.ok(urteil(sha).includes('eigener Krypto-Code: SHA-256 Rundenkonstante'));
  const vierte = KERN.replace('<script id="qrcode_VivodepotInline">', '<script>/*! tweetnacl - public domain */ var nacl = {};</script>\n<script id="qrcode_VivodepotInline">');
  assert.ok(urteil(vierte).includes('eingebettete Bibliothek außerhalb der Liste'));
  const pdf = KERN.replace('<script id="vertrauensregel">', '<script id="vertrauensregel">\nconst _p = { encryption: { userPassword: "x" } };');
  assert.ok(urteil(pdf).includes('PDF-Verschlüsselung über jsPDF'));
});

test('[Krypto·nur WebCrypto·Wirkung] Versiegeln und Entsiegeln eines Sub-Depots rufen crypto.subtle.encrypt/decrypt mit AES-GCM', async () => {
  const { V } = ladeKern();
  const subtle = webcrypto.subtle;
  const gesehen = [];
  const enc = subtle.encrypt, dec = subtle.decrypt;
  subtle.encrypt = function (alg, ...rest) { gesehen.push('encrypt:' + (alg && alg.name)); return enc.call(this, alg, ...rest); };
  subtle.decrypt = function (alg, ...rest) { gesehen.push('decrypt:' + (alg && alg.name)); return dec.call(this, alg, ...rest); };
  try {
    const sub = await V.subDepotVersiegeln({ schemaVersion: 20, verwaltungsTyp: 'verwaltet', sektoren: { identity: { givenName: 'Probe' } }, menschen: [], situationen: {} }, 'sub-webcrypto-probe-0815');
    const offen = await V.subDepotEntsiegeln(sub, 'sub-webcrypto-probe-0815');
    assert.equal(offen.inhalt.sektoren.identity.givenName, 'Probe');
  } finally {
    subtle.encrypt = enc;
    subtle.decrypt = dec;
  }
  assert.ok(gesehen.includes('encrypt:AES-GCM'), gesehen.join(','));
  assert.ok(gesehen.includes('decrypt:AES-GCM'), gesehen.join(','));
  assert.ok(gesehen.every((g) => g.endsWith(':AES-GCM')), 'nur AES-GCM: ' + gesehen.join(','));
});
