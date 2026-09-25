'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Fünf größere Reste" (13.08.2026), Zug 4 — Eingehängte Depots.
   ────────────────────────────────────────────────────────────────────────
   (1) renderSubDepotKonzept endete ohne Weg zur Handlung — wer die Erklärung
   liest und überzeugt ist, fand keinen „Depot anlegen"-Knopf. (2) Der Sub-
   Passwort-Hinweis sagte „kann nicht wiederhergestellt werden", aber nicht,
   was das für DIESES Depot konkret bedeutet — dauerhaft verschlossen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Zug4] renderSubDepotKonzept trägt am Ende einen Knopf zur Handlung (Verwaltete Depots)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw12345678');
  V.akteurSelbstErklaeren('Tester');
  V.oeffneSubKonzept();
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes('id="subkonzept-anlegen-knopf"'),
    'ROT ERWARTET, wenn falsch: die Erklärseite muss einen Knopf zur Handlung tragen');
  assert.ok(html.includes(V.STRINGS.subKonzeptAnlegenKnopf));
});

test('[Zug4] der Knopf öffnet echt die Verwaltete-Depots-Sicht (Klick, nicht nur Markup)', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw12345678');
  V.akteurSelbstErklaeren('Tester');
  V.oeffneSubKonzept();
  const btn = document.getElementById('subkonzept-anlegen-knopf');
  assert.ok(typeof btn.onclick === 'function', 'Knopf ist verdrahtet');
  btn.onclick();
  const html = document.getElementById('content').innerHTML;
  assert.ok(html.includes(V.STRINGS.verwalteteTitel), 'Klick führt zur Verwaltete-Depots-Sicht');
});

test('[Zug4] ohne Schreibrecht (kein Sitzungs-Akteur) bleibt der Knopf weg — keine Sackgasse vorgetäuscht', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw12345678');
  assert.equal(V.Modus.darfBearbeiten(), false, 'Vorbedingung: ohne Akteur kein Schreibrecht');
  V.oeffneSubKonzept();
  const html = document.getElementById('content').innerHTML;
  assert.ok(!html.includes('id="subkonzept-anlegen-knopf"'),
    'kein Knopf, wenn das Gate das Anlegen ohnehin nicht erlaubt');
});

test('[Zug4] Sub-Passwort-Hinweis nennt die Folge klar: dauerhaft verschlossen, nicht nur "nicht wiederherstellbar"', () => {
  const { V } = ladeKern();
  assert.match(V.STRINGS.subPwHinweis, /dauerhaft verschlossen/,
    'ROT ERWARTET, wenn falsch: die konkrete Folge muss dastehen, nicht nur der Mechanismus');
  assert.match(V.STRINGS.subPwHinweis, /Niemand kann es zurücksetzen/,
    'dieselbe Tonlage wie die Haupt-Passwort-Warnung (Setup-first, 23.06.2026)');
});
