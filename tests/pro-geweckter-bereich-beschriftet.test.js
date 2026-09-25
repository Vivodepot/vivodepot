'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Ein geweckter Bereich trägt seine Beschriftungen — auch der gesäte „Wohnen" in Pro (16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Code-Review Schranke 2, Befund S1 (HOCH). In pro-de und pro-en stand nach dem Öffnen einer
   Bürger-Akte mit Wohnen-Werten der Knopf „Wohnen", und der Klick endete im Fehler:
   `renderSektor('housing')` warf an `escapeHTML(undefined)`. Alle fünfzehn Felder trugen kein
   Label. Gemessen an der Referenzdatei vom 04.09. (Node und Browser); privat-de rendert sie.

   URSACHE: Die Feldbeschriftungen werden beim Booten über `bereicheAlle()` aufgetragen — das ist
   die ANZEIGE. In Pro ersetzt `bereichsErsatz` die Bürger-Bereiche; `housing`, der gesäte
   dreizehnte, fehlte dort und wurde nie beschriftet. Die eingebauten zwölf traf es nicht, sie
   werden schon beim Bau von `SEKTOREN` beschriftet. Sichtbar wurde es erst, seit eine geöffnete
   Akte den ruhenden Bereich weckt.

   BEHOBEN AM BESCHRIFTEN, NICHT AM WECKEN: beide Läufe (Boot und `textsatzNeuAnwenden`) gehen
   über den Katalog. Ein Aufruf beim Wecken hätte nebenbei `TEXTSATZ_FEHLSTELLEN` geleert und den
   Wächter darauf nach jedem Öffnen blind gemacht — darum die letzte Probe.

   WIE DIESE PROBE WECKT: ohne Datei, über denselben Index-Neubau, den `depotLaden` nach der
   Normalisierung aufruft (`_sektorIndexNeuBauen`). Die Referenzdatei selbst liegt nicht im Repo;
   eine frisch erzeugte Datei zeigt den Fehler NICHT, weil sie `housing` schon vor dem ersten
   Index-Aufbau unter dem heutigen Namen trägt und danach noch ein Textsatz-Lauf kommt. Erst eine
   Datei aus der Zeit vor dem Kennungs-Umbau wird spät geweckt. Der direkte Neubau trifft genau
   diese späte Weckung.

   ROT-BEWEIS, GEMESSEN (16.09.2026): gegen den Kern ohne diesen Fix sind 5 der 7 Proben rot —
   Beschriftung und Rendern je in pro-de und pro-en, und die pro-en-Beschriftungen gleich
   privat-en. Grün bleiben die beiden Grenzproben (keine Fehlstellen, privat-de unverändert).
   Dieselbe Messung an der Referenzdatei vom 04.09.: vorher 15 von 15 Feldern ohne Label und
   Wurf in pro-de und pro-en, nachher 0 von 15.

   WAS DIESE PROBE NICHT TRIFFT: den Browser-Weg über Datei-Picker und Passwort-Dialog, und jeden
   Bereich außer `housing` — die übrigen ruhenden Bürger-Bereiche sind eingebaut und waren nie
   betroffen; geprüft wird zusätzlich nur, dass keiner von ihnen ohne Beschriftung dasteht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

const LOAD_KERN = path.join(__dirname, 'load-kern.js');
const gebaut = new Map();
function produktKern(slug) {
  if (!gebaut.has(slug)) {
    const p = PRODUKTE.find((x) => x.slug === slug);
    if (!p) throw new Error('Unbekanntes Produkt „' + slug + '"');
    const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-geweckt-' + slug + '-'));
    const r = konfektionieren({
      ziel, slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: modulDateienFuer(p),
    });
    gebaut.set(slug, path.join(r.ordner, 'vivodepot.html'));
  }
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = gebaut.get(slug);
  delete require.cache[require.resolve(LOAD_KERN)];
  try { return require(LOAD_KERN).ladeKern(); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve(LOAD_KERN)];
  }
}

const felderVon = (bereich) => (bereich.sektionen || []).flatMap((s) => s.felder || []);

/* Weckt `housing` so, wie eine alte Datei es tut: erst ein Depot ohne Wohnen-Werte, dann ein Wert,
   dann der Index-Neubau. Gibt den geweckten Bereich zurück — oder macht rot, wenn er nicht wach
   wird, denn dann prüft der Rest nichts. */
async function wohnenGeweckt(slug) {
  const k = produktKern(slug);
  await k.V.basisVorlagenVerifizieren();
  await k.V.depotAnlegen('geweckter-bereich-probe-2026');
  assert.equal(k.V.bereicheAlle().some((s) => s.id === 'housing'), false, slug + ': housing ist schon vor dem Wecken sichtbar — dann prüft diese Probe die späte Weckung nicht');
  const d = k.V.getData();
  // Die Feldkennung aus privat-de, wo housing nie ruht — in Pro steht der Bereich vor dem Wecken in
  // keiner Liste, die die Probe ohne den Katalog lesen könnte.
  const privat = produktKern('privat-de').V.bereicheAlle().find((s) => s.id === 'housing');
  const feldId = felderVon(privat)[0].id;
  d.sektoren.housing = Object.assign({}, d.sektoren.housing, { [feldId]: 'Messwert Wohnen' });
  k.V._sektorIndexNeuBauen();
  const h = k.V.bereicheAlle().find((s) => s.id === 'housing');
  assert.ok(h, slug + ': housing ist nach dem Wecken nicht sichtbar');
  return { k, h };
}

for (const slug of ['pro-de', 'pro-en']) {
  test('[Geweckt·' + slug + '] „Wohnen" trägt nach dem Wecken alle Feldbeschriftungen', async () => {
    const { h } = await wohnenGeweckt(slug);
    const ohne = felderVon(h).filter((f) => typeof f.label !== 'string' || !f.label).map((f) => f.id);
    assert.ok(felderVon(h).length, 'housing hat keine Felder — dann prüft diese Probe nichts');
    assert.deepEqual(ohne, [], slug + ': Felder ohne Beschriftung: ' + ohne.join(', '));
  });

  test('[Geweckt·' + slug + '] „Wohnen" rendert nach dem Wecken, statt zu werfen', async () => {
    const { k } = await wohnenGeweckt(slug);
    assert.doesNotThrow(() => k.V.renderSektor('housing'));
    const c = k.document.getElementById('content');
    assert.ok(c && c.innerHTML.length > 0, slug + ': housing rendert leer');
  });
}

test('[Geweckt·Sprache] in pro-en tragen die geweckten Felder dieselben Beschriftungen wie in privat-en', async () => {
  /* Beschriftet ist nicht gleich richtig beschriftet: ein Lauf über die falsche Liste hätte die
     Felder auch mit dem eingebauten deutschen Text füllen können. Gemessen gegen das englische
     Privat-Produkt, in dem `housing` nie ruht. */
  const { h } = await wohnenGeweckt('pro-en');
  const privat = produktKern('privat-en').V.bereicheAlle().find((s) => s.id === 'housing');
  const soll = Object.fromEntries(felderVon(privat).map((f) => [f.id, f.label]));
  const ist = Object.fromEntries(felderVon(h).map((f) => [f.id, f.label]));
  assert.deepEqual(ist, soll);
});

test('[Geweckt·Fehlstellen] der Beschriftungs-Lauf hinterlässt in keinem der vier Produkte Fehlstellen', () => {
  /* Die Nebenwirkung, gegen die der Ort des Fixes gewählt ist. Vorher wie nachher leer, in allen
     vier Produkten gemessen. Wird hier eine Fehlstelle gemeldet, trägt ein Bereich des Katalogs
     einen Text, den der Textsatz nicht kennt — dann gehört das geklärt, nicht die Probe gelockert. */
  for (const slug of PRODUKTE.map((p) => p.slug)) {
    const { V } = produktKern(slug);
    assert.deepEqual((V.TEXTSATZ_FEHLSTELLEN || []).slice(), [], slug);
  }
});

test('[Geweckt·Privat] in privat-de ändert sich nichts: housing ist wach und beschriftet wie zuvor', () => {
  const V = produktKern('privat-de').V;
  const h = V.bereicheAlle().find((s) => s.id === 'housing');
  assert.ok(h);
  assert.deepEqual(felderVon(h).filter((f) => !f.label).map((f) => f.id), []);
});
