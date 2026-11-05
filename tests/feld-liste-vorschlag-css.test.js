'use strict';
/* Vorgeschlagene Schritte und Listenfelder (29.10.2026): in Pro, Kontakte und Vertretung → „Erste Schritte, wenn Sie
   verhindert sind“, stand der Kasten mit den vorgeschlagenen Schritten fett, und unter der Beschriftung blieb die 200px-Spalte über die
   ganze Höhe der Liste leer. Ursache: `.sektion--eingabe .feld-wert` setzt das Gewicht des gefüllten Werts (Kasten erbt es), und
   `.feld-zeile` hat zwei Spalten auch für Listenfelder. Diese Probe hält beide Regeln statisch fest.
   Rot-Beweis: die Fassung ohne die beiden Regeln fällt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CSS = fs.readFileSync(path.join(__dirname, '..', 'tools', 'erscheinung', 'stil', 'grundlage.css'), 'utf8');
const block = (css, selektor) => {
  const m = new RegExp(selektor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}').exec(css);
  return m ? m[1] : null;
};
const vorschlagNormal = (css) => /font-weight:\s*var\(--fw-regular\)/.test(block(css, '.sektion--eingabe .feld-wert .liste-vorschlaege') || '');
const listeVolleBreite = (css) =>
  /grid-template-columns:\s*1fr\s*;/.test(block(css, '.sektion--eingabe .feld-zeile:has(> .feld-wert > .feld-liste-editor)') || '');

test('[Liste · Vorschlag] der Kasten mit den vorgeschlagenen Schritten steht in normalem Gewicht', () => {
  assert.ok(vorschlagNormal(CSS));
});

test('[Liste · Spalten] ein Listenfeld läuft unter seiner Beschriftung über die volle Breite', () => {
  assert.ok(listeVolleBreite(CSS));
});

test('[Liste · Rot-Beweis] die Fassung ohne die beiden Regeln fällt', () => {
  const alt = CSS.replace(/^.*\.liste-vorschlaege \{ font-weight: var\(--fw-regular\); \}\n/m, '')
    .replace(/^.*:has\(> \.feld-wert > \.feld-liste-editor\) \{ grid-template-columns: 1fr; \}\n/m, '');
  assert.notEqual(alt, CSS);
  assert.equal(vorschlagNormal(alt), false);
  assert.equal(listeVolleBreite(alt), false);
});
