'use strict';
/* Toast schließt per Klick (VD-Fund, 27.08.2026) — echter Klick auf einen echten,
   gerenderten Toast entfernt ihn sofort aus dem DOM. Der Node-Test (tests/toast-klick-
   schliesst.test.js) prüft nur die Quellcode-Verdrahtung; die reale Entfernung braucht ein
   echtes DOM (der jsdom-Stub in tests/load-kern.js sammelt appendChild-Kinder bewusst nicht). */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

test('ein einfacher Toast (ohne aktion) verschwindet sofort per Klick, nicht erst nach dem Timeout', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  await page.evaluate(() => { window.__vdOeffentlich.ui.toast('Testnachricht', 'ok'); });
  const toast = page.locator('#toast-host .toast').first();
  await expect(toast).toBeVisible();
  await toast.click();
  await expect(toast).toHaveCount(0);
});

test('ein Toast MIT aktion bleibt beim Flächen-Klick stehen — nur sein eigener Knopf schließt ihn', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  await page.evaluate(() => { window.__vdOeffentlich.ui.toast('Mit Knopf', 'info', { label: 'Erledigt', handler: () => {} }); });
  const toast = page.locator('#toast-host .toast-tipp').first();
  await expect(toast).toBeVisible();
  // Klick auf die Fläche (nicht den Knopf) darf NICHT schließen — der Knopf trägt die Handlung.
  await toast.click({ position: { x: 5, y: 5 } });
  await expect(toast).toBeVisible();
  await toast.locator('.toast-tipp-btn').click();
  await expect(toast).toHaveCount(0);
});
