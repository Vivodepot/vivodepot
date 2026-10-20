'use strict';
/* „Zugang zum Recht“ ist in jedem Produkt unter diesem Namen auffindbar (11.10.2026).

   Die zwei Vorbereitungsauszüge (Beratungshilfe, Erbschein) liegen seit September ab Werk in jedem Produkt. Gezeigt
   wurden sie außen unter dem Namen des Vorhabens, „Zugang zum Recht“. Im Produkt stand dieser Name nirgends: beide
   Knöpfe hießen gleich („Auszug ansehen“), die Suche fand weder den Namen noch „Erbschein“, und keine Hilfe nannte sie.
   Wer nicht wusste, in welchem Abschnitt sie hängen, fand sie nicht.

   Diese Probe hält, je Produkt und in dessen Sprache:
   · an der Karte jeder der zwei Vorlagen steht der Name des Vorhabens, und die Knöpfe sagen, was sie öffnen
     (Privat; in Pro haben die zwei Vorlagen heute keinen Bereich, an dem eine Karte hängen könnte);
   · die Suche findet die Vorlagen unter dem Namen, unter „Beratungshilfe“ und unter „Erbschein“, und der Treffer öffnet
     den Auszug;
   · die Hilfe führt ein Thema, dessen Titel den Namen trägt und das beide Auszüge nennt.
   Der Name und alle Wörter kommen aus dem Textsatz; das Gerüst kennt keine der zwei Kennungen.

   Gegenprobe: das Gerüst ohne Vorlagen liefert keinen Vorlagen-Treffer und keine Karte — die Treffer kommen von den
   Vorlagen des Produkts, nicht von einer festen Zeile. Klassenwächter: JEDE Vorlage mit Karte hat einen eigenen
   Knopftext und einen Sucheintrag, nicht nur diese zwei. */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

const LOAD_KERN = path.join(__dirname, 'load-kern.js');
const VORLAGEN = Object.freeze({
  'zugang-zum-recht-beratungshilfe': { sektor: 'assets', attr: 'data-zugang-recht-dokument', wort: { de: 'Beratungshilfe', en: 'advisory assistance' } },
  'erbschein-vorbereitung': { sektor: 'advanceCare', attr: 'data-erbschein-dokument', wort: { de: 'Erbschein', en: 'certificate of inheritance' } },
});
const NAME = Object.freeze({ de: 'Zugang zum Recht', en: 'Access to Justice' });
const sprache = (slug) => (slug.endsWith('-en') ? 'en' : 'de');
const enthaelt = (text, wort) => String(text || '').toLowerCase().includes(String(wort).toLowerCase());

const gebaut = new Map();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-zugang-auffindbar-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));
function produktKern(slug) {
  if (!gebaut.has(slug)) {
    const p = PRODUKTE.find((x) => x.slug === slug);
    const r = konfektionieren({
      ziel: path.join(TMP, slug), slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
      unsignierteModulDateien: modulDateienFuer(p),
    });
    gebaut.set(slug, path.join(r.ordner, 'vivodepot.html'));
  }
  return require(LOAD_KERN).ladeKern({ htmlPfad: gebaut.get(slug) });
}
const knopfText = (html, attr) => { const m = new RegExp('<button[^>]*\\b' + attr + '\\b[^>]*>([^<]*)</button>').exec(html); return m ? m[1].trim() : null; };
const vorlagenTreffer = (V, wort) => V._sucheTreffer(wort).filter((t) => t.quelle === 'vorlage');

for (const { slug } of PRODUKTE) {
  const s = sprache(slug);

  test('[Zugang zum Recht·auffindbar·' + slug + '] die Suche findet beide Vorlagen unter dem Namen und jede unter ihrem Wort', async () => {
    const { V } = produktKern(slug);
    await V.depotAnlegen('zugang-auffindbar-probe');
    const unterNamen = vorlagenTreffer(V, NAME[s]);
    assert.equal(unterNamen.length, 2, 'unter „' + NAME[s] + '“ stehen beide Vorlagen; gefunden: ' + V._sucheTreffer(NAME[s]).map((t) => t.label + ' [' + t.quelle + ']').join(' | '));
    for (const [id, v] of Object.entries(VORLAGEN)) {
      const treffer = vorlagenTreffer(V, v.wort[s]);
      assert.equal(treffer.length, 1, id + ': genau ein Vorlagen-Treffer für „' + v.wort[s] + '“; gefunden: ' + V._sucheTreffer(v.wort[s]).map((t) => t.label + ' [' + t.quelle + ']').join(' | '));
      assert.ok(enthaelt(treffer[0].label, v.wort[s]), id + ': der Treffer heißt nach dem Auszug: ' + treffer[0].label);
      assert.equal(typeof treffer[0].ziel, 'function', id + ': der Treffer führt irgendwohin');
    }
    assert.deepEqual(vorlagenTreffer(V, 'kein-wort-das-es-gibt-xyz'), [], 'Negativkontrolle: ein fremdes Wort trifft keine Vorlage');
  });

  test('[Zugang zum Recht·auffindbar·' + slug + '] die Hilfe führt ein Thema mit dem Namen, das beide Auszüge nennt', async () => {
    const { V } = produktKern(slug);
    const themen = V.hilfeUebersichtModell().filter((t) => enthaelt(t.titel, NAME[s]));
    assert.equal(themen.length, 1, 'genau ein Hilfe-Thema trägt „' + NAME[s] + '“ im Titel; Titel: ' + V.hilfeUebersichtModell().map((t) => t.titel).join(' | '));
    const modell = V.hilfeThemaModell(themen[0].id);
    const text = [modell.einleitung].concat(modell.abschnitte).join('\n');
    for (const v of Object.values(VORLAGEN)) assert.ok(enthaelt(text, v.wort[s]), 'das Thema nennt „' + v.wort[s] + '“');
    assert.ok(enthaelt(text, 'service.justiz.de'), 'das Thema nennt den amtlichen Weg');
  });

  if (slug.startsWith('privat-')) {
    test('[Zugang zum Recht·auffindbar·' + slug + '] an beiden Karten steht der Name, und die Knöpfe sagen, was sie öffnen', async () => {
      const { V } = produktKern(slug);
      await V.depotAnlegen('zugang-auffindbar-probe');
      const texte = [];
      for (const [id, v] of Object.entries(VORLAGEN)) {
        const html = V.logikModulAuszugKartenHTML(v.sektor);
        assert.ok(html.includes(v.attr), id + ': Vorbedingung, die Karte steht im Bereich ' + v.sektor);
        assert.ok(enthaelt(html.replace(/<[^>]+>/g, ' '), NAME[s]), id + ': an der Karte steht „' + NAME[s] + '“');
        const knopf = knopfText(html, v.attr);
        assert.ok(enthaelt(knopf, v.wort[s].split(' ')[0]), id + ': der Knopf nennt, was er öffnet; er heißt „' + knopf + '“');
        texte.push(knopf);
      }
      assert.notEqual(texte[0], texte[1], 'die zwei Knöpfe heißen nicht gleich');
    });
  }

  test('[Zugang zum Recht·auffindbar·' + slug + '·Klasse] jede Vorlage mit Karte hat einen eigenen Knopftext und einen Sucheintrag', async () => {
    const { V } = produktKern(slug);
    await V.depotAnlegen('zugang-auffindbar-probe');
    const mitKarte = V._abWerkLogikModule.map((roh) => V.logikModulPruefen(roh)).filter((g) => g.gueltig && g.logik.dokAusgabe.karte).map((g) => g.logik);
    assert.ok(mitKarte.length >= 2, 'Vorbedingung: mindestens die zwei Vorlagen tragen eine Karte');
    const eintraege = V._sucheKatalogAufbauen().filter((e) => e.quelle === 'vorlage');
    const knopftexte = mitKarte.map((l) => V.STRINGS[l.dokAusgabe.karte.knopfKennung]);
    for (const l of mitKarte) {
      assert.ok(typeof V.STRINGS[l.dokAusgabe.karte.knopfKennung] === 'string' && V.STRINGS[l.dokAusgabe.karte.knopfKennung].trim(), l.id + ': Knopftext vorhanden');
      assert.equal(eintraege.filter((e) => e.vorlage === l.id).length, 1, l.id + ': genau ein Sucheintrag');
    }
    assert.equal(new Set(knopftexte).size, knopftexte.length, 'kein Knopftext kommt zweimal vor: ' + knopftexte.join(' | '));
  });
}

test('[Zugang zum Recht·auffindbar·Gegenprobe] das Gerüst ohne Vorlagen kennt keinen Vorlagen-Treffer und keine Karte', async () => {
  const { V } = require(LOAD_KERN).ladeKern({ blank: true });
  for (const name of Object.values(NAME)) assert.deepEqual(vorlagenTreffer(V, name), [], 'die Treffer kommen von den Vorlagen des Produkts, nicht von einer festen Zeile im Gerüst');
  assert.deepEqual(V._sucheKatalogAufbauen().filter((e) => e.quelle === 'vorlage'), []);
  for (const v of Object.values(VORLAGEN)) assert.equal(V.logikModulAuszugKartenHTML(v.sektor), '', 'ohne Vorlage keine Karte in ' + v.sektor);
});
