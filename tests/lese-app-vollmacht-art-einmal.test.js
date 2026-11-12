'use strict';
/* Befund VOLLMACHT-ART-DOPPELT (03.11.2026, Bild der Lese-App): Eine Vollmacht-Zeile las „Vorsorgevollmacht · Art der Vollmacht:
   Vorsorgevollmacht“. Das Steuer-Unterfeld `instrument` nennt die Zeile ohne Beschriftung; ein Auswahl-Unterfeld, dessen gewählte
   Option dasselbe sagt, wiederholt den Titel nur. Der Kern zeigt die Zeile einmal (seine Kurzzeile kuratiert).

   WÄCHTER FÜR DIE FEHLERKLASSE: Für jedes Rezept, jedes Listenfeld mit Steuerfeld `instrument`, jede Instrument-Option und jede
   Option jedes Auswahl-Unterfelds entsteht ein Eintrag; kein beschrifteter Teil der Zeile darf als Wert genau den Titel tragen.
   Die Probe nimmt keinen Fall heraus und kennt keine Feld-Kennung.

   ROT-BEWEIS: mit `listenEintragZusammenfassung` vor dem Fix (vivodepot-lesen.html) fällt der Test bei privat-de an
   advanceCare.provisionInstruments/typeOfPowerOfAttorney. */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const L = require('../tools/lib/vier-produkte.js');
const LOAD_KERN = require.resolve('./load-kern.js');
const LOAD_LESEN = require.resolve('./load-lesen.js');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'lese-art-einmal-'));
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

/* Der echte Weg einer Datei: das Rezept wird konfektioniert, der Kern des
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

function listenfelder(V) {
  const raus = [];
  for (const s of Object.values(V.SEKTOR_BY_ID || {})) {
    for (const se of s.sektionen || []) for (const f of se.felder || []) {
      if (f.typ === 'liste' && Array.isArray(f.unterFelder) && f.unterFelder.length) raus.push({ sektor: s.id, feld: f });
    }
  }
  return raus;
}

function toreErfuellen(feld, uf, eintrag, gesehen) {
  const g = uf.sichtbarWenn;
  if (!g || typeof g !== 'object' || typeof g.feld !== 'string' || g.wert === undefined || (gesehen || new Set()).has(uf.id)) return eintrag;
  const tor = feld.unterFelder.find((u) => u.id === g.feld);
  const soll = Array.isArray(g.wert) ? g.wert : [g.wert];
  if (!soll.includes(eintrag[g.feld])) eintrag[g.feld] = soll[0];
  if (tor) toreErfuellen(feld, tor, eintrag, new Set([...(gesehen || []), uf.id]));
  return eintrag;
}

// Unbedingt angemeldet (tests/haken-ohne-unbedingten-test.test.js): after() oben braucht einen Test außerhalb der Schleife.
test('[VOLLMACHT-ART-DOPPELT·Vorbedingung] die Produktliste ist nicht leer', () => {
  assert.ok(L.PRODUKTE.length > 0, 'keine Produkte — die Schleife unten legte keinen Test an');
});

for (const produkt of L.PRODUKTE) {
  test('[VOLLMACHT-ART-DOPPELT] ' + produkt.slug + ': kein beschrifteter Teil einer Listenzeile wiederholt den Titel aus `instrument`', () => {
    const { V } = lesenFuer(produkt);
    const doppelt = [];
    let geprueft = 0;
    for (const { sektor, feld } of listenfelder(V)) {
      const steuer = feld.unterFelder.find((u) => u.id === 'instrument' && Array.isArray(u.optionen) && u.optionen.length);
      if (!steuer) continue;
      for (const io of steuer.optionen) {
        for (const uf of feld.unterFelder) {
          if (uf === steuer || uf.typ !== 'auswahl' || !Array.isArray(uf.optionen)) continue;
          for (const o of uf.optionen) {
            const eintrag = toreErfuellen(feld, uf, { instrument: io.wert });
            if (eintrag.instrument !== io.wert) continue;          // das Tor verlangt ein anderes Instrument
            eintrag[uf.id] = o.wert;
            const zeile = V.listenEintragZusammenfassung(feld, eintrag, sektor);
            const teile = zeile.split(' · ');
            const titel = teile[0];
            if (!titel || titel.includes(': ')) continue;
            geprueft++;
            const wiederholt = teile.slice(1).filter((t) => t.includes(': ') && t.slice(t.indexOf(': ') + 2) === titel);
            if (wiederholt.length) doppelt.push(sektor + '.' + feld.id + '/' + uf.id + '=' + o.wert + ': ' + zeile);
          }
        }
      }
    }
    assert.ok(geprueft > 0, produkt.slug + ': keine Instrument-Zeile geprüft — Messweg kaputt?');
    assert.deepEqual(doppelt, [], produkt.slug + ': Zeilen, die ihren Titel wiederholen');
  });
}
