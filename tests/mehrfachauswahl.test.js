'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Feldtyp `mehrfachauswahl` (U2-ADR-063) — Render-Typ (Checkboxen, Array-Wert).
   Seit U2-ADR-064 hat der Typ KEINEN Live-Nutzer mehr: vollmachtsGrundlage wurde
   vom Vollmacht-liste-Record abgelöst (ADR-063 dafür supersediert). Der generische
   Render-/Validier-Mechanismus BLEIBT erhalten („dormant") und wird hier gegen ein
   synthetisches Feld geprüft, damit er jederzeit wieder einsetzbar ist. Die
   Anzeige-Auflage (nie das rohe Array) bleibt Vertrag. Die Skalar→Array→liste-
   Migration der einstigen Anwendung ist jetzt in tests/vollmachten-liste.test.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Synthetisches mehrfachauswahl-Feld — der Typ hat produktiv keinen Nutzer mehr.
const SYNTH = { id: 'test_multi', label: 'Test-Mehrfach', typ: 'mehrfachauswahl', optionen: [
  { wert: 'a', label: 'Apfel' }, { wert: 'b', label: 'Birne' }, { wert: 'c', label: 'Kirsche' },
] };

test('Auflage 1 — feldWertText: Array → Labels „, "-getrennt, nie roh', () => {
  const { V } = ladeKern();
  assert.equal(V.feldWertText(SYNTH, ['a', 'c']), 'Apfel, Kirsche');
  assert.equal(V.feldWertText(SYNTH, ['b']), 'Birne');
  assert.ok(!/[\[\]"]/.test(V.feldWertText(SYNTH, ['a', 'b'])), 'keine Array-Klammern/Quotes im Text');
});

test('Auflage 1 — feldWertHTML: escaped Labels, nie das rohe Array', () => {
  const { V } = ladeKern();
  const html = V.feldWertHTML(SYNTH, ['b', 'c']);
  assert.ok(html.includes('Birne') && html.includes('Kirsche'), 'beide Labels');
  assert.ok(!html.includes('['), 'kein rohes Array im HTML');
});

test('leeres Array = leer (feldEingetragen false); nicht-leeres true', () => {
  const { V } = ladeKern();
  assert.equal(V.feldEingetragen(SYNTH, []), false);
  assert.equal(V.feldEingetragen(SYNTH, ['a']), true);
});

test('feldInputHTML: Pillen-Knöpfe (type=button) mit data-edit-multi; gewählte tragen aria-pressed=true + .aktiv', () => {
  // Screenshot-Review Befund C (27.08.2026): Checkbox-Zeilen durch antippbare Pillen-Knöpfe
  // ersetzt (feldInputHTML case 'mehrfachauswahl'). Datenmodell (Array der gewählten `wert`)
  // bleibt unverändert — nur die Bedienoberfläche wechselt.
  const { V } = ladeKern();
  const html = V.feldInputHTML(SYNTH, ['a', 'c']);
  assert.ok(!html.includes('type="checkbox"'), 'keine Checkboxen mehr');
  assert.ok(html.includes('<button type="button"'), 'Pillen-Knöpfe');
  assert.ok(html.includes('data-edit-multi="test_multi"'), 'Sammel-Marker bleibt');
  assert.ok(/value="a"[^>]*aria-pressed="true"/.test(html), 'a aria-pressed=true');
  assert.ok(/class="feld-mehrfach-pill aktiv"[^>]*value="a"/.test(html), 'a trägt .aktiv');
  assert.ok(/value="c"[^>]*aria-pressed="true"/.test(html), 'c aria-pressed=true');
  assert.ok(/value="b"[^>]*aria-pressed="false"/.test(html), 'b aria-pressed=false');
  assert.ok(!/class="feld-mehrfach-pill aktiv"[^>]*value="b"/.test(html), 'b NICHT .aktiv');
});

test('feldValidieren: gültige Werte ok; ein ungültiger → grund auswahl', () => {
  const { V } = ladeKern();
  assert.equal(V.feldValidieren(SYNTH, ['a', 'c']).ok, true);
  const r = V.feldValidieren(SYNTH, ['a', 'kein_opt']);
  assert.equal(r.ok, false);
  assert.equal(r.grund, 'auswahl');
});
