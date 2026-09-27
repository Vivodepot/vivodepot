'use strict';
/* Befund VORFUEHRUNGSKARTE-VERDECKT (24.09.2026): die Erklärkarte der Vorführung lag halbdurchsichtig über den Kacheln. Jetzt hat
   sie ihren eigenen Platz — ein Band unten, die Ansicht endet darüber. Das Verhalten (in jeder Station, Desktop und Handy, liegt
   nichts unter der Karte) prüft tests/e2e/vorfuehrung-karte-und-kacheln.spec.js im Browser. Diese Probe hält die Bauform im Kern
   fest, damit sie in der Befund-Ratsche läuft: die Fangfläche ist durchsichtig, die Karte deckend mit Rand in der Markenfarbe, und
   im Band-Modus enden Ansicht und Dialog-Rücken über dem Band. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const css = () => [...KERN.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
function regel(selektor) {
  const esc = selektor.replace(/[.*+?^${}()|[\]\\#]/g, '\\$&');
  const m = new RegExp('(^|[}\\s])' + esc + '\\s*\\{([^{}]*)\\}').exec(css());
  return m ? m[2] : null;
}

test('[Vorführungskarte·Bauform] die Fangfläche ist durchsichtig, die Karte deckend mit kräftigem Rand in der Markenfarbe', () => {
  const flaeche = regel('#vorfuehrung-schleife');
  assert.ok(flaeche, 'Regel #vorfuehrung-schleife gefunden');
  assert.match(flaeche, /background:\s*transparent/, 'die Fangfläche verdeckt nichts');
  const karte = regel('.vorfuehrung-karte');
  assert.match(karte, /background:\s*var\(--white\)/, 'deckend weiß, nicht halbdurchsichtig');
  assert.match(karte, /border-left:\s*6px solid var\(--salbei-dunkel\)/, 'Rand in der vorhandenen Markenfarbe');
  assert.doesNotMatch(karte, /rgba\(255,\s*255,\s*255,\s*0\.\d+\)/, 'kein halbdurchsichtiges Weiß');
});

test('[Vorführungskarte·Bauform·Rot-Beweis] im Band-Modus enden Ansicht und Dialog-Rücken über dem Band, und der Kern misst das Band', () => {
  assert.match(regel('html.vorfuehrung-band #app') || '', /height:\s*calc\(100vh - 26px - var\(--vorfuehrung-band/, '#app endet über dem Band');
  assert.match(regel('html.vorfuehrung-band #modal-rueck') || '', /bottom:\s*calc\(var\(--vorfuehrung-band/, 'der Dialog-Rücken endet über dem Band');
  assert.match(KERN, /function _vorfuehrungBandMessen\(\)/, 'die Messung der Bandhöhe steht im Kern');
  assert.match(KERN, /_vorfuehrungBandLoesen\(\);\s*\n\s*_vorfuehrungModalZu\(\);/, 'beim Beenden der Schleife fällt der Band-Modus zurück');
});
