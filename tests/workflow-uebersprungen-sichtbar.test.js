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
const { test } = require('node:test');
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
  const cross = fs.readFileSync(path.join(DIR, 'e2e-cross.yml'), 'utf8');
  assert.equal((cross.match(/echo "da=nein"/g) || []).length, 2, 'Vorbedingung: beide Jobs von e2e-cross haben den Zweig');
});

test('[Workflow·übersprungen·Rot-Beweis] ohne die Zusammenfassungs-Zeile fällt e2e-cross', () => {
  const cross = fs.readFileSync(path.join(DIR, 'e2e-cross.yml'), 'utf8');
  const ohne = cross.split('\n').filter((z) => !/GITHUB_STEP_SUMMARY/.test(z)).join('\n');
  assert.equal(befund('e2e-cross.yml', ohne).length, 2);
});
