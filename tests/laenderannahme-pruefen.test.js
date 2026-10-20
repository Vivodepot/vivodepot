'use strict';
/* Wächter zu U2-ADR-495 (09.10.2026): Land, Rechtsraum und Rechtsform kommen aus dem
   Rechtsraum-Modul, nicht aus dem Code. Die Zahl je Datei und Art kann nur sinken (tools/laenderannahme-grundlinie.json). */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // BESTAND: öffentlich nur zwei Privat-Produkte
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const W = require('../tools/laenderannahme-pruefen.js');

const FIXTURE = fs.readFileSync(path.join(__dirname, 'fixtures', 'laenderannahme', 'vorgaben.js'), 'utf8');

test('[Länderannahme] die geführten Dateien stehen auf der Grundlinie, nicht darüber und nicht darunter', () => {
  const soll = W.grundlinieLesen();
  assert.deepEqual(W.vergleichen(W.messen(), soll), []);
});
test('[Länderannahme · Rot-Beweis] das Fixture zählt jede Art, Kommentar, Normzitat und country_code nicht', () => {
  assert.deepEqual(W.zaehlen(FIXTURE), { 'land-vorgabe': 2, 'rechtsraum-vorgabe': 1, 'rechtsform-liste': 1 });
});
test('[Länderannahme · Rot-Beweis] ein neuer Rückfall auf „Deutschland“ im Studio ist rot', () => {
  const studio = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');
  const soll = W.grundlinieLesen();
  const ist = W.messen();
  ist['vivodepot-studio.html'] = W.zaehlen(studio + "\n<script>const x = y || 'Deutschland';</script>\n");
  assert.equal(W.vergleichen(ist, soll).length, 1);
});
test('[Länderannahme · Drift] eine entfernte Stelle ohne nachgezogene Grundlinie ist ebenfalls rot', () => {
  const soll = W.grundlinieLesen();
  const hoeher = JSON.parse(JSON.stringify(soll));
  hoeher['vivodepot-studio.html']['rechtsform-liste'] += 1;
  assert.equal(W.vergleichen(W.messen(), hoeher).length, 1);
});
/* R1 „Rechtsraum als Modul im Kern“ (17.10.2026): der Kern und jedes Pro-Modul der vier Produkte sind geführt. */
test('[Länderannahme · R1] geführt sind auch der Kern und jedes Pro-Modul der vier Produkte, jede Datei mit Grundlinie', () => {
  const soll = W.grundlinieLesen();
  assert.ok(W.GEFUEHRT.includes('vivodepot.html'), 'der Kern ist geführt');
  assert.ok(W.GEFUEHRT.filter((f) => /pro-/.test(path.basename(f))).length >= 1, 'mindestens ein Pro-Modul ist geführt');
  for (const f of W.GEFUEHRT) assert.ok(soll[f], 'Grundlinie fehlt für ' + f);
});
test('[Länderannahme · R1 · Rot-Beweis] ein fester Rechtsraum im Kern ist rot (der Stand vor R1: ein fest eingetragenes DE)', () => {
  const kern = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
  const soll = W.grundlinieLesen();
  const ist = W.messen();
  ist['vivodepot.html'] = W.zaehlen(kern + "\n<script>const fmt = { id: 'fim-json', rechtsraum: 'DE' };</script>\n");
  assert.deepEqual(W.vergleichen(ist, soll), ['vivodepot.html · rechtsraum-vorgabe: 1 statt höchstens 0 (neue Länderannahme)']);
});

/* Geteilte Grundlinie (18.10.2026): öffentlicher Teil und interne Ergänzung. Gepflanzte Teile, keine echten Pfade. */
const { ergaenzungPfad } = require('../tools/lib/mit-interner-ergaenzung.js');
const NULL = { 'land-vorgabe': 0, 'rechtsraum-vorgabe': 0, 'rechtsform-liste': 0 };
const gepflanzt = (oeffentlich, intern) => {
  const dateien = { 'g.json': JSON.stringify({ gegenstand: 'Probe', jeDatei: oeffentlich }) };
  if (intern) dateien[ergaenzungPfad('g.json')] = JSON.stringify({ jeDatei: intern });
  return W.grundlinieLesen('g.json', { lesen: (x) => dateien[x], gibt: (x) => x in dateien });
};
test('[Länderannahme · Teilung] jede geführte Datei hat genau eine Grundlinie, öffentlich und intern zusammen', () => {
  const soll = W.grundlinieLesen();
  assert.deepEqual(Object.keys(soll).sort(), [...W.GEFUEHRT].sort(), 'die Summe beider Teile ist genau die geführte Menge');
});
test('[Länderannahme · Teilung] --grundlinie-schreiben teilt: Zurückgehaltenes intern, der Rest öffentlich, die Summe bleibt', () => {
  const ist = { 'a.html': NULL, 'drinnen/b.json': NULL, 'c.html': NULL };
  const { oeffentlich, intern } = W.teilen(ist, (rel) => rel.startsWith('drinnen/'));
  assert.deepEqual(Object.keys(oeffentlich), ['a.html', 'c.html']);
  assert.deepEqual(Object.keys(intern), ['drinnen/b.json']);
  assert.deepEqual(gepflanzt(oeffentlich, intern), ist, 'die Summe ist der Messwert');
});
test('[Länderannahme · Teilung · Rot-Beweis] ein zurückgehaltener Pfad im öffentlichen Teil ist ein Fund', () => {
  const istZurueck = (rel) => rel.startsWith('drinnen/');
  assert.deepEqual(W.teilungPruefen({ 'a.html': NULL }, istZurueck), []);
  assert.equal(W.teilungPruefen({ 'a.html': NULL, 'drinnen/b.json': NULL }, istZurueck).length, 1);
});
test('[Länderannahme · Teilung · Rot-Beweis] eine Abweichung im internen Teil schlägt an, ein Schlüssel in beiden Teilen auch', () => {
  const ist = { 'a.html': NULL, 'drinnen/b.json': { ...NULL, 'land-vorgabe': 1 } };
  assert.deepEqual(W.vergleichen(ist, gepflanzt({ 'a.html': NULL }, { 'drinnen/b.json': { ...NULL, 'land-vorgabe': 1 } })), []);
  assert.equal(W.vergleichen(ist, gepflanzt({ 'a.html': NULL }, { 'drinnen/b.json': NULL })).length, 1, 'höher als der interne Teil');
  assert.equal(W.vergleichen({ ...ist, 'drinnen/b.json': NULL }, gepflanzt({ 'a.html': NULL }, { 'drinnen/b.json': { ...NULL, 'land-vorgabe': 1 } })).length, 1, 'Drift im internen Teil');
  assert.throws(() => gepflanzt({ 'a.html': NULL }, { 'a.html': NULL }), /doppelter Schlüssel/);
});
