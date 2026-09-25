'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — D1 Topbar-Hinweis (Strang 2 / Commit B)
   ────────────────────────────────────────────────────────────────────────
   D1: persistenter Topbar-Hinweis „… noch nicht dauerhaft gespeichert.
       [Passwort setzen →]" — sichtbar GENAU im passwortlosen Vorschau-Zustand
       (imVorschau()), weg nach der Passwort-Setzung (Session vorhanden).

   D3 (Erst-Eintrag-Toast, dasselbe Commit-Paar) ist entfernt — „Zwei tote Toasts" (13.08.2026): sein Gate (Vorschau UND ein editierbares
   Sektorfeld) war strukturell unerreichbar, seit dem Tag seiner Einführung,
   und D1 hier deckt dieselbe Lage bereits dauerhaft ab. S. Kommentar an der
   ehemaligen Fundstelle in vivodepot.html.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'd1-d3-pw';

/* ── D1 — Topbar-Hinweis ─────────────────────────────────────────────────── */

test('[D1] Topbar-Hinweis sichtbar im passwortlosen Vorschau-Zustand, „Passwort setzen →" verdrahtet', () => {
  const { V, document } = ladeKern();
  V.vorschauDepotErzeugen();          // passwortlos → imVorschau() === true
  V.renderTopbar();
  const h = document.getElementById('tb-pw-hinweis');
  assert.equal(h.hidden, false, 'Hinweis sichtbar (hidden=false) ohne Passwort');
  assert.equal(typeof h.onclick, 'function', '„Passwort setzen →" ist verdrahtet');
});

test('[D1] Topbar-Hinweis verschwindet nach Passwort-Setzung (Session vorhanden)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen(PW);            // echtes Depot: sessionHkdfKey gesetzt, kein _vorschau
  V.renderTopbar();
  const h = document.getElementById('tb-pw-hinweis');
  assert.equal(h.hidden, true, 'Hinweis ausgeblendet (hidden=true) mit Passwort');
});
