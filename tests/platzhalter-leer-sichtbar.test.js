'use strict';
/* Ein leeres Feld sieht auf einen Blick leer aus (Abnahme v998: Beispielwerte wie „0151 12345678“ und „Lindenweg 4“ standen in
   Wertfarbe und Wertgröße, das Feld wirkte ausgefüllt). Geprüft an den Tönen beider Erscheinungsbilder, hell und Nacht: die
   Platzhalterfarbe weicht von der Wertfarbe ab — der Wert hat mindestens 2,5-mal so viel Kontrast zur Feldfläche wie der Platzhalter —,
   und der Platzhalter hält WCAG 1.4.3 (4,5:1). Rot-Beweis: der Stand davor (--ink3) fällt durch. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const GRUNDLAGE = fs.readFileSync(path.join(ROOT, 'tools/erscheinung/stil/grundlage.css'), 'utf8');
const BILDER = ['heute', 'salbei-glas'].map((id) => [id, fs.readFileSync(path.join(ROOT, 'tools/erscheinung', id + '.css'), 'utf8')]);

/* Rein: die Tokenwerte eines Blocks (`:root {` oder `html.dark-mode {`), Verweise var(--x) aufgelöst. */
function toene(css, kopf) {
  const a = css.indexOf(kopf + ' {');
  assert.ok(a >= 0, 'Block ' + kopf);
  const innen = css.slice(a, css.indexOf('}', a)).replace(/\/\*[\s\S]*?\*\//g, '');
  const t = {};
  for (const m of innen.matchAll(/(--[\w-]+):\s*([^;]+);/g)) t[m[1]] = m[2].trim();
  return t;
}
const rgb = (h) => { const x = h.replace('#', ''); const v = x.length === 3 ? x.split('').map((c) => c + c).join('') : x; return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)); };
const lum = (c) => { const l = c.map((x) => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
const kontrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => p - q); return (y + 0.05) / (x + 0.05); };

function aufloesen(wert, t, tiefe = 0) {
  const m = /^var\((--[\w-]+)\)$/.exec(wert);
  if (m && tiefe < 5) return aufloesen(t[m[1]], t, tiefe + 1);
  return wert;
}

/* Rein: die Platzhalterfarbe aus der Regel, gegen die Töne gerechnet (var(--x) oder color-mix(in srgb, var(--a) p%, var(--b))). */
function platzhalterRgb(regelFarbe, t) {
  const mix = /^color-mix\(in srgb, var\((--[\w-]+)\) (\d+)%, var\((--[\w-]+)\)\)$/.exec(regelFarbe);
  if (mix) {
    const a = rgb(aufloesen(t[mix[1]], t)), b = rgb(aufloesen(t[mix[3]], t)), p = Number(mix[2]) / 100;
    return a.map((x, i) => x * p + b[i] * (1 - p));
  }
  return rgb(aufloesen(regelFarbe, t));
}

function funde(grundlage) {
  const r = /\n  input::placeholder, textarea::placeholder \{ color: ([^;]+);/.exec(grundlage);
  const rn = /html\.dark-mode input::placeholder, html\.dark-mode textarea::placeholder \{ color: ([^;]+);/.exec(grundlage);
  assert.ok(r, 'Platzhalter-Regel gefunden');
  const aus = [];
  for (const [id, css] of BILDER) {
    const hell = toene(css, ':root');
    for (const [modus, t] of [['hell', hell], ['Nacht', Object.assign({}, hell, toene(css, 'html.dark-mode'))]]) {
      const flaeche = rgb(aufloesen(t['--feld-flaeche'], t));
      const wert = kontrast(rgb(aufloesen(t['--ink'], t)), flaeche);
      const platz = kontrast(platzhalterRgb((modus === 'Nacht' && rn ? rn : r)[1].trim(), t), flaeche);
      if (platz < 4.5) aus.push(id + ' ' + modus + ': Platzhalter unter 4,5:1 (' + platz.toFixed(2) + ')');
      if (wert < 2.5 * platz) aus.push(id + ' ' + modus + ': Platzhalter zu nah an der Wertfarbe (' + wert.toFixed(2) + ' zu ' + platz.toFixed(2) + ')');
    }
  }
  return aus;
}

test('[Platzhalter] heller als ein Wert und lesbar, in beiden Erscheinungsbildern, hell und Nacht', () => {
  assert.deepEqual(funde(GRUNDLAGE), []);
});

test('[Platzhalter·Rot-Beweis] der Stand davor (--ink3, fast Wertfarbe) fällt durch', () => {
  const alt = GRUNDLAGE.replace(/(\n  input::placeholder, textarea::placeholder \{ color: )[^;]+;/, '$1var(--ink3);').replace(/\n  html\.dark-mode input::placeholder[^\n]*/, '');
  assert.ok(funde(alt).some((f) => f.includes('zu nah an der Wertfarbe')));
});
