'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Situationsblatt-Klick-Hinweis auf eigener Zeile (Fund,
   27.08.2026, Frischer-Blick-Prüfung)
   ────────────────────────────────────────────────────────────────────────
   "Chronische Erkrankungen" verschmilzt streckenweise mit dem Link
   "im Bereich öffnen" zu unlesbarem Text. Reproduziert per Hover-Screenshot:
   situationSektorZeileHTML hängt den Klick-Hinweis inline ans Wortende des
   Feldwerts (".feld-wert" trägt beides im selben Textfluss, nur ein
   Leerzeichen dazwischen). Bei einem langen, zeilenumbrechenden Wert (z. B.
   mehrere Diagnosen) landet der (nur per Hover sichtbare) Hinweis direkt
   hinter dem letzten Wort: "…Niereninsuffizienz Stadium 3 im Bereich
   öffnen ›" liest sich wie ein Satz. "Mal sauber, mal kaputt" erklärt sich
   daraus: sauber = nicht gehovert (opacity 0, unsichtbar), kaputt =
   gehovert (opacity 0.7, verschmilzt) — kein Zufall, derselbe Mechanismus
   bei jedem Aufruf.

   Fix: .klick-hinweis auf eine eigene Zeile (display:block) — dieselbe
   Trennung unabhängig von der Wertlänge, kein Trennzeichen nötig, das bei
   jeder neuen Wertlänge wieder kollidieren könnte.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Klick-Hinweis·Rot-Beweis] .klick-hinweis steht auf einer eigenen Zeile (display:block), nicht inline hinter dem Wert', () => {
  const { html } = ladeKern();
  assert.match(html, /\.feld-zeile\.klick-durch \.klick-hinweis \{[^}]*display:\s*block/s,
    'die CSS-Regel für .klick-hinweis muss display:block tragen — sonst hängt der Hinweis inline am letzten Wort des Werts und kann mit ihm verschmelzen');
});

test('[Klick-Hinweis] echter Situationsblatt-Aufruf: der Hinweis-Span steht weiterhin im feld-wert-Element (Struktur unverändert, nur CSS)', async () => {
  const { V } = await ladeKern();
  await V.depotAnlegen('pw');
  V.betreteApp();
  V.sektorFeldSetzen('health', 'chronicConditionsDiagnoses', [{ text: 'Diabetes mellitus Typ 2, sehr lang und mehrzeilig genug zum Umbrechen', code: null }]);
  const html = V.situationSektorZeileHTML('health', 'chronicConditionsDiagnoses');
  assert.match(html, /class="feld-wert">.*Diabetes mellitus.*<span class="klick-hinweis">im Bereich öffnen ›<\/span><\/div>/s,
    'der Klick-Hinweis bleibt strukturell im feld-wert (nur die CSS-Darstellung ändert sich zu block)');
});
