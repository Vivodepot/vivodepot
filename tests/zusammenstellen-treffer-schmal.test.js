'use strict';
/* Befund B13 (Rundgang Pro, 03.11.2026): in „Selbst zusammenstellen“ standen Beschriftung, Eingabe und „Aufnehmen“ einer
   Trefferzeile am Handy in einer Reihe; Wörter brachen mitten im Wort. Die Zeile muss umbrechen dürfen, und die Beschriftung
   braucht eine Startbreite, damit sie die ganze Reihe nimmt statt der Rest-Spalte.
   Geprüft an der Stilquelle und an beiden Erscheinungsbild-Modulen, in die sie gebaut wird. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const ohneKommentare = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');

function regelnFuer(css, selektor) {
  const r = [];
  for (const m of ohneKommentare(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(',').some((s) => s.trim() === selektor)) r.push(m[2]);
  }
  return r;
}

function maengel(css) {
  const f = [];
  if (!regelnFuer(css, '#zus-treffer .export-zz').some((r) => /flex-wrap\s*:\s*wrap/.test(r))) f.push('Trefferzeile bricht nicht um');
  const lab = regelnFuer(css, '#zus-treffer .export-zz-lab');
  if (!lab.some((r) => /flex\s*:\s*1\s+1\s+(?!0)[\d.]+(rem|px|em|%)/.test(r))) f.push('Beschriftung ohne Startbreite');
  if (lab.some((r) => /overflow-wrap\s*:\s*anywhere/.test(r))) f.push('Beschriftung bricht mitten im Wort');
  if (!regelnFuer(css, '#zus-treffer .zus-fuellen').some((r) => /min-width\s*:\s*0/.test(r))) f.push('Eingabe ohne min-width 0');
  return f;
}

const QUELLE = fs.readFileSync(path.join(REPO, 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');
const MODULE = ['heute', 'salbei-glas'].map((id) => [id, JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'erscheinung', 'erscheinungsbild-' + id + '-modul.json'), 'utf8')).stil.grundlage]);

test('[Zusammenstellen·schmal] die Trefferzeile bricht um, die Beschriftung nimmt die ganze Reihe (Stilquelle)', () => {
  assert.deepEqual(maengel(QUELLE), []);
});

test('[Zusammenstellen·schmal] dieselben Regeln stehen in beiden Erscheinungsbild-Modulen', () => {
  for (const [id, css] of MODULE) assert.deepEqual(maengel(css), [], id);
});

test('[Zusammenstellen·schmal·Rot-Beweis] die Regeln vor dem Fix fallen', () => {
  const alt = '.export-zz { display: flex; align-items: center; }\n.export-zz-lab { min-width: 0; overflow-wrap: anywhere; }';
  assert.deepEqual(maengel(alt), ['Trefferzeile bricht nicht um', 'Beschriftung ohne Startbreite', 'Eingabe ohne min-width 0']);
  const halb = '#zus-treffer .export-zz { flex-wrap: wrap; }\n#zus-treffer .export-zz-lab { flex: 1 1 0; overflow-wrap: anywhere; }\n#zus-treffer .zus-fuellen { min-width: 0; }';
  assert.deepEqual(maengel(halb), ['Beschriftung ohne Startbreite', 'Beschriftung bricht mitten im Wort']);
});
