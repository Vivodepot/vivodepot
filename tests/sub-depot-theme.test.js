'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Salbei + Sub-Depot-Palette in Hochkontrast & Nacht (Strang 3 Commit D;
   Palettentausch 04.08.2026)
   ────────────────────────────────────────────────────────────────────────
   GERECHNETER BEFUND (Palette-Zug-4-Bericht, freigegeben): dieselben sechs
   Hex-Werte + derselbe dunkle Text erreichen ≥3:1 gegen Salbei-dunkel und
   ≥4,5:1 Textkontrast unverändert in allen drei Themes — Salbei-dunkel bewegt
   sich zwischen den Themes kaum (#4F6539 hell/Nacht, #4a5f3a Hochkontrast).
   KEINE separaten Nacht-/Hochkontrast-Fassungen der Palette mehr nötig; die
   HC-/Nacht-Theme-Blöcke tragen darum KEINE eigenen Palette-Hex mehr — sie
   erben aus :root. Geprüft wird darum die ABWESENHEIT eigener Overrides, nicht
   deren (nicht mehr existierender) Werte.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PALETTE = ['hafer', 'ton', 'flieder', 'altrose', 'nebel', 'kiesel'];

function block(html, sel) {
  const i = html.indexOf(sel);
  return html.slice(i, html.indexOf('}', i) + 1);
}

test('HC: Salbei-Familie unverändert; KEINE eigene Palette-Übersteuerung mehr', () => {
  const { html } = ladeKern();
  const hc = block(html, 'html.high-contrast {');
  assert.ok(/--salbei-dunkel:\s*#4a5f3a/.test(hc));
  assert.ok(/--salbei-mid:\s*#576d4a/.test(hc));
  assert.ok(/--salbei-light:\s*#e9f0e3/.test(hc));
  for (const t of PALETTE) {
    assert.ok(!new RegExp('--' + t + ':\\s*#').test(hc), 'HC überschreibt ' + t + ' NICHT mehr mit eigenem Hex');
    assert.ok(!hc.includes('--' + t + '-text:'), 'HC überschreibt ' + t + '-text NICHT mehr');
  }
  assert.ok(!hc.includes('#16320c') && !hc.includes('#244618') && !hc.includes('#e8efe2'), 'keine Forest-HC-Werte');
});

test('Nacht: Salbei unverändert; #8fb86f ersetzt durch #8eab77; KEINE eigene Palette-Übersteuerung mehr', () => {
  const { html } = ladeKern();
  const dm = block(html, 'html.dark-mode {');
  assert.ok(/--salbei-light:\s*#252f1d/.test(dm), 'Nacht salbei-light');
  for (const t of PALETTE) {
    assert.ok(!new RegExp('--' + t + ':\\s*#').test(dm), 'Nacht überschreibt ' + t + ' NICHT mehr mit eigenem Hex');
    assert.ok(!dm.includes('--' + t + '-text:'), 'Nacht überschreibt ' + t + '-text NICHT mehr');
  }
  // --vm-flaeche ist seit der Fläche→Rand-Rücknahme (27.08.2026) ersatzlos entfallen — die
  // Content-Fläche ist in JEDEM Theme wieder das normale --cream/--white wie im Ankerdepot.
  assert.ok(!html.includes('--vm-flaeche:'), 'keine Flächen-Variable mehr, auch nicht in Nacht');
  // vm-chrome-text/vm-akzent-stark werden in Nacht NICHT mehr eigens gesetzt — sie erben aus
  // :root (var(--auf-akzent) bzw. var(--salbei-dunkel)), und --auf-akzent ist in Nacht auf das
  // helle Ink gesetzt (s. u.).
  assert.ok(!dm.includes('--vm-chrome-text:'), 'Nacht setzt --vm-chrome-text NICHT mehr eigens');
  assert.ok(!dm.includes('--vm-akzent-stark:'), 'Nacht setzt --vm-akzent-stark NICHT mehr eigens');
  assert.ok(/--auf-akzent:\s*#e9ede7/.test(dm), 'Nacht --auf-akzent bleibt gesetzt (Kopfzeilen-Text)');
  // Der alte Forest-Nacht-Grün-Ton ist überall ersetzt.
  assert.ok(!html.includes('#8fb86f'), 'kein #8fb86f mehr');
  assert.ok(html.includes('#8eab77'), 'Salbei-Nacht-Textton vorhanden');
});

test('Nacht × Vollmacht liest Theme-Tokens — Kopfzeile bleibt aussen vor (Palettentausch Zug 2)', () => {
  const { html } = ladeKern();
  // UX-Konzept §7/§8 (25.08.2026): die Sidebar hat seit heute KEINE Nacht-×-Vollmacht-Chrome-
  // Regel mehr — sie ist in jedem Modus Papierton (ersatzlos entfallen, nicht umgezogen).
  assert.doesNotMatch(html, /html\.dark-mode #app\.modus-vollmacht \.sidebar\s*\{/, 'kein Sidebar-Chrome-Token mehr in Nacht × Vollmacht');
  assert.ok(!/html\.dark-mode #app\.modus-vollmacht \.topbar/.test(html), 'Kopfzeile bleibt in Nacht × Vollmacht aussen vor (Zug 2)');
  // Fläche→Rand (27.08.2026): weder Content-Fläche noch Überschriften-Textfarbe färben mehr,
  // auch nicht in Nacht — s. tests/sub-depot-akzent-rand-statt-flaeche.test.js für die Rot-Beweise.
  assert.doesNotMatch(html, /html\.dark-mode #app\.modus-vollmacht \.content \{ background:/, 'keine Nacht-Content-Flächenregel mehr');
  assert.doesNotMatch(html, /html\.dark-mode #app\.modus-vollmacht \.sektion h2 \{ color:/, 'keine Nacht-Überschriften-Farbregel mehr');
  // Die alten Vollmacht-Nacht-Hardcodes (#243447 Chrome, #18222e Content) sind weg.
  assert.ok(!html.includes('#243447'), 'kein #243447');
  assert.ok(!html.includes('#18222e'), 'kein #18222e');
});

test('Root: pro-Akzent --*-text-Token, EIN dunkler Wert für alle sechs (Palettentausch)', () => {
  const { html } = ladeKern();
  const root = html.slice(html.indexOf(':root {'), html.indexOf('--akzent: var(--modus-anker);'));
  for (const t of PALETTE) {
    assert.ok(new RegExp('--' + t + '-text:\\s*#1c2a1e').test(root), t + '-text = #1c2a1e');
  }
});
