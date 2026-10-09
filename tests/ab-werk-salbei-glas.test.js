'use strict';
/* ab-werk-salbei-glas.test.js — Ab Werk tragen die vier Produkte das Profil „Salbei mit Glas“ (U2-ADR-473 W5a, 06.10.2026)
   Schließt SUBDEPOT-FELDLABEL-AKZENTTEXT-KONTRAST: im Sub-Depot standen Feldbeschriftung und Hinweis in der Akzentfarbe des
   Sub-Depots (4,29:1 auf hafer). Das Profil setzt sie in der Vollmacht-Ansicht auf --ink2. Die Pixel-Kontrast-Probe
   (tests/e2e/pixel-kontrast.spec.js) misst das am Bild in jeder wählbaren Farbe; diese Probe hält, dass die Regel ab Werk wirkt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const VP = require('../tools/lib/vier-produkte.js');

const SUB_DEPOT_LABEL = /#app\.modus-vollmacht\.vm-akzent \.feld-label,[^{]*\.feld-hint \{ color: var\(--ink2\); \}/;
const stilText = (pfad) => Object.values(require(pfad).stil).join('\n');
const lin = (h) => { const v = parseInt(h, 16) / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const L = (hex) => { const x = hex.replace('#', ''); return 0.2126 * lin(x.slice(0, 2)) + 0.7152 * lin(x.slice(2, 4)) + 0.0722 * lin(x.slice(4, 6)); };
const kontrast = (a, b) => { const [p, q] = [L(a), L(b)].sort((m, n) => n - m); return (p + 0.05) / (q + 0.05); };

test('[Ab Werk] alle vier Produkte tragen das Profil Salbei mit Glas', () => {
  assert.equal(VP.PRODUKTE.length, 4);
  for (const p of VP.PRODUKTE) assert.equal(p.erscheinungsbildModulPfad, VP.ERSCHEINUNGSBILD_AB_WERK_PFAD, p.slug);
  assert.notEqual(VP.ERSCHEINUNGSBILD_AB_WERK_PFAD, VP.ERSCHEINUNGSBILD_HEUTE_PFAD);
});

test('[Ab Werk] im Sub-Depot stehen Feldbeschriftung und Hinweis in --ink2, nicht in der Akzentfarbe', () => {
  assert.match(stilText(VP.ERSCHEINUNGSBILD_AB_WERK_PFAD), SUB_DEPOT_LABEL);
  const basis = require(VP.ERSCHEINUNGSBILD_AB_WERK_PFAD).basis;
  assert.ok(kontrast(basis['--ink2'], basis['--cream']) >= 4.5, '--ink2 auf --cream unter 4,5:1');
});

test('[Ab Werk·Rot-Beweis] das bisherige Profil hat die Regel nicht — dort stand der Befund', () => {
  assert.doesNotMatch(stilText(VP.ERSCHEINUNGSBILD_HEUTE_PFAD), SUB_DEPOT_LABEL);
});
