'use strict';
/* kopfleiste-ebene.test.js — die Kopfleiste trägt in jedem ausgelieferten Erscheinungsbild eine eigene Ebene (07.10.2026)
   Befund KOPFLEISTE-MENUE-UNTER-INHALT: setzt ein Profil backdrop-filter auf die Kopfleiste, wird sie ein eigener Stapelkontext.
   Ohne eigene Ebene zählte der z-index ihrer Aufklapp-Menüs nur darin, und die später gezeichneten Glas-Karten lagen darüber —
   „Sicherungskopie erstellen“ war sichtbar, aber nicht klickbar. Diese Probe hält statisch, was die E2E-Probe
   tests/e2e/kopfleiste-menue-oberstes.spec.js im Browser misst: in jedem Modul unter tools/erscheinung/ setzt `grundlage` auf
   .topbar `position: relative; z-index: 95`, und kein Profil-Teil nimmt das zurück (z-index auto/kleiner, position static). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ORDNER = path.join(__dirname, '..', 'tools', 'erscheinung');
const MODULE = fs.readdirSync(ORDNER).filter((d) => /^erscheinungsbild-.+-modul\.json$/.test(d));
const EBENE = 95;

/* Regeln, deren Selektorliste die Kopfleiste selbst trifft (nicht ein Kind): Selektor endet auf .topbar */
function topbarRegeln(css) {
  const aus = [];
  for (const m of String(css).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(',').some((s) => /\.topbar\s*$/.test(s.trim()))) aus.push(m[2]);
  }
  return aus;
}

function befunde(stil) {
  const f = [];
  const grund = topbarRegeln(stil.grundlage || '');
  if (!grund.some((r) => /position\s*:\s*relative/.test(r) && new RegExp('z-index\\s*:\\s*' + EBENE + '\\b').test(r))) f.push('grundlage: .topbar ohne position: relative; z-index: ' + EBENE);
  for (const [teil, css] of Object.entries(stil)) {
    if (teil === 'grundlage') continue;
    for (const r of topbarRegeln(css)) {
      const z = /z-index\s*:\s*([^;]+)/.exec(r);
      if (z && !(Number(z[1]) >= EBENE)) f.push(teil + ': .topbar z-index ' + z[1].trim());
      if (/position\s*:\s*static/.test(r)) f.push(teil + ': .topbar position static');
    }
  }
  return f;
}

test('[Kopfleiste·Ebene] jedes ausgelieferte Erscheinungsbild gibt der Kopfleiste eine eigene Ebene über dem Inhalt', () => {
  assert.ok(MODULE.length >= 2, 'Voraussetzung: heute und mindestens ein weiteres Modul');
  for (const d of MODULE) {
    const stil = JSON.parse(fs.readFileSync(path.join(ORDNER, d), 'utf8')).stil || {};
    assert.deepEqual(befunde(stil), [], d);
  }
});

test('[Kopfleiste·Ebene·Rot-Beweis] fehlende Ebene in grundlage und ein Profil, das sie zurücknimmt, fallen auf', () => {
  const echt = JSON.parse(fs.readFileSync(path.join(ORDNER, 'erscheinungsbild-salbei-glas-modul.json'), 'utf8')).stil;
  const ohne = Object.assign({}, echt, { grundlage: echt.grundlage.replace(/position:\s*relative;\s*z-index:\s*95;/, '') });
  assert.notEqual(ohne.grundlage, echt.grundlage, 'die Mutation greift');
  assert.equal(befunde(ohne).length, 1);
  const zurueck = Object.assign({}, echt, { probe: 'html body .topbar { z-index: auto; }' });
  assert.deepEqual(befunde(zurueck), ['probe: .topbar z-index auto']);
  assert.deepEqual(befunde(Object.assign({}, echt, { probe: '.topbar .btn { z-index: 1; }' })), [], 'ein Kind der Kopfleiste ist nicht gemeint');
});
