'use strict';
/* Demo-Weg, Review-Befunde HOCH (12.11.2026): S1, S3 (D3 ist ein eigener Wagen). Statische Proben auf die handgeschriebenen Quellen.
   ROT-BEWEIS (von Hand nachgerechnet, nichts gelaufen): vor dem Fix steht
   sd-rechtsform in <details class="fs-mehr"> ohne aria-required (S1) und sagt der Satz nichts vom Ziehen, die Palette steht
   unter der Vorschau mit 190 px Liste (S3). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const W = path.join(__dirname, '..');
const lies = (rel) => fs.readFileSync(path.join(W, rel), 'utf8');
const STUDIO = lies('vivodepot-studio.html');
const tag = (html, id) => { const m = html.match(new RegExp('<input [^>]*id="' + id + '"[^>]*>')); assert.ok(m, 'kein Feld ' + id); return m[0]; };

test('[DEMO-S1] die Rechtsform steht im Einreichen-Dialog dort, wo sie verlangt wird: sichtbar, als erforderlich gekennzeichnet', () => {
  const dlg = STUDIO.slice(STUDIO.indexOf('id="sd-name"'), STUDIO.indexOf('class="fs-mehr"'));
  assert.ok(dlg.includes('id="sd-rechtsform"'), 'sd-rechtsform liegt noch unter „Weitere Angaben (freiwillig)“');
  assert.match(tag(STUDIO, 'sd-rechtsform'), /aria-required="true"/);
  assert.match(STUDIO, /<label for="sd-rechtsform" class="muss"/, 'Beschriftung ohne Stern');
  assert.doesNotMatch(STUDIO, /Rechtsform \(freiwillig\)/);
});

test('[DEMO-S3] Bogen-Schritt: Bausteinliste über der Vorschau, Liste höher als 190 px, Satz nennt das Ziehen (DE und EN)', () => {
  assert.match(STUDIO, /aside\.insertBefore\(pal, aside\.querySelector\('\.as-kleinaug'\)\)/, 'die Palette steht noch unter der Vorschau');
  const h = STUDIO.match(/\.as-rechts \.as-palette #as-pal-liste \{ max-height: (\d+)px/);
  assert.ok(h && Number(h[1]) >= 240, 'Bausteinliste zu niedrig: nur wenige Bausteine sichtbar');
  assert.match(STUDIO, /data-en="Start with an example or add questions\. Change the order by dragging or with the arrows\.">[^<]*durch Ziehen oder mit den Pfeilen/);
});
