'use strict';
/* Suche als Palette nach dem Desktop-Dummy (U-8a, 16.11.2026).
   Im Dummy öffnet die Suche als zentrierte, breite Palette über einem Schleier, die Eingabe oben, je Treffer der Pfad rechts.
   Vorher hing die Liste schmal unter dem Suchfeld der Kopfleiste, die Zeilen brachen um.
   Die Probe hält: (a) ab 768 px wird das Suchfeld der Kopfleiste mit dem Fokus (Klasse suche-offen) fest, zentriert und breit; (b) ein Schleier liegt
   darunter und fängt den Klick; (c) die Trefferzeilen brechen nicht um, der Pfad steht rechts; (d) Escape und eine Wahl nehmen
   den Fokus aus dem Feld, damit die Palette schließt.
   Rot-Beweis: am Stand vor U-8a fehlt jede dieser Regeln; die gepflanzten Fassungen unten fallen. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const CSS = fs.readFileSync(path.join(__dirname, '..', 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');

function paletteBlock(css) {
  const i = css.indexOf('@media (min-width: 768px) {\n    .tb-suche-platz .suche-feld.suche-offen {');
  if (i < 0) return '';
  const e = css.indexOf('\n  }\n', i);
  return e < 0 ? '' : css.slice(i, e);
}
function regel(block, selektor) {
  const i = block.indexOf(selektor + ' {');
  if (i < 0) return '';
  return block.slice(i, block.indexOf('}', i));
}
function befunde(css) {
  const b = paletteBlock(css);
  const m = [];
  if (!b) return ['Palette-Block ab 768 px fehlt'];
  const feld = regel(b, '.tb-suche-platz .suche-feld.suche-offen');
  if (!/position:\s*fixed/.test(feld)) m.push('Feld nicht fest');
  if (!/margin:\s*0 auto/.test(feld) || !/left:\s*0/.test(feld) || !/right:\s*0/.test(feld)) m.push('Feld nicht zentriert');
  if (!/width:\s*min\(40rem/.test(feld)) m.push('Feld nicht breit');
  const schleier = regel(b, '.tb-suche-platz .suche-feld.suche-offen::before');
  if (!/position:\s*fixed/.test(schleier) || !/inset:\s*0/.test(schleier) || !/var\(--schleier-modal\)/.test(schleier)) m.push('Schleier fehlt');
  if (!/flex-wrap:\s*nowrap/.test(regel(b, '.tb-suche-platz .suche-vorschlaege li[data-idx]'))) m.push('Zeilen brechen um');
  if (!/margin-left:\s*auto/.test(regel(b, '.tb-suche-platz .suche-vorschlaege .suche-treffer-quelle'))) m.push('Pfad nicht rechts');
  return m;
}

test('[U8a·Palette] ab 768 px: Feld fest, zentriert, breit, über einem Schleier; Zeilen ohne Umbruch, Pfad rechts', () => {
  assert.deepEqual(befunde(CSS), []);
});

test('[U8a·Palette·Rot-Beweis] ohne Schleier, mit umbrechenden Zeilen oder ohne den Block fällt die Probe', () => {
  assert.deepEqual(befunde(CSS.replace('background: var(--schleier-modal);', '')), ['Schleier fehlt']);
  assert.deepEqual(befunde(CSS.replace('flex-wrap: nowrap; padding: var(--space-2) var(--space-5);', 'padding: var(--space-2) var(--space-5);')), ['Zeilen brechen um']);
  assert.deepEqual(befunde(CSS.replace('@media (min-width: 768px) {\n    .tb-suche-platz .suche-feld.suche-offen {', '@media (min-width: 768px) {\n    .x {')), ['Palette-Block ab 768 px fehlt']);
});

async function mitSuche() {
  const k = ladeKern();
  const V = k.V;
  await V.depotAnlegen('suche-u8r-pw');
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('health', 'ongoingTreatmentNext', 'Praxis Zwinkerhausen');
  V._sucheVerdrahten();
  const ein = k.document.getElementById('suche-eingabe');
  let blur = 0;
  ein.blur = () => { blur += 1; };
  return { V, ein, liste: k.document.getElementById('suche-vorschlaege'), blurs: () => blur };
}

test('[U8a·Schließen] Escape leert das Feld und nimmt den Fokus, die Palette schließt', async () => {
  const { ein, liste, blurs } = await mitSuche();
  ein.value = 'Zwinkerhausen';
  ein.oninput();
  assert.equal(liste.hidden, false);
  ein.onkeydown({ key: 'Escape', preventDefault() {} });
  assert.equal(liste.hidden, true);
  assert.equal(ein.value, '');
  assert.equal(blurs(), 1);
});

test('[U8a·Schließen] eine Wahl nimmt den Fokus aus dem Feld', async () => {
  const { ein, liste, blurs } = await mitSuche();
  ein.value = 'Zwinkerhausen';
  ein.oninput();
  assert.equal(liste.hidden, false);
  ein.onkeydown({ key: 'Enter', preventDefault() {} });   // Enter wählt den ersten Treffer (D101), derselbe Weg wie der Klick
  assert.equal(blurs(), 1);
  assert.equal(ein.value, '');
});

test('[U8a·Klasse] mit dem Fokus trägt das Suchfeld suche-offen, ohne Fokus nicht', () => {
  // Eigene Elemente statt der Platzhalter von load-kern (dort hat das Feld keine Eltern und classList tut nichts).
  const k = ladeKern();
  const klassen = new Set();
  const feld = { classList: { toggle: (n, an) => { if (an) klassen.add(n); else klassen.delete(n); }, contains: (n) => klassen.has(n) } };
  const ein = { value: '', parentElement: feld, setAttribute() {}, blur() {} };
  const liste = { hidden: true, innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  const vorher = k.document.getElementById;
  k.document.getElementById = (id) => (id === 'suche-eingabe' ? ein : id === 'suche-vorschlaege' ? liste : vorher(id));
  try { k.V._sucheVerdrahten(); } finally { k.document.getElementById = vorher; }
  ein.onfocus();
  assert.equal(feld.classList.contains('suche-offen'), true);
  ein.onblur();
  assert.equal(feld.classList.contains('suche-offen'), false);
});
