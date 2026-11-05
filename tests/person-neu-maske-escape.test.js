'use strict';
/* Die Maske „neue Person“ (_personNeuMaskeHTML, 31.10.2026) steht hinter drei HTML-Senken: im Kreisdialog
   (_kreisPersonAuswahlVerdrahten), am Verweisfeld (_refSubPickerVerdrahten) und am Mehrfach-Verweisfeld
   (_refMehrfachVerdrahten, mit dem eingetippten Namen vorbelegt). Diese Probe hält fest, dass ein eingetippter Name
   und eine Feldkennung mit `"><img onerror>` Text bleiben, und dass jede der drei Senken genau die Maske einsetzt.
   Rot-Beweis: derselbe Name ohne escapeAttr bräche aus dem value-Attribut aus. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const BOESE = '"><img src=x onerror="window.__boese=1">';

test('[Person-neu-Maske] Name und Feldkennung bleiben Text, kein Element entsteht', () => {
  const { V } = ladeKern();
  for (const mitGeburt of [false, true]) {
    const html = V._personNeuMaskeHTML(BOESE, BOESE, mitGeburt);
    assert.doesNotMatch(html, /<img /, 'kein img-Element aus Name oder Kennung');
    assert.ok(html.includes('value="&quot;&gt;&lt;img'), 'der Name steht maskiert im value-Attribut');
    // Zeichenebene, nicht DOM: die DOM des Testkerns ist eine Attrappe und parst kein HTML.
    assert.doesNotMatch(html, /data-neu-[a-z]+="[^"]*"[^ >]/, 'kein Attribut bricht aus seinen Anführungszeichen aus');
  }
});

test('[Person-neu-Maske] jede Senke, die die Maske einsetzt, setzt nur die Maske ein', () => {
  const { html } = ladeKern();
  for (const fn of ['_kreisPersonAuswahlVerdrahten', '_refSubPickerVerdrahten', '_refMehrfachVerdrahten']) {
    const a = html.indexOf('\nfunction ' + fn + '(');
    assert.ok(a > 0, fn + ' fehlt');
    const rumpf = html.slice(a, html.indexOf('\n}\n', a));
    assert.match(rumpf, /\.innerHTML = _personNeuMaskeHTML\([^;]*\);/, fn + ' setzt die Maske ein');
  }
  const m = html.indexOf('\nfunction _personNeuMaskeHTML(');
  const maske = html.slice(m, html.indexOf('\n}\n', m));
  assert.doesNotMatch(maske, /\+ STRINGS\.[A-Za-z]+ \+/, 'jeder Text der Maske läuft über escapeHTML oder escapeAttr');
});

test('[Person-neu-Maske·Rot-Beweis] derselbe Name ohne escapeAttr bräche aus dem Attribut aus', () => {
  const ohne = '<input type="text" data-neu-name="kreis" value="' + BOESE + '">';
  assert.match(ohne, /<img [^>]*onerror=/, 'unmaskiert stünde ein img mit onerror im HTML — sonst prüfte die Probe oben nichts');
});
