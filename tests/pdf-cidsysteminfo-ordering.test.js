'use strict';
/* ════════════════════════════════════════════════════════════════════════
   CIDSystemInfo der eingebetteten Schriften: /Ordering (Identity), nicht der CMap-Name (05.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Befund PDF-CIDSYSTEMINFO-ORDERING: jsPDF 4.2.1 schrieb /Ordering (Identity-H) — den Namen des CMaps als
   Zeichensammlung. poppler meldete im öffentlichen Lauf „Unknown character collection 'Adobe-Identity-H'“. Der Kern
   trägt einen benannten Patch (Kommentar VIVODEPOT-PATCH im jsPDF-Block, THIRD_PARTY_LICENSES Eintrag 1, SBOM).
   Diese Probe hält den Patch am Text fest und rechnet den Ausdruck nach; das echte PDF prüft
   tests/e2e/pdf-cidsysteminfo-ordering.spec.js (mit poppler).
   ROT-BEWEIS: der Ausdruck von jsPDF 4.2.1 liefert für Identity-H die falsche Sammlung.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const UPSTREAM = 'i("/Ordering ("+n.encoding+")")';
const GEPATCHT = 'i("/Ordering ("+("Identity-H"===n.encoding||"Identity-V"===n.encoding?"Identity":n.encoding)+")")';

function ordering(ausdruck, encoding) {
  const mitte = ausdruck.slice('i("/Ordering ("+'.length, -'+")")'.length);
  return new Function('n', 'return ' + mitte)({ encoding });   // nur der eine Ausdruck aus dem Kern, kein Kern-Code sonst
}

test('[PDF·Ordering] der jsPDF-Block trägt genau den benannten Patch, den Ausdruck von 4.2.1 nicht mehr', () => {
  assert.equal(KERN.split(GEPATCHT).length - 1, 1, 'der gepatchte Ausdruck steht genau einmal');
  assert.equal(KERN.split(UPSTREAM).length - 1, 0, 'der Ausdruck von jsPDF 4.2.1 steht nicht mehr');
  assert.match(KERN, /VIVODEPOT-PATCH \(05\.10\.2026, Befund PDF-CIDSYSTEMINFO-ORDERING\)/);
  assert.equal((KERN.match(/\/Ordering \("\+/g) || []).length, 1, 'kein zweiter Ort baut /Ordering aus einem Wert');
});

test('[PDF·Ordering] Identity-H und Identity-V ergeben die Sammlung Identity, andere Kodierungen bleiben', () => {
  assert.equal(ordering(GEPATCHT, 'Identity-H'), 'Identity');
  assert.equal(ordering(GEPATCHT, 'Identity-V'), 'Identity');
  assert.equal(ordering(GEPATCHT, 'WinAnsiEncoding'), 'WinAnsiEncoding');
});

test('[PDF·Ordering·Rot-Beweis] der Ausdruck von jsPDF 4.2.1 liefert den CMap-Namen', () => {
  assert.equal(ordering(UPSTREAM, 'Identity-H'), 'Identity-H');
});
