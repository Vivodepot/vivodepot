'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   einstellungen-modul-auffindbarkeit.test.js — Rot-Beweis für den
   Auffindbarkeits-Fund (27.08.2026, „Bürgersatz englisch andocken",
   Strang 1)
   ────────────────────────────────────────────────────────────────────────────
   BEFUND: der Modul-Abschnitt in den Einstellungen hieß, zugeklappt wie
   aufgeklappt, nur „Erweiterung" (STRINGS.einstAbschnittModule/
   moduleEinlassenKnopf) — kein Wort, kein Icon verriet, dass hier ein
   SPRACHMODUL andockt. Wer kein Deutsch liest, hatte keinen Anhaltspunkt,
   selbst nachdem er das (sprachneutrale Zahnrad-)Einstellungen-Symbol
   gefunden hatte.

   Gegenprobe: ein anderer Abschnitt (z. B. Kreise) bekommt KEIN Icon in
   seinem Titel — der Fix ist gezielt, kein Flächenbrand über alle
   Abschnitte.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Auffindbarkeit] der Modul-Abschnittstitel trägt ein Globus-Icon — sichtbar auch ZUGEKLAPPT', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('modul-auffindbarkeit-pw');
  const html = V.einstellungenHTML();
  const titelStart = html.indexOf('<span class="einst-abschnitt-titel">');
  const titelBereich = html.slice(titelStart, html.indexOf('Eingelassene Erweiterungen', titelStart) + 30);
  assert.match(titelBereich, /<svg[^>]*>.*<\/svg>/s, 'kein SVG-Icon vor dem Titeltext');
  assert.match(titelBereich, /<circle cx="12" cy="12" r="10"\/><path d="M12 2a14\.5/, 'nicht das Globus-Icon (ICONS.globe)');
});

test('[Auffindbarkeit] der Modul-Einlass-Knopf trägt den festen, sprachneutralen Anker „Language / Sprache"', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('modul-auffindbarkeit-pw2');
  const html = V.einstellungenHTML();
  assert.match(html, /<span class="einst-modul-sprachanker">Language \/ Sprache<\/span>/);
});

test('[Auffindbarkeit·Rot] der Anker bleibt WORTGLEICH „Language / Sprache", auch wenn ein anderssprachiges Modul angedockt ist — er läuft NIE über den Textsatz', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('modul-auffindbarkeit-rot-pw');
  V.getData().textsprache = 'en';
  V.getData().textsatzModule = [{ modulTyp: 'textsatz', sprache: 'en', moduleVersion: 1,
    texte: { 'strings:moduleEinlassenKnopf.text': 'Dock an extension from a file' } }];
  V._textsatzModuleAusDepotAnmelden(V.getData());
  V.textsatzNeuAnwenden();
  const html = V.einstellungenHTML();
  assert.match(html, /<span class="einst-modul-sprachanker">Language \/ Sprache<\/span>/,
    'der Anker wäre kaputt, wenn er wie der Rest des Knopfs mitschaltete oder verschwände');
  assert.match(html, /Dock an extension from a file/, 'der übrige Knopf-Text schaltet weiterhin mit (STRINGS-Weg unverändert)');
  V.getData().textsprache = 'de';
  V.textsatzNeuAnwenden();
});

test('[Auffindbarkeit·Gegenprobe] ein anderer Abschnitt (Kreise) bekommt KEIN Icon im Titel — der Fund ist gezielt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('modul-auffindbarkeit-gegenprobe-pw');
  const html = V.einstellungenHTML();
  const kreiseTitelIdx = html.indexOf(V.STRINGS.kreiseAbschnitt);
  assert.ok(kreiseTitelIdx > 0, 'Kreise-Abschnitt nicht gefunden — Testvoraussetzung');
  const davor = html.slice(Math.max(0, kreiseTitelIdx - 60), kreiseTitelIdx);
  assert.doesNotMatch(davor, /<svg/, 'ein Icon hier wäre der Flächenbrand, den diese Probe ausschließen soll');
});
