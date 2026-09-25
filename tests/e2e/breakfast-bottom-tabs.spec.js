'use strict';
/* U2-ADR-174 Teilprojekt 2, Task 4 (25.08.2026) — Minimaler Smoke-Test für die Bottom-Tab-Leiste
   (Task 3) und die Eintragen-Übersicht (Task 4), die sie jetzt öffnet. Nur EIN Test — die volle
   Abdeckung der Bottom-Tab-Leiste war in Task 3s Code-Review als Minor/nachrangig eingestuft, kein
   Vollausbau hier.

   Helfer: oeffneApp()/depotAnlegen() aus tests/e2e/helpers.js (nicht der im Plan-Text
   fälschlich genannte `oeffneDepot` — s. helpers.js:40/55). Mobil-Viewport nötig, weil
   .bottom-tabs erst unterhalb 760px sichtbar wird (vivodepot.html, @media max-width:760px). */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers.js');

test.use({ viewport: { width: 390, height: 844 } });

test('[Bottom-Tabs] Eintragen-Tab zeigt Karten-Raster, Tippen auf Karte öffnet den Bereich', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.click('#bt-eintragen');
  await expect(page.locator('.bereich-karte').first()).toBeVisible();
  await page.click('.bereich-karte[data-sektor="identity"]');
  await expect(page.locator('#content .bereich-kopf')).toBeVisible();
});

// Task 5 (U2-ADR-174 Teilprojekt 2, 25.08.2026) — aktiv-Hervorhebung. Dieselbe
// Depot-Öffnen-Vorbereitung wie im ersten Test oben (oeffneApp+depotAnlegen).
test('[Bottom-Tabs] Verwaltete-Depots-Tab markiert sich als aktiv', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.click('#bt-verwaltet');
  await expect(page.locator('#bt-verwaltet')).toHaveClass(/aktiv/);
  await expect(page.locator('#bt-eintragen')).not.toHaveClass(/aktiv/);
});

// Abschluss-Review-Fund (U2-ADR-174, 25.08.2026): der Test oben deckte nur die
// Verwaltete-Depots-Seite ab (#bt-verwaltet aktiv, #bt-eintragen nicht) — nie den
// umgekehrten Fall, dass #bt-eintragen selbst .aktiv bekommt.
test('[Bottom-Tabs] Eintragen-Tab markiert sich als aktiv', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.click('#bt-eintragen');
  await expect(page.locator('#bt-eintragen')).toHaveClass(/aktiv/);
  await expect(page.locator('#bt-verwaltet')).not.toHaveClass(/aktiv/);
});
