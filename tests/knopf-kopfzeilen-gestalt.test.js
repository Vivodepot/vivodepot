'use strict';
/* Die Kopfzeilen-Gestalt `a11y-btn` (helle Schrift für die dunkle Kopfzeile) steht nur an Knöpfen der Kopfzeile (v894,
   Befund 03.10.2026: der Vorlese-Knopf der Einführung trug sie auf der weißen Startkarte — unsichtbar, aber fokussierbar).
   Statisch, gegen den Kern: jede Klassenangabe mit `a11y-btn` gehört zu einem Knopf mit `id="tb-…"`. Die Klasse im Browser
   (jeder fokussierbare Knopf ≥ 3:1 zu seinem Grund, in allen drei Modi) hält tests/e2e/knopf-kontrast.spec.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

/* Liefert die Klassenangaben mit `a11y-btn`, deren Knopf keine Kopfzeilen-Kennung trägt — im Markup wie in JS-Zeichenketten. */
function ausserhalbDerKopfzeile(text) {
  const raus = [];
  const re = /class=\\?["']([^"'\\]*)\\?["']/g;
  let m;
  while ((m = re.exec(text))) {
    if (!m[1].split(/\s+/).includes('a11y-btn')) continue;
    const tag = text.slice(text.lastIndexOf('<', m.index), text.indexOf('>', m.index) + 1);
    if (!/\bid=\\?["']tb-[a-z-]+/.test(tag)) raus.push(tag.slice(0, 120));
  }
  return raus;
}

test('[Knopf-Gestalt] die Kopfzeilen-Gestalt a11y-btn steht nur an Knöpfen der Kopfzeile', () => {
  assert.ok(KERN.split('class="a11y-btn').length - 1 >= 5, 'Vorbedingung: die Knöpfe der Kopfzeile werden gefunden');
  assert.deepEqual(ausserhalbDerKopfzeile(KERN), []);
});

test('[Knopf-Gestalt·Rot-Beweis] der Vorlese-Knopf der Einführung in Kopfzeilen-Gestalt wird gefunden', () => {
  const vorher = `? '<div style="margin-top:var(--space-3)"><button type="button" class="a11y-btn vorlese-knopf" id="vorlese-sicht" aria-pressed="false"'`;
  assert.equal(ausserhalbDerKopfzeile(vorher).length, 1);
  assert.equal(ausserhalbDerKopfzeile('<button type="button" class="a11y-btn" id="tb-nacht">').length, 0, 'Gegenprobe: Kopfzeile');
});
