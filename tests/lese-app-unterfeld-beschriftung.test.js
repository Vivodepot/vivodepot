'use strict';
/* Befund LESE-APP-UNTERFELD-OHNE-BESCHRIFTUNG (MITTEL, 02.10.2026): Die Lese-App zeigte die Einträge eines Listenfelds ohne die
   Beschriftungen ihrer Unterfelder („Beispielbank · Frau Muster“ statt „Institut: Beispielbank · Vollmacht-Inhaber: Frau Muster“).
   Nur ja/nein-Auswahl und Datum trugen sie. Die Lese-App hat keine Detailansicht; ihre Zeile ist die einzige Sicht auf den Eintrag.

   WÄCHTER FÜR ALLE LISTENFELDER, ÜBER ALLE REZEPTE: Jedes Produkt aus `tools/lib/vier-produkte.js` (PRODUKTE) wird mit seinen
   Modulen in die Lese-App gegeben, kein fester Satz von Produkten. Kommt ein Rezept dazu, ist es ohne Nacharbeit dabei; kommt ein
   Listenfeld dazu, ebenso. Je Listenfeld und Unterfeld entsteht ein Eintrag, in dem genau dieses Unterfeld gefüllt ist (ein
   Steuerfeld `instrument` behält seine erste Option, sonst bliebe die Zeile leer). Erscheint dazu Text in der Zeile, muss die
   Beschriftung des Unterfelds davorstehen. Sensible und zurückgenommene Unterfelder erscheinen gar nicht, sie prüft die Gegenprobe.

   ROT-BEWEIS: mit `listenEintragZusammenfassung` vor dem Fix (Beschriftung nur bei ja/nein und Datum) fällt der erste Test bei
   jedem Rezept, der zweite wörtlich am Fall aus dem Befund. */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const L = require('../tools/lib/vier-produkte.js');
const LOAD_KERN = require.resolve('./load-kern.js');
const LOAD_LESEN = require.resolve('./load-lesen.js');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'lese-unterfeld-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

/* Der echte Weg einer Datei: das Rezept wird konfektioniert (wie tests/angedockte-feldtexte-folgen-der-sprache.test.js), der Kern des
   Produkts schreibt seine Mitschrift ins Depot (`_abWerkStrukturInsDepot`), die Lese-App liest dieses Depot. So kommen Bereiche und
   Beschriftungen aus der Datei, wie bei der Empfängerin, nicht aus einer Auswahl der Probe. */
function kernFuer(produkt) {
  const r = konfektionieren({
    ziel: path.join(TMP, produkt.slug), slug: produkt.slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien: L.modulDateienFuer(produkt),
  });
  const vorher = process.env.KERN_HTML_PATH;
  process.env.KERN_HTML_PATH = path.join(r.ordner, 'vivodepot.html');
  delete require.cache[LOAD_KERN];
  try { return require(LOAD_KERN).ladeKern({ blank: true }).V; } finally {   // die umgelenkte Datei ist schon das konfektionierte Produkt — so laden, wie sie ist
    if (vorher === undefined) delete process.env.KERN_HTML_PATH; else process.env.KERN_HTML_PATH = vorher;
    delete require.cache[LOAD_KERN];
  }
}

function lesenFuer(produkt) {
  const K = kernFuer(produkt);
  const d = K.leeresDepot();
  K._abWerkStrukturInsDepot(d);
  if (produkt.sprache !== 'de') d.textsprache = produkt.sprache;
  const kopie = JSON.parse(JSON.stringify(d));
  kopie.sektoren = kopie.sektoren || {};
  kopie.menschen = [{ id: 'p1', vorname: 'Frieda', nachname: 'Muster' }];
  delete require.cache[LOAD_LESEN];
  const V = require(LOAD_LESEN).ladeLesen().V;
  V.setData(kopie);
  V._textsatzModuleAusDepotAnmelden(V.getData());
  V._bereichsModuleAusDepotAnmeldenLesen(V.getData());
  // Kein stiller Ausfall: jeder Bereich, den der Kern des Rezepts führt, muss in der Lese-App angekommen sein.
  const fehlen = K.bereicheAlle().map((b) => b.id).filter((id) => !(V.SEKTOR_BY_ID && V.SEKTOR_BY_ID[id]));
  assert.deepEqual(fehlen, [], produkt.slug + ': Bereiche des Rezepts nicht in der Lese-App angemeldet');
  return { V, K, d: V.getData() };
}

/* Benannte Ausnahmen von der Gleichheit Kern = Lese-App, je mit Grund. Keine allgemeine Lockerung: Eine kuratierte Liste
   (`zusammenfassungFelder` oder `unterdrueckeInZusammenfassungWennGesetzt`), die hier NICHT steht, lässt den Test fallen; ein
   Eintrag, den es nicht mehr gibt, ebenso. */
const PARITAET_AUSNAHMEN = Object.freeze({
  'advanceCare.provisionInstruments': 'U2-ADR-089 „sprechende Zeile“: Der Kern kürzt die Instrument-Zeile, daneben steht die Detailansicht; die Lese-App hat keine und zeigt alle Unterfelder beschriftet.',
});

function beispielWert(uf) {
  if (uf.typ === 'checkbox') return true;
  if (uf.typ === 'datum') return '2026-03-14';
  if (uf.typ === 'ref') return { ref: 'p1' };
  if (uf.typ === 'refMehrfach') return [{ ref: 'p1' }];
  if (Array.isArray(uf.optionen) && uf.optionen.length) return uf.typ === 'mehrfachauswahl' ? [uf.optionen[0].wert] : uf.optionen[0].wert;
  return 'Probewert ' + uf.id;
}

function listenfelder(V) {
  const raus = [];
  for (const s of Object.values(V.SEKTOR_BY_ID || {})) {
    for (const se of s.sektionen || []) for (const f of se.felder || []) {
      if (f.typ === 'liste' && Array.isArray(f.unterFelder) && f.unterFelder.length) raus.push({ sektor: s.id, feld: f });
    }
  }
  return raus;
}

for (const produkt of L.PRODUKTE) {
  test('[LESE-APP-UNTERFELD-OHNE-BESCHRIFTUNG] ' + produkt.slug + ': jedes angezeigte Unterfeld eines Listeneintrags trägt seine Beschriftung', () => {
    const { V, K } = lesenFuer(produkt);
    const felder = listenfelder(V);
    const kernFeld = (sektor, id) => { const s = K.SEKTOR_BY_ID && K.SEKTOR_BY_ID[sektor]; return s && (s.sektionen || []).flatMap((x) => x.felder || []).find((f) => f.id === id); };
    assert.ok(felder.length > 0, produkt.slug + ': keine Listenfelder gefunden — Messweg kaputt?');
    const fehlt = [];
    const kuratierteGesehen = new Set();
    let geprueft = 0;
    // Die Beschriftung kommt aus dem Sprachmodul des Rezepts: Ein englisches Produkt darf nicht auf die deutsche Definition zurückfallen.
    const texte = JSON.parse(fs.readFileSync(produkt.sprachModulPfad, 'utf8')).texte || {};
    for (const { sektor, feld } of felder) {
      const steuer = feld.unterFelder.find((u) => u.id === 'instrument' && Array.isArray(u.optionen) && u.optionen.length);
      for (const uf of feld.unterFelder) {
        if (uf === steuer) continue;
        const eintrag = {};
        if (steuer) eintrag[steuer.id] = steuer.optionen[0].wert;
        eintrag[uf.id] = beispielWert(uf);
        const ohneDieses = steuer ? V.listenEintragZusammenfassung(feld, { [steuer.id]: steuer.optionen[0].wert }, sektor) : '';
        const zeile = V.listenEintragZusammenfassung(feld, eintrag, sektor);
        if (!zeile || zeile === ohneDieses) continue;          // sensibel, zurückgenommen oder ohne Anzeige: nichts zu prüfen
        const beschriftung = V._unterfeldLabelLesen(sektor, feld.id, uf);
        if (!beschriftung) continue;                            // ohne Beschriftung in Textsatz und Definition steht der Wert allein
        geprueft++;
        if (!zeile.includes(beschriftung)) fehlt.push(sektor + '.' + feld.id + '/' + uf.id + ' („' + beschriftung + '“): ' + zeile);
        // Kern und Lese-App gleich, wo der Kern nicht bewusst kürzt (zusammenfassungFelder/unterdrueckeInZusammenfassungWennGesetzt; s. tests/lese-zusammenfassung-vollstaendig.test.js).
        const kf = kernFeld(sektor, feld.id);
        const kuratiert = kf && (Array.isArray(kf.zusammenfassungFelder) || (kf.unterFelder || []).some((u) => u.unterdrueckeInZusammenfassungWennGesetzt));
        if (kuratiert) { kuratierteGesehen.add(sektor + '.' + feld.id); if (!PARITAET_AUSNAHMEN[sektor + '.' + feld.id]) fehlt.push(sektor + '.' + feld.id + ': kuratierte Liste ohne benannte Ausnahme in PARITAET_AUSNAHMEN'); }
        if (kf && !PARITAET_AUSNAHMEN[sektor + '.' + feld.id]) {
          const kz = K.listenEintragZusammenfassung(kf, eintrag, { sektorId: sektor });
          if (kz !== zeile) fehlt.push(sektor + '.' + feld.id + '/' + uf.id + ': Kern „' + kz + '“ / Lese-App „' + zeile + '“');
        }
        const soll = texte[sektor + '.' + feld.id + '/' + uf.id + '.label'];
        if (typeof soll === 'string' && soll.trim() && beschriftung !== soll) fehlt.push(sektor + '.' + feld.id + '/' + uf.id + ': „' + beschriftung + '“ statt „' + soll + '“ aus dem Sprachmodul');
      }
    }
    assert.ok(geprueft > 0, produkt.slug + ': kein Unterfeld geprüft — Messweg kaputt?');
    // Nur, wo das Rezept die Liste führt (Pro ersetzt z. B. die Vorsorge): da, aber nicht mehr kuratiert, heißt veraltet.
    const veraltet = Object.keys(PARITAET_AUSNAHMEN).filter((k) => { const [s, id] = k.split('.'); return kernFeld(s, id) && !kuratierteGesehen.has(k); });
    assert.deepEqual(veraltet, [], produkt.slug + ': Ausnahme ohne kuratierte Liste — Eintrag entfernen');
    assert.deepEqual(fehlt.slice(0, 15), [], produkt.slug + ': ' + fehlt.length + ' Unterfelder ohne Beschriftung (erste 15)');
  });
}

test('[LESE-APP-UNTERFELD-OHNE-BESCHRIFTUNG] der Fall aus dem Befund wörtlich: pro-de, Bankverbindung', () => {
  const produkt = L.PRODUKTE.find((p) => p.slug === 'pro-de');
  const { V, d } = lesenFuer(produkt);
  d.sektoren['pro-finanzen-verbindlichkeiten'] = { tpl_bankverbindung: [{ tpl_institut: 'Beispielbank', tpl_vollmacht_inhaber: 'Frau Muster', tpl_gilt_ueber_den_tod_hinaus: true }] };
  const html = V.sektorHTML('pro-finanzen-verbindlichkeiten');
  const sek = 'pro-finanzen-verbindlichkeiten', feld = 'tpl_bankverbindung';
  const def = V.SEKTOR_BY_ID[sek].sektionen.flatMap((s) => s.felder).find((f) => f.id === feld);
  const label = (id) => V._unterfeldLabelLesen(sek, feld, def.unterFelder.find((u) => u.id === id));
  assert.ok(html.includes(V.escapeHTML(label('tpl_institut') + ': Beispielbank')), 'Institut mit Beschriftung');
  assert.ok(html.includes(V.escapeHTML(label('tpl_vollmacht_inhaber') + ': Frau Muster')), 'Vollmacht-Inhaber mit Beschriftung');
  assert.ok(html.includes(V.escapeHTML(label('tpl_gilt_ueber_den_tod_hinaus'))), 'das Häkchen steht als Beschriftung');
  assert.ok(!/(^|[\s·>])true([\s·<]|$)/.test(html), 'kein rohes „true“');
});

test('[LESE-APP-UNTERFELD-OHNE-BESCHRIFTUNG] Gegenprobe: ein sensibles Unterfeld erscheint weiter nicht', () => {
  const { V } = lesenFuer(L.PRODUKTE.find((p) => p.slug === 'privat-de'));
  let gefunden = 0;
  for (const { sektor, feld } of listenfelder(V)) {
    for (const uf of feld.unterFelder) {
      if (!V.unterfeldIstSensibel(sektor, feld.id, {}, uf)) continue;
      gefunden++;
      const zeile = V.listenEintragZusammenfassung(feld, { [uf.id]: 'GEHEIM-' + uf.id }, sektor);
      assert.ok(!zeile.includes('GEHEIM-'), sektor + '.' + feld.id + '/' + uf.id + ' darf nicht erscheinen: ' + zeile);
    }
  }
  assert.ok(gefunden > 0, 'kein sensibles Unterfeld gefunden — Gegenprobe ohne Gegenstand');
});
