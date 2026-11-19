'use strict';
/* E2E: Liest die Person eine IPS-Datei ein und ein Medikament lässt sich nicht lesen, nennt die Vorschau das betroffene Feld
   in einer eigenen Zeile. Die Regeln dahinter hält tests/ips-mehrere-codes.test.js; hier geht es um die sichtbare Zeile. */
const { test, expect } = require('@playwright/test');
const { inLeisteKlicken, oeffneApp, depotAnlegen } = require('./helpers');

const BUNDLE = { resourceType: 'Bundle', entry: [
  { resource: { resourceType: 'Condition', code: { text: 'Beispielose' } } },
  { resource: { resourceType: 'MedicationStatement', status: 'active', medicationReference: { reference: 'Medication/fehlt' } } },
] };

test('die Vorschau nennt das Medikament, das nicht übernommen wird', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await inLeisteKlicken(page, '[data-einlesen-zentral]');
  // U-3 (Fassung 3, eine Tür): die Datei geht über „Dateien auswählen“ der Seite Einlesen in die Inhaltserkennung.
  const [wahl] = await Promise.all([page.waitForEvent('filechooser'), page.click('#einlesen-waehlen')]);
  await wahl.setFiles({ name: 'ips.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(BUNDLE)) });
  const zeile = page.locator('#modal-rueck.an .export-uebersicht-zurueck');
  await expect(zeile).toHaveCount(1);
  await expect(zeile).toContainText('Nicht übernommen:');
  await expect(zeile).not.toContainText('Vorlage');
  await expect(page.locator('#modal-rueck.an .export-uebersicht-liste').first()).toContainText('Beispielose');
  if (process.env.VD_BILD_ZIEL) await page.locator('#modal-rueck.an .modal').first().screenshot({ path: process.env.VD_BILD_ZIEL });
});
