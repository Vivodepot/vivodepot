'use strict';
/* glas-bezugsrahmen.test.js — die Personen-Auswahl rechnet den Bezugsrahmen ab (07.10.2026, Befund REFM-VORSCHLAEGE-IM-GLAS)
   Ein Vorfahr mit backdrop-filter (Glas-Karten, Glas-Dialog) wird zum Bezugsrahmen für position: fixed. Die Personen-Auswahl
   setzte left/top in Fensterkoordinaten und lag in einer Glas-Karte bei (844, −103) statt unter dem Feld. Statisch gehalten:
   positionieren() zieht den Versatz des Bezugsrahmens ab, und die offene Liste hebt ihre Karte über die nächste. Im Browser
   gemessen in tests/e2e/kopfleiste-menue-oberstes.spec.js ([Glas·Personen-Auswahl], mit Rot-Beweis). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const GRUNDLAGE = fs.readFileSync(path.join(REPO, 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');

function befunde(kern, css) {
  const f = [];
  const pos = /const positionieren = \(\) => \{[\s\S]{0,700}?\n      \};/.exec(kern);
  if (!pos) return ['positionieren() nicht gefunden'];
  if (!/const v = bezugVersatz\(\);/.test(pos[0]) || !/r\.left - v\.x/.test(pos[0]) || !/r\.bottom \+ 3 - v\.y/.test(pos[0])) f.push('positionieren() zieht den Bezugsrahmen nicht ab');
  if (!/const bezugVersatz = \(\) => \{[\s\S]{0,400}backdropFilter/.test(kern)) f.push('bezugVersatz() erkennt backdrop-filter nicht');
  if (!/\.feldgruppen-karte:has\(\.refm-vorschlaege:not\(\[hidden\]\)\)[^{]*\{[^}]*z-index:\s*70/.test(css)) f.push('die offene Liste hebt ihre Karte nicht');
  return f;
}

test('[Glas·Bezugsrahmen] die Personen-Auswahl zieht den Bezugsrahmen ab und hebt ihre Karte', () => {
  assert.deepEqual(befunde(KERN, GRUNDLAGE), []);
});

test('[Glas·Bezugsrahmen·Rot-Beweis] die Fensterrechnung allein und eine fehlende Hebung fallen auf', () => {
  const alt = KERN.replace("liste.style.left = Math.round(r.left - v.x) + 'px';", "liste.style.left = Math.round(r.left) + 'px';");
  assert.notEqual(alt, KERN, 'die Mutation greift');
  assert.deepEqual(befunde(alt, GRUNDLAGE), ['positionieren() zieht den Bezugsrahmen nicht ab']);
  assert.deepEqual(befunde(KERN, GRUNDLAGE.replace(/z-index: 70;/, 'z-index: auto;')), ['die offene Liste hebt ihre Karte nicht']);
});
