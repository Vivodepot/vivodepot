'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Muster E: Layout-Überlänge (15.07.2026)
   ────────────────────────────────────────────────────────────────────────
   Zwei globale CSS-Regeln gegen Layout-Bruch bei Überlänge. Node kann Layout-
   Verhalten nicht beweisen (siehe CC_Bauauftrag_Muster_E) — diese Tests prüfen
   nur, dass die Regeln textlich existieren. Der eigentliche Beweis ist die
   Geräte-Abnahme (iPhone, iOS-Safari), siehe Abschlussbericht.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

// K1 (Auftrag K1/K2/K6, 09.08.2026): .liste-eintraege li ist jetzt ein gemeinsamer Selektor mit
// .menschen-register .liste-eintrag (wortgleiche Dopplung geschlossen) — dieselbe Regel, dieselbe
// Eigenschaft, nur unter einem gemeinsamen Namen statt zwei.
test('Fix 1: .liste-eintraege li trägt flex-wrap (fehlte an keiner anderen vergleichbaren Zeile)', () => {
  const m = HTML.match(/\.liste-eintraege li, \.menschen-register \.liste-eintrag \{[^}]*\}/);
  assert.ok(m, '.liste-eintraege li-Regel gefunden');
  assert.match(m[0], /flex-wrap:\s*wrap/, 'flex-wrap:wrap ist Teil der Regel');
});

test('Fix 2: .modal rechnet die Höhe zusätzlich mit dvh (vh bleibt als Fallback stehen)', () => {
  const modalRegeln = HTML.match(/\.modal \{[^}]*\}/g) || [];
  assert.ok(modalRegeln.length >= 1, 'mindestens eine .modal-Basisregel gefunden');
  const basis = modalRegeln.find(r => r.includes('box-shadow'));
  assert.ok(basis, 'Basis-.modal-Regel gefunden');
  assert.match(basis, /max-height:\s*calc\(100vh/, 'vh-Fallback bleibt erhalten');
  assert.match(basis, /max-height:\s*calc\(100dvh/, 'dvh-Deklaration ergänzt (überschreibt vh dort, wo unterstützt)');
});

test('Fix 2: der mobile .modal-Breakpoint (≤460px) trägt ebenfalls dvh', () => {
  const mobil = HTML.match(/\.modal \{ padding: var\(--space-5\) var\(--space-4\);[^}]*\}/);
  assert.ok(mobil, 'mobile .modal-Override gefunden');
  assert.match(mobil[0], /max-height:\s*calc\(100dvh/, 'dvh auch im mobilen Override');
});
