'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-174 Teilprojekt 2, Task 4 — Eintragen-Übersicht als eigene Ansicht
   ────────────────────────────────────────────────────────────────────────
   oeffneEintragenUebersicht() setzt aktiveAnsicht auf 'kartenraster' — den
   neuen Fallzweig in renderContentInner(), der renderEintragenKartenraster()
   (Task 2, bereits verdrahtungslos vorhanden) tatsächlich zeigt.

   aktiveAnsicht selbst hat KEINEN eigenen Export — der stehende Zugriffsweg
   der ganzen Suite ist V.getViewState().aktiveAnsicht (s. adr124-zug2-
   konzeptseite.test.js, anlass-ereignis-umzug.test.js u.a.), nicht ein
   direktes V.aktiveAnsicht.

   Rot-Beweis: vor der Implementierung lief diese Datei mit
   `TypeError: V.oeffneEintragenUebersicht is not a function` (beide Fälle unten,
   da beide die Funktion vor jeder Prüfung aufrufen) — erst nach Task 4 grün.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Eintragen-Übersicht] oeffneEintragenUebersicht setzt aktiveAnsicht auf kartenraster', () => {
  const { V } = ladeKern();
  V.oeffneEintragenUebersicht();
  assert.equal(V.getViewState().aktiveAnsicht, 'kartenraster');
});

// Der DOM-Stub liefert c.querySelectorAll() unbedingt [] (s. load-kern.js:133) — die
// tatsächliche Klick-Verdrahtung der Karten (data-sektor → oeffneSektor()) kann hier NICHT
// geprüft werden, das übernimmt tests/e2e/breakfast-bottom-tabs.spec.js am echten DOM.
// Hier wird nur geprüft, dass renderContentInner() den Kartenraster-Zweig tatsächlich
// erreicht und den content-narrow-Wrapper (Vorbild renderVerwalteteDepots()) einfügt.
test('[Eintragen-Übersicht] renderContentInner rendert das Karten-Raster in den content-narrow-Wrapper', () => {
  const { V, document } = ladeKern();
  V.oeffneEintragenUebersicht();
  const html = document.getElementById('content').innerHTML;
  assert.match(html, /class="content-narrow"/);
  assert.ok((html.match(/class="bereich-karte"/g) || []).length > 0, 'mindestens eine Bereichs-Karte muss gerendert sein');
});
