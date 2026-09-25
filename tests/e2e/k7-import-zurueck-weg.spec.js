'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — K7 Zug3 (Auftrag F7/K7, 09.08.2026): der Import-Weg trägt jetzt
   einen echten Zurück-Weg. Browser-Abnahme (Auftrag: „hinein, zurück,
   wieder hinein") — die Knopf-Verdrahtung selbst ist im Node-Harness NICHT
   prüfbar (querySelectorAll liefert dort immer [], s. tests/load-kern.js).
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

const KONSOLE_HARMLOS = [
  /Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored when delivered via/i,
];
const istHarmloseKonsole = (t) => KONSOLE_HARMLOS.some((re) => re.test(String(t)));

test('K7: Daten einlesen → Bereich wählen → Zurück → wieder hinein, ohne das Modal zu verlassen', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page);

  // Zentrale Tür (Sidebar) öffnen.
  await page.click('[data-einlesen-zentral]');
  await expect(page.locator('#modal-titel')).toHaveText('Wohin einlesen?');
  await expect(page.locator('[data-iz-sektor="identity"]')).toBeVisible();

  // Hinein: einen Bereich wählen — der Format-Chooser öffnet, "Automatisch erkennen" steht zuerst.
  await page.click('[data-iz-sektor="identity"]');
  await expect(page.locator('#modal-titel')).toHaveText(/Daten einlesen/);
  const ersterKnopf = page.locator('.herausgeben-chooser button').first();
  await expect(ersterKnopf).toHaveAttribute('data-i-auto', 'identity');

  // Zurück: der neue Weg — bisher war „Schließen" der einzige Ausweg (verließ das GANZE Modal).
  await page.click('#m-zweit');
  await expect(page.locator('#modal-titel')).toHaveText('Wohin einlesen?');
  await expect(page.locator('[data-iz-sektor="identity"]')).toBeVisible();

  // Wieder hinein: derselbe Bereich lässt sich erneut öffnen — kein toter Zustand nach dem Zurück.
  await page.click('[data-iz-sektor="identity"]');
  await expect(page.locator('#modal-titel')).toHaveText(/Daten einlesen/);
  await expect(page.locator('[data-i-auto="identity"]')).toBeVisible();

  // Schließen bleibt der schnelle Ausweg (zweitAktion ergänzt, ersetzt nicht).
  await page.click('#m-ok');
  await expect(page.locator('#modal-rueck')).not.toHaveClass(/\ban\b/);

  expect(fehler, 'keine JS-/Konsolen-Fehler während des Import-Wegs').toEqual([]);
});
