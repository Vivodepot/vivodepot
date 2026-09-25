'use strict';
/* Klasse-B-Wächter, Node-Seite — Proben (19.09.2026). Erklärung und Grenzen: tools/klasse-b-node-kern-pruefen.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../tools/klasse-b-node-kern-pruefen.js');

// Bausteine getrennt, damit diese Datei die Zuweisung nicht selbst als Fund trägt.
const ZUW = 'process.env.KERN_HTML' + '_PATH = tmp;';
const BUENDEL = 'K.BUERGERMODUL' + '_BUENDEL.bereichsErsatz = { ersetzt: [], neu: {} };';

test('[Klasse-B·Node·Rot-Beweis] eine gepflanzte Datei, die KERN_HTML_PATH auf eine rohe Kopie setzt, wird gefunden', () => {
  const inhalt = ["const html = fs.readFileSync(HTML, 'utf8');", 'fs.writeFileSync(tmp, html.replace(a, b));', ZUW].join('\n');
  assert.equal(P.rohTrefferInDatei(inhalt), 1);
});

test('[Klasse-B·Node·Gegenprobe] ein Delete der Variable ist keine Zuweisung', () => {
  assert.equal(P.rohTrefferInDatei('delete process.env.KERN_HTML' + '_PATH;'), 0);
});

test('[Klasse-B·Node·Gegenprobe] Backen (konfektionieren/_standardProduktBaken) oder GERÜST-TEST nimmt die Datei aus', () => {
  assert.equal(P.rohTrefferInDatei(ZUW + "\nconst r = konfektionieren({ slug: 'privat-de' });"), 0);
  assert.equal(P.rohTrefferInDatei(ZUW + '\nconst h = _standardProduktBaken(html, {});'), 0);
  assert.equal(P.rohTrefferInDatei('/* GERÜST-TEST: nacktes Gerüst ist Absicht */\n' + ZUW), 0);
});

test('[Klasse-B·Node·Mechanik] urteil() ist rot bei neuer Datei und bei steigender Zahl, grün bei Rückgang', () => {
  const g = { summe: 2, jeDatei: { 'alt.test.js': 2 } };
  const neu = P.urteil({ summe: 3, jeDatei: { 'alt.test.js': 2, 'neu.test.js': 1 } }, g);
  assert.equal(neu.gruen, false);
  assert.ok(neu.befunde.some((b) => b.includes('DRIFT') && b.includes('neu.test.js')));
  assert.equal(P.urteil({ summe: 3, jeDatei: { 'alt.test.js': 3 } }, g).gruen, false);
  assert.equal(P.urteil({ summe: 1, jeDatei: { 'alt.test.js': 1 } }, g).gruen, true);
});

test('[Klasse-B·Node·Bündel-Route·Rot-Beweis] eine gepflanzte Zeile, die in das Bündel schreibt, wird gefunden', () => {
  assert.equal(P.buendelSchreiberInDatei('const { V: K } = ladeKern();\n' + BUENDEL + '\nK.buergermodulBuendelAnwenden(x);'), 1);
});

test('[Klasse-B·Node·Bündel-Route·Gegenprobe] derselbe Text in einem Literal, ein Vergleich und eine Lesezeile sind keine Schreibzugriffe', () => {
  assert.equal(P.buendelSchreiberInDatei("assert.equal(regionHat('BUERGERMODUL" + "_BUENDEL.bereichsErsatz = null;'), true);"), 0);
  assert.equal(P.buendelSchreiberInDatei('if (K.BUERGERMODUL' + '_BUENDEL.bereichsErsatz === null) {}'), 0);
  assert.equal(P.buendelSchreiberInDatei('const b = K.BUERGERMODUL' + '_BUENDEL.bereichsErsatz;'), 0);
});

test('[Klasse-B·Node·Bündel-Route·Mechanik] eine neue schreibende Datei ist rot, ein Rückgang grün', () => {
  const g = { summe: 0, jeDatei: {}, buendel: { summe: 1, jeDatei: { 'tools/alt.js': 1 } } };
  const neu = P.urteil({ summe: 0, jeDatei: {}, buendel: { summe: 2, jeDatei: { 'tools/alt.js': 1, 'tests/neu.test.js': 1 } } }, g);
  assert.equal(neu.gruen, false);
  assert.ok(neu.befunde.some((b) => b.includes('Bündel-Route') && b.includes('tests/neu.test.js')));
  assert.equal(P.urteil({ summe: 0, jeDatei: {}, buendel: { summe: 0, jeDatei: {} } }, g).gruen, true);
});

test('[Klasse-B·Node·Positivkontrolle] der Suchraum ist besetzt, und die Grundlinie deckt den echten Bestand', () => {
  assert.ok(P.testDateien().length > 500, 'Suchraum besetzt: ' + P.testDateien().length + ' Testdateien');
  assert.ok(P.grundlinieLesen().summe > 0, 'Grundlinie trägt Fundstellen');
  const u = P.urteil(P.messen(), P.grundlinieLesen());
  assert.ok(u.gruen, 'Klasse-B (Node) rot:\n' + u.befunde.join('\n'));
});
