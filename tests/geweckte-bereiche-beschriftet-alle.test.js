'use strict';
/* Jeder Bereich, den ein Produkt anzeigt, trägt Beschriftungen und rendert — auch einer, den erst eine Datei weckt.

   Vorbeugung zu Code-Review Schranke 2 (16.09.2026), Befund S1 (HOCH): In pro-de und pro-en stand nach dem Öffnen
   einer Bürger-Akte der Knopf „Wohnen“, und der Klick endete im Fehler (`escapeHTML(undefined)`), weil der geweckte
   Bereich keine Beschriftungen trug. Die Probe zu S1 hält `housing` in Pro. Dieser
   Wächter hält die Klasse: In allen vier Produkten wird JEDER Bereich des Katalogs geweckt (ein Wert, dann derselbe
   Index-Neubau wie in `depotLaden`). Danach gilt für jeden Bereich in `bereicheAlle()`: jedes Feld hat ein nicht
   leeres Label, und `renderSektor` wirft nicht und schreibt kein „undefined“.

   Rot-Beweis: pro-de, gebaut aus einem Kern, der die Beschriftungen wieder nur über die Anzeige (`bereicheAlle()`)
   aufträgt statt über den Katalog, fällt durch. */
const { after } = require('node:test');
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

const KERN = path.join(__dirname, '..', 'vivodepot.html');
const LOAD_KERN = path.join(__dirname, 'load-kern.js');
const S1_FIX = '  _textsatzAufSektorenAnwenden(_bereicheImKatalog(), tun);\n';
const S1_ALT = '  _textsatzAufSektorenAnwenden(bereicheAlle(), tun);\n';

const gebaut = new Map();
const tempOrdner = [];
after(() => { for (const d of tempOrdner) fs.rmSync(d, { recursive: true, force: true }); });
function produktKern(slug, kernQuelle) {
  const schluessel = slug + (kernQuelle ? '·mutiert' : '');
  if (!gebaut.has(schluessel)) {
    const p = PRODUKTE.find((x) => x.slug === slug);
    const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-geweckt-alle-' + slug + '-'));
    tempOrdner.push(ziel);
    const r = konfektionieren({
      ziel, slug, modulauswahl: [], kernQuelle,
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: modulDateienFuer(p),
    });
    gebaut.set(schluessel, path.join(r.ordner, 'vivodepot.html'));
  }
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = gebaut.get(schluessel);
  delete require.cache[require.resolve(LOAD_KERN)];
  try { return require(LOAD_KERN).ladeKern({ blank: true }); } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[require.resolve(LOAD_KERN)];
  }
}

const felderVon = (bereich) => (bereich.sektionen || []).flatMap((s) => s.felder || []);

/* Weckt jeden Bereich des Katalogs mit einem Wert im ersten Feld und baut den Index neu. Gibt die Mängel zurück. */
async function maengelNachWecken(k) {
  await k.V.basisVorlagenVerifizieren();
  await k.V.depotAnlegen('geweckte-bereiche-alle-2026');
  const d = k.V.getData();
  let geweckt = 0;
  for (const b of k.V._bereicheImKatalog()) {
    const f = felderVon(b)[0];
    if (!f || !f.id) continue;
    d.sektoren[b.id] = Object.assign({}, d.sektoren[b.id], { [f.id]: 'Messwert' });
    geweckt++;
  }
  k.V._sektorIndexNeuBauen();
  const maengel = [];
  for (const b of k.V.bereicheAlle()) {
    for (const f of felderVon(b)) if (typeof f.label !== 'string' || !f.label.trim()) maengel.push(b.id + '.' + f.id + ': ohne Beschriftung');
    try {
      k.V.renderSektor(b.id);
      const html = (k.document.getElementById('content') || {}).innerHTML || '';
      if (/>[^<]*\bundefined\b/.test(html)) maengel.push(b.id + ': „undefined“ im gerenderten Text');
    } catch (e) {
      maengel.push(b.id + ': renderSektor wirft: ' + (e && e.message));
    }
  }
  return { geweckt, angezeigt: k.V.bereicheAlle().length, maengel };
}

for (const slug of PRODUKTE.map((p) => p.slug)) {
  test('[Geweckt·alle·' + slug + '] jeder angezeigte Bereich trägt Beschriftungen und rendert, nachdem der ganze Katalog geweckt ist', async () => {
    const { geweckt, angezeigt, maengel } = await maengelNachWecken(produktKern(slug));
    assert.ok(geweckt > 0 && angezeigt > 0, slug + ': nichts geweckt oder angezeigt — dann prüft der Wächter nichts');
    assert.deepEqual(maengel, [], slug);
  });
}

test('[Geweckt·alle·Rot-Beweis] mit Beschriftung nur über die Anzeige fällt pro-de durch', async () => {
  const quelle = fs.readFileSync(KERN, 'utf8');
  assert.equal(quelle.split(S1_FIX).length, 2, 'Anker für den Rot-Beweis trifft nicht genau einmal');
  const { maengel } = await maengelNachWecken(produktKern('pro-de', quelle.replace(S1_FIX, S1_ALT)));
  assert.ok(maengel.length > 0, 'mit dem alten Stand bleibt pro-de ohne Mangel — der Wächter prüft dann nicht, was der Fix leistet');
});
