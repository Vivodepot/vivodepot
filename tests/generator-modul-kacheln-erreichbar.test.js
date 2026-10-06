'use strict';
/* ═══════════════════════════════════════════════════════════════════════
   Jeder Baustein im Dialog „Weitere Möglichkeiten“ ist erreichbar
   ───────────────────────────────────────────────────────────────────────
   Anlass (19.09.2026): seit 774a9a17 (Umbau zur Arbeitsfläche) waren der Baustein für Assistent (wm-block) und der für Auszug (lm-block)
   unerreichbar. Der Umbau führte die Kachelliste MODUL_KACHELN und die Regel ein, die alle Bausteine unter #mod-bloecke ausblendet, bis
   modulZeigen einen freigibt; die beiden Bausteine kamen aus L1 (40a78832, f396f03e) ins Markup, ihre Kürzel nicht in die Liste. Kein Test
   sah es: sie prüften den Baustein, nie den Weg dorthin.
   Gehalten wird, an Markup und Kachelliste (ohne Browser):
     1 · jeder Baustein *-block unter #mod-bloecke hat eine Kachel in MODUL_KACHELN, und jede Kachel hat einen Baustein;
     2 · die Bausteine liegen im Dialog unter #mod-bloecke (sonst blieben sie ausgeblendet);
     3 · der Knopf „Weitere Möglichkeiten“ (#start-module) ist an modulOeffnen gebunden.
   Rot-Beweis je Zeile: eine entfernte Kachel, ein aus dem Container gerückter Baustein, ein ungebundener Knopf.
   ═══════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeGenerator } = require('./load-generator.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-studio.html'), 'utf8');

function befunde(kacheln, html) {
  const f = [];
  const dlgStart = html.indexOf('<dialog id="dlg-module"');
  const dlg = dlgStart < 0 ? '' : html.slice(dlgStart, html.indexOf('</dialog>', dlgStart));
  const container = dlg.indexOf('id="mod-bloecke"');
  if (container < 0) f.push('#mod-bloecke fehlt im Dialog: kein Baustein wäre sichtbar');
  const imContainer = container < 0 ? '' : dlg.slice(container);
  const bloecke = [...imContainer.matchAll(/<details[^>]*\bid="([a-z]+)-block"/g)].map((m) => m[1]);
  const namen = kacheln.map((k) => k[0]);
  for (const b of bloecke) if (namen.indexOf(b) < 0) f.push('Baustein ' + b + '-block hat keine Kachel in MODUL_KACHELN — er bliebe unsichtbar');
  for (const n of namen) if (bloecke.indexOf(n) < 0) f.push('Kachel ' + n + ' hat keinen Baustein unter #mod-bloecke');
  if (!/an\('start-module', 'click', \(\) => modulOeffnen\(\)\)/.test(html)) f.push('der Knopf „Weitere Möglichkeiten“ ist nicht an modulOeffnen gebunden');
  return f;
}

test('[Kacheln] jeder Baustein unter #mod-bloecke hat seine Kachel und umgekehrt; der Knopf ist gebunden', () => {
  const { V } = ladeGenerator();
  const kacheln = Array.from(V.MODUL_KACHELN);
  assert.ok(kacheln.length >= 10, 'Vorbedingung: die Kacheln werden gelesen (' + kacheln.length + ')');
  assert.ok(kacheln.some((k) => k[0] === 'wm') && kacheln.some((k) => k[0] === 'lm'), 'Assistent und Auszug haben ihre Kachel');
  assert.deepEqual(befunde(kacheln, HTML), []);
});

test('[Kacheln·Rot-Beweis] eine entfernte Kachel, ein aus dem Container gerückter Baustein und ein ungebundener Knopf werden gemeldet', () => {
  const { V } = ladeGenerator();
  const kacheln = Array.from(V.MODUL_KACHELN);
  assert.ok(befunde(kacheln.filter((k) => k[0] !== 'wm'), HTML).some((x) => /wm-block.*keine Kachel/.test(x)), 'die entfernte Kachel wm wird gemeldet (der Stand vor dem Fix)');
  assert.ok(befunde(kacheln.filter((k) => k[0] !== 'lm'), HTML).some((x) => /lm-block.*keine Kachel/.test(x)), 'die entfernte Kachel lm wird gemeldet');
  assert.ok(befunde(kacheln.concat([['zz', 'x', 'x', 'x', 'x']]), HTML).some((x) => /Kachel zz hat keinen Baustein/.test(x)), 'eine Kachel ohne Baustein wird gemeldet');
  assert.ok(befunde(kacheln, HTML.replace('id="mod-bloecke"', 'id="mod-bloecke-weg"')).some((x) => /#mod-bloecke fehlt/.test(x)), 'ein fehlender Container wird gemeldet');
  assert.ok(befunde(kacheln, HTML.replace("an('start-module', 'click', () => modulOeffnen())", "an('start-weg', 'click', () => modulOeffnen())")).some((x) => /nicht an modulOeffnen gebunden/.test(x)), 'ein ungebundener Knopf wird gemeldet');
});
