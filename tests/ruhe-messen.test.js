'use strict';
/* ruhe-messen.test.js — die Zählung des Ruhe-Maßes ohne Browser (03.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   tools/ruhe-messen.js zählt aus Stil-Datensätzen, die `sammeln()` in der Seite liefert. Hier laufen
   zwei von Hand gebaute Datensätze (tests/fixtures/ruhe-messen/{ruhig,voll}.json), die die beiden
   HTML-Fixtures nachbilden; die erwarteten Zahlen stehen von Hand hier, nicht aus dem Werkzeug.
   Die Seitenfunktion selbst prüft tests/e2e/ruhe-messen.spec.js im echten Chromium. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { auswerten, farbeLesen, MASSE } = require('../tools/ruhe-messen.js');

const FIX = path.join(__dirname, 'fixtures', 'ruhe-messen');
const ruhig = require(path.join(FIX, 'ruhig.json'));
const voll = require(path.join(FIX, 'voll.json'));
const R0 = [['0px', 'none', 'rgb(0, 0, 0)'], ['0px', 'none', 'rgb(0, 0, 0)'], ['0px', 'none', 'rgb(0, 0, 0)'], ['0px', 'none', 'rgb(0, 0, 0)']];
const flaeche = (hg, vorfahr = 'rgb(255, 255, 255)', mehr = {}) => ({ tag: 'div', hg, hgVorfahr: vorfahr, rahmen: R0, schatten: 'none', text: false,
  breite: 300, hoehe: 100, radius: '0px', innenText: false, ...mehr });

test('[Ruhe] die ruhige Fixture zählt genau, was sie trägt', () => {
  assert.deepEqual(auswerten(ruhig), { flaechen: 1, rahmen: 0, schriftgroessen: 2, schriftstaerken: 2, textfarben: 2, akzentflaechen: 1,
    hintergrundfarben: 1, eckenradien: 0, kleineflaechen: 0, knopfartig: 0 });
});

test('[Ruhe] die volle Fixture zählt genau, was sie trägt', () => {
  assert.deepEqual(auswerten(voll), { flaechen: 8, rahmen: 4, schriftgroessen: 5, schriftstaerken: 4, textfarben: 4, akzentflaechen: 2,
    hintergrundfarben: 5, eckenradien: 3, kleineflaechen: 5, knopfartig: 2 });
});

test('[Ruhe·Probe] mehr Flächen, Rahmen, Schriften und Kleinteile ergeben bei jedem der zehn Maße eine höhere Zahl', () => {
  const a = auswerten(ruhig), b = auswerten(voll);
  for (const m of MASSE) assert.ok(b[m] > a[m], m + ': ' + b[m] + ' > ' + a[m]);
});

test('[Ruhe·Gegenprobe] eine zusätzliche große Fläche in neuer Farbe zählt genau +1 Fläche und +1 Farbe, sonst ändert sich nichts', () => {
  const mehr = { ...ruhig, elemente: [...ruhig.elemente, flaeche('rgb(243, 241, 234)')] };
  const a = auswerten(ruhig), b = auswerten(mehr);
  assert.equal(b.flaechen, a.flaechen + 1);
  assert.equal(b.hintergrundfarben, a.hintergrundfarben + 1);
  for (const m of MASSE.filter((x) => x !== 'flaechen' && x !== 'hintergrundfarben')) assert.equal(b[m], a[m], m);
});

test('[Ruhe·Rot-Beweis] keine Fläche: Farbe des Vorfahren, durchsichtig, fast durchsichtig', () => {
  const nur = (e) => auswerten({ akzent: '#4F6539', elemente: [e] }).flaechen;
  assert.equal(nur(flaeche('rgb(255, 255, 255)')), 0, 'gleiche Farbe wie der Vorfahr');
  assert.equal(nur(flaeche('rgba(0, 0, 0, 0)')), 0, 'durchsichtig');
  assert.equal(nur(flaeche('rgba(79, 101, 57, 0.05)')), 0, 'unter 10 % Deckkraft');
  assert.equal(nur(flaeche('rgba(79, 101, 57, 0.12)')), 1, 'Gegenprobe: eine Tönung ab 10 % ist eine Fläche');
});

test('[Ruhe·Rot-Beweis] eine blasse Tönung der Akzentfarbe ist keine Akzentfläche; fehlt die Akzentfarbe, steht null statt 0', () => {
  assert.equal(auswerten({ akzent: '#4F6539', elemente: [flaeche('rgba(79, 101, 57, 0.12)')] }).akzentflaechen, 0);
  assert.equal(auswerten({ akzent: '#4F6539', elemente: [flaeche('rgb(79, 101, 57)')] }).akzentflaechen, 1);
  assert.equal(auswerten({ akzent: null, elemente: [flaeche('rgb(79, 101, 57)')] }).akzentflaechen, null);
});

test('[Ruhe·Rot-Beweis] ein Rahmen braucht Breite, Stil und Farbe; ein Schatten zählt', () => {
  const r = (rahmen, schatten = 'none') => auswerten({ elemente: [{ tag: 'div', hg: 'rgba(0, 0, 0, 0)', rahmen, schatten, text: false }] }).rahmen;
  assert.equal(r([['1px', 'solid', 'rgb(0, 0, 0)'], ...R0.slice(1)]), 1);
  assert.equal(r([['1px', 'none', 'rgb(0, 0, 0)'], ...R0.slice(1)]), 0, 'Stil none');
  assert.equal(r([['1px', 'solid', 'rgba(0, 0, 0, 0)'], ...R0.slice(1)]), 0, 'durchsichtige Farbe');
  assert.equal(r([['0.5px', 'solid', 'rgb(0, 0, 0)'], ...R0.slice(1)]), 0, 'unter 1px');
  assert.equal(r(R0, 'rgba(0, 0, 0, 0.2) 0px 1px 3px 0px'), 1, 'Schatten');
});

test('[Ruhe] Farben lesen: rgb, rgba, hex, color(srgb …), transparent; Unlesbares ist null', () => {
  assert.deepEqual(farbeLesen('rgb(79, 101, 57)'), [79, 101, 57, 1]);
  assert.deepEqual(farbeLesen('rgba(79, 101, 57, 0.12)'), [79, 101, 57, 0.12]);
  assert.deepEqual(farbeLesen('#4F6539'), [79, 101, 57, 1]);
  assert.deepEqual(farbeLesen('#fff'), [255, 255, 255, 1]);
  assert.deepEqual(farbeLesen('color(srgb 0.5 0 1 / 0.25)'), [127.5, 0, 255, 0.25]);
  assert.deepEqual(farbeLesen('transparent'), [0, 0, 0, 0]);
  assert.equal(farbeLesen('oklch(0.5 0.1 120)'), null);
});

test('[Ruhe·Rot-Beweis] Hintergrundfarben zählen Vielfalt: zwei Flächen gleicher Farbe sind eine Farbe', () => {
  const zwei = (b) => auswerten({ elemente: [flaeche('rgb(243, 241, 234)'), flaeche(b)] }).hintergrundfarben;
  assert.equal(zwei('rgb(243, 241, 234)'), 1);
  assert.equal(zwei('rgb(230, 236, 223)'), 2);
});

test('[Ruhe·Rot-Beweis] Eckenradien: 0 zählt nicht, jede Pille ist „rund“, egal wie viele px', () => {
  const rad = (...r) => auswerten({ elemente: r.map((x) => flaeche('rgb(243, 241, 234)', undefined, x)) }).eckenradien;
  assert.equal(rad({ radius: '0px' }), 0);
  assert.equal(rad({ radius: '8px' }, { radius: '8px' }), 1);
  assert.equal(rad({ radius: '99px', hoehe: 20 }, { radius: '999px', hoehe: 30 }), 1, 'zwei Pillen sind ein Radius');
  assert.equal(rad({ radius: '8px' }, { radius: '99px', hoehe: 20 }), 2);
});

test('[Ruhe·Rot-Beweis] klein heißt unter 48 px; knopfartig braucht dazu Radius, Text und höchstens 240 px Breite', () => {
  const m = (x) => auswerten({ elemente: [flaeche('rgb(230, 236, 223)', undefined, x)] });
  assert.equal(m({ hoehe: 48 }).kleineflaechen, 0, 'genau 48 ist nicht klein');
  assert.equal(m({ hoehe: 47 }).kleineflaechen, 1);
  const pille = { hoehe: 20, breite: 60, radius: '99px', innenText: true };
  assert.equal(m(pille).knopfartig, 1);
  assert.equal(m({ ...pille, radius: '0px' }).knopfartig, 0, 'ohne Radius');
  assert.equal(m({ ...pille, innenText: false }).knopfartig, 0, 'ohne Text');
  assert.equal(m({ ...pille, breite: 300 }).knopfartig, 0, 'zu breit: ein Hinweisband, kein Knopf');
  assert.equal(auswerten({ elemente: [{ ...flaeche('rgba(0, 0, 0, 0)'), ...pille }] }).knopfartig, 0, 'ohne Fläche und ohne Rahmen');
});
