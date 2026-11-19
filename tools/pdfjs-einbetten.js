#!/usr/bin/env node
'use strict';
/* pdf.js einbetten: ein PDF im Depot in der Anwendung ansehen (17.11.2026).
   Der Kern bettet pdf.js (Mozilla, Apache-2.0) ein wie qrcode-generator und den Data-Matrix-Auszug: EIN Skriptblock mit
   @vd-lib-Marke, CSP-Hash über tools/csp-bauen.js, Eintrag in SBOM, THIRD_PARTY_LICENSES und Fremdcode-Register.
   Kein Ladeweg, keine eigene Datei, kein Netz, kein eigener Worker (worker-src bleibt 'self').

   HERKUNFT: Gebaut wird nur aus dem Tarball des npm-Pakets pdfjs-dist, und nur, wenn seine SHA-512 der Integrität aus dem
   Registry-Eintrag gleicht (PAKET.integritaet = `dist.integrity` von pdfjs-dist 4.10.38). Ein entpackter Ordner wird nicht
   angenommen. Verlangt wird eine Fassung ab 4.2.67: davor konnte eine präparierte Schrift über die Schriftmatrix Skript
   ausführen (CVE-2024-4367). Der Kern ruft die Bibliothek zusätzlich mit isEvalSupported: false auf.

   WAS EINGEBETTET WIRD: legacy/build/pdf.worker.min.mjs und legacy/build/pdf.min.mjs. Die legacy-Fassung bringt Ersatz für
   neuere Sprachmittel (etwa Promise.withResolvers) mit; die moderne liefe erst ab Safari 17.4, und ältere iPads zählen, unverändert bis auf je die letzte
   Anweisung `export{…}`. Sie wird ersetzt durch eine Bindung mit Object.defineProperty, nicht beschreibbar, nicht
   umkonfigurierbar (wie vdNobleEd25519):
     - der Worker-Teil bindet `pdfjsWorker` mit WorkerMessageHandler. pdf.js findet ihn dort und rechnet im Hauptfaden,
       statt einen Worker zu starten;
     - der Bibliotheks-Teil bindet `vdPdfjs` mit getDocument und version, sonst nichts.
   Jeder Teil steht in einer eigenen Funktion, damit sich die Namen der beiden Bündel nicht berühren. Der Block ist ein
   Modulskript (die Bündel sind ES-Module und nennen import.meta).

   Aufruf:
     node tools/pdfjs-einbetten.js --paket <pdfjs-dist-4.10.38.tgz> [--kern <vivodepot.html>]
       prüft die Integrität, baut den Block und setzt ihn (mit Marke) hinter den Data-Matrix-Block in den Kern oder
       ersetzt den vorhandenen. Danach: node tools/csp-bauen.js.
     node tools/pdfjs-einbetten.js --pruefen [--paket <tgz>] [--kern <vivodepot.html>]
       prüft, dass der eingebettete Block zu seiner Marke passt (Version, SHA-256); mit --paket wird der Block aus dem Paket
       nachgebaut und Byte-Gleichheit verlangt. Den Tarball liefert `npm pack pdfjs-dist@4.10.38`. */
const fs = require('node:fs');
const path = require('node:path');
const { tarballLesen, sha256 } = require('./datamatrix-auszug-bauen.js');

const VERSION = '4.10.38';
const MINDESTFASSUNG = '4.2.67';
const PAKET = Object.freeze({
  name: 'pdfjs-dist',
  version: VERSION,
  // dist.integrity aus dem Registry-Eintrag (https://registry.npmjs.org/pdfjs-dist/4.10.38), gemessen 17.11.2026
  integritaet: 'sha512-/Y3fcFrXEAsMjJXeL9J8+ZG9U01LbuWaYypvDW2ycW1jL269L3js3DVBjDJ0Up9Np1uqDXsDrRihHANhZOlwdQ==',
});
const SCRIPT_ID = 'pdfjs_VivodepotInline';
const MARKE_ANFANG = '// pdfjs-dist ' + VERSION + ' — Anfang der eingebetteten Bibliothek\n';
const MARKE_ENDE = '// pdfjs-dist ' + VERSION + ' — Ende der eingebetteten Bibliothek\n';
const NACH_BLOCK = '<script id="zxing_DataMatrixInline">';

function argWert(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

/** Fassungsvergleich a ≥ b für x.y.z. */
function fassungMindestens(a, b) {
  const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
  return true;
}

/* Die letzte Anweisung eines Bündels ist `export{a as X,b as Y,…};`. Sie wird gelesen und ersetzt; jede andere Form bricht ab. */
function exportErsetzen(text, datei, binden) {
  const ohneQuelle = text.replace(/\n\/\/# sourceMappingURL=[^\n]*\n?$/, '\n').replace(/\s+$/, '');
  const m = /export\{([^{}]*)\};?$/.exec(ohneQuelle);
  if (!m) throw new Error(datei + ': keine abschließende export-Anweisung');
  const namen = {};
  for (const teil of m[1].split(',')) {
    const t = /^\s*([\w$]+)\s+as\s+([\w$]+)\s*$/.exec(teil);
    if (!t) throw new Error(datei + ': unerwartete export-Form „' + teil + '"');
    namen[t[2]] = t[1];
  }
  const rumpf = ohneQuelle.slice(0, m.index);
  // Weitere import/export-Anweisungen fängt die Syntaxprüfung des Blocks (tests/pdf-anzeige-richtlinie.test.js) ab.
  return '(() => {\n' + rumpf + '\n' + binden(namen) + '\n})();\n';
}

/* Rohe C0-/C1-Steuerzeichen (17.11.2026): pdf.js trägt 35 davon in String-Literalen (Schrift-Tabellen, ESC). Der Kern darf kein
   rohes Steuerzeichen enthalten (Probe gegen rohe Steuerzeichen, W3C Nu Html Checker); sie werden darum als \uXXXX
   geschrieben, wie früher bei jsPDF. Das ist bedeutungsgleich, solange keins hinter einem Backslash steht und kein String.raw
   sie liest; beides bricht hier ab statt still falsch zu schreiben. */
function steuerzeichenUmschreiben(text) {
  if (/String\.raw/.test(text)) throw new Error('String.raw im Block: die Umschrift der Steuerzeichen wäre nicht bedeutungsgleich');
  return text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, (c, i) => {
    let n = 0;
    for (let j = i - 1; j >= 0 && text[j] === '\\'; j--) n++;
    if (n % 2) throw new Error('Steuerzeichen hinter einem Backslash an Stelle ' + i);
    return '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0');
  });
}

function bauen(tarball, erwartet = PAKET.integritaet) {
  const dateien = tarballLesen(tarball, erwartet);
  const pkg = JSON.parse(dateien.get('package.json').toString('utf8'));
  if (pkg.name !== PAKET.name || pkg.version !== VERSION) throw new Error('falsches Paket: ' + pkg.name + '@' + pkg.version);
  if (!fassungMindestens(pkg.version, MINDESTFASSUNG)) throw new Error('Fassung ' + pkg.version + ' unter ' + MINDESTFASSUNG);
  if (pkg.license !== 'Apache-2.0') throw new Error('Lizenz ' + pkg.license + ', erwartet Apache-2.0');
  const lesen = (p) => {
    const b = dateien.get(p);
    if (!b) throw new Error('fehlt im Paket: ' + p);
    const t = b.toString('utf8');
    if (/<\/script|<!--|-->/i.test(t)) throw new Error(p + ': enthält eine Zeichenfolge, die den Skriptblock bräche');
    return t;
  };
  const worker = exportErsetzen(lesen('legacy/build/pdf.worker.min.mjs'), 'pdf.worker.min.mjs', (n) => {
    if (!n.WorkerMessageHandler) throw new Error('pdf.worker.min.mjs: WorkerMessageHandler fehlt');
    return 'Object.defineProperty(globalThis, "pdfjsWorker", { value: Object.freeze({ WorkerMessageHandler: '
      + n.WorkerMessageHandler + ' }), writable: false, configurable: false });';
  });
  const bibliothek = exportErsetzen(lesen('legacy/build/pdf.min.mjs'), 'pdf.min.mjs', (n) => {
    if (!n.getDocument || !n.version) throw new Error('pdf.min.mjs: getDocument oder version fehlt');
    return 'Object.defineProperty(globalThis, "vdPdfjs", { value: Object.freeze({ getDocument: ' + n.getDocument
      + ', version: ' + n.version + ' }), writable: false, configurable: false });';
  });
  const text = steuerzeichenUmschreiben(MARKE_ANFANG + worker + bibliothek + MARKE_ENDE);
  return { text, version: pkg.version };
}

function blockAusKern(kern) {
  const a = kern.indexOf(MARKE_ANFANG), e = kern.indexOf(MARKE_ENDE);
  if (a < 0 || e < a) return null;
  return kern.slice(a, e + MARKE_ENDE.length);
}

function markeText(block) {
  return '<!-- @vd-lib name="pdfjs-dist" version="' + VERSION + '" license="Apache-2.0" spdx="Apache-2.0" purl="pkg:npm/pdfjs-dist@'
    + VERSION + '" sha256="' + sha256(block) + '" status="inline"\n'
    + '     pdf.js (Mozilla Foundation, Apache-2.0) aus legacy/build des npm-Pakets, gebaut mit tools/pdfjs-einbetten.js aus dem\n'
    + '     Tarball mit geprüfter Integrität; nur die export-Anweisungen sind durch nicht beschreibbare Bindungen ersetzt.\n'
    + '     Konsument: ein PDF im Depot ansehen (Seiten als Bild in der Vorschau). Lizenz-Volltext: THIRD_PARTY_LICENSES,\n'
    + '     SBOM-Eintrag: vivodepot.sbom.cdx.json. -->\n';
}

function einsetzen(kern, block) {
  const neu = markeText(block) + '<script type="module" id="' + SCRIPT_ID + '">\n' + block + '</script>\n';
  const alt = new RegExp('<!-- @vd-lib name="pdfjs-dist"[\\s\\S]*?-->\\n<script type="module" id="' + SCRIPT_ID + '">[\\s\\S]*?</script>\\n');
  if (alt.test(kern)) return kern.replace(alt, () => neu);
  const i = kern.indexOf(NACH_BLOCK);
  if (i < 0) throw new Error('Data-Matrix-Block nicht gefunden');
  const ende = kern.indexOf('</script>\n', i);
  return kern.slice(0, ende + 10) + neu + kern.slice(ende + 10);
}

function main() {
  const kernPfad = argWert('--kern') || path.join(__dirname, '..', 'vivodepot.html');
  const paket = argWert('--paket');
  if (process.argv.includes('--pruefen')) {
    const kern = fs.readFileSync(kernPfad, 'utf8');
    const block = blockAusKern(kern);
    if (!block) { console.error('kein pdf.js-Block im Kern'); process.exit(1); }
    const marke = kern.match(/@vd-lib name="pdfjs-dist" version="([^"]+)"[^>]*?sha256="([0-9a-f]{64})"/);
    if (!marke) { console.error('keine @vd-lib-Marke pdfjs-dist'); process.exit(1); }
    const ist = sha256(block);
    if (marke[1] !== VERSION || marke[2] !== ist || !fassungMindestens(marke[1], MINDESTFASSUNG)) {
      console.error('Marke passt nicht: Version ' + marke[1] + ', Marke ' + marke[2] + ', Block ' + ist);
      process.exit(1);
    }
    if (paket) {
      const { text } = bauen(fs.readFileSync(paket));
      if (text !== block) { console.error('Nachbau aus dem Paket weicht vom Block ab'); process.exit(1); }
      console.log('ok ' + VERSION + ' sha256 ' + ist + ', Nachbau aus dem Paket byte-gleich');
      return;
    }
    console.log('ok ' + VERSION + ' sha256 ' + ist + ' (Nachbau nicht geprüft: --paket fehlt)');
    return;
  }
  if (!paket) { console.error('Aufruf: --paket <pdfjs-dist-' + VERSION + '.tgz> [--kern <html>] | --pruefen [--paket <tgz>]'); process.exit(2); }
  const { text } = bauen(fs.readFileSync(paket));
  fs.writeFileSync(kernPfad, einsetzen(fs.readFileSync(kernPfad, 'utf8'), text));
  console.log('eingesetzt: pdfjs-dist ' + VERSION + ' · ' + Buffer.byteLength(text, 'utf8') + ' Byte · sha256 ' + sha256(text));
}

module.exports = { bauen, blockAusKern, fassungMindestens, VERSION, MINDESTFASSUNG, PAKET, SCRIPT_ID, MARKE_ANFANG, MARKE_ENDE };

if (require.main === module) main();
