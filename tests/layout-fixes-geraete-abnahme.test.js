'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Layout-Fixes aus der Geräte-Abnahme (16.07.2026)
   ────────────────────────────────────────────────────────────────────────
   Fünf Layout-/Abstands-Funde aus der Mac-Safari-Geräte-Abnahme (E2/H/E,
   15.–16.07.). Reine CSS-Fixes — node kann Layout-Verhalten nicht beweisen
   (siehe CC_Bauauftrag_Layout_Fixes_2026-07-16.md). Diese Tests prüfen nur,
   dass die Regeln textlich existieren. Der Beweis ist die Geräte-Abnahme.

   F1+F2+F5 teilen sich eine gemeinsame Erkenntnis (nicht eine einzelne Regel):
   F1 ist ein reiner Abstands-/Wachstums-Fix an .liste-eintraege li. F2 und F5
   sind derselbe Container-schmal/Viewport-breit-Widerspruch an zwei
   verschiedenen Klassen (.feld-ref-picker bzw. .liste-eintrag-form
   .feld-zeile-sub) — beide vorher nur unter dem ≤760px-Viewport-Breakpoint
   umgebrochen, obwohl Modal bzw. Ref-Widget auch auf breiten Fenstern schmal
   sein können. F3 und F5 sind hingegen dieselbe Klasse (.feld-zeile-sub) —
   ein Fund, kein Zufall zweier Einzelfälle.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

// K1 (Auftrag K1/K2/K6, 09.08.2026): .liste-eintrag-zusammenfassung/.liste-eintraege li wurden
// mit ihren wortgleichen menschen-register-Gegenstücken zu je EINEM Selektor zusammengelegt (die
// Dopplung, die der F1-Nachtrag unten seit 16.07. selbst benannt hatte) — die Regex trifft jetzt
// den gemeinsamen Selektor; dieselben Eigenschaften, dieselbe berechnete Darstellung.
test('F1: .liste-eintrag-zusammenfassung wächst (flex:1) und .liste-eintraege li trägt space-3-gap', () => {
  const zus = HTML.match(/\.liste-eintrag-zusammenfassung, \.menschen-register \.liste-eintrag-text \{[^}]*\}/);
  assert.ok(zus, 'Regel gefunden');
  assert.match(zus[0], /flex:\s*1 1 auto/, 'wächst in der Flex-Zeile');
  assert.match(zus[0], /min-width:\s*0/, 'erlaubt sauberen Umbruch');
  const li = HTML.match(/\.liste-eintraege li, \.menschen-register \.liste-eintrag \{[^}]*\}/);
  assert.ok(li, 'Regel gefunden');
  assert.match(li[0], /gap:\s*var\(--space-3\)/, 'gap auf space-3 angehoben (war space-2)');
});

test('F1-Nachtrag: menschenRegisterHTML()-Markup (.menschen-register .liste-eintrag/-text/-aktionen) ist gestylt — K1 hat die Dopplung geschlossen, nicht die Deckung entfernt', () => {
  const zeile = HTML.match(/\.liste-eintraege li, \.menschen-register \.liste-eintrag \{[^}]*\}/);
  assert.ok(zeile, 'Regel gefunden (jetzt gemeinsamer Selektor mit .liste-eintraege li)');
  assert.match(zeile[0], /display:\s*flex/, 'Flex-Zeile statt unstyled block');
  assert.match(zeile[0], /gap:\s*var\(--space-3\)/, 'gleicher Abstand wie F1');
  const text = HTML.match(/\.liste-eintrag-zusammenfassung, \.menschen-register \.liste-eintrag-text \{[^}]*\}/);
  assert.ok(text, 'Regel gefunden (jetzt gemeinsamer Selektor mit .liste-eintrag-zusammenfassung)');
  assert.match(text[0], /flex:\s*1 1 auto/, 'wächst, drängt Knöpfe nach rechts');
});

test('F2: .feld-ref-picker bricht unconditional um (nicht nur ≤760px) und teilt den Platz', () => {
  const basis = HTML.match(/\.feld-ref-picker \{[^}]*\}/);
  assert.ok(basis, 'Basis-Regel gefunden');
  assert.match(basis[0], /flex-wrap:\s*wrap/, 'unconditional flex-wrap');
  const kinder = HTML.match(/\.feld-ref-picker select, \.feld-ref-picker input \{[^}]*flex:[^}]*\}/);
  assert.ok(kinder, 'select/input teilen sich den Platz (flex-basis)');
});

test('F3/F5: .liste-eintrag-form .feld-zeile-sub steht unconditional als 1fr (Label über Feld)', () => {
  const regel = HTML.match(/\.liste-eintrag-form \.feld-zeile-sub \{[^}]*\}/);
  assert.ok(regel, 'Regel gefunden');
  assert.match(regel[0], /grid-template-columns:\s*1fr/, 'Label über Feld, nicht 160px/1fr nebeneinander');
});

test('F4: .feld-hint trägt margin-bottom (eigener, kontextunabhängiger Abstand)', () => {
  const regel = HTML.match(/\.feld-hint \{ grid-column:[^}]*\}/);
  assert.ok(regel, 'Basis-Regel (grid-column) gefunden');
  assert.match(regel[0], /margin:\s*var\(--space-1\) 0 var\(--space-2\)/, 'margin-top UND margin-bottom gesetzt');
});
