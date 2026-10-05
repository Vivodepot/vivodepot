'use strict';
/* Halter-Schlüssel ohne extrahierbaren Import (U2-ADR-457, Nachtrag v865; Krypto-Gegenlesung mit Bedingungen).
   Der öffentliche Schlüssel kommt aus der eingebetteten noble-ed25519 am von Cure53 geprüften Commit fa14496 (Bericht
   pentest-report_ed25519.pdf, 02/2022, S. 4), signiert wird mit dem nicht extrahierbaren WebCrypto-Schlüssel. Proben:
   · die eingebettete Bibliothek ist der reproduzierbare Build von fa14496 mit genau einer geänderten Zeile;
   · RFC 8032 §7.1 TEST 1–3;
   · SHA-512 läuft über crypto.subtle (gezählt, nicht gelesen); ohne WebCrypto scheitert der Aufruf;
   · ein Teilfeld mit byteOffset > 0 ergibt denselben Schlüssel (ensureBytes kopiert, gemessen);
   · der Kern ruft aus der Bibliothek nur getPublicKey (NBL-03-005: invZ nur aus der eigenen Batch-Inversion);
     equals wird auf dem Pfad nicht gerufen (NBL-03-007);
   · die Selbstprobe im Block: ein falsches x, eine falsche Länge, eine fehlende Ableitung → kein Schlüssel; die Kopie des
     Seeds ist danach überschrieben, auch im Fehlerfall;
   · genau eine Stelle im Kern reicht die Bibliothek hinein. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { eingebettet, ladeNoble, harnessBibliothek } = require('./helfer/noble-ed25519.js');
const { ladeKern } = require('./load-kern.js');

// Reproduzierbarer Build von fa14496908cf286da53d17b739accd8f7c3790be: `tsc -p tsconfig.esm.json --types node` mit
// typescript 4.5.4 und @types/node 16.11.21 ergibt lib/esm/index.js mit diesem SHA-256 (Fremdcode-Register).
const SHA256_ORIGINAL = '579c9fe63a4c54602f3655353173885241e4fe67e1ed55abd40a420d54d02517';
const SHA256_EINGEBETTET = '15974ff9d8ae30b1a5c649f7e03857b4341a7faac4decb26fd1f57bc5153201b';
const ZEILE_ORIGINAL = "import nodeCrypto from 'crypto';";
const ZEILE_EINGEBETTET = 'const nodeCrypto = undefined;';
const sha256 = (t) => crypto.createHash('sha256').update(t, 'utf8').digest('hex');
const hex = (u) => Buffer.from(u).toString('hex');
const ausHex = (h) => new Uint8Array(Buffer.from(h, 'hex'));

// RFC 8032 §7.1 TEST 1–3 (rfc-editor.org/rfc/rfc8032.txt): Seed und öffentlicher Schlüssel.
const RFC8032 = [
  ['9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60', 'd75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a'],
  ['4ccd089b28ff96da9db6c346ec114e0f5b8a319f35aba624da8cf6ed4fb8a6fb', '3d4017c3e843895a92b70aa74d1b7ebc9c982ccf2ec4968cc0cd55f12af4660c'],
  ['c5aa8df43f9f837bedb7442f31dcb7b166d38535076f094b85ce3a2e0b4458f7', 'fc51cd8e6218a1a38da47ed00230f0580816ed13ba3303ac5deb911548908025'],
];

test('[Halter·noble·Herkunft] eingebettet ist der Build von fa14496 mit genau einer geänderten Zeile', () => {
  const { bibliothek } = eingebettet();
  assert.equal(sha256(bibliothek), SHA256_EINGEBETTET);
  const zeilen = bibliothek.split('\n');
  assert.equal(zeilen.filter((z) => z === ZEILE_EINGEBETTET).length, 1);
  assert.equal(sha256(bibliothek.replace(ZEILE_EINGEBETTET + '\n', ZEILE_ORIGINAL + '\n')), SHA256_ORIGINAL,
    'Original + Ein-Zeilen-Diff ergibt den gebauten Commit');
  assert.ok(!/\bimport\s|\brequire\(/.test(bibliothek), 'kein Import, kein Nachladen');
});

test('[Halter·noble·RFC 8032] TEST 1–3: Seed → öffentlicher Schlüssel', async () => {
  const noble = await ladeNoble();
  for (const [seed, pub] of RFC8032) assert.equal(hex(await noble.getPublicKey(ausHex(seed))), pub);
});

test('[Halter·noble·SHA-512] läuft über crypto.subtle; ohne WebCrypto scheitert der Aufruf hart', async () => {
  const noble = await ladeNoble();
  const subtle = globalThis.crypto.subtle;
  const echt = subtle.digest;
  let sha512 = 0;
  subtle.digest = function (alg, data) { if (String(alg && alg.name || alg).toUpperCase() === 'SHA-512') sha512++; return echt.call(this, alg, data); };
  try { await noble.getPublicKey(ausHex(RFC8032[0][0])); } finally { subtle.digest = echt; }
  assert.ok(sha512 >= 1, 'SHA-512 über crypto.subtle gezählt: ' + sha512);
  const ohne = await ladeNoble({ ohneWebCrypto: true });
  await assert.rejects(ohne.getPublicKey(ausHex(RFC8032[0][0])), 'ohne WebCrypto kein anderer Weg');
});

test('[Halter·noble·byteOffset] ensureBytes kopiert: ein Teilfeld mit Versatz ergibt denselben Schlüssel (gemessen)', async () => {
  // fa14496 Z. 575: `hex instanceof Uint8Array ? Uint8Array.from(hex) : …` — die Bibliothek hasht eine eigene Kopie. Die frische
  // Kopie im Kern bleibt trotzdem: sie ist unsere, und nur sie können wir danach überschreiben.
  const noble = await ladeNoble();
  const gross = new Uint8Array(40);
  gross.set(ausHex(RFC8032[0][0]), 3);
  assert.equal(hex(await noble.getPublicKey(gross.subarray(3, 35))), RFC8032[0][1]);
});

test('[Halter·noble·Pfad] der Kern ruft aus der Bibliothek nur getPublicKey; equals bleibt auf dem Pfad ungerufen (NBL-03-007)', async () => {
  // NBL-03-005: toAffine bekommt auf dem Pfad ein invZ aus der Batch-Inversion der Bibliothek selbst (fa14496 Z. 154, 486–505),
  // nie eines von uns. Statisch: außerhalb des Bibliotheksblocks liest der Kern von der Bibliothek nur getPublicKey, und der
  // Block reicht nur getPublicKey nach außen.
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const { block } = eingebettet(kern);
  const aussen = kern.replace(block, '');
  assert.match(block, /Object\.defineProperty\(globalThis, 'vdNobleEd25519', \{ value: Object\.freeze\(\{ getPublicKey \}\), writable: false, configurable: false \}\);\n$/);
  const zugriffe = [...aussen.matchAll(/\bbibliothek\.(\w+)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(zugriffe)], ['getPublicKey']);
  assert.ok(!/vdNobleEd25519\.(?!getPublicKey\b)\w/.test(aussen), 'kein anderer Zugriff auf die Bibliothek');
  for (const verboten of ['normalizeZ', 'toAffineBatch', 'ExtendedPoint', 'invertBatch']) assert.ok(!aussen.includes(verboten), verboten);
  // Rot-Beweis: ein gepflanzter zweiter Zugriff fällt.
  const gepflanzt = aussen + '\nconst p = bibliothek.Point; globalThis.vdNobleEd25519.utils;';
  assert.deepEqual([...new Set([...gepflanzt.matchAll(/\bbibliothek\.(\w+)/g)].map((m) => m[1]))], ['getPublicKey', 'Point']);
  assert.ok(/vdNobleEd25519\.(?!getPublicKey\b)\w/.test(gepflanzt));
  // Gemessen: equals wird auf dem Pfad von getPublicKey nicht gerufen.
  const noble = await ladeNoble();
  const P = noble.ExtendedPoint.prototype;
  const { equals } = P;
  let gleich = 0;
  P.equals = function (...a) { gleich++; return equals.apply(this, a); };
  try { await noble.getPublicKey(ausHex(RFC8032[1][0])); } finally { P.equals = equals; }
  assert.equal(gleich, 0);
});

test('[Halter·Selbstprobe] richtiges x wird angenommen; falsches x, falsche Länge, fehlende Ableitung → kein Schlüssel; Kopie überschrieben', async () => {
  const { V } = ladeKern();
  const master = await V.importMasterHkdfKey(new Uint8Array(32).fill(3).buffer);
  const salt = new Uint8Array(32).fill(4);
  const gesehen = [];
  const mit = (f) => async (seed) => { gesehen.push(seed); return f(seed); };
  const gut = await V.deriveHalterSignaturV4(master, salt, 'probe', mit((s) => harnessBibliothek().getPublicKey(s)));
  assert.equal(gut.schluessel.extractable, false);
  assert.equal(Object.keys(gut.jwk).sort().join(), 'crv,kty,x');
  // Rot-Beweise: ein anderer gültiger Schlüssel, ein verkürzter, keiner.
  const fremd = ausHex(RFC8032[2][1]);
  await assert.rejects(V.deriveHalterSignaturV4(master, salt, 'probe', mit(async () => fremd)), /halter-signatur-selbstprobe/);
  await assert.rejects(V.deriveHalterSignaturV4(master, salt, 'probe', mit(async () => fremd.slice(0, 31))), /halter-signatur-oeffentlich-ungueltig/);
  await assert.rejects(V.deriveHalterSignaturV4(master, salt, 'probe'), /halter-signatur-ableitung-fehlt/);
  assert.equal(gesehen.length, 3);
  for (const s of gesehen) assert.ok(s.every((b) => b === 0), 'die Kopie des Seeds ist überschrieben');
  for (const s of gesehen) assert.equal(s.byteOffset, 0);
});

// x ohne exportKey (03.10.2026, Wächter kein-master-key G13): x wird aus dem 32-Byte-Rohschlüssel kodiert. Kurve Ed25519,
// roh ohne Präfix (die Funktion wirft bei Länge ≠ 32). Erwartungswerte: (1) RFC 8037 Anhang A.1 — der öffentliche Schlüssel
// aus RFC 8032 §7.1 TEST 1 hat x = 11qYAYKx…URo; (2) die Werte, die der Kern VOR der Änderung (exportKey) für feste
// Eingaben lieferte — ändert sich x, brechen bestehende Halter-Signaturen.
const RFC8037_A1_X = '11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo';
const X_VOR_DER_AENDERUNG = [
  [3, 4, 'probe', 'hlS4ObnIbn-qhM4LgT512cMqj_p5cYzOzvD9zhY-CDs'],
  [7, 9, 'depot-a', '3tQc42_jopDm7ll7n3jzY0ZCRXFFwvNS_UPREHoOy0o'],
  [0xa5, 0x5a, '0c9f3b2e-1d4a-4c7e-9b1f-2a6d8e0f4c11', 'kUUWU0TC9uKLmc64ECezvafgB117sJmXq_AB3dssndY'],
];
test('[Halter·x] x ist der Rohschlüssel in base64url: RFC 8037 A.1, gleich dem JWK-Export und gleich den Werten vor der Änderung', async () => {
  const { V } = ladeKern();
  // (1) öffentlicher Vektor: RFC 8032 TEST 1 → noble → derselbe Rohschlüssel; sein JWK-x nach RFC 8037 A.1.
  const noble = await ladeNoble();
  const pub = await noble.getPublicKey(ausHex(RFC8032[0][0]));
  assert.equal(hex(pub), RFC8032[0][1]);
  const k = await globalThis.crypto.subtle.importKey('raw', pub, { name: 'Ed25519' }, true, ['verify']);
  assert.equal((await globalThis.crypto.subtle.exportKey('jwk', k)).x, RFC8037_A1_X);
  for (const [m, s, u, erwartet] of X_VOR_DER_AENDERUNG) {
    const master = await V.importMasterHkdfKey(new Uint8Array(32).fill(m).buffer);
    let roh = null;
    const r = await V.deriveHalterSignaturV4(master, new Uint8Array(32).fill(s), u,
      async (seed) => { roh = await harnessBibliothek().getPublicKey(seed); return roh; });
    // (2) gleich dem Wert vor der Änderung, (3) gleich dem JWK-Export desselben Rohschlüssels.
    assert.equal(r.jwk.x, erwartet, 'x unverändert gegenüber dem Stand mit exportKey');
    const kk = await globalThis.crypto.subtle.importKey('raw', roh, { name: 'Ed25519' }, true, ['verify']);
    assert.equal(r.jwk.x, (await globalThis.crypto.subtle.exportKey('jwk', kk)).x);
  }
});

test('[Halter·Aufrufer] genau eine Stelle im Kern reicht die Bibliothek in die Ableitung', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const ohneKommentar = kern.split('\n').filter((z) => !/^\s*(\/\/|\*)/.test(z)).join('\n');
  assert.equal((ohneKommentar.match(/_ed25519OeffentlichAusSeed\b(?!\()/g) || []).length, 1, 'eine Übergabe');
  assert.equal((ohneKommentar.match(/\bglobalThis\.vdNobleEd25519\b/g) || []).length, 1, 'gelesen an einer Stelle');
  assert.equal((ohneKommentar.match(/'vdNobleEd25519'/g) || []).length, 1, 'gesetzt an einer Stelle, im Block');
  assert.ok(!/importKey\('pkcs8', pk8, \{ name: 'Ed25519' \}, true/.test(kern), 'kein extrahierbarer Import des Seeds');
});

test('[Halter·noble·global] die Bibliothek lässt sich nicht ersetzen und nicht löschen — Rot-Beweis: eine schreibbare Eigenschaft schon', () => {
  const vm = require('node:vm');
  const { block, bibliothek } = eingebettet();
  const schluss = block.slice(block.indexOf(bibliothek) + bibliothek.length);
  const zeile = schluss.split('\n').find((z) => z.startsWith('Object.defineProperty(globalThis'));
  assert.ok(zeile, 'Schlusszeile gefunden');
  const echt = async () => 'echt';
  const angriff = "globalThis.vdNobleEd25519 = { getPublicKey: async (s) => s }; try { delete globalThis.vdNobleEd25519; } catch (e) {}"
    + " try { Object.defineProperty(globalThis, 'vdNobleEd25519', { value: {} }); } catch (e) {}";
  const ctx = vm.createContext({ getPublicKey: echt });
  vm.runInContext(zeile, ctx);
  vm.runInContext(angriff, ctx);
  assert.equal(vm.runInContext('globalThis.vdNobleEd25519.getPublicKey', ctx), echt);
  assert.equal(vm.runInContext('Object.isFrozen(globalThis.vdNobleEd25519)', ctx), true);
  assert.throws(() => vm.runInContext("'use strict'; globalThis.vdNobleEd25519 = {};", ctx), /read only property 'vdNobleEd25519'/);
  // Rot-Beweis: die frühere Form (nur Object.freeze, schreibbare Eigenschaft) ließe sich ersetzen.
  const alt = vm.createContext({ getPublicKey: echt });
  vm.runInContext('globalThis.vdNobleEd25519 = Object.freeze({ getPublicKey });', alt);
  vm.runInContext(angriff, alt);
  assert.notEqual(vm.runInContext('globalThis.vdNobleEd25519 && globalThis.vdNobleEd25519.getPublicKey', alt), echt);
});
