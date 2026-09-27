'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — A1/D46: EIN „Sichern" in der Topbar (Doppelung entfernt)
   ────────────────────────────────────────────────────────────────────────
   Vorher gab es ZWEI Speicher-Bedienelemente: den freistehenden Knopf
   #tb-speichern (alt, rechts außen) UND den Knopf in der Status-Pille
   #tb-save-status/#tb-save-knopf (D40/D41). Auf dem Handy waren beide
   sichtbar (Verwirrung). A1 entfernt den ALTEN #tb-speichern; das eine
   „Sichern" lebt jetzt nur noch in der Pille (renderSaveStatus). Seit
   Persistenz Stück 1 (U2-ADR-031) führt der Pillen-Knopf zur EHRLICHEN
   Aktion: bearbeitungSpeichern() + depotInDateiSichern() (die bewusste
   .vivodepot-Datei; im internen Modus hält depotInDateiSichern den IDB-Cache
   mit aktuell). Status ≠ Aktion — der Knopf macht die Sicherung durchführbar.

   Im passwortlosen Vorschau-Zustand übernimmt #tb-pw-hinweis das Onboarding
   (→ flowPasswortSetzen) — diese Affordanz muss erhalten bleiben.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('A1: der alte freistehende #tb-speichern-Knopf ist entfernt (keine Doppelung)', () => {
  const { html } = ladeKern();
  assert.ok(!html.includes('id="tb-speichern"'), 'kein freistehender #tb-speichern-Knopf mehr');
  assert.ok(!html.includes('id="tb-speichern-label"'), 'kein #tb-speichern-Label mehr');
});

test('A1: die Status-Pille bleibt das eine „Sichern" (Element + Knopf vorhanden)', () => {
  const { html } = ladeKern();
  assert.ok(html.includes('id="tb-save-status"'), 'Status-Pille #tb-save-status vorhanden');
  assert.ok(html.includes('id="tb-save-knopf"'), 'Pillen-Sichern #tb-save-knopf vorhanden');
});

test('A1: renderSaveStatus verdrahtet den Pillen-Knopf auf die ehrliche Datei-Aktion (Stück 1/3)', () => {
  const { html } = ladeKern();
  // Stück 1/3 (U2-ADR-031): offene Edits falten, auf Nicht-FSA den Namen sicherstellen (UI-Geste),
  // dann depotInDateiSichern() — die bewusste .vivodepot-Datei. Zug 1 (Auftrag „Speicherweg ohne
  // Datei-Picker", 09.08.2026): der vierte Zustand („unbestätigt") bekam einen ZWEITEN, kürzeren
  // Zweig (Bestätigen statt erneut Sichern) — der Handler ist seither eine Verzweigung, dieser
  // Zweig bleibt der „: async () => {"-Ast.
  const i = html.indexOf(': async () => {\n      bearbeitungSpeichern();');
  assert.ok(i > -1, 'Pillen-Knopf-Handler (Datei-Sicherung) vorhanden');
  const block = html.slice(i, i + 260);
  assert.ok(block.includes('bearbeitungSpeichern()'), 'faltet offene Edits');
  assert.ok(block.includes('_dateiNameSicherstellen()'), 'Nicht-FSA: Name vor dem Speichern sicherstellen');
  assert.ok(block.includes('depotInDateiSichern()'), 'ruft die bewusste Datei-Sicherung');
});

test('A1: Vorschau-Onboarding-Affordanz #tb-pw-hinweis bleibt erhalten', () => {
  const { html } = ladeKern();
  assert.ok(html.includes('id="tb-pw-hinweis"'), '#tb-pw-hinweis (→ flowPasswortSetzen) bleibt');
});
