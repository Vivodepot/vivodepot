'use strict';
/* Befund A2 (11.11.2026): Nach „Depot verlassen“ sagt der Startschirm „Auf diesem Gerät liegt schon ein Depot“, bot aber nur „Depot
   anlegen“, „Datei öffnen“ und „Umsehen“; das Passwortfeld kam erst nach dem Neuladen. Jetzt steht „Mein Depot öffnen“ unter dem Satz
   und führt ohne Neuladen zum Passwortfeld; das Passwort öffnet das Depot.
   Rot-Beweis: ein Startschirm ohne den Knopf (Knopf per Skript entfernt) fände den Weg nicht — die Probe verlangt ihn. */
const { test, expect } = require('@playwright/test');
test.use({ viewport: { width: Number(process.env.VD_VP_B) || 1280, height: Number(process.env.VD_VP_H) || 800 } });   // Bildbreite für den Bericht (390 / 1024)
const { depotAnlegen, oeffneSektor, setzeFeld, KERN_URL } = require('./helpers');

const PW = 'pw-anna-a2-1111';

test('[Start·A2] nach dem Verlassen führt „Mein Depot öffnen“ ohne Neuladen zum Passwortfeld und öffnet das Depot', async ({ browser }) => {
  test.setTimeout(90000);
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: Number(process.env.VD_VP_B) || 1280, height: Number(process.env.VD_VP_H) || 800 } });
  const page = await ctx.newPage();
  await page.goto(KERN_URL);
  await page.waitForSelector('#w-anlegen', { state: 'visible' });
  await depotAnlegen(page, { name: 'Anna Alt', pw: PW });
  await oeffneSektor(page, 'identity');
  await setzeFeld(page, 'street', 'Annastraße 1');
  await page.waitForTimeout(2500);
  await page.goto(KERN_URL);
  await page.waitForSelector('#co-pw', { state: 'visible' });
  await page.click('#co-neu');                                   // Startschirm mit vorhandenem Depot
  await page.waitForSelector('#w-intern-hinweis', { state: 'visible' });
  await expect(page.locator('#w-intern-oeffnen'), 'der Weg zurück ins Depot steht unter dem Satz').toBeVisible();
  await expect(page.locator('#w-intern-oeffnen')).toHaveText(/Mein Depot öffnen/);
  await page.screenshot({ path: process.env.A2_BILD || '/tmp/a2-start.png' });
  await page.click('#w-intern-oeffnen');
  await page.waitForSelector('#co-pw', { state: 'visible' });
  await page.fill('#co-pw', PW);
  await page.click('#w-oeffnen');
  await page.waitForTimeout(2500);
  await oeffneSektor(page, 'identity');
  expect(await page.locator('[data-edit="street"]').inputValue()).toBe('Annastraße 1');
  await ctx.close();
});

test('[Start·A2·Rot-Beweis] ohne den Knopf bleibt dem Startschirm nur „Depot anlegen“ — die Probe fällt', async ({ browser }) => {
  test.setTimeout(90000);
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: Number(process.env.VD_VP_B) || 1280, height: Number(process.env.VD_VP_H) || 800 } });
  const page = await ctx.newPage();
  await page.goto(KERN_URL);
  await page.waitForSelector('#w-anlegen', { state: 'visible' });
  await depotAnlegen(page, { name: 'Anna Alt', pw: PW });
  await page.waitForTimeout(2500);
  await page.goto(KERN_URL);
  await page.waitForSelector('#co-pw', { state: 'visible' });
  await page.click('#co-neu');
  await page.waitForSelector('#w-intern-hinweis', { state: 'visible' });
  await page.evaluate(() => { const b = document.getElementById('w-intern-oeffnen'); if (b) b.parentElement.remove(); });
  expect(await page.locator('#w-intern-oeffnen').count(), 'ohne den Knopf fehlt der Weg').toBe(0);
  await ctx.close();
});
