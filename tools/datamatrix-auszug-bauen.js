#!/usr/bin/env node
'use strict';
/* Data-Matrix-Auszug aus @zxing/library bauen (eingebetteter Decoder für den Medikationsplan).
   Der Kern bettet NUR den Lese-Teil für Data Matrix ein, wie qrcode-generator: einen eigenen Skriptblock mit
   @vd-lib-Marke, CSP-Hash über tools/csp-bauen.js, Eintrag in SBOM, THIRD_PARTY_LICENSES und Fremdcode-Register.
   Kein Ladeweg, keine eigene Datei, kein Netz.

   HERKUNFT (Befund DM-HERKUNFT-OHNE-ANKER, Gegenlesung 06.11.2026): Gebaut wird nur aus dem Tarball des npm-Pakets, und nur,
   wenn seine SHA-512 der Integrität aus dem Registry-Eintrag gleicht (PAKET.integritaet, `dist.integrity` von
   @zxing/library 0.23.0). Ein entpackter Ordner hat keinen Anker und wird nicht angenommen. Wer Block und Marke zusammen
   ändert, besteht `--pruefen --paket` nicht: der Nachbau aus dem Paket weicht dann vom Block ab.

   Aufruf:
     node tools/datamatrix-auszug-bauen.js --paket <library-0.23.0.tgz> [--ausgabe <datei>]
       prüft die Integrität des Tarballs, baut den Block aus dem ESM-Baum des Pakets. Verlangt Version 0.23.0 und Apache-2.0.
     node tools/datamatrix-auszug-bauen.js --pruefen [--paket <library-0.23.0.tgz>] [--kern <vivodepot.html>]
       prüft, dass der eingebettete Block zu seiner Marke passt (Version, SHA-256 des Blockinhalts); mit --paket baut es den
       Block aus dem Paket nach und verlangt Byte-Gleichheit. Den Tarball legt npm in seinen Zwischenspeicher
       (~/.npm/_cacache/content-v2/sha512/…, Pfad aus der Integrität) oder `npm pack @zxing/library@0.23.0`.

   GLOBAL (Befund DM-GLOBAL-UEBERSCHREIBBAR): der Block bindet `vdDataMatrix` mit Object.defineProperty, nicht beschreibbar,
   nicht umkonfigurierbar — wie vdNobleEd25519.

   Bündeln ohne Bündler, darum eng: jede Datei wird eine Funktion im Register; erlaubt sind genau sechs Formen
   (`import X from './…'`, `import { A } from './…'`, `export default X`, `export { A }`, `export var|function|class A`, `import './…'`).
   Jede andere import/export-
   Zeile, jeder Ring zwischen Dateien und jedes fremde Paket außer ts-custom-error bricht ab. ts-custom-error ersetzt
   eine eigene Zeile (CustomError als Unterklasse von Error), damit keine zweite Fremdbibliothek mitkommt. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const VERSION = '0.23.0';
const PAKET = Object.freeze({
  name: '@zxing/library',
  version: VERSION,
  // dist.integrity aus dem Registry-Eintrag (https://registry.npmjs.org/@zxing/library/0.23.0), wie in package-lock.json
  integritaet: 'sha512-6fkkoFwP8CHxl6ugnPsj74PLJgX2iRv5zczGAyt5OBzQgxFhuhF0NCEc4t4OvSr8xAv2MRLlI0Iu9ZGDZQ2urA==',
});
const EINSTIEGE = Object.freeze({
  DataMatrixReader: 'core/datamatrix/DataMatrixReader.js',
  HybridBinarizer: 'core/common/HybridBinarizer.js',
  RGBLuminanceSource: 'core/RGBLuminanceSource.js',
  BinaryBitmap: 'core/BinaryBitmap.js',
  DecodeHintType: 'core/DecodeHintType.js',
});
const ERSATZ_PAKETE = Object.freeze({
  'ts-custom-error': 'var CustomError = (function () {\n'
    + '  function CustomError(m) { var e = Error.call(this, m); this.message = e.message; this.name = new.target ? new.target.name : "Error";'
    + ' if (Error.captureStackTrace) Error.captureStackTrace(this, new.target); }\n'
    + '  CustomError.prototype = Object.create(Error.prototype, { constructor: { value: CustomError, writable: true, configurable: true } });\n'
    + '  return CustomError;\n})();\n__exp.CustomError = CustomError;\n',
});
const MARKE_ANFANG = '// @zxing/library ' + VERSION + ' (Data-Matrix-Auszug) — Anfang\n';
const MARKE_ENDE = '// @zxing/library ' + VERSION + ' (Data-Matrix-Auszug) — Ende\n';

function argWert(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function integritaet(buf) { return 'sha512-' + crypto.createHash('sha512').update(buf).digest('base64'); }

/* Liest einen npm-Tarball (gzip + ustar, pax-Köpfe für lange Pfade) nach Prüfung der Integrität; liefert Map pfad → Buffer
   ohne das führende `package/`. Weicht die Integrität ab, bricht es ab, bevor ein Byte gelesen wird. */
function tarballLesen(buf, erwartet = PAKET.integritaet) {
  const ist = integritaet(buf);
  if (ist !== erwartet) throw new Error('Paket-Integrität weicht ab: erwartet ' + erwartet + ', ist ' + ist);
  const tar = zlib.gunzipSync(buf);
  const dateien = new Map();
  let i = 0, paxPfad = null;
  const feld = (o, n) => tar.subarray(i + o, i + o + n).toString('utf8').replace(/\0.*$/s, '');
  while (i + 512 <= tar.length) {
    if (tar.subarray(i, i + 512).every((b) => b === 0)) break;
    const groesse = parseInt(feld(124, 12).trim() || '0', 8);
    const typ = String.fromCharCode(tar[i + 156] || 48);
    const vorsatz = feld(345, 155);
    let name = (vorsatz ? vorsatz + '/' : '') + feld(0, 100);
    const inhalt = tar.subarray(i + 512, i + 512 + groesse);
    if (typ === 'x') {
      const m = /(?:^|\n)\d+ path=([^\n]*)\n/.exec(inhalt.toString('utf8'));
      paxPfad = m ? m[1] : null;
    } else {
      if (paxPfad) { name = paxPfad; paxPfad = null; }
      if (typ === '0' || typ === '\0') dateien.set(name.replace(/^package\//, ''), Buffer.from(inhalt));
    }
    i += 512 + Math.ceil(groesse / 512) * 512;
  }
  return dateien;
}

function aufloesen(hat, von, spez) {
  const p = path.posix.join(path.posix.dirname(von), spez);
  if (p.endsWith('.js')) return p;
  if (hat(p + '.js')) return p + '.js';
  if (hat(p + '/index.js')) return p + '/index.js';
  throw new Error('nicht auflösbar: ' + spez + ' aus ' + von);
}

function quellId(hat, rel, spez) {
  if (spez.startsWith('.')) return aufloesen(hat, rel, spez);
  if (!ERSATZ_PAKETE[spez]) throw new Error('fremdes Paket ' + spez + ' in ' + rel);
  return spez;
}

function umschreiben(hat, rel, text, abhaengig) {
  const aus = [], spaet = [];
  for (const z of text.split('\n')) {
    let m;
    if ((m = z.match(/^import\s+([A-Za-z_$][\w$]*)\s+from\s+'([^']+)';?\s*$/))) {
      const id = quellId(hat, rel, m[2]);
      abhaengig.push(id);
      aus.push('var ' + m[1] + ' = __req(' + JSON.stringify(id) + ').default;');
    } else if ((m = z.match(/^import\s+\{\s*([\w$\s,]+?)\s*\}\s+from\s+'([^']+)';?\s*$/))) {
      const id = quellId(hat, rel, m[2]);
      abhaengig.push(id);
      for (const n of m[1].split(',').map(s => s.trim()).filter(Boolean)) {
        if (!/^[A-Za-z_$][\w$]*$/.test(n)) throw new Error('Importform unbekannt in ' + rel + ': ' + z);
        aus.push('var ' + n + ' = __req(' + JSON.stringify(id) + ')[' + JSON.stringify(n) + '];');
      }
    } else if ((m = z.match(/^import\s+'([^']+)';?\s*(\/\/.*)?$/))) {
      // Import nur der Wirkung wegen: die Datei wird geladen, nichts gebunden.
      const id = quellId(hat, rel, m[1]);
      abhaengig.push(id);
      aus.push('__req(' + JSON.stringify(id) + ');');
    } else if ((m = z.match(/^export\s+default\s+([A-Za-z_$][\w$]*);?\s*(\/\/.*)?$/))) {
      aus.push('__exp.default = ' + m[1] + ';');
    } else if ((m = z.match(/^export\s+\{\s*([\w$\s,]+?)\s*\};?\s*$/))) {
      for (const n of m[1].split(',').map(s => s.trim()).filter(Boolean)) aus.push('__exp[' + JSON.stringify(n) + '] = ' + n + ';');
    } else if ((m = z.match(/^export\s+((?:var|function|class)\s+([A-Za-z_$][\w$]*)\b.*)$/))) {
      // Deklaration mit export davor: die Deklaration bleibt, der Export kommt ans Ende der Datei (nach allen Zuweisungen).
      aus.push(m[1]);
      spaet.push('__exp[' + JSON.stringify(m[2]) + '] = ' + m[2] + ';');
    } else if (/^\s*(import|export)\b/.test(z)) {
      throw new Error('Import/Export-Form unbekannt in ' + rel + ': ' + z);
    } else {
      aus.push(z);
    }
  }
  return aus.concat(spaet).join('\n');
}

function bauen(tarball, erwartet = PAKET.integritaet) {
  const dateienPaket = tarballLesen(tarball, erwartet);
  const lies = (p) => { const b = dateienPaket.get(p); if (!b) throw new Error('fehlt im Paket: ' + p); return b.toString('utf8'); };
  const pkg = JSON.parse(lies('package.json'));
  if (pkg.name !== PAKET.name || pkg.version !== VERSION || pkg.license !== 'Apache-2.0') {
    throw new Error('Paket passt nicht: ' + pkg.name + ' ' + pkg.version + ' ' + pkg.license);
  }
  const hat = (p) => dateienPaket.has('esm/' + p);
  const inhalt = new Map();
  const kanten = new Map();
  const besuchen = (rel) => {
    if (inhalt.has(rel)) return;
    if (ERSATZ_PAKETE[rel]) { inhalt.set(rel, ERSATZ_PAKETE[rel]); kanten.set(rel, []); return; }
    inhalt.set(rel, '');
    const abh = [];
    inhalt.set(rel, umschreiben(hat, rel, lies('esm/' + rel), abh));
    kanten.set(rel, abh);
    abh.forEach(besuchen);
  };
  Object.values(EINSTIEGE).forEach(besuchen);
  const zustand = new Map();
  const tiefe = (n, weg) => {
    if (zustand.get(n) === 2) return;
    if (zustand.get(n) === 1) throw new Error('Ring: ' + weg.concat(n).join(' -> '));
    zustand.set(n, 1);
    for (const k of kanten.get(n)) tiefe(k, weg.concat(n));
    zustand.set(n, 2);
  };
  [...inhalt.keys()].forEach(n => tiefe(n, []));
  const ids = [...inhalt.keys()].sort();
  let s = MARKE_ANFANG;
  s += 'Object.defineProperty(globalThis, \'vdDataMatrix\', { writable: false, configurable: false, value: (function () {\n"use strict";\n';
  s += 'var __def = {}, __cache = {};\n';
  s += 'function __req(id) { if (__cache[id]) return __cache[id]; var e = __cache[id] = {}; __def[id](e, __req); return e; }\n';
  for (const id of ids) s += '__def[' + JSON.stringify(id) + '] = function (__exp, __req) {\n' + inhalt.get(id) + '\n};\n';
  s += 'return Object.freeze({ ' + Object.entries(EINSTIEGE).map(([n, id]) => n + ': __req(' + JSON.stringify(id) + ').default').join(', ') + ' });\n';
  s += '})() });\n' + MARKE_ENDE;
  return { text: s, dateien: ids.length };
}

function sha256(t) { return crypto.createHash('sha256').update(t, 'utf8').digest('hex'); }

function blockAusKern(kern) {
  const a = kern.indexOf(MARKE_ANFANG), e = kern.indexOf(MARKE_ENDE);
  if (a < 0 || e < a) return null;
  return kern.slice(a, e + MARKE_ENDE.length);
}

function main() {
  if (process.argv.includes('--pruefen')) {
    const kern = fs.readFileSync(argWert('--kern') || path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
    const block = blockAusKern(kern);
    if (!block) { console.error('kein Data-Matrix-Block im Kern'); process.exit(1); }
    const marke = kern.match(/@vd-lib name="zxing-library" version="([^"]+)"[^>]*?sha256="([0-9a-f]{64})"/);
    if (!marke) { console.error('keine @vd-lib-Marke zxing-library'); process.exit(1); }
    const ist = sha256(block);
    if (marke[1] !== VERSION || marke[2] !== ist) {
      console.error('Marke passt nicht: Version ' + marke[1] + ', Marke ' + marke[2] + ', Block ' + ist);
      process.exit(1);
    }
    const paket = argWert('--paket');
    if (paket) {
      const { text } = bauen(fs.readFileSync(paket));
      if (text !== block) {
        console.error('Nachbau aus dem Paket weicht vom Block ab: Nachbau ' + sha256(text) + ', Block ' + ist);
        process.exit(1);
      }
      console.log('ok ' + VERSION + ' sha256 ' + ist + ' ' + Buffer.byteLength(block, 'utf8') + ' Byte, Nachbau aus dem Paket ('
        + PAKET.integritaet.slice(0, 19) + '…) byte-gleich');
      return;
    }
    console.log('ok ' + VERSION + ' sha256 ' + ist + ' ' + Buffer.byteLength(block, 'utf8') + ' Byte (Nachbau nicht geprüft: --paket fehlt)');
    return;
  }
  const paket = argWert('--paket');
  if (!paket) { console.error('Aufruf: --paket <library-0.23.0.tgz> [--ausgabe <datei>] | --pruefen [--paket <tgz>]'); process.exit(2); }
  const { text, dateien } = bauen(fs.readFileSync(paket));
  const ziel = argWert('--ausgabe');
  if (ziel) fs.writeFileSync(ziel, text);
  console.log(dateien + ' Dateien · ' + Buffer.byteLength(text, 'utf8') + ' Byte · sha256 ' + sha256(text));
}

if (require.main === module) main();
module.exports = { bauen, tarballLesen, integritaet, blockAusKern, sha256, VERSION, PAKET, MARKE_ANFANG, MARKE_ENDE };
