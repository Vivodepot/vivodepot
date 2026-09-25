'use strict';
/* Reise — Angehörigen-Blatt: die Blätter der Vorlage des Produkts erscheinen als gewöhnliche,
   lesende Ansicht des Kerns (kein Modus) und sind über die globale Suche erreichbar. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

test('Angehörigen-Blatt: über die Suche erreichbar, lesend, Zurück führt in die Bereichs-Ansicht', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  await page.fill('#suche-eingabe', 'Beerdigung');
  const treffer = page.locator('#suche-vorschlaege li[data-idx]', { hasText: 'Angehörigen-Blatt' });
  await expect(treffer.first()).toBeVisible();
  await treffer.first().click();

  await expect(page.locator('#ang-zurueck')).toBeVisible();
  await expect(page.locator('.ang-sicht h2')).toContainText('Beerdigung und Nachlass');
  // Lesend: kein Eingabefeld in der Sicht.
  await expect(page.locator('.ang-sicht input, .ang-sicht textarea, .ang-sicht select')).toHaveCount(0);
  // Kein Modus: die Fläche trägt keine Vollbild-Klasse, die Seitenleiste bleibt.
  await expect(page.locator('#app')).not.toHaveClass(/ang-vollbild/);
  await expect(page.locator('#sidebar')).toBeVisible();

  await page.click('#ang-zurueck');
  await expect(page.locator('#ang-zurueck')).toHaveCount(0);
});
