'use strict';
/* Befund IOS-BUTTON-BLAU (23.09.2026, auf einem iPad gesehen): die Symbole der Bereichskacheln erschienen in iOS-Safari blau.
   .bereich-karte ist ein <button>, das Symbol-SVG zeichnet mit stroke="currentColor", und der Kern setzte für button keine Farbe —
   iOS-Safari nimmt dann das System-Blau, Chromium erbt. Statische CSS-Probe (die Suite hat keinen WebKit-Lauf): die Basisregel
   für button gibt die geerbte Textfarbe weiter, und keine spätere, ebenso allgemeine button-Regel setzt eine eigene Farbe. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const css = () => [...KERN.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
/* Regeln, deren Selektorliste ein nacktes `button` enthält (kein Klassen-, Attribut- oder Pseudo-Zusatz). */
function nackteButtonRegeln(text) {
  const raus = [];
  for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selektoren = m[1].split(',').map((x) => x.trim());
    if (selektoren.some((x) => x === 'button')) raus.push({ selektor: m[1].trim(), rumpf: m[2] });
  }
  return raus;
}

test('[IOS-BUTTON-BLAU·Rot-Beweis] die Basisregel für button gibt die geerbte Textfarbe weiter', () => {
  const regeln = nackteButtonRegeln(css());
  assert.ok(regeln.length >= 1, 'Kontrolle: die Basisregel für button wird gefunden');
  assert.ok(regeln.some((r) => /(^|;)\s*color\s*:\s*inherit\s*(;|$)/.test(r.rumpf)), 'keine button-Regel mit color: inherit: ' + JSON.stringify(regeln));
});

test('[IOS-BUTTON-BLAU] keine allgemeine button-Regel setzt eine eigene Farbe, und die Bereichskachel selbst setzt keine', () => {
  for (const r of nackteButtonRegeln(css())) {
    const farbe = /(^|;)\s*color\s*:\s*([^;]+)/.exec(r.rumpf);
    if (farbe) assert.equal(farbe[2].trim(), 'inherit', 'button-Regel mit eigener Farbe: ' + r.selektor);
  }
  const karte = [...css().matchAll(/(^|\})\s*\.bereich-karte\s*\{([^{}]*)\}/g)].map((m) => m[2]);
  assert.ok(karte.length >= 1, 'Kontrolle: die Regel .bereich-karte wird gefunden');
  for (const rumpf of karte) assert.doesNotMatch(rumpf, /(^|;)\s*color\s*:/, '.bereich-karte setzt eine eigene Farbe');
});
