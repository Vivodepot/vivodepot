'use strict';
/* Bildvergleich zweier Fassungen — die Probe des Werkzeugs (U2-ADR-473, v894).
   tools/design-bildvergleich.js belegt beim Landen, dass eine Tokenisierung ab Werk
   pixelgleich bleibt (--basis <ref>). Hier läuft es gegen Fixtures: eine wertgleiche
   Tokenisierung ist 0 px anders, ein um 1 px geänderter Radius nicht. */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { vergleichen } = require('../../tools/design-bildvergleich.js');

const FIX = path.join(__dirname, '..', 'fixtures', 'design-bildvergleich');
const lies = (n) => fs.readFileSync(path.join(FIX, n), 'utf8');

async function lauf(nachher) {
  const aus = fs.mkdtempSync(path.join(os.tmpdir(), 'design-bildvergleich-probe-'));
  try {
    return await vergleichen({ vorherHtml: lies('vorher.html'), nachherHtml: lies(nachher), aus, roh: true, geraete: ['desktop'] });
  } finally { fs.rmSync(aus, { recursive: true, force: true }); }
}

test('[Bildvergleich·Negativkontrolle] wertgleiche Tokenisierung: 0 Pixel anders', async () => {
  const e = await lauf('nachher-gleich.html');
  expect(e.map((x) => [x.kennung, x.pixel])).toEqual([['--desktop-seite', 0]]);
});

test('[Bildvergleich·Rot] ein um 1 px geänderter Radius fällt auf', async () => {
  const e = await lauf('nachher-anders.html');
  expect(e).toHaveLength(1);
  expect(e[0].pixel).toBeGreaterThan(0);
  expect(e[0].rahmen).not.toBeNull();
});
