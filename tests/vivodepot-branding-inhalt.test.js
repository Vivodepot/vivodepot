'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Vivodepots eigene Marke als expliziter Datenwert (U2-ADR-296)
   ────────────────────────────────────────────────────────────────────────
   Zwei Dinge, nicht nur eines: (1) VIVODEPOT_BRANDING besteht dieselbe echte
   Prüfung wie jede fremde Institutions-Marke — kein Sonderpfad, keine
   Ausnahme fürs eigene Haus. (2) eine Fremdmarke-Fixture (nicht echt, muss
   nur beweisen, dass der Tausch trägt) besteht sie ebenso UND unterscheidet
   sich in jedem Feld — der Beweis, den der Auftrag verlangt: "zwei Marken,
   sichtbar verschiedene Oberfläche" beginnt an der Datenwurzel.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { VIVODEPOT_BRANDING } = require('../tools/vivodepot-branding-inhalt.js');

// Die Fremdmarke darf eine Fixture sein (Auftrag, wörtlich) — klar erfunden, nicht real,
// bewusst weit weg von Vivodepots eigenen Farbtönen (kein Grün/Gold), damit ein Diff nie an
// zufälliger Ähnlichkeit vorbeischlüpfen kann.
const FREMDMARKE_FIXTURE = Object.freeze({
  modulTyp: 'branding',
  moduleVersion: 1,
  herkunft: 'test-institut-fremdmarke',
  name: 'Test-Institut Fremdmarke',
  domain: 'test-institut-fremdmarke.example',
  farbePrimaer: '#8b1a2b',
  farbeSekundaer: '#1a3a8b',
  schriftart: 'Georgia',
  logo: null,
});

test('[U2-ADR-296] VIVODEPOT_BRANDING besteht die echte brandingModulPruefen-Prüfung, ohne Verwurf', () => {
  const { V } = ladeKern();
  const r = V.brandingModulPruefen(VIVODEPOT_BRANDING);
  assert.equal(r.gueltig, true, 'Vivodepots eigene Marke muss dieselbe Prüfung bestehen wie jede fremde');
  assert.deepEqual(Array.from(r.verworfene), [], 'kein einziges Feld darf verworfen werden');
  assert.equal(r.branding.name, 'Vivodepot');
  assert.equal(r.branding.farbePrimaer, '#4F6539');
});

test('[U2-ADR-296] die Fremdmarke-Fixture besteht dieselbe Prüfung ebenso', () => {
  const { V } = ladeKern();
  const r = V.brandingModulPruefen(FREMDMARKE_FIXTURE);
  assert.equal(r.gueltig, true);
  assert.deepEqual(Array.from(r.verworfene), []);
  assert.equal(r.branding.name, 'Test-Institut Fremdmarke');
});

test('[U2-ADR-296·Gegenprobe] beide Marken unterscheiden sich in JEDEM Feld — kein Feld bleibt zufällig gleich', () => {
  const { V } = ladeKern();
  const eigen = V.brandingModulPruefen(VIVODEPOT_BRANDING).branding;
  const fremd = V.brandingModulPruefen(FREMDMARKE_FIXTURE).branding;
  for (const feld of ['name', 'domain', 'farbePrimaer', 'farbeSekundaer', 'schriftart']) {
    assert.notEqual(eigen[feld], fremd[feld], 'Feld "' + feld + '" darf sich nicht zufällig gleichen — sonst bewiese der Tausch nichts');
  }
});

test('[U2-ADR-296·Gegenkontrolle] brandingAnwenden setzt für beide Marken sichtbar unterschiedliche CSS-Werte, nie dieselben', () => {
  const { V } = ladeKern();
  function fakeRoot() {
    return { style: { _werte: {}, setProperty(k, v) { this._werte[k] = v; }, removeProperty(k) { delete this._werte[k]; } } };
  }
  const eigen = V.brandingModulPruefen(VIVODEPOT_BRANDING).branding;
  const fremd = V.brandingModulPruefen(FREMDMARKE_FIXTURE).branding;

  const rootEigen = fakeRoot();
  V.brandingAnwenden(eigen, rootEigen);
  const rootFremd = fakeRoot();
  V.brandingAnwenden(fremd, rootFremd);

  assert.notEqual(rootEigen.style._werte['--vd-branding-primaer'], rootFremd.style._werte['--vd-branding-primaer']);
  assert.notEqual(rootEigen.style._werte['--vd-branding-sekundaer'], rootFremd.style._werte['--vd-branding-sekundaer']);
  assert.notEqual(rootEigen.style._werte['--vd-branding-schriftart'], rootFremd.style._werte['--vd-branding-schriftart']);
  assert.equal(rootEigen.style._werte['--vd-branding-primaer'], '#4F6539');
  assert.equal(rootFremd.style._werte['--vd-branding-primaer'], '#8b1a2b');
});
