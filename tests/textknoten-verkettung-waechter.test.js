'use strict';
/* Klassenwächter „Textknoten-Verkettung in innerHTML“ (05.10.2026): ein Wert, der ohne Maskierung als Textknoten in eine
   HTML-Zeichenkette verkettet wird, ist rot, sobald er neu ist. Die Grundlinie darf nur sinken. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const W = require('../tools/textknoten-verkettung-pruefen.js');

const REPO = path.join(__dirname, '..');
const GRUNDLINIE = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'textknoten-verkettung-grundlinie.json'), 'utf8'));

function mitZusatz(zusatz) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'textknoten-probe-'));
  try {
    const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
    fs.writeFileSync(path.join(dir, 'vivodepot.html'), zusatz + '\n' + kern);
    fs.copyFileSync(path.join(REPO, 'vivodepot-lesen.html'), path.join(dir, 'vivodepot-lesen.html'));
    return W.vergleichen(W.zaehlen(W.messen(dir, W.DATEIEN)), GRUNDLINIE);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('[Textknoten] der Bestand entspricht der Grundlinie', () => {
  assert.deepEqual(W.vergleichen(W.zaehlen(W.messen(REPO, W.DATEIEN)), GRUNDLINIE), []);
});

test('[Textknoten·Rot-Beweis] eine neue Verkettung ohne Maskierung ist rot, in beiden Formen', () => {
  assert.ok(mitZusatz("h += '<li>' + fremdWertProbe;").some((x) => /NEU: vivodepot\.html\|fremdWertProbe/.test(x)));
  assert.ok(mitZusatz("h += a + fremdWertProbe + '</li>';").some((x) => /NEU: vivodepot\.html\|fremdWertProbe/.test(x)));
});

test('[Textknoten·Rot-Beweis] ein neuer HTML-Bauer zählt mit — eine Namensregel ließe ihn still durch', () => {
  assert.ok(mitZusatz("h += '<div>' + fremdeZeileProbeHTML(x) + '</div>';").some((x) => /NEU: vivodepot\.html\|fremdeZeileProbeHTML\(x\)/.test(x)));
});

test('[Textknoten·Gegenprobe] maskiert oder als Textsatz-Wert bleibt grün', () => {
  assert.deepEqual(mitZusatz("h += '<li>' + escapeHTML(fremdWertProbe) + '</li>';"), []);
  assert.deepEqual(mitZusatz("h += '<li>' + STRINGS.leerZustandProbe + '</li>';"), []);
});

test('[Textknoten·Rot-Beweis] eine verschwundene Stelle ist rot — die Grundlinie wird nachgezogen', () => {
  const k = Object.keys(GRUNDLINIE).find((x) => x.startsWith('vivodepot.html|'));
  const weniger = Object.assign({}, GRUNDLINIE, { [k]: GRUNDLINIE[k] + 1 });
  assert.ok(W.vergleichen(W.zaehlen(W.messen(REPO, W.DATEIEN)), weniger).some((x) => x.startsWith('VERSCHWUNDEN: ' + k)));
});
