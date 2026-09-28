'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die Screenshots in publiccode.yml sind die des Werkzeugs (27.09.2026)
   ────────────────────────────────────────────────────────────────────────
   tools/screenshots-oeffentlich-erzeugen.js erzeugt die Bilder aus einer
   ausgelieferten Produktdatei (Parameter, darum nicht im Sammelbefehl der
   Landung). Gehalten wird: publiccode.yml nennt in jeder Sprache genau die
   Bilder des Werkzeugs, und jedes liegt als PNG im Repo — kein Bild, das von
   Hand dazukam oder fehlt.
   ROT-BEWEIS: ein zusätzlich genanntes Bild; ein fehlendes.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { BILDER } = require('../tools/lib/screenshots-oeffentlich-bilder.js');

const REPO = path.join(__dirname, '..');
const SOLL = BILDER.map((b) => 'docs/screenshots/' + b.datei).sort();

function genannt(yml) {
  return [...yml.matchAll(/^\s*-\s*(docs\/screenshots\/[^\s#]+)\s*$/gm)].map((m) => m[1]);
}
function befund(yml, gibt) {
  const funde = [];
  const n = genannt(yml);
  const je = [...new Set(n)].sort();
  if (JSON.stringify(je) !== JSON.stringify(SOLL)) funde.push('genannt ' + je.join(', ') + ' statt ' + SOLL.join(', '));
  for (const d of je) if (!gibt(d)) funde.push(d + ' fehlt');
  return funde;
}
const istPng = (d) => { try { return fs.readFileSync(path.join(REPO, d)).subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])); } catch (_) { return false; } };

test('[Screenshots] publiccode.yml nennt genau die Bilder des Werkzeugs, und jedes ist ein PNG im Repo', () => {
  const yml = fs.readFileSync(path.join(REPO, 'publiccode.yml'), 'utf8');
  assert.equal(genannt(yml).length, SOLL.length * 2, 'Vorbedingung: in beiden Sprachen genannt');
  assert.deepEqual(befund(yml, istPng), []);
});

test('[Screenshots·Rot-Beweis] ein zusätzliches und ein fehlendes Bild fallen', () => {
  const yml = fs.readFileSync(path.join(REPO, 'publiccode.yml'), 'utf8');
  assert.equal(befund(yml + '\n      - docs/screenshots/von-hand.png\n', istPng).length, 2);
  assert.equal(befund(yml, () => false).length, SOLL.length);
});
