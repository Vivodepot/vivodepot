'use strict';
/* ═══════════════════════════════════════════════════════════
   E2E — ABN-B6 BEREICH-OEFFNEN-ZIEL (11.11.2026, Befund HOCH, Abnahme Privatversion v1053).
   „nicht hinterlegt — im Bereich öffnen ›“ auf einem Anlass-Blatt landete oben im Bereich, das Feld lag in einer
   zugeklappten Karte unter der Kante. Der Klick führt jetzt zum Feld: die Karte öffnet sich, das Feld liegt im Blickfeld,
   trägt den Fokus und ist sichtbar markiert. Geprüft bei 390 px und am Desktop.
   ═══════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

for (const [name, breite, hoehe] of [['390 px', 390, 844], ['Desktop 1280', 1280, 800]]) {
  test('ABN-B6: „im Bereich öffnen“ öffnet die Karte und setzt den Fokus ins Feld — ' + name, async ({ page }) => {
    await page.setViewportSize({ width: breite, height: hoehe });
    await oeffneApp(page);
    await depotAnlegen(page);
    // das Anlass-Blatt „Vor einem Arzttermin“ über den Klickweg; bei 390 px liegt die Navigation im Schubfach
    if (await page.locator('#tb-menue').isVisible()) await page.click('#tb-menue');
    await page.click('[data-anlass-auswahl="1"]');
    await page.waitForSelector('[data-anlass="arzt"]', { state: 'visible' });
    await page.click('[data-anlass="arzt"]');
    await page.waitForSelector('.klick-durch[data-klick-feld]', { state: 'visible' });

    // die Zeile aus dem Befund: Medikamente (laufend) — das Feld wohnt in einer zugeklappten Karte des Bereichs
    const zeile = page.locator('.klick-durch[data-klick-feld]', { hasText: 'Medikamente' }).first();
    await expect(zeile).toBeVisible();
    const sprung = { f: await zeile.getAttribute('data-klick-feld') };
    await zeile.click();

    const feld = page.locator('[data-feld="' + sprung.f + '"], [data-feld-liste="' + sprung.f + '"]').first();
    await expect(feld).toBeVisible();
    // Blickfeld: das Feld liegt ganz innerhalb des Fensters
    await expect.poll(async () => page.evaluate((f) => {
      const el = document.querySelector('[data-feld="' + f + '"]') || document.querySelector('[data-feld-liste="' + f + '"]');
      if (!el) return 'fehlt';
      const r = el.getBoundingClientRect();
      return (r.top >= 0 && r.bottom <= window.innerHeight && r.width > 0) ? 'im Blickfeld' : 'ausserhalb ' + Math.round(r.top) + '/' + Math.round(r.bottom);
    }, sprung.f), { timeout: 4000 }).toBe('im Blickfeld');
    // Fokus liegt im Feld
    const fokusImFeld = await page.evaluate((f) => {
      const el = document.querySelector('[data-feld="' + f + '"]') || document.querySelector('[data-feld-liste="' + f + '"]');
      return !!(el && document.activeElement && el.contains(document.activeElement) && document.activeElement !== el.closest('body'));
    }, sprung.f);
    expect(fokusImFeld).toBe(true);
    // keine zugeklappte Karte um das Feld
    expect(await page.evaluate((f) => { const el = document.querySelector('[data-feld="' + f + '"]') || document.querySelector('[data-feld-liste="' + f + '"]'); return !!(el && el.closest('details:not([open])')); }, sprung.f)).toBe(false);
    // sichtbar markiert
    await expect(feld).toHaveClass(/feld-hervorgehoben/);
  });
}
