'use strict';
/* Die Suche als Palette schaltet das Erscheinungsbild nicht ab (U-8a, 17.11.2026)
   Befund: bei 1280 px fiel die Anwendung beim ersten Fokus in der Kopf-Suche auf ungestaltetes HTML zurück. Die Laufzeitprobe sah
   geschützte Anzeigen von der Palette (.suche-feld.suche-offen mit Schleier) überdeckt; der Container stand nicht in
   ueberdeckenErlaubt. Jetzt darf er überdecken, solange das Feld den Fokus hat (Klasse suche-offen).
     1 · Depot anlegen, Fokus in die Kopf-Suche, Begriff eingeben: Palette offen, kein Rückfall.
     2 · Rot-Beweis: dieselbe Laufzeitprobe mit der Liste ohne den Paletten-Eintrag meldet bei offener Palette „ueberdeckt“.
     3 · Escape schließt die Palette, die Klasse ist weg, kein Rückfall. */
const { test, expect } = require('@playwright/test');
const h = require('./helpers.js');

const zustand = (page) => page.evaluate(() => ({
  rueckfall: document.documentElement.getAttribute('data-erscheinungsbild') === 'rueckfall',
  verstoesse: ERSCHEINUNGSBILD_RUECKFALL,
}));

test('Suche als Palette über der Ansicht lässt das Erscheinungsbild stehen, ohne den Eintrag wäre es überdeckt', async ({ browser }) => {
  test.setTimeout(120000);
  // 1440 px: seit der Barrierefreiheits-Leiste im Kopf (U-2) ist die Kopfleiste bei 1280 px eng (tb-eng-0), dort gilt die Lupe
  // (zweiter Fall). Gemessen 17.11.2026: bei 1440 px steht das Feld im Kopf (tb-suche-platz 176 px).
  const kontext = await browser.newContext({ viewport: { width: 1440, height: 800 } });
  const page = await kontext.newPage();
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await h.depotAnlegen(page, { pw: 'e2e-passwort-123' });
  for (let k = 0; k < 3; k++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(150); }
  expect(await zustand(page), 'Start').toEqual({ rueckfall: false, verstoesse: null });

  const feld = page.locator('#tb-suche-platz > .suche-feld');
  await expect(feld, 'die Suche steht bei 1440 px in der Kopfleiste').toBeVisible();
  await page.locator('#suche-eingabe').fill('Vollmacht');
  await expect(feld).toHaveClass(/\bsuche-offen\b/);
  await page.waitForTimeout(600);   // Laufzeitprobe (250 ms gebündelt) gelaufen
  expect(await zustand(page), 'Palette offen').toEqual({ rueckfall: false, verstoesse: null });

  const ohne = await page.evaluate(() => erscheinungsbildSchutzProbe(document, Object.assign({}, ERSCHEINUNGSBILD_REGELN, {
    ueberdeckenErlaubt: ERSCHEINUNGSBILD_REGELN.ueberdeckenErlaubt.filter((s) => s.indexOf('.suche-feld.suche-offen') < 0),
  })));
  expect(ohne.some((v) => v.grund === 'ueberdeckt'), 'Rot-Beweis: ohne den Eintrag meldet die Probe eine Überdeckung').toBe(true);
  expect(await page.evaluate(() => erscheinungsbildSchutzProbe(document)), 'mit dem Eintrag').toEqual([]);

  await page.keyboard.press('Escape');
  await expect(feld).not.toHaveClass(/\bsuche-offen\b/);
  await page.waitForTimeout(600);
  expect(await zustand(page), 'nach Escape').toEqual({ rueckfall: false, verstoesse: null });
  await kontext.close();
});

// Die Lupe im Kopf (D87, M06): bei 375 px steht statt des Felds eine Lupe; sie öffnet die Palette, Escape bringt das Feld zurück in die Seitenleiste.
test('Lupe im Kopf bei 375 px öffnet die Palette ohne Rückfall, danach steht das Feld wieder in der Seitenleiste', async ({ browser }) => {
  test.setTimeout(120000);
  const kontext = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await kontext.newPage();
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await h.depotAnlegen(page, { pw: 'e2e-passwort-123' });
  for (let k = 0; k < 3; k++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(150); }
  const lupe = page.locator('#tb-lupe');
  await expect(lupe, 'die Lupe steht im Kopf').toBeVisible();
  await lupe.click();
  await expect(page.locator('#tb-suche-platz > .suche-feld'), 'das Feld ist im Kopf').toHaveClass(/\bsuche-offen\b/);
  await page.locator('#suche-eingabe').fill('Vollmacht');
  await page.waitForTimeout(600);
  expect(await zustand(page), 'Palette über der Lupe').toEqual({ rueckfall: false, verstoesse: null });
  await page.keyboard.press('Escape');
  await expect(page.locator('#sidebar > .suche-feld'), 'zurück in der Seitenleiste').toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.classList.contains('suche-lupe-auf'))).toBe(false);
  await kontext.close();
});
