'use strict';
/* Suche im englischen Produkt findet ein Feld über seinen Namen (Befund SUCHE-OHNE-FELDNAMEN, HOCH, 18.11.2026; gemeldet am
   ausgelieferten v1065: „allergy“ ergab „No results“). Bei 1280 und 375 px öffnet die Lupe die Palette; „allergy“ zeigt das Feld
   „Allergies (medication, food, other)“ mit dem Bereich „Health“, nicht „No results“. Die Klasse (jedes Feld, beide Sprachen,
   Haupt- und Sub-Depot) hält tests/suche-feldnamen-je-sprache.test.js mit Rot-Beweis. */
const { test, expect } = require('@playwright/test');
const h = require('./helpers.js');

for (const breite of [1280, 375]) {
  test(`[SUCHE-OHNE-FELDNAMEN] „allergy“ findet „Allergies“ im englischen Produkt bei ${breite} px`, async ({ page }) => {
    await page.setViewportSize({ width: breite, height: 900 });
    await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_EN });
    await h.depotAnlegen(page, { pw: 'e2e-passwort-123' });
    for (let k = 0; k < 3; k++) await page.keyboard.press('Escape').catch(() => {});
    const lupe = page.locator('#tb-lupe');
    if (await lupe.isVisible()) await lupe.click();
    await page.locator('#suche-eingabe').fill('allergy');
    const liste = page.locator('#suche-vorschlaege');
    await expect(liste).toBeVisible();
    await expect(liste).toContainText('Allergies (medication, food, other)');
    await expect(liste).toContainText('Health');
    await expect(liste).not.toContainText('No results');
    await page.screenshot({ path: test.info().outputPath(`suche-allergy-en-${breite}.png`) });
  });
}
