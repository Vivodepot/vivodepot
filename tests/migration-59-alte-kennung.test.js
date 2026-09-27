'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Stufe 58 → 59 bindet Dokumente an Instrument-Zeilen — auch unter den Kennungen, die eine alte
   Datei wirklich trägt (16.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Die Stufe gibt einer Dokument-Referenz auf eine Liste eine `zeilenId`, wo sie eindeutig
   auflösbar ist: (a) über den Diskriminanten, wenn die Liste die Rolle `instrumenteListe` trägt
   und `doc.typ` eine Zeile trifft, (b) sonst, wenn die Liste genau eine Zeile hat.

   WAS SCHIEF LIEF: Die Stufe läuft VOR der Umbenennungsstufe am Kettenende. Die Daten tragen dort
   die ALTEN Kennungen (`vorsorge`, `vorsorge_instrumente`, Unterfeld `typ`), der Katalog kennt
   seit dem Kennungs-Umbau nur noch die neuen (`advanceCare`, `provisionInstruments`). Die
   Rollenfrage `bereichFeldHatRolle('vorsorge', 'vorsorge_instrumente', …)` fand darum in KEINEM
   Produkt etwas — Weg (a) griff nie. Bei genau einer Zeile rettete Weg (b); bei zwei oder mehr
   Instrumenten blieb die Referenz ohne Zeile.

   WARUM DIE BESTEHENDE PROBE ES NICHT SAH: tests/m3-eintrag-bezug-zug1.test.js baut ihre
   Schema-58-Akte mit den NEUEN Kennungen. So sah eine Datei vor Schema 59 nie aus; die Probe prüft
   die Stufe gegen dieselbe Landkarte, die sie benutzt. Diese Probe friert die alte Form wörtlich ein.

   ROT-BEWEIS, GEMESSEN (16.09.2026, Kanon 662b4d39): ohne den Fix sind 4 der 5 Proben rot — in
   privat-de UND pro-de, normalisiert wie als Datei geöffnet, jeweils ohne `zeilenId`. Es ist keine
   Pro-Frage; beide Produkte waren gleich falsch. Grün bleibt die Gegenprobe: ohne Typ-Treffer wird
   bei zwei Zeilen weiter nicht geraten.
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
    const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-stufe59-' + slug + '-'));
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

/* Wörtlich eingefroren in der Form vor Schema 59: alte Bereichs-, Listen- und Unterfeld-Kennungen,
   zwei Instrumente, ein Dokument, das über seinen Typ genau eines davon trifft. */
const SCHEMA_58 = Object.freeze({
  schemaVersion: 58,
  sektoren: {
    vorsorge: {
      vorsorge_instrumente: [
        { id: 'zeile-vollmacht', typ: 'vorsorgevollmacht', ablageort: 'Ordner Vorsorge' },
        { id: 'zeile-pv', typ: 'patientenverfuegung', ablageort: 'Schreibtisch' },
      ],
    },
  },
  dokumente: [{
    id: 'doc-pv', typ: 'patientenverfuegung', name: 'Patientenverfügung', sektorId: 'vorsorge',
    erstelltAm: '2024-01-01', felder: [{ sektorId: 'vorsorge', feldId: 'vorsorge_instrumente' }],
    mappeRef: null, istStandard: true, quelle: 'standard', sensibel: false,
  }],
});
const PASSWORT = 'stufe59-alte-kennung-probe-2026';

function referenz(d) {
  const doc = (d.dokumente || []).find((x) => x && x.id === 'doc-pv');
  assert.ok(doc, 'das Dokument ist nach der Migration verschwunden');
  assert.equal(doc.felder.length, 1);
  return doc.felder[0];
}

let UMSCHLAG = null;
async function alteDatei() {
  if (!UMSCHLAG) {
    const Q = produktKern('privat-de').V;
    await Q.depotAnlegen(PASSWORT);
    const alt = JSON.parse(JSON.stringify(Q.getData()));
    Object.assign(alt, JSON.parse(JSON.stringify(SCHEMA_58)));
    Q.setData(alt);
    UMSCHLAG = await Q.depotSerialisieren();
  }
  return JSON.parse(JSON.stringify(UMSCHLAG));
}

for (const slug of ['privat-de', 'pro-de']) {
  test('[Stufe59·' + slug + '] die Referenz auf zwei Instrumente bindet sich über den Typ an die richtige Zeile', () => {
    const V = produktKern(slug).V;
    const ref = referenz(V.depotNormalisieren(JSON.parse(JSON.stringify(SCHEMA_58))));
    assert.equal(ref.zeilenId, 'zeile-pv', slug + ': keine oder falsche Zeile gebunden');
    assert.equal(ref.sektorId, 'advanceCare', 'die Umbenennungsstufe am Kettenende läuft weiter');
    assert.equal(ref.feldId, 'provisionInstruments');
  });

  test('[Stufe59·' + slug + '] dasselbe beim Öffnen der verschlüsselten Datei', async () => {
    const V = produktKern(slug).V;
    await V.depotLaden(await alteDatei(), PASSWORT);
    assert.equal(referenz(V.getData()).zeilenId, 'zeile-pv', slug);
  });
}

test('[Stufe59·Gegenprobe] ohne Typ-Treffer bei zwei Zeilen wird weiter NICHT geraten', () => {
  const V = produktKern('privat-de').V;
  const d = JSON.parse(JSON.stringify(SCHEMA_58));
  d.dokumente[0].typ = 'eigen-ohne-katalog-typ';
  const ref = referenz(V.depotNormalisieren(d));
  assert.ok(!('zeilenId' in ref), 'zwei Kandidaten ohne Diskriminant — die Stufe darf keine Zeile raten');
});
