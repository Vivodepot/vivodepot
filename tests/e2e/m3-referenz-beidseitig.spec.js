'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — M3 (Auftrag M3/M4, 09.08.2026): beidseitig, echt anklickbar.
   ────────────────────────────────────────────────────────────────────────
   Node-Harness kann DOM-Klick-Verdrahtung nicht prüfen (querySelectorAll
   liefert dort immer []). Diese Probe belegt den echten Weg: eine Person
   referenzieren → "Meine Menschen" → bearbeiten → Fundstelle sehen → klicken
   → tatsächlich im referenzierenden Bereich angekommen.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

test('M3: „Wird verwendet in" im Personen-Bearbeiten-Modal ist echt anklickbar und springt zum Bereich', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored/i.test(m.text())) fehler.push(m.text());
  });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page);

  // Eine Person anlegen und als Hausarzt referenzieren (Gesundheit).
  await oeffneSektor(page, 'people');
  const bearb = page.locator('#b-bearb');
  if (await bearb.count()) await bearb.click();
  await page.click('[data-person-hinzufuegen]');
  await page.waitForSelector('#modal-titel');
  await page.fill('[data-edit="name"]', 'Dr. Müller');
  await page.click('#m-ok');
  await page.waitForTimeout(200);

  await oeffneSektor(page, 'health');
  const bearbG = page.locator('#b-bearb');
  if (await bearbG.count()) await bearbG.click();
  await page.selectOption('[data-edit-ref="generalPractitioner"]', { label: 'Dr. Müller' });
  await page.waitForTimeout(300);

  // Zurück zu "Meine Menschen", die Person bearbeiten, die Fundstelle sehen und anklicken.
  await oeffneSektor(page, 'people');
  await page.waitForTimeout(200);
  await page.click('[data-person-bearbeiten]');
  await page.waitForSelector('#modal-titel');
  await expect(page.locator('#modal-inhalt')).toContainText('Wird verwendet in');
  const sprungKnopf = page.locator('[data-referenz-sektor="health"]');
  await expect(sprungKnopf).toBeVisible();
  await sprungKnopf.click();

  await page.waitForTimeout(300);
  await expect(page.locator('.bereich-kopf h1')).toContainText('Gesundheit');

  expect(fehler, 'keine JS-/Konsolen-Fehler beim Verknüpfungs-Sprung').toEqual([]);
});
