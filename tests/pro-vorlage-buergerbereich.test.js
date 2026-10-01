'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Eine Vorlage mit Feldern in Bürger-Bereichen lässt sich auch in Pro einlesen (16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Gemessen beim Bau der Sprach-Regel: in pro-de wurde ein Vorlagenfeld für `identity` beim Einlass
   mit Grund `bereich` verworfen. `_bereichZuSektorId` fragte den Anzeige-Index, und in Pro ruhen die
   Bürger-Bereiche. Eine Notarin konnte damit keine Vorlage einlesen, die Felder in Identität,
   Vorsorge oder Finanzen trägt. Dieselbe Klasse wie der Katalog-Schnitt; die Klasse bewacht
   tests/anzeige-index-leser.test.js.

   ROT-BEWEIS, GEMESSEN (16.09.2026): gegen den Kern ohne den Fix sind die beiden Pro-Proben rot
   (Grund `bereich`); die Privat-Gegenprobe bleibt grün.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

const LOAD_KERN = path.join(__dirname, 'load-kern.js');
function produktKern(slug) {
  const p = PRODUKTE.find((x) => x.slug === slug);
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-pro-vorlage-buerger-' + slug + '-'));
  const r = konfektionieren({
    ziel, slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien: modulDateienFuer(p),   // seit v746 kommen die Bereiche als Module (neu aufgesetzt 28.09.2026)
  });
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = path.join(r.ordner, 'vivodepot.html');
  delete require.cache[require.resolve(LOAD_KERN)];
  try { return require(LOAD_KERN).ladeKern({ blank: true }); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve(LOAD_KERN)];
    fs.rmSync(ziel, { recursive: true, force: true });   // der Kern ist geladen; das gebaute Produkt wird nicht mehr gebraucht
  }
}
const tpl = () => ({ felder: [
  { feldname: { de: 'Steuerberater', en: 'Tax adviser' }, feldtyp: 'text', bereich: 'identity' },
  { feldname: { de: 'Hausbank', en: 'House bank' }, feldtyp: 'text', bereich: 'finance' },
] });

for (const slug of ['pro-de', 'pro-en']) {
  test('[Pro·Vorlage·' + slug + '] Felder in ruhenden Bürger-Bereichen werden angedockt, nicht mit Grund `bereich` verworfen', () => {
    const { V } = produktKern(slug);
    const r = V._templateFelderUebersetzen(tpl(), V.SCHEMA_VERSION_AKTUELL, {}, 'probe-notariat');
    assert.deepEqual(r.verworfeneFelder, []);
    assert.deepEqual(r.feldDefinitionen.map((d) => d.sektorId), ['identity', 'finance']);
  });
}

test('[Pro·Vorlage·Gegenprobe] privat-de dockt dieselbe Vorlage an wie bisher', () => {
  const { V } = produktKern('privat-de');
  assert.equal(V._templateFelderUebersetzen(tpl(), V.SCHEMA_VERSION_AKTUELL, {}, 'probe-notariat').feldDefinitionen.length, 2);
});
