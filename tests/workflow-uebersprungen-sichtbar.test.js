'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Ein Workflow, der seine Schritte überspringt, sagt es in der Zusammenfassung (26.09.2026)
   ────────────────────────────────────────────────────────────────────────
   e2e-cross.yml hängt jeden Schritt an `steps.vier.outputs.da == 'ja'`. Im
   öffentlichen Zuschnitt fehlt der Template-Generator; dann lief nichts, und der
   Lauf war grün — eine Deckung, die es nicht gibt. Die Annotation allein sieht
   man in der Übersicht nicht.
   Regel: jeder Zweig in .github/workflows/, der `da=nein` setzt, schreibt
   dieselbe Aussage in `$GITHUB_STEP_SUMMARY`.
   ROT-BEWEIS: der Workflow ohne die Zusammenfassungs-Zeile.
   ════════════════════════════════════════════════════════════════════════ */
// nur-privat: e2e-cross.yml ist öffentlich zurückgezogen (bis E2E-CROSS-OEFFENTLICH-LEER gelöst); nur die Vorbedingung
// an diesem Workflow läuft privat. Die Regel über alle Workflows und ihr Rot-Beweis laufen öffentlich.
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', '.github', 'workflows');

function befund(name, text) {
  const funde = [];
  const zeilen = text.split('\n');
  zeilen.forEach((z, i) => {
    if (!/echo "da=nein" >> "\$GITHUB_OUTPUT"/.test(z)) return;
    const davor = zeilen.slice(Math.max(0, i - 4), i).join('\n');
    if (!/>> "\$GITHUB_STEP_SUMMARY"/.test(davor)) funde.push(name + ':' + (i + 1) + ' setzt da=nein ohne Zeile in der Zusammenfassung');
  });
  return funde;
}

test('[Workflow·übersprungen] jeder Zweig, der da=nein setzt, schreibt es in die Zusammenfassung', () => {
  const dateien = fs.readdirSync(DIR).filter((d) => /\.ya?ml$/.test(d));
  const alle = dateien.flatMap((d) => befund(d, fs.readFileSync(path.join(DIR, d), 'utf8')));
  assert.deepEqual(alle, []);
});

test('[Workflow·übersprungen·e2e-cross] beide Jobs von e2e-cross haben den Zweig', () => {
  const cross = fs.readFileSync(path.join(DIR, 'e2e-cross.yml'), 'utf8');   // zuschnitt-privat: nur-privat-Test
  assert.equal((cross.match(/echo "da=nein"/g) || []).length, 2, 'Vorbedingung: beide Jobs von e2e-cross haben den Zweig');
});

test('[Workflow·übersprungen·Rot-Beweis] ein Zweig ohne Zusammenfassungs-Zeile fällt, einer mit ihr nicht', () => {
  // Erfundener Ausschnitt in der Form der e2e-cross-Zweige (keine Datei gelesen: der Workflow ist öffentlich zurückgezogen).
  const mit = [
    '        run: |',
    '          if [ -f anwendung.html ]; then echo "da=ja" >> "$GITHUB_OUTPUT"; else',
    '            echo "::notice title=übersprungen::anwendung.html fehlt"',
    '            echo "### übersprungen: anwendung.html fehlt" >> "$GITHUB_STEP_SUMMARY"',
    '            echo "da=nein" >> "$GITHUB_OUTPUT"; fi',
  ].join('\n');
  const ohne = mit.split('\n').filter((z) => !/GITHUB_STEP_SUMMARY/.test(z)).join('\n');
  assert.deepEqual(befund('probe.yml', mit), []);
  assert.equal(befund('probe.yml', ohne).length, 1);
});
