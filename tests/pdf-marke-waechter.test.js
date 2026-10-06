'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Wächter gegen die Klasse (v896, Befund BRANDING-NICHT-IM-PDF): JEDER PDF-Erzeuger trägt die Marke.
   ────────────────────────────────────────────────────────────────────────────
   Vor v896 trug kein PDF das Logo, und drei von sieben Erzeugern nicht einmal den Namen — jeder Erzeuger las die Marke
   selbst oder gar nicht. Jetzt gibt es zwei Helfer (pdfMarkeKopfZeichnen, pdfMarkeFussAufAllenSeiten). Dieser Wächter
   sucht jede `new window.jspdf.jsPDF(`-Stelle im Kern, nimmt die umschließende Funktion und verlangt, dass sie — selbst
   oder über eine Zeichenfunktion, die sie aufruft — einen der beiden Helfer erreicht. Ein achter Erzeuger ohne Marke
   wird rot, ohne dass jemand an diese Datei denkt. Rot-Beweis: derselbe Lauf gegen eine Kopie mit entferntem Aufruf.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const HELFER = /\bpdfMarke(KopfZeichnen|FussAufAllenSeiten)\(/;

// Funktionsrümpfe des Kerns: Name → Text (top-level `function`/`async function` bis zur nächsten Zeile `}`).
function rumpfe(quelle) {
  const aus = new Map();
  const re = /^(?:async )?function ([A-Za-z_$][\w$]*)\(/gm;
  let m;
  while ((m = re.exec(quelle))) {
    const ende = quelle.indexOf('\n}\n', m.index);
    aus.set(m[1], { start: m.index, text: quelle.slice(m.index, ende < 0 ? undefined : ende + 2) });
  }
  return aus;
}
function erreichtHelfer(name, r, tiefe = 0, gesehen = new Set()) {
  const f = r.get(name);
  if (!f || gesehen.has(name) || tiefe > 2) return false;
  gesehen.add(name);
  if (HELFER.test(f.text)) return true;
  const aufrufe = [...f.text.matchAll(/\b(zeichne[A-Za-z]*)\(/g)].map((x) => x[1]);
  return aufrufe.some((n) => erreichtHelfer(n, r, tiefe + 1, gesehen));
}
function erzeugerOhneMarke(quelle) {
  const r = rumpfe(quelle);
  const erzeuger = new Set();
  for (const m of quelle.matchAll(/new window\.jspdf\.jsPDF\(/g)) {
    let bester = null;
    for (const [name, f] of r) if (f.start < m.index && f.start + f.text.length > m.index && (!bester || f.start > r.get(bester).start)) bester = name;
    erzeuger.add(bester || '(außerhalb einer Funktion)');
  }
  return { erzeuger: [...erzeuger].sort(), ohne: [...erzeuger].filter((n) => !erreichtHelfer(n, r)).sort() };
}

test('jeder PDF-Erzeuger erreicht einen Marken-Helfer', () => {
  const { erzeuger, ohne } = erzeugerOhneMarke(KERN);
  assert.ok(erzeuger.length >= 7, 'mindestens die sieben bekannten Erzeuger gefunden: ' + erzeuger.join(', '));
  assert.deepEqual(ohne, []);
});

test('Rot-Beweis: ohne den Aufruf in zeichneNotfallkarte wird flowNotfallkartePdf gemeldet', () => {
  const kopie = KERN.replace("pdfMarkeFussAufAllenSeiten(doc, RAND, 2.6, 'mm');", '');
  assert.notEqual(kopie, KERN);
  assert.deepEqual(erzeugerOhneMarke(kopie).ohne, ['flowNotfallkartePdf']);
});
