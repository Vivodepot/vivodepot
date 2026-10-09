'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Eine Schriftart ohne Datei führt nie zu Serifen (Befund SCHRIFTART-OHNE-DATEI-SERIFEN, 05.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Gemessen: ein Branding-Modul mit `schriftart: "Barlow"` ohne Schriftdatei setzte `--vd-branding-schriftart: Barlow`.
   Der Browser kannte die Familie nicht, der Stapel endete auf keiner generischen Familie, und die Seite fiel auf die
   Standardschrift des Browsers zurück: eine Serifenschrift. Produktentscheidung: keine Serifen.
   Zwei Sicherungen, je eine Probe:
     (a) brandingModulPruefen nimmt eine `schriftart` nur an, wenn es für sie eine Datei gibt: ein Bildschirm-Schnitt
         (woff2) in `schriften[]` des geprüften Erscheinungsbilds, oder eine Familie des Schriftstapels, den der Kern
         ohne Marke anwendet (`--font-inter` des Erscheinungsbilds). Sonst verworfen mit Grund `schriftart-ohne-datei`.
     (b) brandingAnwenden setzt einen Stapel, der IMMER auf `sans-serif` endet, und setzt für eine Familie ohne Datei
         (etwa aus einem früher eingelassenen, gespeicherten Modul) gar nichts.
   Die Lese-App wendet keine Marken-Schrift an; ihr eigener Stapel endet auf sans-serif (letzte Probe).
   Wächter gegen die Klasse: tools/serifen-pruefen.js, Modulweg (tests/serifen-pruefen.test.js).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const REPO = path.join(__dirname, '..');
const HEUTE = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'erscheinung', 'erscheinungsbild-heute-modul.json'), 'utf8'));
const INTER_BILD = HEUTE.schriften.find((s) => s.woff2 && s.stil === 'normal');

function wurzel() {
  const werte = {};
  return { style: { _werte: werte, setProperty(k, v) { werte[k] = v; }, removeProperty(k) { delete werte[k]; } } };
}
function stapelEnde(stapel) {
  const teile = String(stapel).split(',').map((t) => t.trim());
  return teile[teile.length - 1];
}
const MODUL = (schriftart) => ({ moduleVersion: 1, farbePrimaer: '#112233', schriftart });

let _ab;
const abWerk = () => (_ab = _ab || ladeKern().V);

test('[Schriftart·Rot-Beweis] eine Schriftart ohne Datei (Georgia, Barlow) wird verworfen, mit Grund', () => {
  const V = abWerk();
  for (const name of ['Georgia', 'Barlow', 'Times New Roman']) {
    const g = V.brandingModulPruefen(MODUL(name));
    assert.equal(g.gueltig, true, name + ': die übrigen Felder bleiben gültig');
    assert.equal(g.branding.schriftart, null, name + ': nicht angenommen');
    assert.ok(g.verworfene.some((v) => v.schluessel === 'schriftart' && v.grund === 'schriftart-ohne-datei'), name + ': benannt verworfen');
  }
});

test('[Schriftart] angenommen wird, was eine Datei hat: Inter (woff2 im Erscheinungsbild) und Systemfamilien des Kern-Stapels', () => {
  const V = abWerk();
  assert.equal(V.brandingModulPruefen(MODUL('Inter')).branding.schriftart, 'Inter');
  assert.equal(V.brandingModulPruefen(MODUL('inter')).branding.schriftart, 'Inter', 'Schreibweise der Datei gilt');
  assert.equal(V.brandingModulPruefen(MODUL('Segoe UI')).branding.schriftart, 'Segoe UI');
  assert.equal(V.brandingModulPruefen(MODUL('sans-serif')).branding.schriftart, null, 'eine generische Familie ist keine Schriftart');
});

test('[Schriftart] die Ab-Werk-Marke behält ihre Schrift', () => {
  const V = abWerk();
  const g = V.brandingModulPruefen(V.AB_WERK_BRANDING);
  assert.equal(g.gueltig, true);
  assert.equal(g.branding.schriftart, 'Inter');
  assert.deepEqual(g.verworfene, []);
});

test('[Schriftart] ein Profil, das Barlow als Bildschirm-Schnitt trägt, lässt Barlow zu', () => {
  const modul = Object.assign({}, HEUTE, { schriften: HEUTE.schriften.concat([Object.assign({}, INTER_BILD, { familie: 'Barlow' })]) });
  const V = ladeKern({ erscheinungsbildModul: modul }).V;
  assert.equal(V.ERSCHEINUNGSBILD.gueltig, true, 'Vorbedingung: das Profil ist gültig');
  assert.equal(V.brandingModulPruefen(MODUL('Barlow')).branding.schriftart, 'Barlow');
  const r = wurzel();
  V.brandingAnwenden({ schriftart: 'Barlow' }, r);
  const stapel = r.style._werte['--vd-branding-schriftart'];
  assert.match(stapel, /^Barlow,/);
  assert.equal(stapelEnde(stapel), 'sans-serif');
});

test('[Schriftart·Rot-Beweis] ohne Erscheinungsbild gibt es keine Datei, also keine Schriftart', () => {
  const V = ladeKern({ ohneErscheinungsbild: true }).V;
  assert.equal(V.brandingModulPruefen(MODUL('Inter')).branding.schriftart, null);
});

test('[Schriftart·Rot-Beweis] der angewandte Stapel endet immer auf sans-serif', () => {
  const V = abWerk();
  const r = wurzel();
  V.brandingAnwenden({ schriftart: 'Inter' }, r);
  const stapel = r.style._werte['--vd-branding-schriftart'];
  assert.ok(stapel, 'gesetzt');
  assert.match(stapel, /^Inter,/);
  assert.equal(stapelEnde(stapel), 'sans-serif');
  V.brandingAnwenden({ schriftart: 'Segoe UI' }, r);
  assert.match(r.style._werte['--vd-branding-schriftart'], /^"Segoe UI",/, 'Name mit Leerzeichen in Anführungszeichen');
  assert.equal(stapelEnde(r.style._werte['--vd-branding-schriftart']), 'sans-serif');
});

test('[Schriftart·Rot-Beweis] eine gespeicherte Schriftart ohne Datei wird nicht angewandt (Rückfall auf den Kern-Stapel)', () => {
  const V = abWerk();
  const r = wurzel();
  V.brandingAnwenden({ schriftart: 'Inter' }, r);
  V.brandingAnwenden({ schriftart: 'Georgia' }, r);
  assert.equal(r.style._werte['--vd-branding-schriftart'], undefined);
  V.brandingAnwenden({ schriftart: 'Barlow; color: red' }, r);
  assert.equal(r.style._werte['--vd-branding-schriftart'], undefined, 'nur ein bekannter Familienname, kein CSS');
});

test('[Schriftart] die Lese-App wendet keine Marken-Schrift an, ihr Stapel endet auf sans-serif', () => {
  const lesen = fs.readFileSync(path.join(REPO, 'vivodepot-lesen.html'), 'utf8');
  assert.ok(!/--vd-branding-schriftart|\.schriftart\b/.test(lesen), 'kein Leseweg für schriftart');
  const stapel = (lesen.match(/font-family\s*:\s*([^;]+);/g) || []).map((z) => z.replace(/^font-family\s*:\s*/, '').replace(/;$/, ''));
  assert.ok(stapel.length > 0);
  for (const s of stapel) if (!/^var\(/.test(s.trim()) && !/monospace\s*$/.test(s)) assert.equal(stapelEnde(s), 'sans-serif', s);
});
