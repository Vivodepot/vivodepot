'use strict';
/* Assistent als Anlass-Seite (U-AS, Entwurf A, 21.11.2026).
   Ein Assistent stellt seine Fragen nicht mehr einzeln mit „Weiter“, sondern auf EINER Seite:
   je sichtbarer Frage eine Zeile mit Haken und Eingabe, oben „n von m vorhanden“. Was bleibt:
   Sichtbarkeit (U2-ADR-102), Prüfung je Frage, Speichern bei jeder Eingabe, „Fertig“ löst den
   Abschluss aus (gebwiz legt das Kind an), Schließen kehrt zurück (U2-ADR-054).
   Rot-Beweis: auf der Schrittansicht gibt es `#wiz-weiter` und nur EINE Eingabe je Seite. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, wizardStarten } = require('./helpers');

const ZEILE = '.wizard-liste [data-wiz-idx]';

test('Umzug öffnet als eine Seite: alle zehn Fragen, kein „Weiter“, kein „Schritt n von m“', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'identity');
  await wizardStarten(page, 'umzwiz');

  await expect(page.locator('.wizard-frage')).toBeVisible();
  await expect(page.locator(ZEILE)).toHaveCount(10);
  await expect(page.locator('#wiz-weiter')).toHaveCount(0);
  await expect(page.locator('#wiz-zurueck')).toHaveCount(0);
  await expect(page.locator('#content')).not.toContainText('Schritt 1 von');
  await expect(page.locator('.wizard-fortschritt')).toContainText('0 von 10');
  // Alle vier Teile der Anschrift stehen zugleich auf der Seite.
  for (const f of ['street', 'houseNumber', 'postalCode', 'city']) {
    await expect(page.locator(`#content [data-edit="${f}"]`)).toBeVisible();
  }
});

test('Eine Antwort setzt den Haken ihrer Zeile und speichert sofort', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'identity');
  await wizardStarten(page, 'umzwiz');

  const zeile0 = page.locator(`${ZEILE}[data-wiz-idx="0"]`);
  await expect(zeile0.locator('.haken')).not.toHaveClass(/\bja\b/);
  await page.fill('#content [data-edit="street"]', 'Seestraße');
  await page.locator('#content [data-edit="street"]').blur();
  await expect(zeile0.locator('.haken')).toHaveClass(/\bja\b/);
  await expect(page.locator('.wizard-fortschritt')).toContainText('1 von 10');

  // Schließen behält, was eingetragen ist, und kehrt zurück.
  await page.click('#wiz-abbr');
  await expect(page.locator('.wizard-frage')).toHaveCount(0);
  await oeffneSektor(page, 'identity');
  await expect(page.locator('#content [data-edit="street"]')).toHaveValue('Seestraße');
});

// Sichtbarkeit (verborgenWenn, Mietfragen bei Wohnungseigentum) prüft tests/e2e/umzwiz-abnahme.spec.js auf der Seitenform.

test('375 Pixel: jede Eingabe liegt ganz im Bild, keine Seite rollt quer', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'identity');
  await wizardStarten(page, 'umzwiz');
  // Gestartet wird über die Seitenleiste am Rechner; gemessen wird die offene Assistenten-Seite bei 375.
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator(ZEILE).first()).toBeVisible();

  const raus = await page.evaluate(() => {
    const b = window.innerWidth;
    return [...document.querySelectorAll('.wizard-liste input, .wizard-liste select, .wizard-liste textarea')]
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ f: el.getAttribute('data-edit') || el.id, r: Math.round(el.getBoundingClientRect().right) }))
      .filter((x) => x.r > b);
  });
  expect(raus, 'Eingaben rechts außerhalb des Bildes').toEqual([]);
  const quer = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(quer).toBeLessThanOrEqual(0);
  await page.screenshot({ path: 'tests/e2e/.artifacts/assistent-als-liste-umzug-375.png', fullPage: true }).catch(() => {});
});

test('„Fertig“ löst den Abschluss aus: die Geburt legt das Kind an', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.click('[data-anlass-auswahl]');
  await page.waitForSelector('[data-anlass="geburt"]', { state: 'visible' });
  await page.click('[data-anlass="geburt"]');
  await expect(page.locator(ZEILE)).toHaveCount(3);

  await page.fill('#content [data-edit="guidedBirthEntryChildsNameNot"]', 'Mia Musterfrau');
  await page.click('#wiz-fertig');
  await expect(page.locator('#modal-titel')).toContainText('Eigenes Depot für Ihr Kind?');
  // Das Kind steht danach sichtbar im Bereich Menschen — gelesen an der Oberfläche, nicht über die Testfläche.
  await page.click('#m-abbr');
  await oeffneSektor(page, 'people');
  await expect(page.locator('#content')).toContainText('Mia Musterfrau');
});
