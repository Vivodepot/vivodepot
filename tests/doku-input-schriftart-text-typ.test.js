'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — `.doku-input` erbt die App-Schrift (Inter) AUCH für
   `input[type="text"]` (Name/Adresse/Partei im Dokumente-Panel)
   ────────────────────────────────────────────────────────────────────────
   Screenshot-Review Fund 3 (26.08.2026): Platzhalter- und Werttext im Feld
   „Eigenes Dokument vermerken" (z. B. "z. B. Mietvertrag") erschienen in
   einem Screenshot sichtbar größer/fetter als im Rest der Oberfläche.

   DER BEFUND. Fund 1 (selbes Datum, s. tests/select-datum-schriftart-
   ausserhalb-feld-zeile.test.js) hatte bereits einen globalen Reset für
   `textarea, select, input[type="date"]` nachgezogen — aber BEWUSST nur für
   diese drei Typen (die Lücke, die der damalige Screenshot zeigte). Genau
   EIN Feld-Typ blieb dabei außen vor: `input[type="text"]` unter der Klasse
   `.doku-input` — die Name-/Adresse-/Partei-Felder im Dokumente-Panel
   (`#doku-neu-name`, `#doku-neu-adresse`, `#doku-neu-partei`, sowie die
   entsprechenden Felder an bestehenden Dokument-Einträgen).

   Gemessen (Playwright, computed style, vor dem Fix): `#doku-neu-name`
   rendert in Arial (Chromium-UA-Default für Formularfelder), während das
   direkt danebenstehende Datumsfeld (`input[type="date"]`, von Fund 1 schon
   erfasst) korrekt Inter erbt. Bei identischer deklarierter Pixelgröße
   (1rem) sieht Arial durch seine größere x-Höhe sichtbar größer aus als das
   umgebende Inter — das Bild aus dem Review.

   Die im Auftrag mitgegebene Hypothese (Schriftgröße hänge an vorangehenden
   Geschwister-Zeilen/Vorschlägen im Panel) hat sich NICHT bestätigt: eine
   Playwright-Messung an drei verschiedenen DOM-Zuständen (alle Karten
   offen, gemischter Öffnungszustand, frische Navigation) zeigte für
   `.doku-input`/`.doku-select` unabhängig von Geschwister-Anzahl oder
   -Reihenfolge byte-identische computed-style-Werte — kein sibling-
   abhängiger Selektor ist beteiligt. Der reale Fehler war die schmale,
   damals bewusst gezogene Fund-1-Grenze (nur select/date/textarea).

   Geprüft wird die REGEL (`.doku-input`/`.doku-select` trägt
   `font-family: inherit`), nicht nur der eine Fundort von heute.
   ════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = path.join(__dirname, '..', 'vivodepot.html');

function leafRegeln(css) {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  const out = [];
  let m;
  while ((m = re.exec(css)) !== null) out.push({ selector: m[1].trim(), decl: m[2] });
  return out;
}

/* Anker über die Kennung `id="design-system"`, nicht über die Position (Fund 18.09.2026,
   Rahmen-Schutz-Nachtrag): „das erste <style>" und, unabhängig davon, „das erste </style>"
   kreuzen sich, sobald ein weiteres <style>-Element davorsteht — real getroffen durch den
   Rahmen-Schutz-Block. Beide Enden jetzt an derselben, benannten Stelle verankert. */
function ladeStyleBlock() {
  const html = fs.readFileSync(KERN, 'utf8');
  const MARKER = '<style id="design-system">';
  const markerAt = html.indexOf(MARKER);
  const start = markerAt === -1 ? -1 : markerAt + MARKER.length;
  const end = start === -1 ? -1 : html.indexOf('</style>', start);
  assert.ok(start > -1 && end > start, '<style id="design-system">-Block gefunden');
  return html.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('[Doku-Input-Schriftart] `.doku-input` erbt font-family AUCH für input[type="text"]', () => {
  test('eine Regel, die `.doku-input` trägt, setzt font-family: inherit', () => {
    const regeln = leafRegeln(ladeStyleBlock());
    const treffer = regeln.filter((r) => {
      const teile = r.selector.split(',').map((s) => s.trim());
      return teile.some((t) => t === '.doku-input');
    });
    assert.ok(treffer.length >= 1, 'keine Regel trägt den Selektor `.doku-input`');
    assert.ok(treffer.some((r) => /font-family\s*:\s*inherit/.test(r.decl)),
      'die `.doku-input`-Regel setzt kein font-family: inherit — input[type="text"] bleibt in der UA-Schrift (Arial)');
  });

  test('die betroffenen Fundstellen (Name/Adresse/Partei) sind type="text" unter `.doku-input` (Diagnose-Beleg)', () => {
    const html = fs.readFileSync(KERN, 'utf8');
    // Reihenfolge der Attribute wie im Renderer (dokumentPanelHTML): type vor id vor class.
    assert.match(html, /type="text" id="doku-neu-name" class="doku-input"/, 'doku-neu-name nicht gefunden — Diagnose veraltet?');
    assert.match(html, /type="text" id="doku-neu-adresse" class="doku-input"/, 'doku-neu-adresse nicht gefunden — Diagnose veraltet?');
    assert.match(html, /type="text" id="doku-neu-partei" class="doku-input"/, 'doku-neu-partei nicht gefunden — Diagnose veraltet?');
    // Zum Vergleich: doku-neu-datum ist type="date" — von Fund 1s globalem Reset bereits erfasst,
    // unabhängig vom Fix hier.
    assert.match(html, /type="date" id="doku-neu-datum" class="doku-input"/, 'doku-neu-datum nicht gefunden — Diagnose veraltet?');
  });
});

describe('[Doku-Input-Schriftart·Rotmachbarkeit] die Maschine kann tatsächlich rot werden', () => {
  test('eine Regel, die `.doku-input` nur mit anderen Eigenschaften (ohne font-family) trägt, fällt durch', () => {
    const ohneFontFamily = '.doku-input, .doku-select { width: 100%; font-size: 1rem; }';
    const regeln = leafRegeln(ohneFontFamily);
    const treffer = regeln.filter((r) => r.selector.split(',').map((s) => s.trim()).some((t) => t === '.doku-input'));
    assert.ok(treffer.length >= 1, 'Testaufbau fehlerhaft — `.doku-input` müsste hier auftauchen');
    assert.ok(!treffer.some((r) => /font-family\s*:\s*inherit/.test(r.decl)),
      'ohne font-family: inherit darf die Probe nicht grün sein');
  });

  test('eine auf `.doku-select` allein gescopte Regel deckt `.doku-input` NICHT ab (das ist genau die alte Lücke)', () => {
    const nurSelect = '.doku-select { font-family: inherit; }';
    const regeln = leafRegeln(nurSelect);
    const treffer = regeln.filter((r) => r.selector.split(',').map((s) => s.trim()).some((t) => t === '.doku-input'));
    assert.deepEqual(treffer, [], 'eine Regel ohne `.doku-input`-Selektor darf die Probe nicht bestehen');
  });
});
