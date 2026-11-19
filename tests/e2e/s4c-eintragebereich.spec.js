'use strict';
/* Reise — Eintragebereich Liste | Detail (U-4, 16.11.2026), Bedienung der Rubriken wie von Hand.
   Ein Bereich zeigt links die Liste seiner Rubriken, rechts nur die offene. Eine Zeile wählen wechselt das Detail; ein
   Feld der gewählten Rubrik lässt sich eintragen, die Zahl im Kopf der Liste steigt, und die Wahl bleibt nach dem
   Neuzeichnen stehen. Diese Reise braucht den Testhelfer nicht, der alle Rubriken zeigt (feldgruppenKartenOeffnen):
   sie öffnet den Bereich selbst über die Seitenleiste. Schritt 4 (Handy mit „Zurück“) erweitert sie um 375 px. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

/* Den Bereich über die Seitenleiste öffnen, wie von Hand: eine eingeklappte Gruppe zuerst aufklappen. Bewusst nicht
   oeffneSektor, das danach alle Rubriken zeigt. */
async function bereichOeffnen(page, id) {
  const gruppe = page.locator('#sidebar details.nav-gruppe', { has: page.locator(`[data-sektor="${id}"]`) });
  if (await gruppe.count() && !(await gruppe.first().evaluate((el) => el.open))) await gruppe.first().locator('summary').click();
  await page.click(`#sidebar [data-sektor="${id}"]`);
  await page.waitForSelector('#content .bereich-liste');
}

const sichtbareRubriken = (page) => page.evaluate(() =>
  [...document.querySelectorAll('#content .bereich-detail .feldgruppen-karte')]
    .filter((k) => getComputedStyle(k).display !== 'none').map((k) => k.getAttribute('data-karte')));

test('[Eintragebereich·1280] Zeile wählen wechselt das Detail, ein Eintrag zählt im Kopf, die Wahl bleibt', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await oeffneApp(page);
  await depotAnlegen(page);
  await bereichOeffnen(page, 'health');
  const liste = page.locator('#content .bereich-liste');
  await expect(liste).toBeVisible();
  const zeilen = liste.locator('.bereich-liste-zeile');
  expect(await zeilen.count()).toBeGreaterThanOrEqual(2);
  await expect(zeilen.nth(0)).toHaveAttribute('aria-current', 'true');

  // Ab Werk ist genau die erste Rubrik im Detail zu sehen.
  const erste = await zeilen.nth(0).getAttribute('data-rubrik');
  expect(await sichtbareRubriken(page)).toEqual(erste.startsWith('sek:') ? [] : [erste]);

  // Die Rubrik mit der Blutgruppe wählen, wie von Hand: die Zeile, deren Karte das Feld trägt.
  const ziel = await page.evaluate(() => document.querySelector('#content [data-edit="bloodType"]').closest('.feldgruppen-karte').getAttribute('data-karte'));
  await page.locator(`#content .bereich-liste-zeile[data-rubrik="${ziel}"]`).click();
  await expect(page.locator(`#content .bereich-liste-zeile[data-rubrik="${ziel}"]`)).toHaveAttribute('aria-current', 'true');
  await expect(page.locator(`#content .bereich-liste-zeile[data-rubrik="${ziel}"]`)).toBeFocused();
  expect(await sichtbareRubriken(page)).toEqual([ziel]);

  // Eintragen in der gewählten Rubrik, wie von Hand: wählen und das Feld verlassen speichert.
  const zahlVorher = parseInt((await liste.locator('.bereich-liste-zahl').textContent()).replace(/\D+/g, ''), 10);
  await page.selectOption('#content [data-edit="bloodType"]', 'A+');
  await page.locator('#content [data-edit="bloodType"]').blur();

  // Nach einem Bereichswechsel bleibt die gewählte Rubrik offen, mit dem Wert, und der Kopf der Liste zählt die Angabe.
  await bereichOeffnen(page, 'identity');
  await bereichOeffnen(page, 'health');
  await expect(page.locator('#content .bereich-liste-zahl')).toContainText(String(zahlVorher + 1));
  await expect(page.locator(`#content .bereich-liste-zeile[data-rubrik="${ziel}"]`)).toHaveAttribute('aria-current', 'true');
  expect(await sichtbareRubriken(page)).toEqual([ziel]);
  await expect(page.locator('#content [data-edit="bloodType"]')).toHaveValue('A+');
});
