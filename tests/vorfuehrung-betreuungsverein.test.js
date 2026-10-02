'use strict';
/* ═════════════════════════════════════════════════════════════════
   Vorführung „Betreuungsverein“ (01.10.2026): die Quellen liegen im Repo, und was die Stationen sagen, kann das Produkt
   ─────────────────────────────────────────────────────────────────
   Die Demo stand bis v792 nur als gebackene Datei auf der Website; ihre Quellen lagen nirgends (Befund DEMO-QUELLEN-FEHLEN). Sie
   sind aus der Datei zurückgewonnen und nach tools/vorfuehrung/betreuungsverein/ überführt. Die Notfall-Station sagt, die
   Notfallkarte zeige, wen man anruft und wo die Vollmacht liegt — seit v845 kann sie das; diese Probe hält es fest.
   Gebaut auf dem erzeugten Produkt privat-de, nie auf dem blanken Kern.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const WERKZEUG = require('../tools/vorfuehrung-showcase-erzeugen.js');
const PRODUKT = require('./produkt-html-erzeugen.js');

const ORDNER = path.join(__dirname, '..', 'tools', 'vorfuehrung', 'betreuungsverein');
const DEPOT = JSON.parse(fs.readFileSync(path.join(ORDNER, 'showcase-depot.json'), 'utf8'));
const SZENEN = JSON.parse(fs.readFileSync(path.join(ORDNER, 'showcase-szenen.json'), 'utf8'));
const V_PRODUKT = () => PRODUKT.kernAus(PRODUKT.produktHtml('privat-de')).V;

test('[Betreuungsverein·Quellen] Depot und Stationen bestehen den Erzeuger: jedes Feld kennt der Kern, jede Station hat Text und Notiz-Texte', () => {
  const n = WERKZEUG.vorfuehrungNutzlastErzeugen({ sprache: 'de', daten: DEPOT, szenen: SZENEN, V: V_PRODUKT(), dokumentOrdner: ORDNER });
  assert.equal(n.stationen.length, SZENEN.stationen.length);
  assert.ok(n.texte.notizLabel && n.texte.mehr && n.texte.weniger, 'die Notiz spricht Deutsch');
  assert.equal(SZENEN.noindex, true, 'die Demo-Datei trägt noindex');
});

test('[Betreuungsverein·Notfall] die Notfallkarte zeigt für Gerda, wen man anruft und wo die Vollmacht liegt (Station „notfall“)', () => {
  const station = SZENEN.stationen.find((s) => s.ansicht === 'notfall');
  assert.match(station.text.de, /wen man anruft und wo die Vollmacht liegt/, 'Vorbedingung: das sagt die Station');
  const V = V_PRODUKT();
  const n = WERKZEUG.vorfuehrungNutzlastErzeugen({ sprache: 'de', daten: DEPOT, szenen: SZENEN, V, dokumentOrdner: ORDNER });
  V.setData(JSON.parse(JSON.stringify(n.depot)));
  const zeilen = V.notfallKernModell();
  const kontakte = zeilen.find((z) => /Notfallkontakt/.test(String(z.label)));
  assert.ok(kontakte && /\+49 30 23125020/.test(String(kontakte.wert)), 'Notfallkontakte mit Telefon');
  const ablage = zeilen.find((z) => /Vorsorgevollmacht/.test(String(z.label)) && /mittlere Schublade/.test(String(z.wert)));
  assert.ok(ablage, 'der Ablageort der Vorsorgevollmacht steht auf der Karte (v845)');
});

test('[Betreuungsverein·Notfall·Rot-Beweis] ohne Ablageort im Depot fehlt die Zeile auf der Karte — die Probe oben misst die Karte, nicht die Szene', () => {
  const V = V_PRODUKT();
  const n = WERKZEUG.vorfuehrungNutzlastErzeugen({ sprache: 'de', daten: DEPOT, szenen: SZENEN, V, dokumentOrdner: ORDNER });
  const depot = JSON.parse(JSON.stringify(n.depot));
  (function streiche(o) {
    if (!o || typeof o !== 'object') return;
    if (Object.prototype.hasOwnProperty.call(o, 'storageLocation')) delete o.storageLocation;
    for (const k of Object.keys(o)) streiche(o[k]);
  })(depot);
  V.setData(depot);
  const zeilen = V.notfallKernModell();
  assert.equal(zeilen.find((z) => /Vorsorgevollmacht/.test(String(z.label)) && /Schublade/.test(String(z.wert))), undefined);
});
