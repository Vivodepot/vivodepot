'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-336 — die vier reservierten Zustands-Klassen selbst als Maßstab,
   nicht die von ihnen abgeleitete Erhebung
   ────────────────────────────────────────────────────────────────────────
   DIE LÜCKE (gemessen am Kanon bb247786): `tools/zusicherungs-schluessel-
   erheben.js` findet die Zustands-Blöcke über einen literalen String-
   Vergleich gegen `ZUSTAND_KLASSEN`. Wird eine der vier Klassen im Markup
   umbenannt (die CSS-Regel bleibt dabei unangetastet — das ist der
   naheliegende Fall, kein Sonderfall), verschwindet sie STILL aus der
   Erhebung: `erheben()` liefert einfach weniger Treffer, `gegenprobe()`
   bleibt grün (sie prüft nur CSS-Regeln mit Warn-Farben, nicht ob eine
   Klasse noch im Markup benutzt wird).

   Die bestehende `[U2-ADR-331·Sperre]`-Probe fängt das NUR, solange die
   eingefrorene Sperrliste noch die alte (vollständige) Erhebung trägt —
   sobald jemand dem Fix-Hinweis der Probe folgt (`npm run
   zusicherungen:build`), schreibt genau dieser Schritt die verkleinerte
   Erhebung fest, und der Rot-Beweis von U2-ADR-331 prüft danach nur noch
   die verbliebenen Schlüssel.

   DIESE PROBE hält dagegen die vier Namen selbst fest, unabhängig von jeder
   Erzeugung/Regenerierung — sie übersteht eine `zusicherungen:build`-
   Regenerierung, weil sie nicht zwei Erhebungen vergleicht, sondern gegen
   den festen Vier-Klassen-Katalog prüft.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../tools/zusicherungs-schluessel-erheben.js');

const REPO = path.join(__dirname, '..');
const LESE = path.join(REPO, 'vivodepot-lesen.html');
const ZUSTAND_KLASSEN = Object.freeze(['klartext-warn', 'herkunft-marke', 'stand-marke', 'vorlage-marke']);

test('[U2-ADR-336·Vollständigkeit] jede der vier reservierten Klassen hat mindestens einen Treffer', () => {
  const quelle = fs.readFileSync(LESE, 'utf8');
  const r = E.erheben(quelle);
  const gefunden = new Set(r.treffer.map((t) => t.klasse));
  const fehlend = ZUSTAND_KLASSEN.filter((k) => !gefunden.has(k));
  assert.deepEqual(fehlend, [],
    'reservierte Klasse(n) ohne Fundstelle im Markup — umbenannt oder entfernt: ' + fehlend.join(', '));
});

test('[U2-ADR-336·Rot-Beweis] eine umbenannte reservierte Klasse macht die Probe rot', () => {
  const quelle = fs.readFileSync(LESE, 'utf8');
  const verstuemmelt = quelle.replace(
    'class="herkunft-marke herkunft-marke--',
    'class="herkunft-hinweis herkunft-hinweis--',
  );
  assert.notEqual(verstuemmelt, quelle, 'Ausbeute: die Ersetzung muss greifen, sonst prüft dieser Test nichts');
  const r = E.erheben(verstuemmelt);
  const gefunden = new Set(r.treffer.map((t) => t.klasse));
  assert.ok(!gefunden.has('herkunft-marke'),
    'Selbsttest der Probe: nach der simulierten Umbenennung darf herkunft-marke nicht mehr auftauchen');
});

test('[U2-ADR-336·Gegenrichtung] eine unveränderte Fundstelle bleibt kein Fehlalarm', () => {
  const quelle = fs.readFileSync(LESE, 'utf8');
  const r = E.erheben(quelle);
  assert.ok(r.treffer.some((t) => t.klasse === 'klartext-warn'));
  assert.ok(r.treffer.some((t) => t.klasse === 'vorlage-marke'));
});
