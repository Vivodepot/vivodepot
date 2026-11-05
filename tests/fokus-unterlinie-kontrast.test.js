'use strict';
/* Fokus im Eingabefeld (Entscheidung 29.10.2026, am 30.10.2026 bestätigt: kein Ring um das Feld). Text-, Auswahl- und mehrzeilige
   Felder zeigen im Fokus nur ihre Unterkante, ohne Rahmen, ohne Abstand, ohne Hof: in Ruhe 1px, im Fokus 2px in der Akzentfarbe —
   hell --salbei-dunkel, nachts --salbei-nacht —, im hohen Kontrast 3px in --ink, das dort in beiden Erscheinungsbildern Schwarz ist (Token statt Farbwert, tests/design-treue.test.js). Die Regeln stehen im <style id="schutz-stil"> des
   Kerns. Geprüft wird je Ebene des Erscheinungsbilds „Salbei mit Glas“ (hell, dunkel, hoher Kontrast): die Linie hat gegen beide
   angrenzenden Flächen — Feldfläche darüber, Karte darunter — mindestens 3:1 (WCAG 1.4.11). Knöpfe behalten den Rahmen der
   allgemeinen :focus-visible-Regel. Im Browser hält es die Probe zu Feldschrift und Entsperrfeld; diese Probe liest die Quellen als
   Text. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseFarbe: rgbFarbe, ueber, verhaeltnis } = require('../tools/lib/kontrast.js');

const REPO = path.join(__dirname, '..');
const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const modul = JSON.parse(fs.readFileSync(path.join(REPO, 'tools/erscheinung/erscheinungsbild-salbei-glas-modul.json'), 'utf8'));

const SCHUTZ = '\n<style id="schutz-stil">\n';
const schutzText = (html) => { const a = html.indexOf(SCHUTZ); return a < 0 ? '' : html.slice(a, html.indexOf('</style>', a)); };

// Die Tokens stehen als #rrggbb, die getönten Flächen als rgba(); tools/lib/kontrast.js liest nur rgb()/rgba().
const parseFarbe = (s) => {
  const h = String(s).trim().match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return h ? { r: parseInt(h[1], 16), g: parseInt(h[2], 16), b: parseInt(h[3], 16), a: 1 } : rgbFarbe(s);
};

// Ein Token der Ebene, Erbe aus der Basis, var() aufgelöst.
function token(name, ebene) {
  const w = (modul[ebene] && modul[ebene][name]) || modul.basis[name];
  if (w === undefined) throw new Error(`Token ${name} fehlt (${ebene})`);
  const m = String(w).trim().match(/^var\((--[\w-]+)\)$/);
  return m ? token(m[1], ebene) : String(w).trim();
}

// Die Feldfläche, wie „Salbei mit Glas“ sie über die Karte (--white) legt: hell und dunkel getönt, hoher Kontrast deckend.
function feldTonung(ebene) {
  const sg = modul.stil['salbei-glas'];
  const re = ebene === 'dunkel'
    ? /html\.dark-mode:not\(\.high-contrast\) :is\(\.content, \.modal, \.suche-feld\) :is\(input[^{]*\{ background-color: (rgba\([^)]+\))/
    : /html:not\(\.high-contrast\) :is\(\.content, \.modal, \.suche-feld\) :is\(input[^{]*\{[^}]*background-color: (rgba\([^)]+\))/;
  return ebene === 'hochkontrast' ? null : (sg.match(re) || [])[1];
}

function flaechen(ebene) {
  const karte = parseFarbe(token('--white', ebene));
  const feld = ebene === 'hochkontrast' ? parseFarbe(token('--feld-flaeche', ebene)) : ueber(parseFarbe(feldTonung(ebene)), karte);
  return { feld, karte };
}

/* Die Fokusregeln der Eingabefelder im schutz-stil (Grundregel und Nachtregel): gibt die Mängel zurück (leer = in Ordnung). */
function maengel(schutz) {
  const zeilen = schutz.split('\n');
  const regel = zeilen.find((z) => /^input:not\(\[type="checkbox"\]\)[^{]*:focus-visible, select:focus-visible, textarea:focus-visible \{/.test(z));
  if (!regel) return ['keine Fokusregel für input/select/textarea im schutz-stil'];
  const f = [];
  const kopf = regel.slice(0, regel.indexOf('{'));
  for (const t of ['button', 'submit', 'reset', 'image', 'checkbox', 'radio']) if (!kopf.includes(`:not([type="${t}"])`)) f.push(`type=${t} nicht ausgenommen`);
  if (!/outline: none !important;/.test(regel)) f.push('Rahmen (outline) nicht entfernt');
  if (!/border-bottom-color: var\(--salbei-dunkel\) !important;/.test(regel)) f.push('Unterlinie nicht in der Akzentfarbe');
  if (!/box-shadow: inset 0 -1px 0 var\(--salbei-dunkel\) !important;/.test(regel)) f.push('Unterlinie nicht 2px (1px Innenschatten)');
  const nacht = zeilen.find((z) => /^html\.dark-mode :is\(input:not\(\[type="checkbox"\]\)[^{]*, select, textarea\):focus-visible \{/.test(z));
  if (!nacht) f.push('keine Nachtregel');
  else if (!/border-bottom-color: var\(--salbei-nacht\) !important; box-shadow: inset 0 -1px 0 var\(--salbei-nacht\) !important;/.test(nacht)) f.push('Nachtregel nicht 2px in --salbei-nacht');
  const hk = zeilen.find((z) => /^html\.high-contrast :is\(input:not\(\[type="checkbox"\]\)[^{]*, select, textarea\):focus-visible \{/.test(z));
  if (!hk) f.push('keine Regel für hohen Kontrast');
  else if (!/border-bottom-color: var\(--ink\) !important; box-shadow: inset 0 -2px 0 var\(--ink\) !important;/.test(hk)) f.push('hoher Kontrast nicht 3px in --ink');
  if (/:focus-visible \{ box-shadow: 0 0 0 /.test(schutz)) f.push('Hof um das Feld');
  return f;
}

// Die Akzentfarbe der Linie je Ebene, wie die Regeln oben sie setzen.
const AKZENT = { basis: '--salbei-dunkel', dunkel: '--salbei-nacht', hochkontrast: '--ink' };

function kontrastMaengel(ebene, fokus = parseFarbe(AKZENT[ebene].startsWith('#') ? AKZENT[ebene] : token(AKZENT[ebene], ebene))) {
  const { feld, karte } = flaechen(ebene);
  return [['Feldfläche', feld], ['Karte', karte]]
    .map(([n, g]) => [n, verhaeltnis(fokus, g)])
    .filter(([, k]) => !(k >= 3)).map(([n, k]) => `${ebene}: Linie gegen ${n} ${k.toFixed(2)}:1`);
}

const EBENEN = ['basis', 'dunkel', 'hochkontrast'];

test('hoher Kontrast: --ink ist in beiden Erscheinungsbildern Schwarz, die Linie also 3px Schwarz', () => {
  for (const id of ['heute', 'salbei-glas']) {
    const m = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'erscheinung', `erscheinungsbild-${id}-modul.json`), 'utf8'));
    assert.equal(m.hochkontrast['--ink'], '#000000', id);
  }
});

test('der schutz-stil trägt die Fokusregel der Eingabefelder: ohne Rahmen, Unterkante 2px in der Akzentfarbe, nachts und im hohen Kontrast eigene', () => {
  assert.deepEqual(maengel(schutzText(kern)), []);
});

test('die allgemeine :focus-visible-Regel (Knöpfe, Menüs, Links) behält ihren Rahmen', () => {
  assert.match(schutzText(kern), /\n:focus-visible \{ outline: var\(--fokus-breite\) solid var\(--fokus\) !important; outline-offset: 2px !important; \}/);
});

for (const ebene of EBENEN) {
  test(`${ebene}: in Ruhe 1px (--feld-rahmen), im Fokus 2px (dazu 1px Innenschatten)`, () => {
    assert.match(token('--feld-rahmen', ebene), /^1px solid /);
  });
  test(`${ebene}: Linie in ${AKZENT[ebene]} gegen Feldfläche und Karte ≥ 3:1`, () => {
    assert.deepEqual(kontrastMaengel(ebene), []);
  });
}

test('[Rot-Beweis] Rahmen zurück, Linie entfernt, 3px Tinte wie vorher, ohne Nachtregel oder Linie in Feldfarbe fällt', () => {
  const s = schutzText(kern);
  assert.ok(maengel(s.replace(/(textarea:focus-visible \{ )outline: none !important;/, '$1outline: var(--fokus-breite) solid var(--fokus) !important;')).includes('Rahmen (outline) nicht entfernt'));
  const ohneLinie = maengel(s.replace(/ border-bottom-color: var\(--salbei-dunkel\) !important; box-shadow: [^;]+;/, ''));
  assert.ok(ohneLinie.includes('Unterlinie nicht in der Akzentfarbe') && ohneLinie.includes('Unterlinie nicht 2px (1px Innenschatten)'), ohneLinie.join(' | '));
  const vorher = maengel(s.replace('border-bottom-color: var(--salbei-dunkel) !important; box-shadow: inset 0 -1px 0 var(--salbei-dunkel) !important;',
    'border-bottom-color: var(--fokus) !important; box-shadow: inset 0 calc(-1 * var(--fokus-breite)) 0 var(--fokus) !important;'));
  assert.ok(vorher.includes('Unterlinie nicht 2px (1px Innenschatten)'), vorher.join(' | '));
  assert.ok(maengel(s.replace(/\nhtml\.dark-mode :is\(input[^\n]*/, '')).includes('keine Nachtregel'));
  assert.ok(maengel(s.replace(/\nhtml\.high-contrast :is\(input[^\n]*/, '')).includes('keine Regel für hohen Kontrast'));
  assert.ok(maengel(s + '\n:focus-visible { box-shadow: 0 0 0 2px var(--white); }').includes('Hof um das Feld'));
  assert.equal(kontrastMaengel('dunkel', parseFarbe(token('--salbei-dunkel', 'dunkel'))).length, 2, 'nachts --salbei-dunkel statt --salbei-nacht');
  assert.deepEqual(maengel(s.replace(/\ninput:not\(\[type="checkbox"\]\)[^\n]*/, '')), ['keine Fokusregel für input/select/textarea im schutz-stil']);
  for (const ebene of EBENEN) assert.equal(kontrastMaengel(ebene, flaechen(ebene).feld).length, 2, ebene);
});
