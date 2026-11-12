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

/* [D48] am namenlosen Passwort-Dialog (pw-neu/pw-neu2) entfiel mit seinem Rückbau (07.11.2026). Dieselbe geteilte Inline-Prüfung
   im Anlege-Dialog hält [D49] unten (modalPwMismatch mit id-pw/id-pw2). */

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
  // Zielbild 01 (05.11.2026): im Anlege-Fenster mit Schritten (zs) meldet die Probe erst bei „Weiter“; Sub behält blur.
  assert.ok(/modalPwFelderVerdrahten\('id-pw', 'id-pw2', 'id-pw2-fehler', \{ ohneBlur: zs \}\)/.test(src), 'blur-Verdrahtung (Sub), im Fenster mit Schritten erst bei Weiter');
});

test('[D48/D49] Feld-Markierung + scrollIntoView über bestehendes --error-Token', () => {
  const { src, html } = ladeKern();
  assert.ok(/input\.feld-fehler \{ border-color: var\(--error\)/.test(html), 'rote Feld-Ränder via --error');
  // FELD-FEHLER-NICHT-ZUGEORDNET (23.10.2026): markiert wird über den gemeinsamen Helfer, der aria-invalid und den Verweis mitsetzt.
  // Zielbild 01 (05.11.2026): der Satz kommt aus pwProbeMeldung (beim Wörter-Vorschlag von den Wörtern, sonst pwSetzenUngleich).
  assert.ok(/feldFehlerSetzen\(f2, pwProbeMeldung\(f1\.value, f2\.value\), \{ meldung: inl \}\);\s*feldFehlerSetzen\(f1, null, \{ meldung: inl \}\);/.test(src), 'beide PW-Felder markiert');
  assert.ok(/scrollIntoView\(\{ block: 'center' \}\)/.test(src), 'scrollIntoView bei offener Tastatur');
});
