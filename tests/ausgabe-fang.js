'use strict';
/* Hilfe für tests/ausgabewege-*.test.js (AUS1): lädt den Kern mit dem ECHTEN jsPDF des Produkts (die
   eingebettete Bibliothek aus vivodepot.html, kein Stub) und fängt jede herausgegebene Datei ab. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ladeKern } = require('./load-kern.js');

let _jspdf = null;
let _qr = null;
function echtesJsPdf() {
  if (_jspdf) return _jspdf;
  const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const bloecke = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const lib = bloecke.find((b) => /jsPDF - PDF Document creation from JavaScript/.test(b.slice(0, 400)));
  if (!lib) throw new Error('eingebettetes jsPDF nicht gefunden — Form der Skriptblöcke geändert?');
  const fenster = { atob, btoa, TextEncoder, TextDecoder, Blob, URL, setTimeout, clearTimeout, console, navigator: { userAgent: 'node' }, document: undefined };
  fenster.window = fenster; fenster.self = fenster; fenster.globalThis = fenster;
  vm.runInNewContext(lib, fenster, { filename: 'jspdf(eingebettet)' });
  if (!fenster.jspdf || !fenster.jspdf.jsPDF) throw new Error('jsPDF hat sich nicht angemeldet');
  // Die eingebetteten Schriften (Inter) hängen sich per Ereignis an dieselbe jsPDF-Instanz — im selben Kontext laden.
  const schriften = bloecke.find((b) => /PDF-INTER-B64:BEGIN/.test(b.slice(0, 200)));
  if (schriften) vm.runInContext(schriften, fenster, { filename: 'pdf-inter(eingebettet)' });
  // Der QR-Generator (eigener Skriptblock) — der Widerrufs-Beleg und die Notfallkarte zeichnen ihn ein.
  const qrBlock = bloecke.find((b) => /QR Code Generator/.test(b.slice(0, 300)));
  if (qrBlock) { vm.runInContext(qrBlock, fenster, { filename: 'qrcode(eingebettet)' }); _qr = fenster.qrcode || null; }
  _jspdf = fenster.jspdf;
  return _jspdf;
}

/* → { V, gefangen: [{ blob, name }], bytes(i) } */
function ladeMitAusgabe(opts) {
  const gefangen = [];
  const jspdf = echtesJsPdf();
  const k = ladeKern(Object.assign({ jspdf, qrcode: _qr || undefined, Blob, ausgabeErfassen: (x) => gefangen.push(x) }, opts || {}));
  return Object.assign(k, { gefangen, bytes: async (i) => Buffer.from(await gefangen[i].blob.arrayBuffer()) });
}

/* Warten, bis die asynchronen Ausgabewege ihre Datei abgegeben haben (n Dateien oder Zeitgrenze). */
async function warteAufDateien(k, n, ms) {
  const ende = Date.now() + (ms || 4000);
  while (k.gefangen.length < n && Date.now() < ende) await new Promise((r) => setTimeout(r, 25));
  return k.gefangen.length;
}

module.exports = { echtesJsPdf, ladeMitAusgabe, warteAufDateien };
