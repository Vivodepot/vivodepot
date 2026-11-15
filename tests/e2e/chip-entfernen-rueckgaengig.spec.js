'use strict';
/* Befund A4 (11.11.2026): das × an einem Chip (z. B. Diagnose) löschte sofort, ohne Hinweis und ohne Weg zurück. Jetzt sagt ein Hinweis
   „Entfernt.“ und bietet „Rückgängig“; der Chip kommt an seine Stelle zurück, auch in der Mitte der Liste.
   Rot-Beweis: ohne Klick auf „Rückgängig“ bleibt der Chip weg (die Probe unterscheidet beide Wege). */
const { test, expect } = require('@playwright/test');
test.use({ viewport: { width: Number(process.env.VD_VP_B) || 1280, height: Number(process.env.VD_VP_H) || 800 } });   // Bildbreite für den Bericht (390 / 1024)
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

async function chip(page, wert) {
  const eingabe = page.locator('[data-chip-liste="chronicConditionsDiagnoses"] input[data-chip-eingabe]');
  await eingabe.fill(wert);
  await page.locator('[data-chip-liste="chronicConditionsDiagnoses"] button[data-chip-uebernehmen]').click();
}
const texte = (page) => page.locator('[data-chip-liste="chronicConditionsDiagnoses"] .chip').allInnerTexts();

test('[Chip·A4] das × meldet „Entfernt.“; „Rückgängig“ bringt den Chip an seinen Platz zurück', async ({ page }) => {
  test.setTimeout(90000);
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'health');
  await chip(page, 'Diabetes mellitus Typ 2');
  await chip(page, 'Asthma');
  await chip(page, 'Migräne');
  const vorher = (await texte(page)).map((t) => t.replace(/[×\s]+$/, '').trim());
  expect(vorher.length).toBe(3);
  await page.locator('[data-chip-liste="chronicConditionsDiagnoses"] .chip').nth(1).locator('[data-chip-weg]').click();
  expect((await texte(page)).length).toBe(2);
  const toast = page.locator('#toast-host .toast', { hasText: 'Entfernt.' });
  await expect(toast).toBeVisible();
  await page.screenshot({ path: process.env.A4_BILD || '/tmp/a4-toast.png' });
  await toast.getByRole('button', { name: 'Rückgängig' }).click();
  const nachher = (await texte(page)).map((t) => t.replace(/[×\s]+$/, '').trim());
  expect(nachher).toEqual(vorher);
});

test('[Chip·A4·Rot-Beweis] ohne „Rückgängig“ bleibt der Chip weg', async ({ page }) => {
  test.setTimeout(90000);
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'health');
  await chip(page, 'Asthma');
  await chip(page, 'Migräne');
  await page.locator('[data-chip-liste="chronicConditionsDiagnoses"] .chip').first().locator('[data-chip-weg]').click();
  expect((await texte(page)).length).toBe(1);
});
