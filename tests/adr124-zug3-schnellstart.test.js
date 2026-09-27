'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-124, Zug 3 — Schnellstart im Einstellungen-Dialog
   ────────────────────────────────────────────────────────────────────────
   Fünf Schritte, Zuschnitt aus dem Auftrag: Datei öffnen · Passwort setzen
   + Verlust-Folge · Anlass wählen · Feld ausfüllen · speichern + Ablageort.
   Kein eigener Test für DOM-Wiring nötig — der Abschnitt ist reiner Text im
   selben `einstellungenHTML()`-String wie alle anderen Abschnitte, ohne
   eigene Buttons/Handler (anders als Zug 2, das eine eigene Route braucht).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[Zug3] alle fünf Schritte stehen im Einstellungen-Dialog', () => {
  const { V } = ladeKern();
  const html = V.einstellungenHTML();
  assert.match(html, /Schnellstart/);
  for (const s of [V.STRINGS.schnellstartSchritt1, V.STRINGS.schnellstartSchritt2,
    V.STRINGS.schnellstartSchritt3, V.STRINGS.schnellstartSchritt4, V.STRINGS.schnellstartSchritt5]) {
    assert.ok(html.includes(s), 'fehlt im Dialog: ' + s);
  }
});

test('[Zug3] Schritt 2 nennt die Passwort-Verlust-Folge, mit derselben Ehrlichkeit wie das Notfall-Blatt', () => {
  const { V } = ladeKern();
  assert.match(V.STRINGS.schnellstartSchritt2, /lässt sich die Datei später nicht mehr öffnen/);
  assert.match(V.STRINGS.schnellstartSchritt2, /auch nicht von uns/,
    'dieselbe Ehrlichkeits-Formel wie STRINGS.nfbAnbietenText — keine abgeschwächte Zweitfassung');
});

test('[Zug3] Schnellstart steht VOR „Über Vivodepot" im Dialog (Reihenfolge aus dem Bau)', () => {
  const { V } = ladeKern();
  const html = V.einstellungenHTML();
  const posSchnellstart = html.indexOf(V.STRINGS.einstAbschnittSchnellstart);
  const posUeber = html.indexOf(V.STRINGS.einstAbschnittUeber);
  assert.ok(posSchnellstart >= 0 && posUeber >= 0);
  assert.ok(posSchnellstart < posUeber, 'Schnellstart muss vor Über Vivodepot stehen');
});

test('[Zug3] U2-ADR-033: keine Empfehlung, kein Rat-Vokabular in den fünf Schritten', () => {
  const { V } = ladeKern();
  const text = [V.STRINGS.schnellstartSchritt1, V.STRINGS.schnellstartSchritt2, V.STRINGS.schnellstartSchritt3,
    V.STRINGS.schnellstartSchritt4, V.STRINGS.schnellstartSchritt5].join(' ');
  assert.doesNotMatch(text, /am besten/i);
  assert.doesNotMatch(text, /wir empfehlen/i);
  assert.doesNotMatch(text, /sinnvollerweise/i);
});

test('[Zug3] keine Vollständigkeit behauptet — der Abschnitt bleibt bei fünf Schritten, keine Bereichsliste', () => {
  const { V } = ladeKern();
  assert.doesNotMatch(V.STRINGS.einstSchnellstartIntro, /alle Bereiche|vollständig/i);
});
