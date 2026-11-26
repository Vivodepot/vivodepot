'use strict';
/* ═════════════════════════════════════════════════════════════════
   MELDUNG-NACH-SEITENWECHSEL (23.11.2026)

   Eine Meldung (Toast) blieb nach dem Wechsel der Seite über der neuen Seite stehen und lag dort über Karten und Knöpfen.
   Jetzt verschwindet sie beim Wechsel der Seite (renderContent mit Sprung nach oben). Eine eben erst entstandene Meldung (der auslösende
   Weg wechselt gleich danach die Seite) und eine bleibende Meldung mit Knopf stehen weiter.

   Proben:
   [Meldung·Aufräumen]   ältere Meldung weg, frische und bleibende stehen.
   [Meldung·Verdrahtung] der Seitenwechsel ruft das Aufräumen, ein Neuzeichnen derselben Seite nicht; ui.toast setzt Zeit und „bleibt“.
   [Meldung·Rot-Beweis]  ein Kern ohne den Aufruf fällt durch [Meldung·Verdrahtung]; ein Aufräumen ohne Frist entfernt auch die frische.
   (Das Verhalten im Browser zeigt der Browser-Beleg des Wagens.)
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');

const QUELLE = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const AUFRUF = '  if (springeNachOben) { try { _meldungenBeimSeitenwechsel(); } catch (_) {} }\n';

function host(jetzt) {
  const liste = [];
  const el = (text, alter, bleibt) => {
    const e = { text, classList: { contains: (k) => k === 'toast-bleibt' && !!bleibt },
      getAttribute: (k) => (k === 'data-toast-zeit' ? String(jetzt - alter) : null),
      remove: () => { liste.splice(liste.indexOf(e), 1); } };
    liste.push(e);
  };
  el('ältere Meldung', 5000, false);
  el('bleibende Meldung', 5000, true);
  el('frische Meldung', 100, false);
  return { liste, querySelectorAll: (sel) => (sel === '.toast' ? liste.slice() : []) };
}

test('[Meldung·Aufräumen] ältere Meldung weg, frische und bleibende stehen', () => {
  const { V } = ladeKern();
  const jetzt = Date.now();
  const h = host(jetzt);
  assert.equal(V._meldungenBeimSeitenwechsel(h, jetzt), 1);
  assert.deepEqual(h.liste.map((e) => e.text), ['bleibende Meldung', 'frische Meldung']);
});

function verdrahtet(q) {
  const i = q.indexOf('function renderContent(springeNachOben) {');
  return i >= 0 && q.slice(i, i + 300).includes(AUFRUF)
    && q.includes("el.setAttribute('data-toast-zeit', String(Date.now()));")
    && q.includes("if (aktion && aktion.bleibt) el.classList.add('toast-bleibt');");
}

test('[Meldung·Verdrahtung] der Seitenwechsel räumt auf, ui.toast setzt Zeit und „bleibt“', () => {
  assert.equal(QUELLE.split(AUFRUF).length, 2, 'genau ein Aufruf, nur unter springeNachOben');
  assert.ok(verdrahtet(QUELLE));
});

/* Rot-Beweis: ohne den Aufruf fällt die Verdrahtung; ohne Frist ginge auch die frische Meldung (der Grund für die Frist). */
test('[Meldung·Rot-Beweis] ohne Aufruf rot; ohne Frist geht auch die frische Meldung', () => {
  assert.equal(verdrahtet(QUELLE.replace(AUFRUF, '')), false);
  const { V } = ladeKern();
  const jetzt = Date.now();
  const h = host(jetzt);
  V._meldungenBeimSeitenwechsel(h, jetzt + 10000);
  assert.deepEqual(h.liste.map((e) => e.text), ['bleibende Meldung'], 'ein späterer Wechsel räumt auch die dann alte Meldung');
});
