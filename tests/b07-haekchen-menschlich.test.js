'use strict';
/* B07 (01.11.2026): ein gesetztes Häkchenfeld stand in jeder für Menschen geschriebenen Ausgabe als „true“ da
   (gefunden an identity.displayFamilyNameFirst). `feldWertText` gab für ein Häkchen ohne eigenen Zweig `String(roh)`
   zurück; die Bildschirmanzeige `feldWertHTML` hatte dieselbe Lücke. Listen-Unterfelder waren längst behandelt
   (`listenEintragZusammenfassung`). `feldWertText` selbst bleibt roh, weil die Export-Mapper es lesen.
   Klassenprobe: JEDES Top-Level-Häkchenfeld aller Bereiche des Katalogs, gesetzt, in beiden menschlichen Wegen. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function haekchenFelder(V) {
  const felder = [];
  for (const sek of V.bereicheAlle()) {
    for (const s of (sek.sektionen || [])) {
      for (const f of (s.felder || [])) if (f && f.typ === 'checkbox') felder.push({ id: sek.id + '.' + f.id, feld: f });
    }
  }
  return felder;
}

for (const produkt of ['privat-de', 'privat-en']) {
  test('[B07·' + produkt + '] jedes Top-Level-Häkchen zeigt menschlich weder „true“ noch „false“', () => {
    const { V } = ladeKern({ produkt });
    const felder = haekchenFelder(V);
    // Rot-Beweis des Suchraums: ohne das Fundfeld misst die Probe nichts.
    assert.ok(felder.some((x) => x.id === 'identity.displayFamilyNameFirst'), 'Suchraum: identity.displayFamilyNameFirst gefunden');
    const funde = [];
    for (const { id, feld } of felder) {
      const text = String(V._wertTextMenschlich(feld, true));
      const html = String(V.feldWertHTML(feld, true));
      if (!text.trim() || /\b(true|false)\b/.test(text)) funde.push(id + ' _wertTextMenschlich → ' + text);
      if (!html.trim() || /\b(true|false)\b/.test(html)) funde.push(id + ' feldWertHTML → ' + html);
    }
    assert.deepEqual(funde, []);
  });
}

test('[B07·Gegenprobe] feldWertText bleibt für die Export-Mapper roh', () => {
  const { V } = ladeKern();
  const { feld } = haekchenFelder(V).find((x) => x.id === 'identity.displayFamilyNameFirst');
  assert.equal(V.feldWertText(feld, true), 'true');
});
