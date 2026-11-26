'use strict';
/* Feldregister-Zuordnungen: der QR auf die SSSOM-Tabelle, aus dem gezeichneten Bild zurückgelesen. Die Matrix kommt aus
   tools/lib/feldregister-sssom.js (Bibliothek aus dem Kern); jsQR (devDependency, nur Tests) liest sie zurück, und das
   Ergebnis muss genau die Abholadresse mit Prüfsumme sein. Hier unter tests/mit-modul/, weil Schicht 1 ohne externes Modul läuft. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const jsQR = require('jsqr');
const S = require('../../tools/lib/feldregister-sssom.js');

function lesen(m) {
  const k = 4, rand = 4, n = (m.length + 2 * rand) * k;
  const bild = new Uint8ClampedArray(n * n * 4).fill(255);
  m.forEach((zeile, r) => zeile.forEach((dunkel, c) => {
    if (!dunkel) return;
    for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) { const i = (((r + rand) * k + y) * n + (c + rand) * k + x) * 4; bild[i] = bild[i + 1] = bild[i + 2] = 0; }
  }));
  return (jsQR(bild, n, n) || {}).data;
}

test('[SSSOM·QR] der QR liest sich als die Abholadresse der Tabelle mit Prüfsumme im Fragment', () => {
  const hash = 'ab'.repeat(32);
  const adresse = S.qrAdresse(hash);
  assert.equal(adresse, 'https://register.vivodepot.de/feldregister.sssom.tsv#sha256=' + hash);
  assert.equal(lesen(S.qrMatrix(adresse)), adresse);
});

test('[SSSOM·QR·Rot-Beweis] eine andere Adresse liest sich nicht als die gesuchte', () => {
  const adresse = S.qrAdresse('cd'.repeat(32));
  assert.notEqual(lesen(S.qrMatrix(adresse)), S.qrAdresse('ab'.repeat(32)));
});
