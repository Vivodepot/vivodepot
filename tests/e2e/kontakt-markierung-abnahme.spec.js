'use strict';
/* „Die Mappe bleibt drin — und der Kontakt bekommt eine Markierung" (13.08.2026),
   Zug 5 — Abnahme am echten Klickweg, Nachweis an der heruntergeladenen Datei. */
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

const ARTIFACTS = path.join(__dirname, '.artifacts');
if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });

async function kontaktAnlegen(page, name) {
  await oeffneSektor(page, 'people');
  const bearb = page.locator('#b-bearb');
  if (await bearb.count()) await bearb.click();
  await page.waitForTimeout(150);
  await page.click('[data-person-hinzufuegen="1"]');
  await page.waitForSelector('#modal-inhalt');
  await page.fill('[data-sub-zeile="name"] input', name);
  await page.click('#m-ok');
  await page.waitForTimeout(300);
}

async function kontaktBearbeiten(page, name) {
  await page.click('.liste-eintrag:has-text("' + name + '") [data-person-bearbeiten]');
  await page.waitForSelector('#modal-inhalt');
}

test('Kontakt markieren → Export lässt ihn weg + Box nennt ihn; zurücknehmen → er ist wieder da', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await kontaktAnlegen(page, 'Anna Schmidt');
  await kontaktAnlegen(page, 'Peter Nachbar');

  // ── Markieren ────────────────────────────────────────────────────────────
  await kontaktBearbeiten(page, 'Anna Schmidt');
  const checkbox = page.locator('[data-sub-zeile="nichtMitgeben"] input[type="checkbox"]');
  await expect(checkbox).toBeVisible();
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await page.screenshot({ path: path.join(ARTIFACTS, 'kontakt-markierung-checkbox-gesetzt.png'), fullPage: true });
  await page.click('#m-ok');
  await page.waitForTimeout(300);

  // ── Export: markierter Kontakt fehlt, Box nennt ihn ────────────────────────
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.evaluate(() => window.__vdOeffentlich.flowFormatExport('vcard-menschen')),
  ]);
  const inhalt = fs.readFileSync(await download.path(), 'utf8');
  expect(inhalt).not.toContain('Anna Schmidt');
  expect(inhalt).toContain('Peter Nachbar');

  await page.waitForSelector('.toast:has-text("Anna Schmidt")', { timeout: 3000 });
  const toastText = await page.locator('.toast:has-text("Anna Schmidt")').textContent();
  expect(toastText).toContain('Nicht mitgeschickt');
  expect(toastText).toContain('Anna Schmidt');
  await page.screenshot({ path: path.join(ARTIFACTS, 'kontakt-markierung-toast-nach-export.png'), fullPage: true });
  // Übergabe-Protokoll-Nachtrag (U2-ADR-120) öffnet nach JEDEM Export unbedingt sein eigenes
  // Modal — davon unabhängig, wegschließen ("Später") bevor der nächste Klickweg beginnt.
  await page.click('#m-zweit');
  await expect(page.locator('#modal-rueck')).not.toHaveClass(/\ban\b/);

  // ── Zurücknehmen ────────────────────────────────────────────────────────
  await kontaktBearbeiten(page, 'Anna Schmidt');
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  await page.click('#m-ok');
  await page.waitForTimeout(300);

  const [download2] = await Promise.all([
    page.waitForEvent('download'),
    page.evaluate(() => window.__vdOeffentlich.flowFormatExport('vcard-menschen')),
  ]);
  const inhalt2 = fs.readFileSync(await download2.path(), 'utf8');
  expect(inhalt2).toContain('Anna Schmidt');
  expect(inhalt2).toContain('Peter Nachbar');
});

test('unmarkierte Kontakte: kein Nicht-mitgeschickt-Toast nach dem Export', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await kontaktAnlegen(page, 'Peter Nachbar');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.evaluate(() => window.__vdOeffentlich.flowFormatExport('vcard-menschen')),
  ]);
  await download.path();
  await page.waitForTimeout(300);
  const toasts = await page.locator('.toast').allTextContents();
  expect(toasts.join(' ')).not.toContain('Nicht mitgeschickt');
});
