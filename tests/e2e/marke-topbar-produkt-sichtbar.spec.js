'use strict';
/* U2-ADR-297 — echter Browser-Lauf (Playwright, nicht nur Kern-Regex): beweist, dass ein
   Vor-Depot-Branding-Modul die tatsächlich vom Browser berechnete Kopfzeilen-Fläche
   (getComputedStyle(.topbar).backgroundColor) sichtbar ändert — Fall 2, „die sparkasse zb
   färbt rot". Spiegel von marke-schriftart-sichtbar.spec.js, hier für die Kopfzeile statt die
   Basis-Schriftart. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

const PW = 'e2e-passwort-adr297';

test('ein Vor-Depot-Branding-Modul füllt die Kopfzeile sichtbar mit der Institutionsfarbe (rgb, nicht der Salbei-Fallback)', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });

  const ohneBranding = await page.locator('.topbar').evaluate((el) => getComputedStyle(el).backgroundColor);

  const mitBranding = await page.evaluate(() => {
    window.__vdOeffentlich._brandingProduktTopbarAnwenden({ farbePrimaer: '#8b1a2b' });
    return getComputedStyle(document.querySelector('.topbar')).backgroundColor;
  });
  expect(mitBranding).not.toBe(ohneBranding);
  expect(mitBranding).toBe('rgb(139, 26, 43)'); // #8b1a2b

  const textFarbe = await page.evaluate(() => getComputedStyle(document.querySelector('.topbar')).color);
  expect(textFarbe).toBe('rgb(255, 255, 255)'); // Kontrast-Gewinner gegen #8b1a2b

  // Reset-Weg: derselbe Vertrag wie brandingAnwenden(null, ...).
  const nachReset = await page.evaluate(() => {
    window.__vdOeffentlich._brandingProduktTopbarAnwenden(null);
    return getComputedStyle(document.querySelector('.topbar')).backgroundColor;
  });
  expect(nachReset).toBe(ohneBranding);
});

test('eine kontrastschwache Institutionsfarbe füllt die Kopfzeile NICHT — der Salbei-Fallback bleibt sichtbar bestehen', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });

  const ohneBranding = await page.locator('.topbar').evaluate((el) => getComputedStyle(el).backgroundColor);

  const mitKontrastschwacherFarbe = await page.evaluate(() => {
    window.__vdOeffentlich._brandingProduktTopbarAnwenden({ farbePrimaer: '#808080' });
    return getComputedStyle(document.querySelector('.topbar')).backgroundColor;
  });
  expect(mitKontrastschwacherFarbe).toBe(ohneBranding);
});
