'use strict';
/* ═════════════════════════════════════════════════════════════════
   Vorführung „Fragen am Eintrag“, Station Freigabe (17.11.2026): seit „Häkchen in Gruppen“ (Entscheidung 17.11.2026) trägt die
   Übersicht vor der Ausgabe je Angabe ein Häkchen (input.export-haken), keine Knöpfe „Zurückhalten“/„Doch mitgeben“ mehr. Die
   Vorführung klickte weiter den alten Knopf und fand ihn nicht: die Medikation stand in der Freigabe-Station nicht angehakt.

   [Vorführung·Häkchen]   die Freigabe der Vorführung hakt input.export-haken der Station an.
   [Vorführung·Klasse]    kein Selektor im Kern zielt noch auf die entfallenen Knöpfe (.export-zz-btn, #exp-zurueckhalten-weg).
   [Vorführung·Rot-Beweis] ein Kern mit dem alten Knopf-Selektor fällt durch beide Proben.
   Die Wirkung im Browser prüft die Demo-Probe [Demo fragen-am-eintrag · Inhalt].
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');

function funktion(kern, name) {
  const i = kern.indexOf('function ' + name + '(');
  if (i < 0) return '';
  const j = kern.indexOf('\nfunction ', i + 1);
  return kern.slice(i, j < 0 ? undefined : j);
}

function luecken(kern) {
  const fehlt = [];
  const f = funktion(kern, '_vorfuehrungGespraechsblattFreigabe');
  if (!f) fehlt.push('Funktion fehlt');
  else if (!/input\.export-haken\[data-sektor=/.test(f)) fehlt.push('Freigabe hakt kein input.export-haken an');
  const alt = kern.match(/querySelector(?:All)?\([^)]*(?:\.export-zz-btn|#exp-zurueckhalten-weg)/g) || [];
  if (alt.length) fehlt.push('Selektor auf entfallenen Knopf: ' + alt.length);
  return fehlt;
}

test('[Vorführung·Häkchen] die Freigabe der Vorführung hakt die Angaben der Station an', () => {
  assert.deepEqual(luecken(KERN).filter((z) => !z.startsWith('Selektor')), []);
});

test('[Vorführung·Klasse] kein Selektor zielt auf die entfallenen Knöpfe', () => {
  assert.deepEqual(luecken(KERN).filter((z) => z.startsWith('Selektor')), []);
});

test('[Vorführung·Rot-Beweis] der alte Knopf-Selektor fällt durch', () => {
  const alt = KERN.replace(
    /input\.export-haken\[data-sektor="' \+ sektor \+ '"\]\[data-feld="' \+ feld \+ '"\]'\);\n    if \(h && !h\.checked\) h\.click\(\);/,
    '.export-zz-btn-zurueck[data-sektor="\' + sektor + \'"][data-feld="\' + feld + \'"]\');\n    if (h) h.click();');
  assert.notEqual(alt, KERN, 'Voraussetzung: die neue Stelle gefunden');
  const l = luecken(alt);
  assert.ok(l.includes('Freigabe hakt kein input.export-haken an'), l.join(' | '));
  assert.ok(l.some((z) => z.startsWith('Selektor auf entfallenen Knopf')), l.join(' | '));
});
