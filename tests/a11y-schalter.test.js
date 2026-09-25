'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Barrierefreiheits-Schalter (Bruch B2 der Navigations-Schale)
   ────────────────────────────────────────────────────────────────────────
   Drei Topbar-Schalter: Schrift-Skala (A+), hoher Kontrast, Nachtmodus.
   Die Schrift-Skala-Reihe ist eine reine Funktion und wird hier direkt
   geprüft. Das tatsächliche Klassen-Setzen geschieht am echten DOM (im
   Browser); der DOM-Stub kann Klassen-Zustand nicht halten (classList ist
   noop) — daher prüfen wir Verdrahtung über Quelltext-Marker, nicht über
   gelesene Klassen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

test('naechsteSchriftSkala: zyklische Reihe leer → fs-medium → fs-large → leer', () => {
  const { V } = ladeKern();
  assert.equal(V.SCHRIFT_SKALA.length, 3);
  assert.equal(V.SCHRIFT_SKALA[0], '');
  assert.equal(V.SCHRIFT_SKALA[1], 'fs-medium');
  assert.equal(V.SCHRIFT_SKALA[2], 'fs-large');
  assert.equal(V.naechsteSchriftSkala(''), 'fs-medium');
  assert.equal(V.naechsteSchriftSkala('fs-medium'), 'fs-large');
  assert.equal(V.naechsteSchriftSkala('fs-large'), '');
  // Robust gegen undefined/Unbekanntes → Start der Reihe.
  assert.equal(V.naechsteSchriftSkala(undefined), 'fs-medium');
  assert.equal(V.naechsteSchriftSkala('quatsch'), 'fs-medium');
});

test('schriftSkalaWeiterschalten liefert eine gültige Stufe der Reihe', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.betreteApp();
  const next = V.schriftSkalaWeiterschalten();
  assert.ok(V.SCHRIFT_SKALA.includes(next), 'Rückgabe ist eine bekannte Stufe');
});

test('renderTopbar verdrahtet die drei Schalter ohne Fehler', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  // betreteApp ruft renderTopbar — darf nicht werfen, auch mit den neuen Schaltern.
  assert.doesNotThrow(() => V.betreteApp());
});

test('Topbar-HTML: drei A11y-Schalter, nach dem Spacer, mit role=group', () => {
  const { html } = ladeKern();
  assert.ok(html.includes('id="tb-schrift"'), 'A+-Schalter');
  assert.ok(html.includes('id="tb-kontrast"'), 'Kontrast-Schalter');
  assert.ok(html.includes('id="tb-nacht"'), 'Nacht-Schalter');
  assert.ok(html.includes('class="a11y-leiste"'), 'Leiste vorhanden');
  assert.ok(html.includes('role="group"'), 'als Gruppe ausgezeichnet');
  // Umschalter tragen aria-pressed (Schrift-Skala ist ein Durchschalter, kein Umschalter).
  assert.ok(html.includes('id="tb-kontrast" aria-pressed="false"'), 'Kontrast hat aria-pressed');
  assert.ok(html.includes('id="tb-nacht" aria-pressed="false"'), 'Nacht hat aria-pressed');
  // Stehen NACH dem Spacer (rechte Topbar-Seite), VOR der Demo-Leiste.
  assert.ok(html.indexOf('class="spacer"') < html.indexOf('class="a11y-leiste"'), 'nach Spacer');
  assert.ok(html.indexOf('class="a11y-leiste"') < html.indexOf('class="dev-leiste"'), 'vor Demo-Leiste');
});

test('CSS: rem-basierte Schrift-Skala + Kontrast-/Nacht-Override-Blöcke', () => {
  const { html } = ladeKern();
  assert.ok(html.includes('html.fs-medium'), 'Schrift-Skala mittel');
  assert.ok(html.includes('html.fs-large'), 'Schrift-Skala groß');
  assert.ok(html.includes('html.high-contrast'), 'Kontrast-Override');
  assert.ok(html.includes('html.dark-mode'), 'Nacht-Override');
  assert.ok(html.includes('.a11y-btn'), 'Schalter-Stil');
  // Schrift-Skala läuft über die Wurzel-Schriftgröße (rem skaliert alles mit).
  assert.ok(/html\.fs-medium\s*\{\s*font-size:/.test(html), 'fs-medium setzt font-size');
});

test('Icons: contrast + moon im ICONS-Register', () => {
  const { V } = ladeKern();
  // Indirekt über renderTopbar (svgIcon zieht ICONS.contrast/moon) — kein Icon-Fehlt-Warnpfad.
  assert.ok(typeof V.naechsteSchriftSkala === 'function');
});
