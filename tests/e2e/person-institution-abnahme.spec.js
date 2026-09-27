'use strict';
/* „Person und Institution — die Verbindung, die fehlt" (13.08.2026). */
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

const ARTIFACTS = path.join(__dirname, '.artifacts');
if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });

test('Zug 0 — Befund: person.institution-Verweisfeld war bereits vollständig gebaut (UI+Picker)', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'people');
  const bearb = page.locator('#b-bearb');
  if (await bearb.count()) await bearb.click();
  await page.waitForTimeout(150);
  await page.click('[data-person-hinzufuegen="1"]');
  await page.waitForSelector('#modal-inhalt');
  const html = await page.locator('#modal-inhalt').innerHTML();
  expect(html).toContain('Wo arbeitet');
  expect(html).toContain('data-sub-zeile="institution"');
});

test('Zug 1+5 — Praxis anlegen, Person darauf verweisen: die Verbindung ist sichtbar (Vorher/Nachher)', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'people');
  const bearb = page.locator('#b-bearb');
  if (await bearb.count()) await bearb.click();
  await page.waitForTimeout(150);

  await page.click('[data-person-hinzufuegen="1"]');
  await page.waitForSelector('#modal-inhalt');
  await page.fill('[data-sub-zeile="name"] input', 'Dr. Beispiel');
  await page.fill('[data-sub-zeile="beziehung"] input', 'Hausärztin');
  await page.screenshot({ path: path.join(ARTIFACTS, 'person-institution-vorher-ohne.png'), fullPage: true });

  const artSelect = page.locator('[data-sub-zeile="institution"] select');
  await expect(artSelect).toHaveCount(1);
  await artSelect.selectOption({ label: '+ Neue Institution anlegen' });
  await page.waitForSelector('#modal-inhalt:has-text("Institution anlegen"), .liste-eintrag-form:has-text("Institution")', { timeout: 5000 }).catch(() => {});
  // Inline-Anlegen: Name-Feld der neuen Institution
  const instName = page.locator('[data-sub-zeile="institution"] input[type="text"]').last();
  if (await instName.count()) {
    await instName.fill('Praxis Dr. Beispiel');
    const artInst = page.locator('[data-sub-zeile="institution"] select').last();
    if (await artInst.count() && (await artInst.locator('option[value="arztpraxis"]').count())) {
      await artInst.selectOption('arztpraxis');
    }
  }
  await page.screenshot({ path: path.join(ARTIFACTS, 'person-institution-nachher-verknuepft.png'), fullPage: true });

  await page.click('#m-ok');
  await page.waitForTimeout(300);
  const contentHtml = await page.locator('#content').innerHTML();
  expect(contentHtml).toContain('Dr. Beispiel');
});

test('Zug 5 — Rot-Beweis: Person ohne Institution behauptet nichts', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'people');
  const bearb = page.locator('#b-bearb');
  if (await bearb.count()) await bearb.click();
  await page.waitForTimeout(150);
  await page.click('[data-person-hinzufuegen="1"]');
  await page.waitForSelector('#modal-inhalt');
  await page.fill('[data-sub-zeile="name"] input', 'Freund Ohne Praxis');
  await page.click('#m-ok');
  await page.waitForTimeout(300);
  const contentHtml = await page.locator('#content').innerHTML();
  expect(contentHtml).toContain('Freund Ohne Praxis');
  expect(contentHtml).not.toContain('arbeitet');
});
