'use strict';
/* ════════════════════════════════════════════════════════════════════════
   MIG3 (19.09.2026) — U2-ADR-187 (_bereicheVerwaisteRetten,
   _proIdentitaetUebernehmen) in die Lese-App gebracht. Angehörige müssen
   denselben geretteten Bereich sehen wie der Kern: dasselbe alte Depot
   durch beide gefahren, gleiche Bereiche in `sektoren`.

   WEG: GENERIERT (tools/build-kennung-mapping-region.js, neue Region
   BEREICHE-VERWAISTE-RETTEN-LESEN), keine Handkopie — derselbe Anker-Schnitt
   wie beim bereits bestehenden KENNUNG-MAPPING-LESEN-Umschreib-Code, mit
   eigenem Drift-Wächter (s. `[MIG3·Drift]` unten). Eine Namens-Anpassung
   dokumentiert (bereichsModulPruefen → bereichsModulPruefenLesen).

   ABWEICHUNG IM ADR-TEXT, NICHT NUR HIER: `_bereicheVerwaisteRetten`s
   Vorrang-Fall „Bürgerin war schneller — nicht überschreiben" beschreibt
   laufende, konkurrierende Bearbeitung — die es in einer read-only Lese-App
   per Definition nicht gibt (eine Sitzung, ein Laderaum, kein Schreibweg).
   Der Code bleibt unverändert (der Zweig trifft hier nie zwei
   widersprüchliche Werte an), nur das Szenario tritt nie ein. Die Rettung
   wird bei jedem Öffnen neu berechnet, nie zurückgeschrieben — anders als im
   Kern, wo ein nachfolgendes Sichern sie dauerhaft macht. Dieselbe Notiz
   steht im generierten Kommentar der Lese-App-Region und sollte in
   docs/adr/vivodepot-U2-ADR-187*.md nachgezogen werden (dort noch nicht
   nachgetragen — ADR-Text-Pflege ist Sache der ADR-Verwaltung, nicht dieser
   Testdatei).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const buildTool = require('../tools/build-kennung-mapping-region.js');

function frischeLesenInstanz() {
  delete require.cache[require.resolve('./load-lesen.js')];
  const x = require('./load-lesen.js').ladeLesen();
  return x.V || x;
}

function jeBereichEinFeld(V) {
  const out = {};
  for (const z of V.KENNUNG_MAPPING) {
    if (z.istUnterfeld || out[z.bereichAlt]) continue;
    out[z.bereichAlt] = { bereichNeu: z.bereichNeu, feldAlt: z.kennungAlt.slice(z.bereichAlt.length + 1),
      feldNeu: z.kennungNeu.slice(z.bereichNeu.length + 1) };
  }
  return out;
}

function gleich(lesen, kern, meldung) {
  assert.deepEqual(JSON.parse(JSON.stringify(lesen === undefined ? null : lesen)),
    JSON.parse(JSON.stringify(kern === undefined ? null : kern)), meldung);
}

test('[MIG3·Drift] die generierte BEREICHE-VERWAISTE-RETTEN-LESEN-Region ist aus dem Kern erzeugt — kein Drift', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const lese = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');
  const region = buildTool.aktuelleRegion(lese, buildTool.VERWAISTE_BEGIN, buildTool.VERWAISTE_END);
  assert.ok(region, 'Marker-Paar BEREICHE-VERWAISTE-RETTEN-LESEN fehlt in vivodepot-lesen.html');
  const erwartet = buildTool.generiereVerwaisteRegion(html);
  assert.equal(region.inhalt, erwartet,
    'Drift: die Lese-App-Region weicht vom Kern-Code ab — node tools/build-kennung-mapping-region.js ausführen');
});

test('[MIG3] bereicheVerwaist: Lese-App = Kern — dieselbe Rettung nach sektoren, in JEDEM Bereich', () => {
  const V = ladeKern().V;
  const L = frischeLesenInstanz();
  const je = jeBereichEinFeld(V);
  const bauen = () => { const d = { schemaVersion: 80, bereicheVerwaist: {} };
    for (const [b, def] of Object.entries(je)) d.bereicheVerwaist[b] = { [def.feldAlt]: 'wert-' + b }; return d; };
  const kern = bauen(); V.depotNormalisieren(kern);
  const lesen = bauen(); L._foldVollmachtenLesen(lesen);

  assert.deepEqual(kern.bereicheVerwaist, {}, 'Vorbedingung Kern: jeder Bereich ist wieder erkannt');
  gleich(lesen.bereicheVerwaist, kern.bereicheVerwaist, 'bereicheVerwaist: Lese-App weicht vom Kern ab');
  gleich(lesen.sektoren, kern.sektoren, 'gerettete sektoren: Lese-App weicht vom Kern ab');
  for (const [b, def] of Object.entries(je)) {
    assert.equal((lesen.sektoren[def.bereichNeu] || {})[def.feldNeu], 'wert-' + b,
      'sektoren.' + def.bereichNeu + ': Angehörige sehen den geretteten Wert nicht');
  }
});

test('[MIG3] feldDefinitionenVerwaist[]: Lese-App = Kern — dieselbe Rettung nach feldDefinitionen', () => {
  const V = ladeKern().V;
  const L = frischeLesenInstanz();
  const je = jeBereichEinFeld(V);
  const bauen = () => ({ schemaVersion: 80, feldDefinitionenVerwaist: Object.keys(je).map((b, i) => ({ sektorId: b, feldId: 'f' + i, typ: 'text', label: 'X' })) });
  const kern = bauen(); V.depotNormalisieren(kern);
  const lesen = bauen(); L._foldVollmachtenLesen(lesen);

  assert.equal(kern.feldDefinitionenVerwaist.length, 0, 'Vorbedingung Kern: alle 13 sind gerettet');
  gleich(lesen.feldDefinitionenVerwaist, kern.feldDefinitionenVerwaist, 'feldDefinitionenVerwaist: Lese-App weicht vom Kern ab');
  gleich(lesen.feldDefinitionen, kern.feldDefinitionen, 'feldDefinitionen: Lese-App weicht vom Kern ab');
});

test('[MIG3] proIdentitaet: eine alte Pro-Datei zeigt Telefon/E-Mail in identity, wie der Kern', () => {
  const V = ladeKern().V;
  const L = frischeLesenInstanz();
  const bauen = () => ({ schemaVersion: 80, sektoren: { 'pro-identitaet': { tpl_telefon: '0151 1234567', tpl_e_mail: 'a@b.example.de', notiz: 'x' } } });
  const kern = bauen(); V.depotNormalisieren(kern);
  const lesen = bauen(); L._foldVollmachtenLesen(lesen);

  assert.equal(kern.sektoren['pro-identitaet'], undefined, 'Vorbedingung Kern: pro-identitaet ist übernommen, nicht mehr vorhanden');
  assert.equal(kern.sektoren.identity.telephone, '0151 1234567');
  gleich(lesen.sektoren.identity, kern.sektoren.identity, 'sektoren.identity: Lese-App weicht vom Kern ab');
  assert.equal(lesen.sektoren['pro-identitaet'], undefined, 'Angehörige dürfen pro-identitaet nicht mehr sehen, wie der Kern');
});

test('[MIG3·Rot-Beweis] am echten Bestand: ohne die neuen Aufrufe in _foldVollmachtenLesen bleibt der Bereich verwaist', () => {
  const LESEN = path.join(__dirname, '..', 'vivodepot-lesen.html');
  const quelle = fs.readFileSync(LESEN, 'utf8');
  const marker = "  if (typeof _proIdentitaetUebernehmen === 'function') _proIdentitaetUebernehmen(obj);\n  if (typeof _bereicheVerwaisteRetten === 'function') _bereicheVerwaisteRetten(obj);\n";
  assert.equal(quelle.split(marker).length, 2, 'die beiden Aufrufzeilen stehen genau einmal — sonst trifft die Mutation nichts');
  const tmp = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'mig3-lesen-'));
  const mutant = path.join(tmp, 'vivodepot-lesen.html');
  fs.writeFileSync(mutant, quelle.replace(marker, ''));
  try {
    const vorher = process.env.LESEN_HTML_PATH;
    process.env.LESEN_HTML_PATH = mutant;
    delete require.cache[require.resolve('./load-lesen.js')];
    const L = require('./load-lesen.js').ladeLesen().V;
    if (vorher === undefined) delete process.env.LESEN_HTML_PATH; else process.env.LESEN_HTML_PATH = vorher;
    delete require.cache[require.resolve('./load-lesen.js')];
    const data = { schemaVersion: 80, bereicheVerwaist: { identitaet: { vorname: 'Anna' } } };
    L._foldVollmachtenLesen(data);
    assert.ok(data.bereicheVerwaist.identity, 'Rot-Beweis: ohne die Aufrufe bleibt der Bereich (umbenannt, aber) verwaist statt gerettet');
    assert.equal((data.sektoren && data.sektoren.identity) || undefined, undefined,
      'Rot-Beweis: ohne die Aufrufe erscheint der Wert nicht in sektoren');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
