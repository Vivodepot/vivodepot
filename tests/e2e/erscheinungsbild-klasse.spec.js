'use strict';
/* Rückfall des Erscheinungsbilds durch den Sichern-Knopf bei 768 px (Befund ERSCHEINUNGSBILD-RUECKFALL-SICHERN-768, 18.11.2026),
   im echten Browser. Die Laufzeitprobe des Erscheinungsbilds (U2-ADR-473, Punkt 4) schaltet bei einem einzigen Verstoß an einer
   geschützten Anzeige die ganze Gestaltung ab. Bei 768 px (iPad hoch) lief nach einer ungespeicherten Änderung der Knopf
   „Jetzt als Datei sichern“ unter die Darstellungs-Gruppe der Kopfleiste; die Probe meldete ihn verdeckt, und die Gestaltung fiel
   zurück. Die Kopfleiste stuft sich in jeder Breite schon zurück (tb-eng-1), nur der Knopf behielt seinen Text außerhalb des
   Handy-Bereichs. Belegt: nach der ungespeicherten Änderung meldet die Probe nichts, und die Wurzel trägt keine Rückfall-Marke. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

/* Der Stand der Probe: was sie jetzt meldet (frisch gerufen) und was sie bisher gemeldet hat. Beides muss leer sein. */
function probeStand(page) {
  return page.evaluate(() => ({
    jetzt: typeof erscheinungsbildSchutzProbe === 'function' ? erscheinungsbildSchutzProbe(document) : ['probe-fehlt'],
    bisher: typeof ERSCHEINUNGSBILD_RUECKFALL === 'undefined' ? ['unbekannt'] : ERSCHEINUNGSBILD_RUECKFALL,
    marke: document.documentElement.getAttribute('data-erscheinungsbild'),
  }));
}

test('Erscheinungsbild 768: kein Rückfall mit ungespeicherter Änderung', async ({ page }) => {
  await page.addInitScript(() => { try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {} });
  await page.setViewportSize({ width: 768, height: 900 });
  await oeffneApp(page);
  await depotAnlegen(page);
  const feld = page.locator('[data-edit="telephone"]');
  await feld.scrollIntoViewIfNeeded();
  await feld.click({ force: true });
  await page.keyboard.type('030 1234567');
  await page.keyboard.press('Tab');
  await expect(page.locator('#tb-save-knopf')).toBeVisible();
  await page.waitForTimeout(500);   // die Probe läuft gebündelt 250 ms nach einer Änderung
  const s = await probeStand(page);
  expect(s.jetzt, '768 ungespeichert: die Probe meldet nichts').toEqual([]);
  expect(s.bisher, '768 ungespeichert: kein Rückfall seit dem Laden').toBe(null);
  expect(s.marke, '768 ungespeichert: keine Rückfall-Marke an der Wurzel').not.toBe('rueckfall');
});
