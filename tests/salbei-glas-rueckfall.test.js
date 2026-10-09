'use strict';
/* salbei-glas-rueckfall.test.js — Glas hat im Profil „Salbei mit Glas“ immer einen deckenden Rückfall (U2-ADR-473 W5a, 06.10.2026)
   Am Modul gerechnet, ohne Browser, damit die Zusage auch gilt, solange das Profil nicht ab Werk wirkt: jede Regel mit
   backdrop-filter schließt den Hochkontrast aus (:not(.high-contrast)), und jeder ihrer Selektoren steht genau so im Block
   @media (prefers-reduced-transparency: reduce) mit backdrop-filter: none. Genau so, weil ein kürzerer Selektor gegen den
   längeren der Glas-Regel verliert (Spezifitätsfalle, 06.10.). Am Bild misst es tests/e2e/glas-flaechen.spec.js; dass das Profil ab Werk wirkt, hält tests/ab-werk-salbei-glas.test.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const MODUL = require(path.join(__dirname, '..', 'tools', 'erscheinung', 'erscheinungsbild-salbei-glas-modul.json'));
const STIL = Object.values(MODUL.stil).join('\n');

// Regeln mit ihrem umgebenden @-Block, Kommentare entfernt. Reicht für das flache CSS der Profile (eine Ebene @media/@supports).
function regeln(css) {
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const aus = []; const stapel = []; let kopf = '';
  for (const z of css) {
    if (z === '{') { stapel.push(kopf.trim()); kopf = ''; }
    else if (z === '}') {
      const sel = stapel.pop();
      if (sel !== undefined && !sel.startsWith('@')) aus.push({ selektor: sel, koerper: kopf.trim(), at: stapel.filter((s) => s.startsWith('@')).join(' ') });
      kopf = '';
    } else kopf += z;
  }
  return aus;
}
const einzeln = (s) => s.split(',').map((x) => x.trim().replace(/\s+/g, ' ')).filter(Boolean);
const glasRegeln = (rs) => rs.filter((r) => !r.at && /(^|;)\s*(-webkit-)?backdrop-filter\s*:\s*(?!none)/.test(r.koerper));
const reduziert = (rs) => new Set(rs.filter((r) => /prefers-reduced-transparency:\s*reduce/.test(r.at) && /backdrop-filter\s*:\s*none/.test(r.koerper)).flatMap((r) => einzeln(r.selektor)));

function luecken(css) {
  const rs = regeln(css); const red = reduziert(rs); const aus = [];
  for (const r of glasRegeln(rs)) for (const s of einzeln(r.selektor)) {
    if (!/:not\(\.high-contrast\)/.test(s)) aus.push('Hochkontrast nicht ausgeschlossen: ' + s);
    if (!red.has(s)) aus.push('kein Rückfall bei „Transparenz reduzieren“: ' + s);
  }
  return aus;
}

test('[Salbei mit Glas·Rückfall] jede Glasfläche ist im Hochkontrast und bei „Transparenz reduzieren“ deckend', () => {
  assert.ok(glasRegeln(regeln(STIL)).length >= 5, 'Testvoraussetzung: das Profil hat Glasflächen');
  assert.deepEqual(luecken(STIL), []);
});

test('[Salbei mit Glas·Rückfall·Rot-Beweis] eine Glasfläche ohne Rückfall und eine mit kürzerem Rückfall-Selektor fallen auf', () => {
  const ohne = STIL + '\nhtml:not(.high-contrast) .probe-flaeche { background: rgba(255,255,255,.5); backdrop-filter: blur(9px); }';
  assert.ok(luecken(ohne).includes('kein Rückfall bei „Transparenz reduzieren“: html:not(.high-contrast) .probe-flaeche'));
  const kurz = STIL + '\nhtml:not(.high-contrast) #app .probe-b { backdrop-filter: blur(9px); }\n@media (prefers-reduced-transparency: reduce) { .probe-b { backdrop-filter: none; } }';
  assert.ok(luecken(kurz).some((l) => l.endsWith('#app .probe-b')));
  const hk = STIL + '\nhtml .probe-c { backdrop-filter: blur(9px); }';
  assert.ok(luecken(hk).includes('Hochkontrast nicht ausgeschlossen: html .probe-c'));
});
