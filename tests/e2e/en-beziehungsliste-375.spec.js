'use strict';
/* en-beziehungsliste-375.spec.js — EN-BEZIEHUNGSLISTE-DEUTSCH (18.11.2026): in der englischen Fassung steht die Auswahl
   „Your relationship to this person“ im Dialog „Create new depot“ englisch, bei 375 px am Handy. Vorher stand jeder Eintrag
   deutsch („Ich bin Ehepartner oder Lebensgefährte dieser Person“ …), nur „— please choose —“ war englisch.
   Gemessen an den Optionen der Auswahl im echten Dialog; das Bild der geöffneten Liste geht als Anhang mit.
   Die Node-Probe tests/en-beziehungsliste.test.js trägt den Rot-Beweis und den Wächter gegen die Klasse. */
const { test, expect } = require('@playwright/test');
const { KERN_URL_PRIVAT_EN, oeffneApp, depotAnlegen } = require('./helpers');

const DEUTSCH = /\b(Ich|bin|dieser|Person|Kind|Andere|Beziehung|Schwester|Bruder|Großeltern|Enkel|Nichte|Neffe|Tante|Onkel|Freund|Ehepartner|Lebens)/;

test('[EN-Beziehung·375] „Create new depot“: die Beziehung steht englisch zur Wahl', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await oeffneApp(page, { url: KERN_URL_PRIVAT_EN });
  await depotAnlegen(page);
  await page.click('#tb-depot-pille');
  await page.waitForSelector('#tb-depot-menue-anlegen', { state: 'visible' });
  await page.click('#tb-depot-menue-anlegen');
  const sel = page.locator('#sub-beziehung');
  await sel.waitFor({ state: 'visible' });
  const texte = await sel.locator('option').allTextContents();
  test.info().annotations.push({ type: 'optionen', description: JSON.stringify(texte) });
  expect(texte.length, 'die Auswahl hat ihre Einträge').toBeGreaterThanOrEqual(15);
  expect(texte.filter((t) => DEUTSCH.test(t)), 'kein deutscher Eintrag').toEqual([]);
  expect(texte, 'der erste Eintrag nennt die Beziehung englisch').toContain("I am this person's spouse or partner");
  await sel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('en-beziehung-dialog-375.png') });
  // Die Liste selbst: als aufgeklappte Auswahl (size) für das Bild, damit jeder Eintrag zu sehen ist.
  await sel.evaluate((s) => { s.size = s.options.length; s.style.height = 'auto'; });
  await sel.scrollIntoViewIfNeeded();
  await sel.screenshot({ path: test.info().outputPath('en-beziehung-liste-375.png') });
});
