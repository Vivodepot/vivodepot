'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Zurück im Browser führt eine Ansicht zurück und nicht aus dem offenen Depot (11.11.2026)
   ────────────────────────────────────────────────────────────────────────
   BEFUND. Die Ansichten der Anwendung standen nicht im Verlauf des Browsers. Wer von einem Bereich in einen
   anderen wechselte und dann Zurück wählte (am Telefon die häufigste Geste), verließ die Anwendung; das Depot
   war danach geschlossen, eine Rückfrage kam nicht.

   ZUSICHERUNG. Jeder Wechsel der Ansicht ist ein Schritt im Verlauf. Zurück zeigt die Ansicht davor, das Depot
   bleibt offen, die Adresse bleibt die der Anwendung.

   GEGENPROBE. Die Probe prüft vor dem Zurück, dass der Wechsel wirklich stattfand (anderer Bereichskopf).
   Ohne sie bestünde der Vergleich „Kopf wie vorher“ auch dann, wenn der Bereich nie gewechselt hätte.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

const kopf = (page) => page.locator('#content .bereich-kopf').first().innerText();

test('Zurück aus einem Bereich zeigt den Bereich davor, das Depot bleibt offen', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'identity');
  const adresse = page.url().split('#')[0];
  const davor = await kopf(page);

  await oeffneSektor(page, 'health');
  const danach = await kopf(page);
  expect(danach, 'Gegenprobe: der Wechsel in den zweiten Bereich hat stattgefunden').not.toBe(davor);

  await page.goBack().catch(() => {});

  expect(page.url().split('#')[0], 'Zurück bleibt in der Anwendung').toBe(adresse);
  await expect(page.locator('#app.an'), 'das Depot bleibt offen').toHaveCount(1, { timeout: 5000 });
  await expect(page.locator('#w-anlegen'), 'der Willkommensschirm erscheint nicht').toBeHidden();
  await expect(page.locator('#content .bereich-kopf').first(), 'Zurück zeigt den Bereich davor').toHaveText(davor, { timeout: 5000, useInnerText: true });
});

test('Vor geht nach einem Zurück wieder in den späteren Bereich', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'identity');
  await oeffneSektor(page, 'health');
  const spaeter = await kopf(page);

  await page.goBack().catch(() => {});
  await page.goForward().catch(() => {});

  await expect(page.locator('#app.an'), 'das Depot bleibt offen').toHaveCount(1, { timeout: 5000 });
  await expect(page.locator('#content .bereich-kopf').first(), 'Vor zeigt den späteren Bereich').toHaveText(spaeter, { timeout: 5000, useInnerText: true });
});
