'use strict';
/* SPRUNGLINK-FEHLT (Barrierefreiheits-Audit 06.09.2026, Befund 1; WCAG 2.4.1, Stufe A) — mit der Tastatur, in der Depot-Ansicht
   Der erste Tab-Druck fokussiert den Sprunglink, und er ist sichtbar (im Bild, Kontrast der Beschriftung mindestens 4,5:1).
   Enter setzt den Fokus in <main>, ohne die Adresse zu ändern; der nächste Tab-Druck bleibt in <main>. Bis zum ersten Element
   in <main> sind es höchstens zwei Tab-Schritte (vor dem Link: Menü, Marke, Depot-Pille, Barrierefreiheit, Navigation …).
   Das Gerüst ohne Browser und den Klassenschutz über alle Anwendungen prüft tests/sprunglink-erstes-element.test.js. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

/** Relative Leuchtdichte nach WCAG aus "rgb(r, g, b)". */
function leuchtdichte(rgb) {
  const [r, g, b] = rgb.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function kontrast(a, b) {
  const [h, d] = [leuchtdichte(a), leuchtdichte(b)].sort((x, y) => y - x);
  return (h + 0.05) / (d + 0.05);
}

test('[Sprunglink·Tastatur] erster Tab fokussiert den sichtbaren Link, Enter springt in <main>, höchstens zwei Tab-Schritte', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await expect(page.locator('#content')).not.toHaveAttribute('inert', /.*/);
  const vorher = await page.evaluate(() => location.href);
  // Startpunkt der Tab-Reihenfolge an den Seitenanfang: blur() allein läßt ihn am zuletzt fokussierten Element stehen.
  await page.evaluate(() => { document.body.setAttribute('tabindex', '-1'); document.body.focus(); document.body.removeAttribute('tabindex'); window.scrollTo(0, 0); });

  await page.keyboard.press('Tab');
  const link = page.locator('#sprunglink');
  await expect(link, 'fokussiert ist: ' + await page.evaluate(() => document.activeElement && document.activeElement.outerHTML.slice(0, 120))).toBeFocused();
  await expect(link).toHaveText(/\S/);
  const box = await link.boundingBox();
  expect(box && box.y >= 0 && box.height > 0 && box.width > 0, 'der Link liegt mit dem Fokus nicht im Bild: ' + JSON.stringify(box)).toBe(true);
  const farben = await link.evaluate((el) => { const s = getComputedStyle(el); return { vg: s.color, hg: s.backgroundColor }; });
  expect(kontrast(farben.vg, farben.hg), 'Kontrast ' + JSON.stringify(farben)).toBeGreaterThanOrEqual(4.5);

  await page.keyboard.press('Enter');
  await expect(page.locator('#content')).toBeFocused();
  expect(await page.evaluate(() => location.href), 'der Sprunglink hat die Adresse geändert').toBe(vorher);

  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement && !!document.activeElement.closest('main#content')),
    'zwei Tab-Schritte (Link, dann erstes Element) führen nicht in <main>').toBe(true);
});
