'use strict';
/* U2-ADR-174 Teilprojekt 2, Task 4 (25.08.2026; vier Tabs seit 17.11.2026: Übersicht · Bereiche · Einlesen · Herausgeben) — Minimaler Smoke-Test für die Bottom-Tab-Leiste
   (Task 3) und die Eintragen-Übersicht (Task 4), die sie jetzt öffnet. Nur EIN Test — die volle
   Abdeckung der Bottom-Tab-Leiste war in Task 3s Code-Review als Minor/nachrangig eingestuft, kein
   Vollausbau hier.

   Helfer: oeffneApp()/depotAnlegen() aus tests/e2e/helpers.js (nicht der im Plan-Text
   fälschlich genannte `oeffneDepot` — s. helpers.js:40/55). Mobil-Viewport nötig, weil
   .bottom-tabs erst unterhalb 760px sichtbar wird (vivodepot.html, @media max-width:760px). */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers.js');

test.use({ viewport: { width: 390, height: 844 } });

test('[Bottom-Tabs] Übersicht-Tab zeigt Karten-Raster, Tippen auf Karte öffnet den Bereich', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.click('#bt-uebersicht');
  await expect(page.locator('.bereich-karte').first()).toBeVisible();
  await page.click('.bereich-karte[data-sektor="identity"]');
  await expect(page.locator('#content .bereich-kopf')).toBeVisible();
});

test('[Bottom-Tabs] genau vier Tabs in der Reihenfolge Übersicht, Bereiche, Einlesen, Herausgeben', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await expect(page.locator('#bottom-tabs .bt-tab')).toHaveCount(4);
  await expect(page.locator('#bottom-tabs .bt-tab')).toHaveText(['Übersicht', 'Bereiche', 'Einlesen', 'Herausgeben']);
});

test('[Bottom-Tabs] Übersicht-Tab markiert sich als aktiv', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.click('#bt-uebersicht');
  await expect(page.locator('#bt-uebersicht')).toHaveClass(/aktiv/);
  await expect(page.locator('#bt-bereiche')).not.toHaveClass(/aktiv/);
});

test('[Bottom-Tabs] Bereiche-Tab öffnet mit einem Tipp die Bereichsliste, ein Bereich macht ihn aktiv', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.click('#bt-bereiche');
  await expect(page.locator('#sidebar')).toBeVisible();
  await oeffneSektor(page, 'identity');
  await expect(page.locator('#bt-bereiche')).toHaveClass(/aktiv/);
  await expect(page.locator('#bt-uebersicht')).not.toHaveClass(/aktiv/);
});

test('[Bottom-Tabs] „Verwaltet“ ist am Handy über das Depot-Menü erreichbar', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.click('#tb-depot-pille');
  await page.click('#tb-depot-menue-verwaltung');
  await expect(page.locator('#content')).toBeVisible();
  await expect(page.locator('#bottom-tabs .bt-tab.aktiv')).toHaveCount(0);
});
