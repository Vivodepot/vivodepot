'use strict';
/* nav-aktiv-linie-schmal.spec.js — Desktop-Dummy H08: unter 768 px trägt der aktive Eintrag im geöffneten Menü die Linie links
   (Salbei, ohne Karte), auf dem Schreibtisch bleibt die weiße Karte (Dummy, Regel `.nav button.an` und ihre Fassung unter 768 px).
   Rot-Beweis: ohne die Regel für schmale Schirme steht dort wieder die Karte ohne Linie, die Messung erkennt das. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, schubfachOeffnen } = require('./helpers');

const messe = (page) => page.evaluate(() => {
  const el = document.querySelector('#sidebar .nav-item.aktiv');
  if (!el) return null;
  const c = getComputedStyle(el);
  return { linie: parseFloat(c.borderLeftWidth) >= 2 && !/rgba\(0, 0, 0, 0\)|transparent/.test(c.borderLeftColor), flaeche: c.backgroundColor };
});

test('[Navigation·H08] schmal: Linie links am aktiven Eintrag, breit: Karte ohne Linie, mit Rot-Beweis', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'identity');   // über die Seitenleiste, die auf dem Schreibtisch offen steht
  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(300);
  await schubfachOeffnen(page);   // am Handy über den Tab „Bereiche“ (Kopfleiste nach dem Desktop-Dummy, 17.11.2026)
  await expect(page.locator('#app'), 'die Seitenleiste ist offen').toHaveClass(/\bmenue-auf\b/);
  await page.waitForTimeout(300);
  const schmal = await messe(page);
  expect(schmal, 'ein aktiver Eintrag in der Seitenleiste').not.toBeNull();
  expect(schmal.linie, 'bei 375 px: Linie links am aktiven Eintrag').toBe(true);
  expect(schmal.flaeche, 'bei 375 px: keine Karte').toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  await page.screenshot({ path: test.info().outputPath('nav-aktiv-375.png') });   // Bild für die Abnahme

  // Rot-Beweis: ohne die Regel für schmale Schirme sieht die Messung keine Linie.
  const ohne = await page.addStyleTag({ content: '#sidebar .nav-item.aktiv { border-left-color: transparent !important; background: #fff !important; }' });
  expect((await messe(page)).linie, 'Rot-Beweis: ohne Regel keine Linie').toBe(false);
  await ohne.evaluate((el) => el.remove());

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(300);
  const breit = await messe(page);
  expect(breit.linie, 'bei 1280 px: die Karte, keine Linie (Dummy)').toBe(false);
});
