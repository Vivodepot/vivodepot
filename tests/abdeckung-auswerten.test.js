'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   abdeckung-auswerten.js — Grund-Proben (Glied 2, Auftrag „Belegkette und
   Lücken"/„Auftragskette Nacht", 14./15.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   Kein Gate (die Auftragsvorgabe verbietet ausdrücklich ein Ziel-Prozent,
   an dem ein Gate hängt) — diese Proben sichern nur die Kernlogik der
   Auswertung selbst: die Ganze-Datei-Pseudo-Range wird ausgeschlossen (sonst
   100% „ausgeführt", der Bug vom ersten Lauf), und die Klassifizierungs-
   Heuristik ist deterministisch.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { baueOffsetKarte, klassifiziere } = require('../tools/abdeckung-auswerten.js');

test('[Abdeckung-auswerten·Rot-Beweis] Ganze-Datei-Pseudo-Range (>50% der Skriptlänge) wird ausgeschlossen — der Fund vom ersten Lauf', () => {
  const funktionslisten = [[
    { functionName: '', ranges: [{ startOffset: 0, endOffset: 1000, count: 5 }] },  // Pseudo — muss raus
    { functionName: 'echteFunktion', ranges: [{ startOffset: 100, endOffset: 150, count: 3 }] },
  ]];
  const { ausgefuehrt, alleFunktionen } = baueOffsetKarte(funktionslisten, 1000);
  // Die Pseudo-Range (0-1000, 100% der Skriptlänge) darf NICHT in `ausgefuehrt` stehen —
  // sonst wäre jeder Offset trivial "ausgeführt" (genau der Fund vom ersten Lauf).
  assert.equal(ausgefuehrt.some(([a, b]) => a === 0 && b === 1000), false);
  assert.equal(ausgefuehrt.some(([a, b]) => a === 100 && b === 150), true);
  assert.equal(alleFunktionen.has('echteFunktion@100'), true);
});

test('[Abdeckung-auswerten] eine nie aufgerufene Funktion summiert über mehrere Läufe bleibt 0', () => {
  const funktionslisten = [
    [{ functionName: 'toteFunktion', ranges: [{ startOffset: 200, endOffset: 250, count: 0 }] }],
    [{ functionName: 'toteFunktion', ranges: [{ startOffset: 200, endOffset: 250, count: 0 }] }],
  ];
  const { alleFunktionen } = baueOffsetKarte(funktionslisten, 10000);
  const fn = alleFunktionen.get('toteFunktion@200');
  assert.equal(fn.aufrufe, 0);
});

test('[Abdeckung-auswerten] eine in irgendeinem Lauf aufgerufene Funktion zählt als ausgeführt', () => {
  const funktionslisten = [
    [{ functionName: 'manchmalGerufen', ranges: [{ startOffset: 200, endOffset: 250, count: 0 }] }],
    [{ functionName: 'manchmalGerufen', ranges: [{ startOffset: 200, endOffset: 250, count: 1 }] }],
  ];
  const { alleFunktionen } = baueOffsetKarte(funktionslisten, 10000);
  const fn = alleFunktionen.get('manchmalGerufen@200');
  assert.equal(fn.aufrufe, 1);
});

test('[Abdeckung-auswerten·Gegenprobe] klassifiziere erkennt throw-Zeilen als unerreichten Fehlerpfad, gewoehnlicher Code bleibt sonst-ungeprobt', () => {
  assert.equal(klassifiziere("throw new Error('x');"), 'unerreichter-fehlerpfad');
  assert.equal(klassifiziere("const x = 1;"), 'sonst-ungeprobt');
});
