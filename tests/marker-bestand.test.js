'use strict';
/* marker-bestand.test.js — jede Marker-Region im Kern steht in der W0-Positivliste oder einzeln begründet daneben (v894, Auflage der Gegenlesung)
   Werkzeug: tools/marker-bestand-pruefen.js. Anlass: ein Regelblock mit :BEGIN/:END-Markern fiel am 02.10.2026 unbemerkt aus der
   W0-Zählung (gemessen +3757 statt +7987 Byte). Eine Region ohne Eintrag ist ein Versteck. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../tools/marker-bestand-pruefen.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

test('[Marker-Bestand] jeder Marker-Name im Kern hat einen Eintrag, jeder Eintrag einen Marker, jedes BEGIN ein END', () => {
  const b = M.bestand({ text: KERN });
  assert.deepEqual(b.ohneEintrag, [], 'Marker ohne Eintrag in der W0-Positivliste oder MARKER_AUSSERHALB_W0');
  assert.deepEqual(b.eintragOhneMarker, [], 'Eintrag ohne Marker — die Region ist fort, die Zeile muss es auch sein');
  assert.deepEqual(b.ohneEnde, []);
  assert.deepEqual(b.nichtLeer, [], 'ein dauerhafter Backplatz trägt im Gerüst Inhalt (Sollwert leer)');
});

test('[Marker-Bestand] dauerhaft und Übergang sind getrennt, jede Zeile mit eigenem Grund, der Übergang exakt gedeckelt', () => {
  const dauerhaft = Object.keys(M.MARKER_DAUERHAFT);
  const uebergang = Object.keys(M.MARKER_UEBERGANG);
  assert.deepEqual(dauerhaft.filter((n) => uebergang.includes(n)), [], 'ein Name in beiden Listen');
  for (const [name, grund] of Object.entries(M.MARKER_AUSSERHALB_W0)) assert.ok(typeof grund === 'string' && grund.length >= 40, name);
  for (const [name, e] of Object.entries(M.MARKER_DAUERHAFT)) assert.ok(['leer', 'mechanik'].includes(e.art), name);
  for (const [name, grund] of Object.entries(M.MARKER_UEBERGANG)) assert.match(grund, /v\d{3}/, name + ': eine Übergangszeile nennt ihren Abbaupfad (Fassung)');
  assert.equal(uebergang.length, M.UEBERGANG_DECKEL, 'Übergangszeilen dürfen nur weniger werden — beim Abbau den Deckel im selben Commit senken');
});

test('[Marker-Bestand·Rot-Beweis] ein neuer, nicht eingetragener Marker wird gefunden — als Kommentar wie als HTML-Kommentar', () => {
  for (const marke of ['/* VERSTECK:BEGIN */ const x = 1; /* VERSTECK:END */', '<!-- VERSTECK:BEGIN --><!-- VERSTECK:END -->']) {
    const t = KERN.replace('</title>', '</title>\n<script>' + marke + '</script>');
    assert.ok(M.bestand({ text: t }).ohneEintrag.includes('VERSTECK'), marke);
  }
  const ohneEnde = KERN.replace('</title>', '</title>\n<script>/* HALB:BEGIN */</script>');
  assert.ok(M.bestand({ text: ohneEnde }).ohneEnde.includes('HALB'));
});

test('[Marker-Bestand·Rot-Beweis] ein Backplatz mit Inhalt im Gerüst ist rot (Sollwert leer)', () => {
  const t = KERN.replace('const LEBENSLAGEN_KATALOG = null;', 'const LEBENSLAGEN_KATALOG = { lagen: [1] };');
  assert.notEqual(t, KERN, 'Testvoraussetzung');
  assert.equal(M.leerImGeruest(KERN, 'LEBENSLAGEN_KATALOG'), true);
  assert.ok(M.bestand({ text: t }).nichtLeer.includes('LEBENSLAGEN_KATALOG'));
  assert.equal(M.leerImGeruest(KERN, 'AB_WERK_VOR_DEPOT_KONFIGURATION'), true, 'HTML-Hülle mit = null gilt als leer');
});
