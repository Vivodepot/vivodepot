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

/* Seit S-1 trägt das Gitter genau die id für die Telefon-Reiter (aria-controls); ein anderes Attribut ist nicht vorgesehen. */
const ERSTE_SPALTE = /<div class="bau-gitter"(?: id="bau-gitter")?>\s*<aside class="palette" id="palette"/;
test('[DEMO-S3 · Rot-Beweis] ein anderes Attribut am Gitter oder ein Element vor der Bausteinliste fällt auf', () => {
  assert.doesNotMatch(STUDIO.replace('<div class="bau-gitter" id="bau-gitter">', '<div class="bau-gitter" style="display:block">'), ERSTE_SPALTE);
  assert.doesNotMatch(STUDIO.replace('<div class="bau-gitter" id="bau-gitter">', '<div class="bau-gitter" id="bau-gitter"><p>x</p>'), ERSTE_SPALTE);
});
test('[DEMO-S3] Arbeitsfläche: die Bausteinliste steht als erste Spalte neben der Vorlage, ihre Liste ist nicht auf unter 190 px begrenzt, der Satz nennt das Ziehen (DE und EN)', () => {
  assert.match(STUDIO, ERSTE_SPALTE, 'die Bausteinliste steht nicht als erste Spalte der Arbeitsfläche');
  assert.match(STUDIO, /\.bau-gitter \{ display: grid; grid-template-columns: 290px minmax\(0, 1fr\) 320px;/);
  const h = STUDIO.match(/#pal-liste \{[^}]*max-height: (\d+)px/);
  assert.ok(!h || Number(h[1]) >= 190, 'Bausteinliste zu niedrig: nur wenige Bausteine sichtbar');
  assert.match(STUDIO, /data-en="Add with \+ or drag into the template\.">Mit \+ hinzufügen oder in die Vorlage ziehen\./);   // seit S-3: Vorlage statt Vorschau
});
