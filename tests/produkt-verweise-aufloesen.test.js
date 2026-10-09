'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Jeder Verweis eines gebauten Produkts löst auf (07.10.2026, Befund PRO-ASSISTENT-ZIEL-OHNE-BEREICH)
   ─────────────────────────────────────────────────────────────────────────────
   Die Klassen-Wache über alle Produkte aus tools/lib/vier-produkte.js:
   (1) statisch über die gebackenen Module (dieselbe Prüfung, die den Auslieferungsweg und vier-produkte-erzeugen abbricht): die
       Verweise ins Leere sind GENAU die der Grundlinie tools/produkt-verweise-grundlinie.json — ein neuer ist rot, ein
       verschwundener auch (dann die Grundlinie senken);
   (2) am geladenen Kern: jeder ANGEBOTENE Assistent (mit Startknopf) zeigt auf einen Bereich des Produkts; einer ohne
       Zielbereich wird weder angeboten noch gestartet (Rot-Beweis am Kern vor dem Fix: Pro bot pvwiz/kiwiz an);
   (3) Rot-Beweise: ein Modul mit einem Verweis ins Leere bricht den Bau ab; ein Listen-Verweis auf eine fehlende Liste
       ebenso; ein Assistent mit fehlendem Ziel wird verworfen, nicht angeboten.
   ═════════════════════════════════════════════════════════════════════════════ */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const L = require('../tools/lib/produkt-verweise-pruefen.js');
const VP = require('../tools/lib/vier-produkte.js');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { ladeKern } = require('./load-kern.js');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'produkt-verweise-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

const moduleVon = (p) => VP.modulDateienFuer(p).map((f) => ({ roh: JSON.parse(fs.readFileSync(f, 'utf8')), basisname: path.basename(f) }));
function kernVon(p) {
  const r = konfektionieren({ ziel: path.join(TMP, p.slug), slug: p.slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n', unsignierteModulDateien: VP.modulDateienFuer(p) });
  return ladeKern({ htmlPfad: path.join(r.ordner, 'vivodepot.html') });
}

test('[Verweise·statisch] je Produkt sind die Verweise ins Leere genau die der Grundlinie', () => {
  const grundlinie = L.grundlinieLesen();
  const gemessen = new Set();
  for (const p of VP.PRODUKTE) for (const v of L.produktVerweiseMessen(p.slug, moduleVon(p))) gemessen.add(L.schluessel(v));
  assert.deepEqual([...gemessen].filter((k) => !grundlinie.has(k)), [], 'neue Verweise ins Leere');
  assert.deepEqual([...grundlinie].filter((k) => !gemessen.has(k)), [], 'aufgelöst: die Grundlinie senken');
});

test('[Verweise·Bau] der Bauweg bricht bei jedem Produkt nicht ab, solange nur die Grundlinie ins Leere zeigt', () => {
  for (const p of VP.PRODUKTE) assert.doesNotThrow(() => L.produktVerweiseSichern(p.slug, moduleVon(p)), p.slug);
});

for (const slug of ['privat-de', 'pro-de', 'pro-en']) {
  test('[Verweise·Kern ' + slug + '] jeder angebotene Assistent zeigt auf einen Bereich des Produkts', async () => {
    const { V } = kernVon(VP.PRODUKTE.find((x) => x.slug === slug));
    const bereiche = new Set(V.bereicheAlle().map((b) => b.id));
    const angeboten = V.wizardsAlle().filter((w) => w && V.wizardStartHTML(w.id) !== '');
    const ins_leere = angeboten.filter((w) => w.ziel && w.ziel.sektor && !bereiche.has(w.ziel.sektor)).map((w) => w.id + '→' + w.ziel.sektor);
    assert.deepEqual(ins_leere, []);
    if (slug === 'privat-de') assert.notEqual(V.wizardStartHTML('pvwiz'), '', 'Gegenprobe: Privat bietet pvwiz an');
    else {
      assert.equal(V.wizardStartHTML('pvwiz'), '', 'Pro bietet pvwiz nicht an');
      assert.equal(V.wizardStartHTML('kiwiz'), '', 'Pro bietet kiwiz nicht an');
      await V.depotAnlegen('NURPROBE-' + 'start'.repeat(4));
      assert.equal(V.wizardLauf('kiwiz'), false, 'und startet ihn auch nicht über einen alten Knopf');
    }
  });
}


test('[Verweise·Rot-Beweis] ein Modul mit einem Verweis auf einen fehlenden Bereich bricht den Bau ab', () => {
  const p = VP.PRODUKTE.find((x) => x.slug === 'privat-de');
  const fremd = { roh: { modulTyp: 'logikModul', id: 'probe-verweis', sektor: 'gibt-es-nicht' }, basisname: 'probe-verweis.json' };
  assert.throws(() => L.produktVerweiseSichern(p.slug, [...moduleVon(p), fremd]), /gibt-es-nicht/);
});

test('[Verweise·Rot-Beweis] ein Listen-Verweis auf eine fehlende Liste eines vorhandenen Bereichs ist rot', () => {
  const p = VP.PRODUKTE.find((x) => x.slug === 'privat-de');
  const fremd = { roh: { modulTyp: 'wizard', wizards: { probe: { ziel: { sektor: 'advanceCare', liste: 'gibtEsNicht' } } } }, basisname: 'probe-liste.json' };
  assert.throws(() => L.produktVerweiseSichern(p.slug, [...moduleVon(p), fremd]), /liste-fehlt:advanceCare\.gibtEsNicht/);
});
