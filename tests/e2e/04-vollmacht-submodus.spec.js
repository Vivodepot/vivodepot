'use strict';
/* Reise — Vollmacht / Sub-Modus-Wechsel: in den Vollmacht-Modus wechseln (setzt die
   modus-vollmacht-Klasse; Fläche→Rand-Rücknahme 27.08.2026 — s.
   tests/sub-depot-akzent-rand-statt-flaeche.test.js für die Farb-Details), die
   Verwaltete-Depots-Sicht öffnen, zurück zum Anker. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, setzeModus } = require('./helpers');

test('Vollmacht-Modus setzt die Modus-Klasse; zurück zum Anker entfernt sie', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  await setzeModus(page, 'vollmacht');
  await expect(page.locator('#app')).toHaveClass(/modus-vollmacht/);

  await setzeModus(page, 'anker');
  await expect(page.locator('#app')).not.toHaveClass(/modus-vollmacht/);
});

test('Depot-Pille → Menü → „Depots, die ich aufbewahre" öffnet die Verwaltete-Depots-Sicht (Sorge-Übersicht)', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  // Zug 5 (Auftrag „Speicherweg ohne Datei-Picker", 09.08.2026): die Pille öffnet jetzt ein Menü
  // statt direkt zu navigieren.
  await page.click('#tb-depot-pille');
  await page.waitForSelector('#tb-depot-menue-verwaltung', { state: 'visible' });
  await page.click('#tb-depot-menue-verwaltung');
  await expect(page.locator('#content')).toContainText('Verwaltete Depots');
  // Leerzustand ist klar benannt (kein Crash, kein Code). Wortarbeit 04.08.: „Sub-Depot"
  // ist internes Wort, die Oberfläche sagt „eingehängtes Depot".
  await expect(page.locator('#content')).toContainText('eingehängte');
});
