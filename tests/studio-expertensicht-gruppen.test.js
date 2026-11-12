'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Studio · Die Expertensicht gruppiert ihre Bausteine (Studio-Umbau „Einstieg und Expertensicht“, Wagen 1, 09.11.2026)
   ─────────────────────────────────────────────────────────────────────────────
   Im Dialog „Weitere Möglichkeiten“ standen elf Bausteine nebeneinander. Drei Gruppen-Chips („Bausteine“, „Formate & Sprache“,
   „Register & Antworten“) zeigen je nur ihre Bausteine. Kein Baustein darf dabei verloren gehen.
   Gehalten wird:
     1 · jeder Baustein *-block unter #mod-bloecke steht in genau einer Gruppe von MODUL_GRUPPEN, und jede Gruppe nennt nur
         Bausteine, die es gibt;
     2 · der Dialog trägt den Halter der Gruppen-Chips (#mod-gruppen) vor den Kacheln;
     3 · die drei Gruppen heißen wie entschieden, deutsch und englisch.
   ROT-BEWEIS: ein Baustein ohne Gruppe, ein Baustein in zwei Gruppen, eine Gruppe mit einem unbekannten Baustein.
   ═════════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');

function bloecke(html) {
  const a = html.indexOf('<dialog id="dlg-module"');
  const dlg = a < 0 ? '' : html.slice(a, html.indexOf('</dialog>', a));
  const c = dlg.indexOf('id="mod-bloecke"');
  return c < 0 ? [] : [...dlg.slice(c).matchAll(/<details[^>]*\bid="([a-z]+)-block"/g)].map((m) => m[1]);
}
function befunde(gruppen, html) {
  const f = [], bl = bloecke(html);
  for (const b of bl) {
    const n = gruppen.filter((g) => g[3].indexOf(b) >= 0).length;
    if (n !== 1) f.push(b + '-block steht in ' + n + ' Gruppen');
  }
  for (const g of gruppen) for (const b of g[3]) if (bl.indexOf(b) < 0) f.push('Gruppe ' + g[0] + ' nennt ' + b + ', den Baustein gibt es nicht');
  return f;
}
const gruppenVon = () => Array.from(ladeGenerator().V.MODUL_GRUPPEN).map((g) => [g[0], g[1], g[2], Array.from(g[3])]);

test('[Expertensicht · Gruppen] jeder Baustein steht in genau einer Gruppe', () => {
  const g = gruppenVon();
  assert.ok(bloecke(HTML).length > 0, 'Vorbedingung: Bausteine gelesen');
  assert.ok(g.length > 0, 'Vorbedingung: Gruppen gelesen');
  assert.deepEqual(befunde(g, HTML), []);
});

test('[Expertensicht · Gruppen] drei Gruppen, wie entschieden benannt; der Halter steht vor den Kacheln', () => {
  assert.deepEqual(gruppenVon().map((x) => [x[1], x[2]]), [['Bausteine', 'Building blocks'], ['Formate & Sprache', 'Formats & language'], ['Register & Antworten', 'Register & replies']]);
  const a = HTML.indexOf('<dialog id="dlg-module"');
  const dlg = HTML.slice(a, HTML.indexOf('</dialog>', a));
  assert.ok(dlg.indexOf('id="mod-gruppen"') > 0 && dlg.indexOf('id="mod-gruppen"') < dlg.indexOf('id="mod-kacheln"'), '#mod-gruppen vor #mod-kacheln');
});

test('[Expertensicht · Gruppen · Rot-Beweis] ein Baustein ohne Gruppe, doppelt oder unbekannt fällt auf', () => {
  const g = gruppenVon();
  const ohne = g.map((x) => [x[0], x[1], x[2], x[3].filter((b) => b !== 'bd')]);
  assert.deepEqual(befunde(ohne, HTML), ['bd-block steht in 0 Gruppen']);
  const doppelt = g.map((x, i) => [x[0], x[1], x[2], i === 1 ? x[3].concat(['anf']) : x[3]]);
  assert.deepEqual(befunde(doppelt, HTML), ['anf-block steht in 2 Gruppen']);
  const unbekannt = g.map((x, i) => [x[0], x[1], x[2], i === 0 ? x[3].concat(['zz']) : x[3]]);
  assert.deepEqual(befunde(unbekannt, HTML), ['Gruppe ' + g[0][0] + ' nennt zz, den Baustein gibt es nicht']);
});
