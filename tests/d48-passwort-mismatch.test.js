'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — D48/D49: Inline-Validierung in den Passwort-Modalen (Anker-Setup + Sub-Anlegen)
   ────────────────────────────────────────────────────────────────────────
   D48: Passwort-Mismatch erschien im Modal-FUSS (iOS-Tastatur verdeckt) → „nichts passiert".
   D49: Im Sub-Anlege-Modal blockte zusätzlich die Nachname-Pflicht STILL (leerer Nachname →
        kein Toast/Fehler/Schluss = toter Knopf).
   Fix: EINE geteilte Inline-Validierung (modalFeldFehlerZeigen/-Loeschen, modalPwMismatch,
   modalPwFelderVerdrahten) für BEIDE Modale — Meldung inline unter dem Feld, Feld rot
   (--error), Live nach blur, scrollIntoView. Sub: Vorname Pflicht, Nachname optional.

   Verhaltens-e2e: tests/e2e-cross/T-CROSS-12-d48-mismatch.spec.js + T-CROSS-13-sub-anlegen.spec.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[D48/D49] geteilte Validierungs-Helfer existieren (eine Quelle, kein Duplikat)', () => {
  const { src } = ladeKern();
  assert.ok(/function modalFeldFehlerZeigen\(/.test(src), 'modalFeldFehlerZeigen');
  assert.ok(/function modalFeldFehlerLoeschen\(/.test(src), 'modalFeldFehlerLoeschen');
  assert.ok(/function modalPwMismatch\(/.test(src), 'modalPwMismatch');
  assert.ok(/function modalPwFelderVerdrahten\(/.test(src), 'modalPwFelderVerdrahten');
});

test('[D48] Anker-Setup-Modal nutzt die geteilte Inline-Prüfung (nicht den Modal-Fuß)', () => {
  const { src } = ladeKern();
  assert.ok(/id="pw-neu2"[\s\S]{0,120}?id="pw-neu2-fehler"/.test(src), 'Inline-Fehler unter Feld 2 (Anker)');
  assert.ok(/if \(modalPwMismatch\('pw-neu', 'pw-neu2', 'pw-neu2-fehler', true\)\) return;/.test(src), 'Mismatch → modalPwMismatch');
  assert.ok(/modalPwFelderVerdrahten\('pw-neu', 'pw-neu2', 'pw-neu2-fehler'\)/.test(src), 'blur-Verdrahtung (Anker)');
});

test('[D49] Sub-/Anker-Anlege-Modal: Inline-Fehler je Feld + KEIN stilles Blockieren', () => {
  const { src } = ladeKern();
  // Inline-Fehler-Elemente unter Vorname/Nachname/PW/PW2.
  for (const f of ['id-vorname', 'id-nachname', 'id-pw', 'id-pw2']) {
    assert.ok(new RegExp('id="' + f + '"[\\s\\S]{0,160}?id="' + f + '-fehler"').test(src), 'Inline-Fehler unter ' + f);
  }
  // Vorname Pflicht (immer), Nachname Pflicht NUR im Anker (Sub erlaubt Vorname-only).
  assert.ok(/if \(!vorname\) \{ modalFeldFehlerZeigen\('id-vorname', 'id-vorname-fehler'/.test(src), 'Vorname-Pflicht inline');
  assert.ok(/if \(!sub && !nachname\) \{ modalFeldFehlerZeigen\('id-nachname', 'id-nachname-fehler'/.test(src), 'Nachname nur im Anker Pflicht');
  assert.ok(/if \(modalPwMismatch\('id-pw', 'id-pw2', 'id-pw2-fehler', true\)\) return;/.test(src), 'Mismatch inline (Sub/Anker)');
  assert.ok(/modalPwFelderVerdrahten\('id-pw', 'id-pw2', 'id-pw2-fehler'\)/.test(src), 'blur-Verdrahtung (Sub/Anker)');
});

test('[D48/D49] Feld-Markierung + scrollIntoView über bestehendes --error-Token', () => {
  const { src, html } = ladeKern();
  assert.ok(/input\.feld-fehler \{ border-color: var\(--error\)/.test(html), 'rote Feld-Ränder via --error');
  assert.ok(/classList\.toggle\('feld-fehler', ungleich\)/.test(src), 'beide PW-Felder markiert');
  assert.ok(/scrollIntoView\(\{ block: 'center' \}\)/.test(src), 'scrollIntoView bei offener Tastatur');
});
