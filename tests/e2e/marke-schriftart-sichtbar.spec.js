'use strict';
/* U2-ADR-296 — echter Browser-Lauf (Playwright, nicht nur Kern-Regex): beweist, dass ein
   Branding-Modul die BASIS-Schriftart tatsächlich SICHTBAR ändert (getComputedStyle), nicht
   nur, dass brandingAnwenden eine CSS-Custom-Property setzt (das wäre heute schon grün und
   bewiese nichts — s. U2-ADR-296-Diskussion). Font-family-Werte lösen NIE über das Netz auf
   (nur @font-face-Regeln tun das) — ein unbekannter Fontname fällt einfach durch die
   Fallback-Kette, offline-sicher ohne Sonderfall. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

const PW = 'e2e-passwort-adr296';

test('ein Branding-Modul ändert die sichtbare Basis-Schriftart (body, getComputedStyle)', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });

  const ohneBranding = await page.locator('body').evaluate((el) => getComputedStyle(el).fontFamily);
  expect(ohneBranding).toContain('Inter');

  const mitBranding = await page.evaluate(() => {
    window.__vdOeffentlich.brandingAnwenden({ farbePrimaer: null, farbeSekundaer: null, schriftart: 'Comic Sans MS' });
    return getComputedStyle(document.body).fontFamily;
  });
  expect(mitBranding).not.toBe(ohneBranding);
  expect(mitBranding).toContain('Comic Sans MS');

  // Reset-Weg seit U2-ADR-400 §1 (vivodepot.html:32612, _depotSpeicherZuruecksetzen): kein
  // hartes brandingAnwenden(null) mehr — der echte Reset fällt auf
  // _letztesBrandingOderAbWerk(null) zurück (den vollen Ab-Werk-Stack), damit ein geschlossenes
  // Depot nicht kurz die native Marke zeigt. Derselbe Weg hier, sonst prüft dieser Test einen
  // Reset-Pfad, den das Produkt gar nicht mehr geht — ein echt kaputter Reset (bliebe z. B. bei
  // Comic Sans MS stehen) fällt weiterhin durch, denn _letztesBrandingOderAbWerk(null) kennt
  // dieses Depot-lose window.__vdOeffentlich.brandingAnwenden-Fenster nicht und liefert unverändert den
  // Ab-Werk-Wert zurück.
  const nachReset = await page.evaluate(() => {
    window.__vdOeffentlich.brandingAnwenden(window.__vdOeffentlich._letztesBrandingOderAbWerk(null));
    return getComputedStyle(document.body).fontFamily;
  });
  expect(nachReset).toBe(ohneBranding);
});
