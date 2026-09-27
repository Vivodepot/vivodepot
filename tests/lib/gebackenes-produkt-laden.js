'use strict';
/* Lädt EIN gebackenes Produkt (privat-de/-en, pro-de/-en) als Kern für einen Node-Test — dieselbe
   Apparatur wie tests/angehoerigen-vorlage-de-feldverlust.test.js, herausgezogen, damit mehrere
   Proben sie teilen. Backt in ein Wegwerf-Verzeichnis und räumt es wieder weg. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../../tools/lib/vier-produkte.js');

async function gebackenLaden(slug) {
  const produkt = PRODUKTE.find((p) => p.slug === slug);
  if (!produkt) throw new Error('Unbekanntes Produkt: ' + slug);
  const zielOrdner = fs.mkdtempSync(path.join(os.tmpdir(), 'gebackenes-produkt-' + slug + '-'));
  try {
    const gebaut = konfektionieren({
      ziel: zielOrdner, slug: produkt.slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: modulDateienFuer(produkt),
    });
    const REPO = path.join(__dirname, '..', '..');
    const ladeKernPfad = path.join(REPO, 'tests', 'load-kern.js');
    const vorher = process.env.KERN_HTML_PATH;
    process.env.KERN_HTML_PATH = path.join(gebaut.ordner, 'vivodepot.html');
    delete require.cache[require.resolve(ladeKernPfad)];
    const { ladeKern } = require(ladeKernPfad);
    const paar = ladeKern();
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve(ladeKernPfad)];
    return paar;
  } finally {
    fs.rmSync(zielOrdner, { recursive: true, force: true });
  }
}

module.exports = { gebackenLaden };
