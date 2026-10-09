// @ts-check
/* eintrag-dialog-fokus.spec.js — der Dialog „Neuer Eintrag“ führt den Fokus (08.10.2026, v922)
   ─────────────────────────────────────────────────────────────────
   Vorher blieb der Fokus beim Auslöser hinter dem Dialog (gemessen 07.10.2026 mit echtem Klick). Jetzt steht er im ersten Feld und
   kehrt beim Abbrechen zum Auslöser zurück. Legt man im Dialog eine neue Person an, steht der Fokus danach in der Auswahl, nicht auf der
   Seite. Personen-Listen zeigen „Weitere Person hinzufügen“ erst ab einer Person. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, listenDialogOeffnen } = require('./helpers');

async function bereitsicht(page, sektor) {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, sektor);
  await page.evaluate(() => document.querySelectorAll('#content details').forEach((d) => { d.open = true; }));
}

test('[Dialog·Fokus] der Dialog nimmt den Fokus ins erste Feld und gibt ihn beim Abbrechen an den Auslöser zurück', async ({ page }) => {
  await bereitsicht(page, 'identity');
  // Konvention „Hinzufügen“: bei leerer Liste steht der erste Eintrag inline; der Dialog öffnet über „Weiteres Tier hinzufügen“.
  await listenDialogOeffnen(page, 'pets', { sektor: 'identity', vorbelegen: { petNameSpecies: 'Mira, Katze' } });
  await expect(page.locator('#modal-rueck.an')).toBeVisible();
  const imDialog = await page.evaluate(() => !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('#modal-inhalt .liste-eintrag-form')));
  expect(imDialog, 'Fokus im ersten Feld des Dialogs').toBe(true);
  await page.click('#m-abbr');
  await expect(page.locator('#modal-rueck.an')).toHaveCount(0);
  await expect(page.locator('#content [data-eintrag-hinzufuegen="pets"]')).toBeFocused();
});

test('[Dialog·Fokus·Person] nach dem Anlegen einer Person im Dialog steht der Fokus in der Auswahl', async ({ page }) => {
  await bereitsicht(page, 'identity');
  await listenDialogOeffnen(page, 'pets', { sektor: 'identity', vorbelegen: { petNameSpecies: 'Mira, Katze' } });
  const auswahl = page.locator('#modal-inhalt [data-edit-ref="emergencyCarePersonContact"]');
  await auswahl.selectOption('__neu__');
  await page.locator('#modal-inhalt [data-neu-name="emergencyCarePersonContact"]').fill('Dialog Fokus Eins');
  await page.click('#modal-inhalt [data-neu-anlegen="emergencyCarePersonContact"]');
  await expect(auswahl).toHaveValue(/.+/);
  await expect(auswahl).toBeFocused();
});

test('[Personen·Zweitknopf] „Weitere Person hinzufügen“ steht genau dann da, wenn eine Person bestätigt ist', async ({ page }) => {
  await bereitsicht(page, 'health');
  const box = page.locator('#content [data-refm="emergencyContacts"]');
  await expect(box, 'Voraussetzung: eine Personen-Liste im Bereich').toHaveCount(1);
  const knopf = box.locator('[data-refm-add]');
  await expect(knopf).toHaveText('Weitere Person hinzufügen');
  const bestaetigt = await box.locator('[data-edit-refm][data-refm-bestaetigt="1"]').count();
  if (bestaetigt) await expect(knopf).toBeVisible(); else await expect(knopf).toBeHidden();
});
