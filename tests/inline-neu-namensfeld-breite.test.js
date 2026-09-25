'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Namensfeld im Kind-Inline-Editor zu schmal (Nachbesserung 16.07.2026)
   ────────────────────────────────────────────────────────────────────────
   Restfund zu F5: fünf Elemente (Name, Datum, Geburtsjahr, zwei Knöpfe) teilten
   sich die .inline-neu-Zeile mit gleichem flex:1 auf allen Inputs — das
   Namensfeld bekam dadurch keinen Vorrang und schnitt normale Vornamen ab
   („Emiliane" passte nicht). Node prüft nur die CSS-Regeln (Klassen/Werte);
   der visuelle Beweis ist die Geräte-Abnahme.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

test('.inline-neu bricht unconditional um (wie F1/F2: Umbruch statt Kollision)', () => {
  const basis = HTML.match(/\.inline-neu \{[^}]*\}/);
  assert.ok(basis, 'Basis-Regel gefunden');
  assert.match(basis[0], /flex-wrap:\s*wrap/, 'unconditional flex-wrap, nicht nur ≤760px');
});

test('Namensfeld bekommt mehr Flex-Anteil + Mindestbreite als die schmalen Felder', () => {
  const nameRegel = HTML.match(/\.inline-neu input\[data-neu-name\] \{[^}]*\}/);
  assert.ok(nameRegel, 'Namensfeld-Regel gefunden');
  assert.match(nameRegel[0], /flex:\s*2 1 160px/, 'größerer Flex-Anteil als die übrigen Inputs');
  assert.match(nameRegel[0], /min-width:\s*140px/, 'Mindestbreite reicht für normale Vornamen (z. B. „Emiliane")');

  const schmalRegel = HTML.match(/\.inline-neu input:not\(\[data-neu-name\]\) \{[^}]*\}/);
  assert.ok(schmalRegel, 'Regel für die schmalen Felder (Datum/Geburtsjahr) gefunden');
  assert.match(schmalRegel[0], /flex:\s*0 1 auto/, 'schmale Felder bleiben kompakt statt gequetscht');
});

test('Kein redundanter Mobile-Duplikat-Eintrag mehr für .inline-neu (Basis-Regel deckt es ab)', () => {
  assert.doesNotMatch(HTML, /\.inline-neu \{ flex-wrap: wrap; \}/, 'kein doppelt gepflegter Mobile-Sonderfall mehr');
});
