'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — Seitenleiste Zug 4: Browser-Abnahme („Seitenleiste",
   10.08.2026, echter Klickweg durch jeden verschobenen Eintrag)
   ────────────────────────────────────────────────────────────────────────
   Zug 1: zwei Gruppen statt einer („Nachsehen" — drei Lesesichten — und
   „Austausch" — Einlesen/Herausgeben/Verwaltete Depots), Depot verlassen
   bleibt ungruppiert ganz unten.
   Zug 2: die zwei Erklärseiten (Sub-Depot-Konzept, Bestandsübersicht)
   verlassen die Navigation, bleiben aber über einen Verweis am Kopf der
   jeweiligen Handlungssicht erreichbar.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

test('NACHSEHEN-Gruppe: alle drei Lesesichten per Klick erreichbar, Gruppenüberschrift sichtbar', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  // Fortsetzen-Fokus (26.08.2026): die frühere Überschrift „Eintragen" über dem Zwölf-Bereiche-
  // Baum ist entfallen — der Baum steckt jetzt hinter dem Umschalter „Alle Bereiche zeigen"
  // (eigenes <summary>, kein .gruppe-titel). „Weitermachen" (26.08.2026) selbst wieder ENTFERNT
  // (28.08.2026, Entscheidung: bereits vor dem Bau abgelehntes Konzept, s. renderSidebar()
  // im Kern) — keine Gruppen-Überschrift dafür mehr.
  const gruppen = page.locator('.gruppe-titel');
  await expect(gruppen).toContainText(['Nachsehen', 'Austausch']);

  await page.click('[data-mappe]');
  await expect(page.locator('.bereich-kopf h2')).toContainText('Was hier liegt');

  await page.click('[data-prueftermine]');
  await expect(page.locator('#content')).toContainText('Prüftermine');

  await page.click('[data-uebergabe-protokoll]');
  await expect(page.locator('#content')).toContainText('Herausgegeben');
});

test('AUSTAUSCH-Gruppe: Verwaltete Depots per Klick erreichbar, eigene Gruppenüberschrift trennt sie von „Herausgegeben"', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  // Reihenfolge im DOM: „Herausgegeben" (NACHSEHEN) steht vor der AUSTAUSCH-Überschrift,
  // die wiederum vor „Verwaltete Depots" steht — die frühere Verwechslungsgefahr
  // („Herausgegeben" direkt über „Daten herausgeben", ohne trennende Überschrift) ist damit
  // strukturell aufgelöst, nicht nur behauptet.
  const sidebarHtml = await page.locator('#sidebar').innerHTML();
  const herausgegebenPos = sidebarHtml.indexOf('Herausgegeben');
  const austauschPos = sidebarHtml.indexOf('Austausch');
  const verwaltetePos = sidebarHtml.indexOf('Verwaltete Depots');
  expect(herausgegebenPos).toBeGreaterThan(-1);
  expect(herausgegebenPos).toBeLessThan(austauschPos);
  expect(austauschPos).toBeLessThan(verwaltetePos);

  await page.click('[data-verwaltete-depots]');
  await expect(page.locator('.bereich-kopf h2')).toContainText('Verwaltete Depots');
});

test('„Wofür eingehängte Depots da sind" ist kein Sidebar-Eintrag mehr, aber über einen Verweis in „Verwaltete Depots" per Klick erreichbar', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  await expect(page.locator('[data-subdepot-konzept]')).toHaveCount(0);

  await page.click('[data-verwaltete-depots]');
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

  await page.click('[data-mappe]');
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
  const verlassenPos = sidebarHtml.indexOf('data-verlassen');
  const austauschPos = sidebarHtml.indexOf('Austausch');
  expect(verlassenPos).toBeGreaterThan(austauschPos);
  // Zwischen der letzten AUSTAUSCH-Zeile und „Depot verlassen" steht keine weitere
  // .gruppe-titel-Überschrift.
  const zwischenteil = sidebarHtml.slice(sidebarHtml.indexOf('Verwaltete Depots'), verlassenPos);
  expect(zwischenteil).not.toContain('gruppe-titel');
});
