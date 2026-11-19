'use strict';
/* D86/H06 (Desktop-Dummy Z. 252–255, 17.11.2026): schmal (375 px) steht „Herausgeben“ als Blatt von unten, angedockt an den unteren
   Rand, volle Breite, nur oben gerundet; breit (1280 px) bleibt das Fenster mittig. Der Weg geht mit echten Klicks wie bei einem Menschen. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, schubfachOeffnen } = require('./helpers');

async function herausgebenOeffnen(page, schmal) {
  await oeffneApp(page);
  await depotAnlegen(page);
  // Schmal ist die Seitenleiste eingeklappt; seit der Kopfleiste nach dem Dummy (17.11.2026) öffnet sie bis 767 px der Tab „Bereiche“,
  // nicht mehr ein Menü-Knopf im Kopf. Derselbe Weg wie ein Mensch: schubfachOeffnen nimmt den sichtbaren.
  if (schmal) await schubfachOeffnen(page);
  await page.click('[data-anlass-auswahl="1"]');
  await page.waitForSelector('[data-anlass="arzt"]', { state: 'visible' });
  await page.click('[data-anlass="arzt"]');
  await page.waitForSelector('#b-anlass-herausgeben', { state: 'visible' });
  await page.click('#b-anlass-herausgeben');
  await page.waitForSelector('#modal-inhalt.modal-blatt', { state: 'visible' });
  await page.waitForTimeout(400);   // Einblenden abwarten
  return page.evaluate(() => {
    const b = document.getElementById('modal-inhalt');
    const r = b.getBoundingClientRect();
    const st = getComputedStyle(b);
    return { unten: r.bottom, oben: r.top, links: r.left, breite: r.width, hoehe: innerHeight, weite: innerWidth,
      rundOben: parseFloat(st.borderTopLeftRadius), rundUnten: parseFloat(st.borderBottomLeftRadius),
      titel: (document.getElementById('modal-titel') || {}).textContent || '' };
  });
}

test('[D86·375] „Herausgeben“ steht schmal als Blatt unten', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const r = await herausgebenOeffnen(page, true);
  expect(r.titel).toContain('Herausgeben');
  expect(Math.abs(r.unten - r.hoehe), 'am unteren Rand angedockt').toBeLessThanOrEqual(1);
  expect(r.breite, 'volle Breite').toBeGreaterThanOrEqual(r.weite - 1);
  expect(r.rundOben, 'oben gerundet').toBeGreaterThan(0);
  expect(r.rundUnten, 'unten eckig').toBe(0);
  expect(r.oben, 'höchstens 88 % der Höhe').toBeGreaterThanOrEqual(r.hoehe * 0.12 - 1);
});

test('[D86·1280] „Herausgeben“ bleibt breit mittig', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const r = await herausgebenOeffnen(page, false);
  expect(r.titel).toContain('Herausgeben');
  expect(r.breite, 'nicht volle Breite').toBeLessThan(r.weite - 100);
  expect(Math.abs((r.links + r.breite / 2) - r.weite / 2), 'waagrecht mittig').toBeLessThanOrEqual(2);
  expect(r.hoehe - r.unten, 'nicht am unteren Rand').toBeGreaterThan(8);
});
