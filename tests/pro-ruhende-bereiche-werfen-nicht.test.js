'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Drei Stellen, die in Pro warfen oder still falsch antworteten, wenn ein Bürger-Bereich ruht
   ────────────────────────────────────────────────────────────────────────
   Gefunden über die Ratsche tools/anzeige-index-leser.js (16.09.2026): drei Funktionen lasen
   `SEKTOR_BY_ID.advanceCare` bzw. `SEKTOR_BY_ID['people']` direkt. In Pro ruhen diese Bereiche, solange
   sie keine Werte tragen — und ein Schreibvorgang weckt sie nicht in derselben Sitzung.

     _instrumentUnterfeldDef     warf TypeError — und mit ihr der Import einer b16-Datei mit
                                 Vorsorge-Angaben (`_b16InstrumentZeilen`).
     _gebwizSubDepotVorschlagen  warf TypeError, nachdem ein Kind angelegt wurde. Gemessen über die
                                 Funktion; ob der Geburts-Assistent in der Pro-Oberfläche erreichbar
                                 ist, ist nicht gemessen.
     _vollmachtArtLabel          warf nicht — der Wurf wurde vom try geschluckt —, lieferte aber ""
                                 statt „Vorsorgevollmacht"; die Vollmachtsart erschien als Rohschlüssel.

   ROT-BEWEIS, GEMESSEN (16.09.2026): gegen den Kern ohne diesen Fix sind die drei Pro-Proben rot;
   die Privat-Gegenprobe bleibt grün.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

const LOAD_KERN = path.join(__dirname, 'load-kern.js');
async function kernMitDepot(slug) {
  const p = PRODUKTE.find((x) => x.slug === slug);
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-werfen-nicht-' + slug + '-'));
  const r = konfektionieren({
    ziel, slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien: modulDateienFuer(p),   // seit v746 kommen die Bereiche als Module (neu aufgesetzt 28.09.2026)
  });
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = path.join(r.ordner, 'vivodepot.html');
  delete require.cache[require.resolve(LOAD_KERN)];
  let V;
  try {
    V = require(LOAD_KERN).ladeKern({ blank: true, zusatzBindungen: ['_instrumentUnterfeldDef', '_b16InstrumentZeilen', 'B16_INSTRUMENT_IMPORT'] }).V;
  } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve(LOAD_KERN)];
    fs.rmSync(ziel, { recursive: true, force: true });   // der Kern ist geladen; das gebaute Produkt wird nicht mehr gebraucht
  }
  await V.depotAnlegen('werfen-nicht-probe-2026');
  return V;
}
function vorsorgeImport(V) {
  const def = V.__zusatz.B16_INSTRUMENT_IMPORT[0];
  const detail = Object.keys(def.felder)[0];
  return V.__zusatz._b16InstrumentZeilen({ [def.gate]: 'ja', [detail]: 'Ordner im Schrank' }, new Set());
}
function vollmachtOption(V) {
  const liste = V.feldDefFuer('advanceCare', 'provisionInstruments');
  return (liste.unterFelder.find((u) => u.id === 'typeOfPowerOfAttorney').optionen || [])[0];
}

test('[Pro·ruhend·b16] der Import einer b16-Datei mit Vorsorge-Angaben wirft in pro-de nicht', async () => {
  const V = await kernMitDepot('pro-de');
  const zeilen = vorsorgeImport(V);
  assert.ok(Array.isArray(zeilen) && zeilen.length === 1, 'keine Instrument-Zeile aus dem Import');
});

test('[Pro·ruhend·Vollmachtsart] die Vollmachtsart hat in pro-de ihren Namen, nicht ""', async () => {
  const V = await kernMitDepot('pro-de');
  const opt = vollmachtOption(V);
  assert.ok(opt && opt.label, 'keine Option — dann prüft diese Probe nichts');
  assert.equal(V._vollmachtArtLabel(opt.wert), opt.label);
});

test('[Pro·ruhend·Geburt] der Sub-Depot-Vorschlag nach dem Anlegen eines Kindes wirft in pro-de nicht', async () => {
  const V = await kernMitDepot('pro-de');
  V.getData().sektoren.people = { childrenAndDependants: [{ person: { ref: '', override: 'Kind Beispiel' } }] };
  assert.equal(V.bereicheAlle().some((s) => s.id === 'people'), false, 'people ist wach — dann prüft diese Probe den ruhenden Fall nicht');
  assert.doesNotThrow(() => V._gebwizSubDepotVorschlagen(0));
});

test('[Pro·ruhend·Gegenprobe] privat-de antwortet an allen drei Stellen wie bisher', async () => {
  const V = await kernMitDepot('privat-de');
  assert.equal(vorsorgeImport(V).length, 1);
  const opt = vollmachtOption(V);
  assert.equal(V._vollmachtArtLabel(opt.wert), opt.label);
  V.getData().sektoren.people = { childrenAndDependants: [{ person: { ref: '', override: 'Kind Beispiel' } }] };
  assert.doesNotThrow(() => V._gebwizSubDepotVorschlagen(0));
});
