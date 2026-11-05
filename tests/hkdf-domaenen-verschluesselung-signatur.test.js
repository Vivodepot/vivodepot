'use strict';
/* ════════════════════════════════════════════════════════════════════════
   HKDF-Domänen: getrennte Schlüssel für Verschlüsselung und Signatur (30.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Die Seite validierung.html sagt über HKDF: „getrennte Schlüssel für Verschlüsselung und Signatur“. Bis hierher trug das
   keine Probe: tests/b2-schluesseltrennung.test.js trennt Depots untereinander (Info je depotUUID), nicht Verschlüsselung
   von Signatur. Diese Probe hält die Trennung an zwei Stellen fest:
   - Bauart: Jede HKDF-Ableitung im Kern steht in einer benannten Funktion und nimmt ihre Info aus genau einer Konstante.
     Die Konstanten sind verschieden und präfixfrei (keine ist Anfang einer anderen; angehängt wird die depotUUID). Der
     Signaturschlüssel der Antwort an eine Stelle kommt nicht aus dem Sitzungsschlüssel, sondern aus einem eigenen Seed.
   - Wirkung: Aus DEMSELBEN Master, Salz und derselben depotUUID entstehen ein AES-Schlüssel nur für encrypt/decrypt, ein
     HMAC-Schlüssel nur für sign (Adressen) und ein Ed25519-Schlüssel nur für sign (Halterin); die gemessenen Info-Bytes
     der drei Ableitungen sind paarweise verschieden.
   Rot-Beweis: eine Kopie des Kerns mit der Signatur-Domäne gleich der Depot-Domäne und eine neue HKDF-Stelle außerhalb der
   Liste fallen beide auf.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto } = require('node:crypto');
const { ladeKern } = require('./load-kern.js');
const { harnessBibliothek } = require('./helfer/noble-ed25519.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

// Funktion → die eine Info-Konstante, aus der sie ableitet. `_deriveHkdfRaw` ist der Test-Helfer für die RFC-5869-Vektoren
// (variable Info, kein Produktionsaufrufer), `antwortSchluesselJeStelle` leitet aus dem eigenen Seed ab (antwortSchluesselInfo).
const ABLEITUNGEN = Object.freeze({
  deriveSubKey: 'HKDF_INFO_SUBDEPOT_V1',
  deriveDepotKeyV2: 'HKDF_INFO_DEPOT_V2_PREFIX',
  deriveAdressKeyV4: 'HKDF_INFO_ADRESSE_V4_PREFIX',
  deriveHalterSignaturV4: 'HKDF_INFO_HALTER_SIGNATUR_V4_PREFIX',
  _deriveHkdfRaw: null,
  antwortSchluesselJeStelle: null,
  _verzeichnisSchluessel: 'HKDF_INFO_AUSSENABLAGE_VERZEICHNIS_V1',   // aus dem Seed im Depot, für das Verzeichnis der Außenablagen (U2-ADR-520)
});
const VERSCHLUESSELUNG = ['HKDF_INFO_SUBDEPOT_V1', 'HKDF_INFO_DEPOT_V2_PREFIX', 'HKDF_INFO_AUSSENABLAGE_VERZEICHNIS_V1'];
const SIGNATUR = ['HKDF_INFO_HALTER_SIGNATUR_V4_PREFIX'];

function umgebendeFunktion(text, index) {
  const re = /^(?:async )?function ([A-Za-z_$][\w$]*)\(/gm;
  let name = null, m;
  while ((m = re.exec(text)) && m.index < index) name = m[1];
  return name;
}
function funktionsKoerper(text, name) {
  const m = new RegExp('^(async )?function ' + name + '\\(', 'm').exec(text);
  if (!m) return null;
  const naechste = /^(async )?function [A-Za-z_$][\w$]*\(/gm;
  naechste.lastIndex = m.index + m[0].length;
  const n = naechste.exec(text);
  const roh = text.slice(m.index, n ? n.index : text.length);
  // Der Körper endet an der ersten schließenden Klammer in Spalte 0; danach stehen schon die Konstanten der nächsten Ableitung.
  const ende = /^\}/m.exec(roh);
  return ende ? roh.slice(0, ende.index + 1) : roh;
}
function konstanten(text) {
  const aus = {};
  for (const m of text.matchAll(/^const (HKDF_INFO_[A-Z0-9_]+)\s*=\s*'([^']*)';/gm)) aus[m[1]] = m[2];
  return aus;
}

// → Liste der Verstöße (leer = gut).
function domaenenUrteil(text) {
  const raus = [];
  const k = konstanten(text);
  for (const m of text.matchAll(/name:\s*'HKDF',\s*hash/g)) {
    const f = umgebendeFunktion(text, m.index);
    if (!Object.prototype.hasOwnProperty.call(ABLEITUNGEN, f)) raus.push('HKDF-Ableitung außerhalb der Liste: ' + f);
  }
  for (const [f, konst] of Object.entries(ABLEITUNGEN)) {
    const koerper = funktionsKoerper(text, f);
    if (!koerper) { raus.push('Ableitung fehlt: ' + f); continue; }
    if (konst === null) continue;
    const benutzt = [...new Set([...koerper.matchAll(/HKDF_INFO_[A-Z0-9_]+/g)].map((x) => x[0]))];
    if (benutzt.length !== 1 || benutzt[0] !== konst) raus.push(f + ' leitet nicht genau aus ' + konst + ' ab: ' + benutzt.join(','));
  }
  const namen = Object.keys(k);
  for (const a of namen) for (const b of namen) {
    if (a !== b && k[b].startsWith(k[a])) raus.push('Info nicht präfixfrei: ' + a + ' ist Anfang von ' + b);
  }
  for (const v of VERSCHLUESSELUNG) for (const s of SIGNATUR) {
    if (k[v] === undefined || k[s] === undefined) raus.push('Konstante fehlt: ' + (k[v] === undefined ? v : s));
    else if (k[v] === k[s]) raus.push('Verschlüsselung und Signatur in derselben Domäne: ' + v + ' = ' + s);
  }
  const antwort = funktionsKoerper(text, 'antwortSchluesselJeStelle') || '';
  if (!/_antwortSeedHolen\(/.test(antwort) || /sessionHkdfKey|depotSchluessel/.test(antwort)) {
    raus.push('antwortSchluesselJeStelle leitet nicht aus dem eigenen Seed ab');
  }
  return raus;
}

test('[HKDF·Domänen·Bauart] jede HKDF-Ableitung steht in einer benannten Funktion mit genau einer Info-Konstante; die Konstanten sind präfixfrei, Verschlüsselung und Signatur getrennt', () => {
  assert.deepEqual(domaenenUrteil(KERN), []);
});

test('[HKDF·Domänen·Bauart·Rot-Beweis] Signatur-Domäne gleich Depot-Domäne und eine HKDF-Stelle außerhalb der Liste fallen auf', () => {
  const gleich = KERN.replace("const HKDF_INFO_HALTER_SIGNATUR_V4_PREFIX = 'vivodepot/v4/halter-signatur/';",
    "const HKDF_INFO_HALTER_SIGNATUR_V4_PREFIX = 'vivodepot/v3/depot/';");
  assert.notEqual(gleich, KERN, 'Vorbedingung: die Konstante steht so im Kern');
  const u1 = domaenenUrteil(gleich);
  assert.ok(u1.some((x) => /derselben Domäne/.test(x)), u1.join('\n'));
  assert.ok(u1.some((x) => /präfixfrei/.test(x)), u1.join('\n'));
  const fremd = KERN.replace('async function _deriveHkdfRaw(',
    "async function _eigeneAbleitung(m, s) { return crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info: new Uint8Array(0) }, m, 256); }\nasync function _deriveHkdfRaw(");
  assert.notEqual(fremd, KERN);
  assert.ok(domaenenUrteil(fremd).some((x) => /außerhalb der Liste: _eigeneAbleitung/.test(x)));
});

test('[HKDF·Domänen·Wirkung] derselbe Master: AES nur encrypt/decrypt, Adress-HMAC nur sign, Halter-Ed25519 nur sign; drei verschiedene Info-Bytes', async () => {
  const { V } = ladeKern();
  const subtle = webcrypto.subtle;
  const infos = [];
  const deriveKey = subtle.deriveKey, deriveBits = subtle.deriveBits;
  subtle.deriveKey = function (alg, ...rest) { if (alg && alg.name === 'HKDF') infos.push(Buffer.from(alg.info).toString('utf8')); return deriveKey.call(this, alg, ...rest); };
  subtle.deriveBits = function (alg, ...rest) { if (alg && alg.name === 'HKDF') infos.push(Buffer.from(alg.info).toString('utf8')); return deriveBits.call(this, alg, ...rest); };
  try {
    const bits = webcrypto.getRandomValues(new Uint8Array(32));
    const master = await V.importMasterHkdfKey(bits);
    const salz = webcrypto.getRandomValues(new Uint8Array(32));
    const uuid = 'hkdf-domaenen-probe-0001';
    const aes = await V.deriveDepotKeyV2(master, salz, uuid);
    const hmac = await V.deriveAdressKeyV4(master, salz, uuid);
    const halter = await V.deriveHalterSignaturV4(master, salz, uuid, async (seed) => harnessBibliothek().getPublicKey(seed));
    assert.equal(aes.algorithm.name, 'AES-GCM');
    assert.deepEqual([...aes.usages].sort(), ['decrypt', 'encrypt']);
    assert.equal(hmac.algorithm.name, 'HMAC');
    assert.deepEqual([...hmac.usages], ['sign']);
    const sk = halter.schluessel;
    assert.equal(sk.algorithm.name, 'Ed25519');
    assert.deepEqual([...sk.usages], ['sign']);
    for (const k of [aes, hmac, sk]) assert.equal(k.extractable, false);
    assert.equal(infos.length, 3, 'genau drei HKDF-Ableitungen: ' + infos.join(' | '));
    assert.equal(new Set(infos).size, 3, 'drei verschiedene Info-Bytes: ' + infos.join(' | '));
    assert.deepEqual(infos, ['vivodepot/v3/depot/' + uuid, 'vivodepot/v4/adressen/' + uuid, 'vivodepot/v4/halter-signatur/' + uuid]);
  } finally {
    subtle.deriveKey = deriveKey;
    subtle.deriveBits = deriveBits;
  }
});
