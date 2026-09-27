'use strict';
/* Befund-Ratsche LISTEN-UNTERFELD-ABFLUSS (26.09.2026, HOCH): an einem Listen-Unterfeld entschied die Sensibel-Prüfung über den
   blanken Unterfeld-Namen (`fdef.id`), die Entscheidung der Person steht aber unter dem Listen-Selektor
   `liste:<liste>:<eintrag>:<unterfeld>` — dort schreibt sie der Freigabe-Dialog (`exportAuswahlEphemerAnwenden`), dort liest sie
   `unterfeldIstSensibel`. Zwei Richtungen, beide gemessen am Kanon a0e64bc6b:
     - ABFLUSS: ein Unterfeld, das die Person abwählt oder selbst als sensibel markiert, ging trotzdem hinaus
       (Bevollmächtigte der Vorsorgevollmacht in der Antwort auf eine Anfrage);
     - Funktionsausfall: ein ausdrücklich freigegebenes, schema-geschütztes Unterfeld ging nie mit
       (Gesundheitssorge der Vollmacht, Ablageorte) — Befund ANFRAGE-FREIGABE-LISTEN-UNTERFELD.
   Die Klasse, gehalten an ALLEN Listen-Unterfeldern des Katalogs: jedes als sensibel markierte Unterfeld fehlt in
   `zusammenstellungDatensatz` und `anlassDatensatz` (beide über `_datensatzAusEintraegen`), jedes freigegebene bleibt drin.
   Ohne Werte gemessen: die Sensibel-Prüfung läuft VOR der Wert-Prüfung — zurückgehalten zählt als `zurueckgehalten.sensibel`,
   nicht zurückgehalten steht mangels Wert unter `fehlend`. Dazu der Freigabe-Dialog am echten Weg, mit Werten. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { _standardProduktBaken } = require('./load-kern.js');
const S = require('../tools/vorfuehrung-showcase-erzeugen.js');

let _V = null;
function kern() {
  if (_V) return _V;
  _V = S._kernAusProdukt(_standardProduktBaken(fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8')));
  return _V;
}
function leeresDepot() {
  const V = kern();
  V.vorschauDepotErzeugen();
  V.akteurSelbstErklaeren('Erna Mustermann');
  return V;
}

// Jedes Listen-Unterfeld des Katalogs als Kennung. Eine Liste mit Instrument-Zeilen trägt je Instrument eine eigene Kennung.
function alleListenUnterfelder(V) {
  const raus = [];
  for (const s of V.bereicheAlle()) for (const sek of s.sektionen || []) for (const f of sek.felder || []) {
    if (f.typ !== 'liste' || !Array.isArray(f.unterFelder)) continue;
    const art = f.unterFelder.find((u) => u.id === 'instrument');
    const typen = art && Array.isArray(art.optionen) ? art.optionen.map((o) => (o && typeof o === 'object' ? o.wert : o)).filter(Boolean) : ['*'];
    for (const typ of typen) for (const u of f.unterFelder) {
      if (u.id === 'instrument') continue;
      const kennung = V.kennungAusSelektor(s.id, 'liste:' + f.id + ':' + typ + ':' + u.id);
      if (!kennung) continue;
      const sel = V.kennungZuSelektor(kennung);
      if (!sel || !V.kennungFeldDef(kennung)) continue;
      raus.push({ kennung, sel, schemaSensibel: !!u.sensibel });
    }
  }
  return raus;
}
function entscheidung(V, kennung) {
  const ds = V.zusammenstellungDatensatz([kennung], { id: 'probe', titel: 'Probe' });
  if (!ds) return 'ungueltig';
  if (ds.felder.concat(ds.fehlend).some((e) => e.kennung === kennung)) return 'mit';
  return (ds.zurueckgehalten && ds.zurueckgehalten.sensibel) ? 'zurueck' : 'weg';
}

test('[Listen-Unterfeld·Klasse] jedes als sensibel markierte Listen-Unterfeld bleibt in zusammenstellungDatensatz zurück', () => {
  const V = leeresDepot();
  const alle = alleListenUnterfelder(V);
  assert.ok(alle.length >= 150, 'Listen-Unterfelder des Katalogs gefunden: ' + alle.length);
  const abfluss = [];
  for (const { kennung, sel } of alle) {
    V.getData().sensibelFelder = {};
    V.sensibelFeldSetzen(sel.sektorId, sel.feldId, true);
    if (entscheidung(V, kennung) === 'mit') abfluss.push(kennung);
  }
  V.getData().sensibelFelder = {};
  assert.deepEqual(abfluss.slice(0, 5), [], abfluss.length + ' von ' + alle.length + ' markierten Unterfeldern gehen trotzdem hinaus');
});

test('[Listen-Unterfeld·Klasse·Gegenprobe] jedes ausdrücklich freigegebene Listen-Unterfeld geht in zusammenstellungDatensatz mit', () => {
  const V = leeresDepot();
  const alle = alleListenUnterfelder(V);
  const gesperrt = [];
  for (const { kennung, sel } of alle) {
    V.getData().sensibelFelder = {};
    V.sensibelFeldSetzen(sel.sektorId, sel.feldId, false);
    if (entscheidung(V, kennung) !== 'mit') gesperrt.push(kennung);
  }
  V.getData().sensibelFelder = {};
  assert.deepEqual(gesperrt.slice(0, 5), [], gesperrt.length + ' von ' + alle.length + ' freigegebenen Unterfeldern bleiben trotzdem zurück');
});

test('[Listen-Unterfeld·Klasse·Anlass] anlassDatensatz: jedes Listen-Unterfeld eines Anlasses folgt der Entscheidung der Person', () => {
  const V = leeresDepot();
  let geprueft = 0;
  const falsch = [];
  for (const a of V.anlaesseAlle()) {
    for (const e of V.anlassEintraege(a.id)) {
      if (typeof e.feld !== 'string' || e.feld.indexOf('liste:') !== 0) continue;
      const kennung = V.kennungAusSelektor(e.quelle, e.feld);
      if (!kennung) continue;
      geprueft++;
      for (const an of [true, false]) {
        V.getData().sensibelFelder = {};
        V.sensibelFeldSetzen(e.quelle, e.feld, an);
        const ds = V.anlassDatensatz(a.id);
        const drin = !!ds && ds.felder.concat(ds.fehlend).some((x) => x.feld === e.feld && x.bereich === e.quelle);
        if (drin === an) falsch.push(a.id + ' ' + kennung + (an ? ' markiert, aber drin' : ' freigegeben, aber zurück'));
      }
    }
  }
  V.getData().sensibelFelder = {};
  assert.ok(geprueft > 0, 'Anlässe mit Listen-Unterfeldern gefunden');
  assert.deepEqual(falsch.slice(0, 5), [], falsch.length + ' falsche Entscheidungen');
});

/* Zwei weitere Aufrufer derselben Form — `feldIstSensibel` am blanken Unterfeld-Namen — sind heute NICHT erreichbar und bleiben
   in dieser Fassung unberührt (Auftrag: kein Kern-Umbau über die zwei Stellen hinaus). Die Wachen halten fest, WARUM sie nicht
   erreichbar sind; fällt eine, ist es ein Abfluss:
   - die Situationsblatt-Ausgabe (Querverweis `{quelle, feld: 'liste:…'}`) hält am blanken Namen nur dann sicher zurück, wenn
     jedes so verwiesene Unterfeld schema-sensibel ist — ein nicht schema-sensibles, das die Person selbst markiert, ginge hinaus;
   - der Vollexport filtert die Metadaten `feldGueltigkeit`/`ausdruecklichKeine` am blanken Namen — sicher nur, solange die
     Anwendung dort nie unter einem Listen-Selektor schreibt. */
test('[Listen-Unterfeld·Wache·Situationsblatt] jedes Listen-Unterfeld, auf das ein Blatt verweist, ist schema-sensibel', () => {
  const V = kern();
  const funde = [];
  const tief = (o) => {
    if (Array.isArray(o)) { o.forEach(tief); return; }
    if (!o || typeof o !== 'object') return;
    if (typeof o.feld === 'string' && o.feld.indexOf('liste:') === 0 && typeof o.quelle === 'string') {
      const d = V.feldDefFuer(o.quelle, o.feld);
      if (!d || !d.sensibel) funde.push(o.quelle + ' ' + o.feld);
    }
    for (const v of Object.values(o)) tief(v);
  };
  tief(V.SITUATIONEN);
  assert.deepEqual(funde, [], 'ein Blatt verweist auf ein nicht schema-sensibles Listen-Unterfeld — die Blatt-Ausgabe prüft am blanken Namen und gäbe es trotz Markierung heraus');
});

test('[Listen-Unterfeld·Wache·Vollexport] Gültigkeit und „ausdrücklich keine" werden nie unter einem Listen-Selektor geschrieben', () => {
  const V = kern();
  const kern_ = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  assert.ok(V.AUSDRUECKLICH_KEINE_FELDER && Object.keys(V.AUSDRUECKLICH_KEINE_FELDER).length, 'AUSDRUECKLICH_KEINE_FELDER ist erreichbar — sonst prüfte die Schleife nichts');
  for (const [sektor, liste] of Object.entries(V.AUSDRUECKLICH_KEINE_FELDER)) {
    for (const f of liste) assert.ok(String(f).indexOf('liste:') !== 0, 'ausdrücklich keine an einem Listen-Unterfeld: ' + sektor + ' ' + f);
  }
  const aufrufe = kern_.match(/feldGueltigkeitZeileHTML\([^)]*\)/g) || [];
  assert.ok(aufrufe.length >= 2, 'Aufrufe gefunden');
  for (const a of aufrufe) {
    if (/^feldGueltigkeitZeileHTML\(sektorId, feldId, feld, darf, schreibwegVerdrahtet\)$/.test(a)) continue;   // die Deklaration
    assert.match(a, /^feldGueltigkeitZeileHTML\(sektorId, feld\.id,/, 'die Gültigkeitszeile wird mit etwas anderem als der Bereichsfeld-id gebaut: ' + a);
  }
});

// Der Weg, auf dem es gefunden wurde: der Freigabe-Dialog einer Anfrage, mit Werten.
const EPA = 'advanceCare.provisionInstruments[enduring-power-of-attorney].';
const ANFRAGE = {
  modulTyp: 'anfrage', anfrageVersion: 1, von: 'Probe-Klinik', zweck: 'Probe', grundlage: 'Probe', vorgang: 'P-1',
  gestelltAm: '2026-09-26', gueltigBis: '2027-12-31',
  felder: [
    { kennung: 'identity.givenName', zweck: 'Zuordnung', pflicht: true },
    { kennung: EPA + 'authorizedPersons', zweck: 'Wer ist bevollmächtigt?', pflicht: true },
    { kennung: EPA + 'healthCareGeneralDecision', zweck: 'Gesundheitssorge?', pflicht: true },
    { kennung: EPA + 'storageLocation', zweck: 'Wo liegt die Vollmacht?', pflicht: true },
  ],
  antwort: { art: 'einmalpasswort', an: 'probe@example.de' },
};
async function antwortUeberDenDialog(nimmHeraus) {
  const V = kern();
  S.showcaseNutzlastErzeugen({ V, daten: { format: 'showcaseDepot/1', owner: 'Erna Mustermann',
    people: [{ key: 'kai', name: 'Kai Mustermann', beziehung: 'Sohn' }], fields: { 'identity.givenName': 'Erna' },
    lists: { 'advanceCare.provisionInstruments': [{ instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge',
      authorizedPersons: [{ person: 'kai' }], healthCareGeneralDecision: 'ja', storageLocation: 'Ordner Vorsorge' }] } } });
  const m = V.exportUebersichtModell(null, undefined, ANFRAGE.felder.map((f) => f.kennung));
  const kandidaten = m.enthalten.concat(m.zurueckgehalten);
  let ds = null;
  await V.exportAuswahlEphemerAnwenden(kandidaten, new Set(kandidaten.filter((e) => !nimmHeraus.includes(e.kennung)).map((e) => e.sektor + '/' + e.feld)),
    (o) => { ds = V.anfrageAntwortDatensatz(ANFRAGE, o); });
  return ds;
}
const drin = (ds, k) => ds.felder.some((f) => f.kennung === k);

test('[Listen-Unterfeld·Dialog·Abfluss] im Freigabe-Dialog abgewählt: die Bevollmächtigten gehen nicht hinaus', async () => {
  const ds = await antwortUeberDenDialog([EPA + 'authorizedPersons']);
  assert.ok(!drin(ds, EPA + 'authorizedPersons'), 'abgewählt, aber in der Antwort');
  assert.ok(drin(ds, 'identity.givenName'), 'das Übrige geht mit');
});

test('[Listen-Unterfeld·Dialog·Gegenprobe] alles gewählt: auch die geschützten Unterfelder gehen mit', async () => {
  const ds = await antwortUeberDenDialog([]);
  for (const k of [EPA + 'authorizedPersons', EPA + 'healthCareGeneralDecision', EPA + 'storageLocation']) assert.ok(drin(ds, k), 'gewählt, aber nicht in der Antwort: ' + k);
});
