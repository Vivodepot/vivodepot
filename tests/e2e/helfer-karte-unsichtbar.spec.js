// @ts-check
/* helfer-karte-unsichtbar.spec.js — der Helfer klappt nur Karten auf, die man sieht.
   Eine zugeklappte Karte unter einem verborgenen Eltern-Element trägt kein eigenes `hidden`. Vorher klickte der Helfer sie an
   und lief in eine Zeitüberschreitung von 30 s.
   Rot-Beweis: ohne `:visible` im Selektor des Helfers endet der Aufruf nicht in 5 s. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, feldgruppenKartenOeffnen } = require('./helpers');

test('[Helfer·Karte·Unsichtbar] eine verborgene, zugeklappte Karte hält den Helfer nicht auf', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'people');
  await page.evaluate(() => {
    const huelle = document.createElement('div');
    huelle.style.display = 'none';
    huelle.innerHTML = '<details class="feldgruppen-karte"><summary>verborgen</summary><p>x</p></details>';
    document.getElementById('content').appendChild(huelle);
  });
  const ende = await Promise.race([
    feldgruppenKartenOeffnen(page).then(() => 'fertig'),
    new Promise((r) => setTimeout(() => r('haengt'), 5000)),
  ]);
  expect(ende).toBe('fertig');
  await expect(page.locator('#content .feldgruppen-karte:not([open]):not([hidden]) > summary:visible')).toHaveCount(0);
});
