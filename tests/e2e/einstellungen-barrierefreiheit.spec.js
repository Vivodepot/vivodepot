'use strict';
/* U-3 Schritt 4a, Schritt 1 (16.11.2026): Schrift, Kontrast und Nacht stehen als erster Abschnitt „Barrierefreiheit“ der Einstellungen,
   vom Kopf aus in einem Schritt erreichbar (Zahnrad), und lassen sich mit der Tastatur bedienen. */
const { test, expect } = require('@playwright/test');
const h = require('./helpers.js');

test('[Barrierefreiheit] erster Abschnitt der Einstellungen, in einem Schritt vom Kopf, mit der Tastatur bedienbar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await h.oeffneApp(page); await h.depotAnlegen(page); await h.einmalDialogeSchliessen(page);
  await page.locator('#tb-einstellungen').click();
  const erster = page.locator('.einst > section.einst-abschnitt, .einst > details').first();
  await expect(erster, 'der erste Abschnitt ist die Barrierefreiheit').toContainText(/Barrierefreiheit/);
  for (const id of ['#einst-schrift', '#einst-kontrast', '#einst-nacht']) await expect(erster.locator(id)).toBeVisible();
  // Tastatur: Leertaste schaltet den Nachtmodus, Enter den Kontrast.
  await page.locator('#einst-nacht').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('html')).toHaveClass(/dark-mode/);
  await expect(page.locator('#einst-nacht')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#einst-kontrast').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveClass(/high-contrast/);
  // Schrift: dritte Stufe
  await page.locator('#einst-schrift [data-fs="fs-large"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveClass(/fs-large/);
});

test('[Barrierefreiheit·Rot-Beweis] ohne den Abschnitt als ersten wäre die Probe rot', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await h.oeffneApp(page); await h.depotAnlegen(page); await h.einmalDialogeSchliessen(page);
  await page.locator('#tb-einstellungen').click();
  // Die Gegenprobe prüft denselben Selektor auf einen anderen Abschnitt: der zweite Abschnitt ist NICHT die Barrierefreiheit.
  const zweiter = page.locator('.einst > section.einst-abschnitt, .einst > details').nth(1);
  await expect(zweiter).not.toContainText(/Barrierefreiheit/);
});
