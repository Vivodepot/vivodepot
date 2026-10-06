'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Keine Serifenschrift (Entscheidung 03.10.2026, „kein Serifen") — Wächter tools/serifen-pruefen.js
   ────────────────────────────────────────────────────────────────────────
   Gegenstand: jeder Schriftstapel in den Anwendungen (alle *.html im Repo-Wurzelordner), in den
   Erscheinungsbild-Quellen und -Modulen (tools/erscheinung) und jsPDF `setFont('times')`.
   Ratsche: tools/serifen-grundlinie.json, die Zahl je Datei darf nur sinken.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../tools/serifen-pruefen.js');

test('[Serifen] kein neuer Serifen-Stapel gegenüber der Grundlinie', () => {
  const g = JSON.parse(fs.readFileSync(S.GRUNDLINIE, 'utf8'));
  const { zuwachs } = S.gegenGrundlinie(S.messen(S.standardDateien()), g);
  assert.deepEqual(zuwachs, []);
});

test('[Serifen] jede Datei der Grundlinie existiert (sonst wäre die Ratsche leer grün)', () => {
  const g = JSON.parse(fs.readFileSync(S.GRUNDLINIE, 'utf8'));
  for (const d of Object.keys(g.dateien)) assert.ok(fs.existsSync(path.join(S.REPO, d)), d);
});

test('[Serifen] die Standardmenge ist nicht leer (Kern, Studio, Lese-App, Erscheinungsbild)', () => {
  const namen = S.standardDateien().map((d) => path.relative(S.REPO, d));
  for (const n of ['vivodepot.html', 'vivodepot-studio.html', 'vivodepot-lesen.html', 'tools/erscheinung/heute.css', 'share/empfangen.html', 'share/empfangen.css']) assert.ok(namen.includes(n), n);
});

test('[Serifen·Rot-Beweis] erkannt wird, was serif ist — und nur das', () => {
  const fall = (t) => S.funde(t).length;
  assert.equal(fall('.x { font-family: Georgia, serif; }'), 1, 'Georgia');
  assert.equal(fall('.x { font-family: "Inter", serif; }'), 1, 'Sans vorne, aber Rückfall serif');
  assert.equal(fall(':root { --font-narrativ: "Source Serif 4", sans-serif; }'), 1, 'Serifenfamilie im Token');
  assert.equal(fall('<div style="font-family:Times New Roman">'), 1, 'Inline-Style');
  assert.equal(fall('doc.setFont(\'times\', \'normal\');'), 1, 'jsPDF times');
  assert.equal(fall('.x { font-family: "Inter", -apple-system, "Segoe UI", sans-serif; }'), 0, 'reine Sans');
  assert.equal(fall('.x { font-family: var(--font-ui); }'), 0, 'Verweis auf einen Token');
  assert.equal(fall('.x { font-family: "IBM Plex Sans", "Noto Sans", sans-serif; }'), 0, 'Sans mit „Sans" im Namen');
  assert.equal(fall('.x { font-family: ui-monospace, Menlo, monospace; }'), 0, 'Monospace');
});

test('[Serifen·Rot-Beweis] eine neue Serifenschrift in einer Datei der Grundlinie wäre rot', () => {
  const g = { dateien: { 'a.css': 1 } };
  const gemessen = { 'a.css': [{}, {}], 'b.html': [{}] };
  const { zuwachs } = S.gegenGrundlinie(gemessen, g);
  assert.equal(zuwachs.length, 2);
});

test('[Serifen·Rot-Beweis] Formen außerhalb des font-family-Stapels: SVG-Attribut, Kurzform, Canvas, JS, var()-Rückfall', () => {
  const art = (t) => S.funde(t).map((f) => f.art);
  assert.deepEqual(art('<svg><text font-family="Georgia">x</text></svg>'), ['attribut'], 'SVG-Attribut');
  assert.deepEqual(art("ctx.font = '16px serif';"), ['canvas-font'], 'Canvas');
  assert.deepEqual(art('.x { font: italic 16px/1.4 Georgia, serif; }'), ['font-kurzform'], 'CSS-Kurzform');
  assert.deepEqual(art("el.style.fontFamily = 'Times New Roman';"), ['js-fontFamily'], 'JS fontFamily');
  assert.deepEqual(art('.x { font-family: var(--font-narrativ, serif); }'), ['font-family'], 'Rückfall in var()');
  assert.deepEqual(art('<text font-family="Inter, sans-serif">'), [], 'Sans im Attribut');
  assert.deepEqual(art("ctx.font = 'bold 12px Inter, sans-serif';"), [], 'Sans im Canvas');
  assert.deepEqual(art('.x { font: 16px/1.4 var(--font-ui); }'), [], 'Kurzform mit Token');
  assert.deepEqual(art('.x { font-family: var(--font-narrativ); }'), [], 'Token ohne Rückfall');
});
