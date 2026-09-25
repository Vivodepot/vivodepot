'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — tools/index-weiterleitung-erzeugen.js (Auftrag, 01.09.2026)
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { indexWeiterleitungInhalt } = require('../tools/index-weiterleitung-erzeugen.js');

const REPO = path.join(__dirname, '..');

function mitFixture(html, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'index-weiterleitung-'));
  const p = path.join(dir, 'vivodepot.html');
  fs.writeFileSync(p, html, 'utf8');
  try { return fn(p); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('[Index-Weiterleitung] leitet sofort auf ./vivodepot.html weiter', () => {
  mitFixture('<html lang="de">\n<head></head><body></body></html>', (p) => {
    const inhalt = indexWeiterleitungInhalt(p);
    assert.match(inhalt, /<meta http-equiv="refresh" content="0; url=\.\/vivodepot\.html">/);
    assert.match(inhalt, /<a href="\.\/vivodepot\.html">/, 'Fallback-Link für den Fall ohne Refresh-Unterstützung');
  });
});

test('[Index-Weiterleitung] übernimmt die Sprache aus der Zieldatei — Deutsch', () => {
  mitFixture('<html lang="de">\n<head></head><body></body></html>', (p) => {
    assert.match(indexWeiterleitungInhalt(p), /<html lang="de">/);
  });
});

test('[Index-Weiterleitung] übernimmt die Sprache aus der Zieldatei — Englisch', () => {
  mitFixture('<html lang="en">\n<head></head><body></body></html>', (p) => {
    assert.match(indexWeiterleitungInhalt(p), /<html lang="en">/);
  });
});

test('[Index-Weiterleitung·Rot-Beweis] die Sprache wird wirklich GELESEN, nicht fest verdrahtet', () => {
  // Ohne den Lese-Schritt wäre jede Ausgabe identisch, egal was die Quelle sagt —
  // dieselbe Lehre wie beim Hash-Handmessung-Befund: am echten Verhalten prüfen,
  // nicht am plausibel klingenden Code allein.
  mitFixture('<html lang="fr">\n<head></head><body></body></html>', (p) => {
    assert.match(indexWeiterleitungInhalt(p), /<html lang="fr">/,
      'eine dritte, unerwartete Sprache muss ebenso durchgereicht werden — kein Nur-de/en-Schalter');
  });
});

test('[Index-Weiterleitung·Rot-Beweis] fehlt <html lang>, wird geworfen statt geraten', () => {
  mitFixture('<html>\n<head></head><body></body></html>', (p) => {
    assert.throws(() => indexWeiterleitungInhalt(p), /Kein <html lang/);
  });
});

test('[Index-Weiterleitung] gegen den echten Kern: Wurzel-vivodepot.html ist lang="de"', () => {
  const inhalt = indexWeiterleitungInhalt(path.join(REPO, 'vivodepot.html'));
  assert.match(inhalt, /<html lang="de">/);
  assert.match(inhalt, /url=\.\/vivodepot\.html/);
});

test('[Index-Weiterleitung] enthält Titel und charset — kein leeres Gerüst', () => {
  mitFixture('<html lang="de"><head></head><body></body></html>', (p) => {
    const inhalt = indexWeiterleitungInhalt(p);
    assert.match(inhalt, /<meta charset="utf-8">/);
    assert.match(inhalt, /<title>/);
  });
});
