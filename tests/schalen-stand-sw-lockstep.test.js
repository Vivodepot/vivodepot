'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Lockstep-Gate: SCHALEN_STAND (vivodepot.html) === SW-Cache-Generation (sw.js)
   ────────────────────────────────────────────────────────────────────────
   Der Fuß-Build-Stempel liest `SCHALEN_STAND` als „geladene Schale" und den
   SW-Cache-Namen (`vivodepot-shell-vNN`) live über die Cache-API. Zweck des
   Stempels: den Stale-SW-Fehler in einer Sekunde sichtbar machen. Laufen die
   beiden Quellen auseinander (SW gebumpt, SCHALEN_STAND vergessen — oder
   umgekehrt), zeigt der Stempel eine Abweichung an, wo keine ist, oder verdeckt
   eine echte — er LÜGT. Und der Stempel ist das Werkzeug, mit dem die Geräte-
   Abnahme gefahren wird.

   Bisher waren die beiden nur durch einen Kommentar gekoppelt (⚠ in beiden
   Dateien). Dieser Test macht die Kopplung zu einem GATE statt zu einer
   Disziplin: er wird rot, sobald die Generationen abweichen.

   BERICHTIGUNG (04.08.2026, Schalen-Lockstep-Grenze-Auftrag): dieser Test
   prüft NUR Gleichstand — dass beide Zahlen, WENN sie sich bewegen, sich
   GEMEINSAM bewegen. Er erzwingt NICHT den Anlass, entgegen der früheren
   Behauptung hier („der Test erzwingt es"). Ein Commit, der vivodepot.html
   inhaltlich ändert und BEIDE Zahlen unangetastet lässt, ist hier grün —
   genau das geschah in `4aa0a43` (Schrift-Regel, drei CSS-Klassen, SCHALEN_
   STAND blieb 'v74'). Den Anlass — „hat sich die Schale geändert, ohne dass
   SCHALEN_STAND gestiegen ist" — prüft `tests/schalen-lockstep-anlass.test.js`
   gegen `scripts/schalen-lockstep-kern.js`. Zwei verschiedene Aussagen, zwei
   verschiedene Tests: Gleichstand hier, Anlass dort — niemand halte den einen
   für den anderen.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
// ROOT sw.js — NICHT pages/sw.js. Letzterer ist ein eigener, unabhängig gezählter Klon für
// GitHub Pages (eigene v7/v8-Historie, eigener Kommentarblock) und trägt hier nichts bei; schon
// einmal verwechselt (12.09.2026, Nutzer-Rückmeldung v1.0-rc.501, Wortlaut-Reparatur) — der Bump
// landete zuerst in pages/sw.js, dieser Test blieb trotzdem rot.
const SW   = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

test('Lockstep: SCHALEN_STAND (vivodepot.html) === CACHE-Generation (sw.js)', () => {
  const mHtml = HTML.match(/const\s+SCHALEN_STAND\s*=\s*'(v\d+)'/);
  const mSw   = SW.match(/const\s+CACHE\s*=\s*'vivodepot-shell-(v\d+)'/);
  assert.ok(mHtml, 'SCHALEN_STAND in vivodepot.html gefunden (Format vNN)');
  assert.ok(mSw, 'CACHE in sw.js gefunden (Format vivodepot-shell-vNN)');
  assert.equal(mHtml[1], mSw[1],
    `SCHALEN_STAND (${mHtml[1]}) muss der SW-Cache-Generation (${mSw[1]}) entsprechen — ` +
    'beim SW-Bump BEIDE hochzählen, sonst lügt der Fuß-Build-Stempel.');
});

test('Lockstep: genau EINE Definition je Seite (keine tote Zweitdefinition)', () => {
  const nHtml = (HTML.match(/const\s+SCHALEN_STAND\s*=/g) || []).length;
  const nSw   = (SW.match(/const\s+CACHE\s*=\s*'vivodepot-shell-/g) || []).length;
  assert.equal(nHtml, 1, 'genau eine SCHALEN_STAND-Definition');
  assert.equal(nSw, 1, 'genau eine CACHE-Definition');
});
