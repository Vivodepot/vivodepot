'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   PDF-Schrift einer Marke prüfen (v896, Befund BRANDING-NICHT-IM-PDF, Auflagen der Gegenlesung 02.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Eine PDF-Schrift, die ein Branding- oder Erscheinungsbild-Modul mitbringt, wird nur verwendet, wenn sie
   (1) TrueType ist (jsPDF liest kein WOFF2), (2) ihr fsType weder Bit 1 (Restricted License) noch Bit 8
   (kein Subsetting) noch Bit 9 (nur Bitmap) trägt — das PDF schneidet zu und bettet ein —, und (3) die Zeichen
   trägt, die gebraucht werden. Sonst gilt die Template-Schrift des Produkts, und der Grund wird benannt.
   Fixtures: tests/fixtures/pdf-schrift/ (tools/pdf-schrift-fixturen-bauen.py).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const FX = path.join(__dirname, 'fixtures', 'pdf-schrift');
const b64 = (name) => fs.readFileSync(path.join(FX, name)).toString('base64');

test('gute TTF besteht, liefert cmap und fsType', () => {
  const k = ladeKern().V;
  const r = k.pdfSchriftPruefen(b64('gut.ttf'), 'Ödön Erdős');
  assert.equal(r.gueltig, true, JSON.stringify(r));
  assert.equal(r.grund, null);
  assert.equal(r.fsType, 0);
  assert.ok(r.cmap.has(0x151) && r.cmap.has(0x41));
});

test('Rot-Beweis fsType: Bit 1, Bit 8 und Bit 9 werden je einzeln abgelehnt', () => {
  const k = ladeKern().V;
  for (const [datei, bit] of [['fstype-bit1.ttf', 0x0002], ['fstype-bit8.ttf', 0x0100], ['fstype-bit9.ttf', 0x0200]]) {
    const r = k.pdfSchriftPruefen(b64(datei), 'A');
    assert.equal(r.gueltig, false, datei);
    assert.equal(r.grund, 'fstype', datei);
    assert.equal(r.fsType, bit, datei);
  }
});

test('Rot-Beweis Format: WOFF2 und Unsinn werden als „format“ abgelehnt', () => {
  const k = ladeKern().V;
  assert.equal(k.pdfSchriftPruefen(b64('gut.woff2'), 'A').grund, 'format');
  assert.equal(k.pdfSchriftPruefen(Buffer.from('keine Schrift').toString('base64'), 'A').grund, 'format');
  assert.equal(k.pdfSchriftPruefen('', 'A').grund, 'format');
  assert.equal(k.pdfSchriftPruefen(null, 'A').grund, 'format');
});

test('Rot-Beweis Deckung: ohne „ő“ fällt „Ödön Erdős“ durch und benennt das Zeichen', () => {
  const k = ladeKern().V;
  const r = k.pdfSchriftPruefen(b64('ohne-oe.ttf'), 'Ödön Erdős');
  assert.equal(r.gueltig, false);
  assert.equal(r.grund, 'deckung');
  assert.deepEqual(r.fehlend, ['ő']);
  // Dieselbe Schrift deckt einen Text ohne ő — die Deckung hängt am Text, nicht an der Schrift allein.
  assert.equal(k.pdfSchriftPruefen(b64('ohne-oe.ttf'), 'Ödön Erdös').gueltig, true);
});

test('Kästchen und weiches Trennzeichen zählen nicht als Lücke (sie werden gezeichnet bzw. entfernt)', () => {
  const k = ladeKern().V;
  assert.equal(k.pdfSchriftPruefen(b64('gut.ttf'), '☒ ja  ☐ nein­').gueltig, true);
});

test('cmap-Leser des Kerns stimmt mit fontTools überein (Gegenprobe, Format 4)', () => {
  const k = ladeKern().V;
  const soll = JSON.parse(fs.readFileSync(path.join(FX, 'gut.ttf.cmap.json'), 'utf8'));
  const ist = [...k.pdfSchriftPruefen(b64('gut.ttf'), '').cmap].sort((a, b) => a - b);
  assert.deepEqual(ist, soll);
});
