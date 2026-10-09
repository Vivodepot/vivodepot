'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — Seitenleiste Zug 4: Browser-Abnahme („Seitenleiste",
   10.08.2026, echter Klickweg durch jeden verschobenen Eintrag)
   ────────────────────────────────────────────────────────────────────────
   Zug 1: zwei Gruppen statt einer („Nachsehen" — drei Lesesichten — und
   „Austausch" — Einlesen/Herausgeben/Sub-Depots), Depot verlassen
   bleibt ungruppiert ganz unten.
   Zug 2: die zwei Erklärseiten (Sub-Depot-Konzept, Bestandsübersicht)
   verlassen die Navigation, bleiben aber über einen Verweis am Kopf der
   jeweiligen Handlungssicht erreichbar.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { inLeisteKlicken, oeffneApp, depotAnlegen } = require('./helpers');

test('„Austausch und Überblick“: ein eingeklappter Punkt unter den Bereichen, alle drei Lesesichten per Klick erreichbar (Navigation A, 05.10.2026)', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  // Navigation A: EIN Gruppentitel („Bereiche“), die übrigen Wege stehen im eingeklappten Punkt. Er ist zu, bis man ihn öffnet.
  await expect(page.locator('#sidebar .gruppe-titel')).toHaveText(['Bereiche']);
  const punkt = page.locator('#sidebar details.nav-gruppe-austausch');
  await expect(punkt.locator('summary')).toHaveText('Austausch und Überblick');
  await expect(page.locator('#sidebar [data-mappe]')).toBeHidden();

  await inLeisteKlicken(page, '[data-mappe]');
  await expect(page.locator('.bereich-kopf h2')).toContainText('Was hier liegt');

  await inLeisteKlicken(page, '[data-prueftermine]');
  await expect(page.locator('#content')).toContainText('Prüftermine');

  await inLeisteKlicken(page, '[data-uebergabe-protokoll]');
  await expect(page.locator('#content')).toContainText('Herausgegeben');
});

test('„Austausch und Überblick“: jeder Weg steht genau einmal darin, Sub-Depots per Klick erreichbar', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  const punkt = page.locator('#sidebar details.nav-gruppe-austausch');
  for (const anker of ['data-einlesen-zentral', 'data-weitergeben-zentral', 'data-uebergabe-protokoll', 'data-mappe', 'data-prueftermine', 'data-verwaltete-depots']) {
    await expect(page.locator('#sidebar [' + anker + ']')).toHaveCount(1);
    await expect(punkt.locator('[' + anker + ']')).toHaveCount(1);
  }

  await inLeisteKlicken(page, '[data-verwaltete-depots]');
  await expect(page.locator('.bereich-kopf h2')).toContainText('Sub-Depots');
});

test('„Wofür eingehängte Depots da sind" ist kein Sidebar-Eintrag mehr, aber über einen Verweis in „Sub-Depots" per Klick erreichbar', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  await expect(page.locator('[data-subdepot-konzept]')).toHaveCount(0);

  await inLeisteKlicken(page, '[data-verwaltete-depots]');
  const link = page.locator('#verwaltete-subkonzept-link');
  await expect(link).toBeVisible();
  await expect(link).toHaveText('Wofür eingehängte Depots da sind');
  await link.click();
  await expect(page.locator('.bereich-kopf h2')).toContainText('Wofür eingehängte Depots da sind');
});

test('„Was hier hineingehört" ist kein Sidebar-Eintrag mehr, aber über einen Verweis in „Meine Dokumente" per Klick erreichbar', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  await expect(page.locator('[data-bestand-auswahl]')).toHaveCount(0);

  await inLeisteKlicken(page, '[data-mappe]');
  const link = page.locator('#mappe-bestand-link');
  await expect(link).toBeVisible();
  await expect(link).toHaveText('Was hier hineingehört');
  await link.click();
  await expect(page.locator('#content')).toContainText('Was möchten Sie hinterlegen?');
});

test('„Depot verlassen" bleibt ganz unten, ohne eigene Gruppenüberschrift', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  const sidebarHtml = await page.locator('#sidebar').innerHTML();
  // Jede Marke muss gefunden sein: ein −1 machte den Vergleich und den Schnitt unten leer grün (bis 05.10.2026 so geschehen,
  // als „Verwaltete Depots“ umbenannt wurde). Wächter der Klasse: tools/e2e-fundstelle-ungeprueft-pruefen.js.
  const verlassenPos = sidebarHtml.indexOf('data-verlassen');
  const austauschPos = sidebarHtml.indexOf('Austausch');
  const subDepotsPos = sidebarHtml.indexOf('Sub-Depots');
  expect(austauschPos, 'Austausch steht in der Leiste').toBeGreaterThanOrEqual(0);
  expect(subDepotsPos, 'Sub-Depots steht in der Leiste').toBeGreaterThanOrEqual(0);
  expect(verlassenPos, 'Depot verlassen steht in der Leiste').toBeGreaterThanOrEqual(0);
  expect(verlassenPos).toBeGreaterThan(austauschPos);
  // Zwischen der letzten AUSTAUSCH-Zeile und „Depot verlassen" steht keine weitere
  // .gruppe-titel-Überschrift.
  const zwischenteil = sidebarHtml.slice(subDepotsPos, verlassenPos);
  expect(zwischenteil).not.toContain('gruppe-titel');
});
