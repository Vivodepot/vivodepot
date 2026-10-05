'use strict';
/* Die eingebettete noble-ed25519 (Skriptblock noble_ed25519_VivodepotInline in vivodepot.html, U2-ADR-457 Nachtrag v865),
   geladen wie im Browser: der ganze Block als ES-Modul, hier über eine data:-URL. `self` setzt die Bibliothek beim Laden
   (`crypto.web = self.crypto`); in Node zeigt es auf den globalen Bereich, mit `ohneWebCrypto` auf ein Objekt ohne crypto. */
const fs = require('node:fs');
const path = require('node:path');

const HTML = path.join(__dirname, '..', '..', 'vivodepot.html');
const OEFFNEN = '<script type="module" id="noble_ed25519_VivodepotInline">\n';
const ANFANG = '// noble-ed25519 fa14496 — Anfang der eingebetteten Bibliothek\n';
const ENDE = '// noble-ed25519 fa14496 — Ende der eingebetteten Bibliothek\n';

// { block, bibliothek }: der ganze Skriptblock und nur der Text der Bibliothek zwischen den Markierungen.
function eingebettet(html) {
  const t = html || fs.readFileSync(HTML, 'utf8');
  const o = t.indexOf(OEFFNEN);
  if (o < 0) throw new Error('Skriptblock noble_ed25519_VivodepotInline fehlt');
  const block = t.slice(o + OEFFNEN.length, t.indexOf('</script>', o));
  const a = block.indexOf(ANFANG), e = block.indexOf(ENDE);
  if (a < 0 || e < a) throw new Error('Markierungen der Bibliothek fehlen');
  return { block, bibliothek: block.slice(a + ANFANG.length, e) };
}

let _zaehler = 0;
async function ladeNoble(opt) {
  // Nur die Bibliothek: die Schlusszeile des Blocks legt eine nicht löschbare globale Eigenschaft an, die in Node jede
  // zweite Ladung sperren würde. Ihre Wirkung prüft tests/halter-schluessel-noble.test.js gesondert.
  const { bibliothek: block } = eingebettet();
  const vorher = Object.getOwnPropertyDescriptor(globalThis, 'self');
  const vdVorher = Object.getOwnPropertyDescriptor(globalThis, 'vdNobleEd25519');
  globalThis.self = (opt && opt.ohneWebCrypto) ? {} : globalThis;
  try {
    // Jede Ladung ein eigenes Modul (der Kommentar macht die URL eindeutig), damit `self` je Ladung gilt.
    const quelle = block + '\n// Ladung ' + (++_zaehler) + '\n';
    return await import('data:text/javascript;base64,' + Buffer.from(quelle).toString('base64'));
  } finally {
    if (vorher) Object.defineProperty(globalThis, 'self', vorher); else delete globalThis.self;
    // Der Block setzt globalThis.vdNobleEd25519; eine Probe-Ladung hinterlässt nichts.
    if (vdVorher) Object.defineProperty(globalThis, 'vdNobleEd25519', vdVorher); else delete globalThis.vdNobleEd25519;
  }
}

// Für den Harness: die Bibliothek in der Form, die der Block im Browser als globalThis.vdNobleEd25519 setzt (einmal geladen).
let _harness = null;
const _harnessBibliothek = Object.freeze({
  getPublicKey: async (seed) => (await (_harness || (_harness = ladeNoble()))).getPublicKey(seed),
});
function harnessBibliothek() { return _harnessBibliothek; }

module.exports = { eingebettet, ladeNoble, harnessBibliothek, OEFFNEN, ANFANG, ENDE };
