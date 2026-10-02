'use strict';
/* Passwort-Vorschlag im Anlege-Dialog (U2-ADR-463, Teil 1): vorschlagen, anderen Vorschlag holen, übernehmen,
   bestätigen, anlegen. Der Hinweis zum eigenen Passwort erscheint nur, wenn jemand selbst tippt, und sperrt nichts.
   Probe der Liste, des Zufalls und der Abdeckung aller Felder: tests/passwort-vorschlag.test.js. */
const { test, expect } = require('@playwright/test');
const { oeffneApp } = require('./helpers');

test('[PW-Vorschlag] vorschlagen, übernehmen, anlegen — der Hinweis gilt nur dem eigenen Passwort', async ({ page }) => {
  await oeffneApp(page);
  await page.click('#w-anfangen');
  await page.waitForSelector('#tb-pw-hinweis', { state: 'visible' });
  await page.click('#tb-pw-hinweis');
  await page.waitForSelector('#id-pw', { state: 'visible' });
  await page.fill('#id-vorname', 'Maria');
  await page.fill('#id-nachname', 'Mustermann');

  await expect(page.locator('#id-pw-eigen')).toBeHidden();
  await page.fill('#id-pw', 'sommer2026!');
  await expect(page.locator('#id-pw-eigen')).toBeVisible();

  await page.click('#id-pw-vorschlag-knopf');
  const erster = await page.locator('#id-pw-vorschlag-woerter').textContent();
  expect(erster.split('-')).toHaveLength(6);
  await expect(page.locator('#id-pw')).toHaveValue(erster);
  await expect(page.locator('#id-pw-eigen')).toBeHidden();
  await expect(page.locator('#id-pw-staerke')).toHaveClass(/pw-staerke-stark/);

  await page.click('#id-pw-vorschlag-anderer');
  const zweiter = await page.locator('#id-pw-vorschlag-woerter').textContent();
  expect(zweiter).not.toBe(erster);
  await expect(page.locator('#id-pw')).toHaveValue(zweiter);

  // Wer danach selbst tippt, sieht den alten Vorschlag nicht mehr, sondern den Hinweis; zurück geht es mit dem Knopf.
  await page.fill('#id-pw', 'sommer2026!');
  await expect(page.locator('#id-pw-vorschlag-anzeige')).toBeHidden();
  await expect(page.locator('#id-pw-eigen')).toBeVisible();
  await page.click('#id-pw-vorschlag-knopf');
  const dritter = await page.locator('#id-pw-vorschlag-woerter').textContent();
  await expect(page.locator('#id-pw')).toHaveValue(dritter);

  await page.fill('#id-pw2', dritter);
  await page.click('#m-ok');
  await page.waitForSelector('#tb-pw-hinweis', { state: 'hidden' });
});
