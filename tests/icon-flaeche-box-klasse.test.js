'use strict';
/* Befund KACHEL-ICON-KLEBT (24.09.2026, in der Vorführung gesehen): in der Eintragen-Übersicht klebte das Symbol am Bereichstitel,
   dahinter ein versetzter blasser Kreis. Ursache: die Icon-Fläche `.bereich-karte-icon` war ein <span> ohne display — inline, und bei
   inline greifen width/height/margin nicht. Die Klasse: eine Icon-Fläche mit Maßen, die ihre Maße nie bekommt.
   Klassenwächter über Kern und Lese-App: jede CSS-Klasse, deren Name „icon" enthält und die width oder height setzt, trägt in
   irgendeiner ihrer Regeln ein display, das Maße wirken lässt (block, flex, inline-flex, grid, inline-grid, inline-block). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const MASS_DISPLAY = /^(block|flex|inline-flex|grid|inline-grid|inline-block|table|inline-table|list-item)$/;

function iconKlassen(html) {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const k = new Map();
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const sel of m[1].split(',').map((x) => x.trim())) {
      const t = /\.([a-z0-9_-]*icon[a-z0-9_-]*)\s*$/i.exec(sel);
      if (!t) continue;
      if (!k.has(t[1])) k.set(t[1], { masse: false, display: [] });
      const e = k.get(t[1]);
      if (/(^|;)\s*(width|height)\s*:/.test(m[2])) e.masse = true;
      const d = /(^|;)\s*display\s*:\s*([^;]+)/.exec(m[2]);
      if (d) e.display.push(d[2].replace(/!important/, '').trim());
    }
  }
  return k;
}
function funde(html) {
  const raus = [];
  for (const [klasse, e] of iconKlassen(html)) {
    if (e.masse && !e.display.some((d) => MASS_DISPLAY.test(d))) raus.push(klasse + ' setzt Maße, aber kein display, das sie wirken lässt (' + (e.display.join(', ') || 'keins') + ')');
  }
  return raus;
}

test('[Icon-Fläche·Klasse] jede Icon-Klasse mit Maßen trägt ein display, das die Maße wirken lässt — Kern und Lese-App', () => {
  for (const datei of ['vivodepot.html', 'vivodepot-lesen.html']) {
    const html = fs.readFileSync(path.join(REPO, datei), 'utf8');
    assert.ok(iconKlassen(html).size > 0 || datei === 'vivodepot-lesen.html', datei + ': Kontrolle — Icon-Klassen werden gefunden');
    assert.deepEqual(funde(html), [], datei);
  }
});

test('[Icon-Fläche·Klasse·Rot-Beweis] die frühere Regel der Kachel-Icon-Fläche wird gefunden, die heutige nicht', () => {
  const alt = '<style>.bereich-karte .bereich-karte-icon { width: 32px; height: 32px; border-radius: 4px; }</style>';
  assert.equal(funde(alt).length, 1);
  const neu = '<style>.bereich-karte .bereich-karte-icon { display: inline-flex; width: 32px; height: 32px; }</style>';
  assert.deepEqual(funde(neu), []);
});
