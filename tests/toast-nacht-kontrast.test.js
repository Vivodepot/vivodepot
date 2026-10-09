'use strict';
/* toast-nacht-kontrast.test.js — Befund TOAST-NACHT-KONTRAST (HOCH, 06.10.2026)
   Nachts lagen die Toasts „OK“ und „Fehler“ bei 2,40 bzw. 2,85:1: die Schrift kam aus --white, das nachts selbst dunkel wird. Die Probe liest
   die Regel aus dem Modul „heute“ (stil) und rechnet die Schrift gegen die Fläche je Ebene. Die Klasse hält die Pixel-Probe
   (tests/e2e/pixel-kontrast.spec.js, Toast-Messpunkt je Art und Modus). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../tools/erscheinung/erscheinungsbild-heute-modul.json');
// WCAG-Kontrast zweier #rrggbb-Farben (relative Leuchtdichte, sRGB).
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const leucht = (h) => { const r = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * lin(r[0]) + 0.7152 * lin(r[1]) + 0.0722 * lin(r[2]); };
const kontrast = (a, b) => { const x = leucht(a), y = leucht(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const EBENEN = ['basis', 'dunkel', 'hochkontrast'];
function wert(ebene, name) {
  const t = Object.assign({}, M.basis, ebene === 'basis' ? {} : M[ebene]);
  let v = t[name];
  for (let i = 0; i < 8 && /^var\(/.test(v || ''); i++) v = t[v.slice(4, -1).trim()];
  return v;
}
function regel(art) {
  const m = new RegExp('\\.toast\\.' + art + '\\s*\\{([^}]*)\\}').exec(M.stil.grundlage);
  assert.ok(m, 'Regel .toast.' + art + ' fehlt im Modul');
  const farbe = /(?:^|;)\s*color:\s*var\((--[a-z0-9-]+)\)/.exec(m[1]); const flaeche = /background:\s*var\((--[a-z0-9-]+)\)/.exec(m[1]);
  return { schrift: farbe ? farbe[1] : null, flaeche: flaeche[1] };
}

test('[Toast·Nacht] „OK“ und „Fehler“ halten 4,5:1 in Tag, Nacht und Hochkontrast', () => {
  for (const art of ['ok', 'fehler']) {
    const r = regel(art);
    assert.ok(r.schrift, '.toast.' + art + ' setzt eine eigene Schriftfarbe');
    for (const e of EBENEN) {
      const k = kontrast(wert(e, r.schrift), wert(e, r.flaeche));
      assert.ok(k >= 4.5, art + '/' + e + ': ' + k.toFixed(2) + ':1');
    }
  }
});

test('[Toast·Nacht·Rot-Beweis] mit --white als Schrift fiele die Nacht durch (2,40 bzw. 2,85:1)', () => {
  assert.ok(kontrast(wert('dunkel', '--white'), wert('dunkel', '--success')) < 4.5);
  assert.ok(kontrast(wert('dunkel', '--white'), wert('dunkel', '--error')) < 4.5);
});
