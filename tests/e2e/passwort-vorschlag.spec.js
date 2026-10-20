'use strict';
/* Passwort-Vorschlag im Anlege-Dialog (U2-ADR-463, Teil 1): vorbelegt beim Öffnen, vorschlagen, anderen Vorschlag holen, übernehmen,
   bestätigen, anlegen. Der Hinweis zum eigenen Passwort erscheint nur, wenn jemand selbst tippt, und sperrt nichts.
   Probe der Liste, des Zufalls und der Abdeckung aller Felder: tests/passwort-vorschlag.test.js. */
const { test, expect } = require('@playwright/test');
const { oeffneApp } = require('./helpers');

test('[PW-Vorschlag] vorschlagen, übernehmen, anlegen — der Hinweis gilt nur dem eigenen Passwort', async ({ page }) => {
  await oeffneApp(page);
  await page.click('#w-anfangen');
  await page.waitForSelector(':is([data-anlegen-weg], [data-bereich-leer="vorschau"] [data-umschau-eintragen]):visible', { state: 'attached' });
  await page.click(':is([data-anlegen-weg], [data-bereich-leer="vorschau"] [data-umschau-eintragen]):visible');
  await page.waitForSelector('#id-pw', { state: 'visible' });
  await page.fill('#id-vorname', 'Maria');
  await page.fill('#id-nachname', 'Mustermann');

  // Vorbelegt (07.10.2026): ohne Klick steht der Vorschlag im Feld und sichtbar darüber; die Bestätigung bleibt leer.
  const vorbelegt = await page.locator('#id-pw-vorschlag-woerter').textContent();
  expect(vorbelegt.split('-')).toHaveLength(6);
  await expect(page.locator('#id-pw-vorschlag-anzeige')).toBeVisible();
  await expect(page.locator('#id-pw')).toHaveValue(vorbelegt);
  await expect(page.locator('#id-pw2')).toHaveValue('');
  await expect(page.locator('#id-pw-staerke')).toHaveClass(/pw-staerke-stark/);

  await expect(page.locator('#id-pw-eigen')).toBeHidden();
  await page.fill('#id-pw', 'sommer2026!');
  await expect(page.locator('#id-pw-eigen')).toBeVisible();
  // Die Stärke rechnet auf den getippten Wert, nicht auf den Vorschlag.
  await expect(page.locator('#id-pw-staerke')).not.toHaveClass(/pw-staerke-stark/);

  await page.click('#id-pw-vorschlag-knopf');
  const erster = await page.locator('#id-pw-vorschlag-woerter').textContent();
  expect(erster).not.toBe(vorbelegt);
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
