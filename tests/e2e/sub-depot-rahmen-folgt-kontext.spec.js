'use strict';
/* U2-ADR-236 — "Rahmen folgt Kontext", echter Browser-Lauf (Playwright, nicht nur
   Kern-Regex): "Der Rahmen trägt die Farbe des Depots, in dem man gerade ist."

   Anker über Struktur (Tag/ID), nicht über CSS-Klasse oder Position — dieselbe Regel,
   die heute schon mehrfach einen formatwechsel-blinden Prüfer zeigte. Verglichen wird
   der ECHTE, vom Browser berechnete Rand-Farbwert (getComputedStyle), nicht der
   Quelltext — ein Fund, der reines Regex-Lesen der CSS-Quelle nicht zeigen kann. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

const PW = 'e2e-passwort-123';

// Rot-Beweis, echt gefahren (vivodepot.html kurz auf den Vor-ADR-236-Stand zurückgesetzt,
// Playwright erneut gefahren, Datei danach wiederhergestellt): dieser erste Test bestand SCHON
// VORHER — die Kopfzeilen-Randfarbe nutzte immer schon var(--akzent), unverändert seit 04.08.2026
// (s. Bericht vom 03.09.2026). Er bleibt als Regressionswächter für einen bereits korrekten
// Mechanismus stehen, beweist aber keinen NEUEN Bau. Der zweite Test (Navigation/Fußzeile) schlug
// im selben Lauf fehl — DER ist der echte Rot-Beweis für U2-ADR-236.
test('Kopfzeilen-Randfarbe (border-bottom-color, header) wechselt Anker→Sub-Kontext', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });

  const ankerFarbe = await page.locator('header').evaluate((el) => getComputedStyle(el).borderBottomColor);

  const subFarbe = await page.evaluate(async (pw) => {
    const e = await window.__vdOeffentlich.subDepotAnlegen(
      { bezeichnung: 'E2E-Sub', inhaberin: 'Testperson', verwaltungsTyp: 'verwaltet', akzent: 'flieder' }, pw);
    await window.__vdOeffentlich.subDepotVertrauenOeffnen(e.depotUUID, pw);
    window.__vdOeffentlich.subKontextBetreten(e.depotUUID);
    return getComputedStyle(document.querySelector('header')).borderBottomColor;
  }, PW);

  expect(subFarbe).not.toBe(ankerFarbe);

  const zurueckFarbe = await page.evaluate(async () => {
    await window.__vdOeffentlich.subKontextVerlassen();
    return getComputedStyle(document.querySelector('header')).borderBottomColor;
  });
  expect(zurueckFarbe).toBe(ankerFarbe);
});

test('Navigation (#sidebar, border-left-color) und Fußzeile (#app-fuss, border-top-color) wechseln ebenfalls', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });

  const ankerNav = await page.locator('#sidebar').evaluate((el) => getComputedStyle(el).borderLeftColor);
  const ankerFuss = await page.locator('#app-fuss').evaluate((el) => getComputedStyle(el).borderTopColor);

  const { subNav, subFuss } = await page.evaluate(async (pw) => {
    const e = await window.__vdOeffentlich.subDepotAnlegen(
      { bezeichnung: 'E2E-Sub-2', inhaberin: 'Testperson', verwaltungsTyp: 'verwaltet', akzent: 'nebel' }, pw);
    await window.__vdOeffentlich.subDepotVertrauenOeffnen(e.depotUUID, pw);
    window.__vdOeffentlich.subKontextBetreten(e.depotUUID);
    return {
      subNav: getComputedStyle(document.getElementById('sidebar')).borderLeftColor,
      subFuss: getComputedStyle(document.getElementById('app-fuss')).borderTopColor,
    };
  }, PW);

  expect(subNav).not.toBe(ankerNav);
  expect(subFuss).not.toBe(ankerFuss);
  // Dieselbe Sub-Farbe trägt beide Stellen — "ein Satz", kein Zufall zweier unabhängiger Werte.
  expect(subNav).toBe(subFuss);
});
