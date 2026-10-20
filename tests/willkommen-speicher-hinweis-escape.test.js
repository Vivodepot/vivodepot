'use strict';
/* Der Speicher-Hinweis des Willkommensschirms (Einstieg nach Zustand, 13.10.2026) steht im Fluss statt als Toast und läuft durch die
   HTML-Senke von renderWelcome. Diese Probe hält fest, dass sein Text Text bleibt: ein STRINGS-Wert mit `<img onerror>` erscheint als
   Zeichenfolge, kein Element entsteht. Rot-Beweis: derselbe Wert ohne escapeHTML ergäbe ein img-Element. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const BOESE = '<img src=x onerror="window.__boese=1">Hinweis';

// STRINGS ist zur Laufzeit gesperrt (ein Text gehört in den Textsatz). Darum zwei Schritte: die Quelle setzt genau diesen Wert durch
// escapeHTML in den Hinweis, und derselbe Ausdruck mit dem echten escapeHTML des Kerns macht aus <img onerror> Text.
test('[Willkommen·Speicher-Hinweis] der Text läuft durch escapeHTML, und ein Wert mit <img onerror> bleibt Text', () => {
  const { V, html } = ladeKern();
  const a = html.indexOf('function renderWelcome(');
  const quelle = html.slice(a, html.indexOf('\n}\n', a));
  assert.match(quelle, /id="w-speicher-hinweis"[^\n]*hidden>' \+ escapeHTML\(STRINGS\.internSpeicherProbeFehlgeschlagen\) \+ '<\/p>'/,
    'renderWelcome setzt den Speicher-Hinweis über escapeHTML');
  // Zeichenebene, nicht DOM: die DOM des Testkerns ist eine Attrappe und parst kein HTML.
  const aus = V.escapeHTML(BOESE);
  assert.ok(!/[<>"]/.test(aus), 'nach escapeHTML steht kein <, > oder " mehr — kein Element, kein Attribut: ' + aus);
  assert.ok(aus.includes('&lt;img'), 'der Wert bleibt als Text lesbar');
});

test('[Willkommen·Speicher-Hinweis·Rot-Beweis] derselbe Wert ohne escapeHTML trüge ein Element', () => {
  const ohne = '<p class="welcome-hinweis" id="w-speicher-hinweis" role="status" hidden>' + BOESE + '</p>';
  assert.match(ohne, /<img [^>]*onerror=/, 'unmaskiert stünde ein img mit onerror im HTML — sonst prüfte die Probe oben nichts');
  const { html } = ladeKern();
  assert.doesNotMatch(html, /id="w-speicher-hinweis"[^\n]*hidden>' \+ STRINGS\.internSpeicherProbeFehlgeschlagen/, 'der Kern setzt den Wert nicht unmaskiert');
});
