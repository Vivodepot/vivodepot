'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Der Katalog eines Pro-Produkts kennt ALLE Felder und Unterfelder der dreizehn nativen Bereiche
   (Fund 19.09.2026, tests/altbestand-vier-produkte-messen.test.js Z. 52)
   ────────────────────────────────────────────────────────────────────────────
   Vor dem Schnitt standen alle dreizehn in `SEKTOREN`; die Anzeige filterte die ersetzten aus, der Katalog
   (`_bereicheImKatalog()`) blieb vollständig. Nach dem Schnitt reichte B12 die native Definition nur für
   GEWECKTE Bereiche in die Registry nach — für die zwölf ruhenden kannte der Katalog nichts, und jeder
   Schlüssel samt Unterfeld eines Listenfelds (z. B. advanceCare.provisionInstruments) war „unbekannt".
   Diese Probe hält die Parität über ALLE Felder aller Bereiche, nicht nur über das eine Listenfeld:
   für jeden Schlüssel `bereich.feld`, den der Katalog von Privat kennt, kennt ihn der von Pro gleich,
   mit derselben Menge an Unterfeldern (dieselbe Lesart wie tools/altbestand-vier-produkte-messen.js).
   Rot-Beweis: eine Produktkopie mit der alten Beschränkung („nur geweckte") wird an derselben Probe rot. */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const VP = require('../tools/lib/vier-produkte.js');

const LOAD_KERN = require.resolve('./load-kern.js');
const PW = 'Pro-Katalog-Paritaet-2026';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pro-katalog-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

function produktPfad(slug, name, aendern) {
  const p = VP.PRODUKTE.find((x) => x.slug === slug);
  const r = konfektionieren({
    ziel: path.join(TMP, name), slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien: VP.modulDateienFuer(p),
  });
  const datei = path.join(r.ordner, 'vivodepot.html');
  if (aendern) fs.writeFileSync(datei, aendern(fs.readFileSync(datei, 'utf8')), 'utf8');
  return datei;
}
function kern(pfad) {
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = pfad;
  delete require.cache[LOAD_KERN];
  try { return require(LOAD_KERN).ladeKern().V; } finally {
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[LOAD_KERN];
  }
}
function schluessel(V) {
  const m = new Map();
  for (const b of V._bereicheImKatalog()) {
    for (const sek of b.sektionen || []) {
      for (const f of sek.felder || []) m.set(b.id + '.' + f.id, [...new Set((f.unterFelder || []).map((u) => u.id))].sort().join(','));
    }
  }
  return m;
}
async function offen(pfad) { const V = kern(pfad); await V.depotAnlegen(PW); return V; }

/* Was Pro dem Katalog von Privat schuldet: jeder Schlüssel der dreizehn nativen Bereiche samt Unterfeldern. */
function fehlendeSchluessel(privat, pro) {
  const p = schluessel(privat);
  const q = schluessel(pro);
  const nativ = new Set(privat._bereicheImKatalog().map((b) => b.id));
  return [...p].filter(([k]) => nativ.has(k.split('.')[0]))
    .filter(([k, u]) => !q.has(k) || q.get(k) !== u).map(([k]) => k);
}

for (const [pro, privat] of [['pro-de', 'privat-de'], ['pro-en', 'privat-en']]) {
  test('[Pro-Katalog·' + pro + '] jeder Schlüssel und jedes Unterfeld der dreizehn nativen Bereiche steht im Katalog', async () => {
    const V = await offen(produktPfad(pro, pro));
    const P = kern(produktPfad(privat, privat));
    const listen = [...schluessel(P)].filter(([, u]) => u !== '');
    assert.ok(listen.length >= 26, 'Suchraum besetzt: ' + listen.length + ' Listenfelder mit Unterfeldern im Privat-Katalog');
    assert.ok(P._bereicheImKatalog().length >= 13, 'Privat kennt die dreizehn');
    assert.deepEqual(fehlendeSchluessel(P, V), [], 'im Pro-Katalog fehlen (oder weichen ab)');
    assert.ok(V.bereicheAlle().length < 13, 'die Anzeige bleibt gefiltert — der Katalog ist vollständig, die Seitenleiste nicht');
  });
}

test('[Pro-Katalog·Rot-Beweis] mit der alten Beschränkung „nur geweckte Bereiche" fehlen dem Pro-Katalog die Schlüssel', async () => {
  const alt = (t) => {
    const a = 'if (_BEREICH_IDS_ERSETZT.length) {\n    const bekannt';
    assert.equal(t.split(a).length - 1, 1, 'Anker der Beschränkung steht genau einmal');
    return t.replace(a, 'if (_BEREICH_IDS_RUHEND.length) {\n    const bekannt')
      .replace('_BEREICH_IDS_ERSETZT.filter((id) => !bekannt(id) && _BEREICHE_NATIV_DEFINITIONEN[id])', '_BEREICH_IDS_RUHEND.filter((id) => !bekannt(id) && _BEREICHE_NATIV_DEFINITIONEN[id])');
  };
  const V = await offen(produktPfad('pro-de', 'pro-de-alt', alt));
  const P = kern(produktPfad('privat-de', 'privat-de-rot'));
  const fehlt = fehlendeSchluessel(P, V);
  assert.ok(fehlt.includes('advanceCare.provisionInstruments'), 'der Fund vom 19.09.2026 wäre erkannt: ' + fehlt.slice(0, 5).join(' '));
  assert.ok(fehlt.length > 100, 'nicht nur ein Feld — ganze ruhende Bereiche fehlen (' + fehlt.length + ')');
});
