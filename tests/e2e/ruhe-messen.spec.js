// ruhe-messen.spec.js — die Seitenfunktion des Ruhe-Maßes im echten Chromium (03.10.2026)
// ────────────────────────────────────────────────────────────────────────────
// tests/ruhe-messen.test.js prüft die Zählung an Datensätzen; was `sammeln()` in einer echten Seite
// liefert (Sichtbarkeit, berechnete Stile, gefüllter Vorfahr), sieht nur ein Browser. Zwei HTML-Fixtures:
// die volle trägt mehr Flächen, Rahmen und Schriften — sie muss bei jedem der zehn Maße höher liegen.
// Die genauen Zahlen stehen von Hand hier und decken sich mit den Datensatz-Fixtures.
const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');
const { sammeln, auswerten, MASSE } = require('../../tools/ruhe-messen.js');

const FIX = path.join(__dirname, '..', 'fixtures', 'ruhe-messen');
async function messen(page, name) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(pathToFileURL(path.join(FIX, name + '.html')).href);
  return auswerten(await page.evaluate(sammeln));
}

test('[Ruhe·Seite] die ruhige und die volle Fixture ergeben im Browser die erwarteten Zahlen, voll liegt überall höher', async ({ page }) => {
  const ruhig = await messen(page, 'ruhig');
  const voll = await messen(page, 'voll');
  expect(ruhig).toEqual({ flaechen: 1, rahmen: 0, schriftgroessen: 2, schriftstaerken: 2, textfarben: 2, akzentflaechen: 1,
    hintergrundfarben: 1, eckenradien: 0, kleineflaechen: 0, knopfartig: 0 });
  expect(voll).toEqual({ flaechen: 8, rahmen: 4, schriftgroessen: 5, schriftstaerken: 4, textfarben: 4, akzentflaechen: 2,
    hintergrundfarben: 5, eckenradien: 3, kleineflaechen: 5, knopfartig: 2 });
  for (const m of MASSE) expect(voll[m], m).toBeGreaterThan(ruhig[m]);
});

test('[Ruhe·Seite·Rot-Beweis] was außerhalb des sichtbaren Bereichs liegt, zählt nicht', async ({ page }) => {
  const vorher = await messen(page, 'voll');
  await page.evaluate(() => { document.querySelector('.leiste').style.position = 'absolute'; document.querySelector('.leiste').style.top = '-500px'; });
  const nachher = auswerten(await page.evaluate(sammeln));
  expect(nachher.flaechen).toBe(vorher.flaechen - 1);
  expect(nachher.akzentflaechen).toBe(vorher.akzentflaechen - 1);
});
