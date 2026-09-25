'use strict';
/* Abnahme 2 — „Drei Abnahmen und vier Messungen" (12./13.08.2026).
   Ursprünglich drei S4-Toasts ohne E2E-Abdeckung: `saveStatusDateiToast`, `d3ToastText`,
   `zeigeErstEintragToast`. Zug 0 (Auftragsvorgabe): erst feststellen, wie der Zustand zu
   erreichen ist, bevor die Abnahme fährt.

   BEFUND ZU `d3ToastText`/`zeigeErstEintragToast`: Der Toast feuerte nur bei
   `imVorschau() === true` UND einer echten Änderung an einem `[data-edit]`-Sektorfeld. Direkt
   geprüft (zwei unabhängige Sektoren, `identitaet` und `wohnen`): in der passwortlosen Vorschau
   (`#w-anfangen`, KEIN Passwort gesetzt) rendert JEDES Sektorfeld als reiner
   `<div data-feld="…">`, nicht als `<input data-edit="…">` — `Modus.darfBearbeiten()` ist ohne
   Sitzungs-Akteur `false` (Setup-first, Erstnutzer-Befund 22.06.2026), und das gilt strukturell
   für JEDEN Sektor, nicht nur einen. Die beiden Bedingungen (Vorschau UND editierbares Feld)
   schlossen sich im UI gegenseitig aus — kein Klickweg löst das auf.

   FOLGE („Zwei tote Toasts", 13.08.2026): der Toast war unerreichbar seit seiner
   Einführung (07.06.2026, nicht durch einen späteren Umbau verloren) und die Lage, für die er
   gedacht war, bekommt über den D1-Topbar-Hinweis bereits eine dauerhafte Rückmeldung —
   `zeigeErstEintragToast`/`d3ToastText`/das Gate sind ENTFERNT, nicht mehr nur dokumentiert.
   Der zweite Test unten bleibt: er belegt weiterhin ein eigenständiges Verhalten (Vorschau
   rendert keine editierbaren Sektorfelder), unabhängig vom entfernten Toast. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, setzeFeld } = require('./helpers');

test('saveStatusDateiToast erscheint beim echten Datei-Sichern', async ({ page }) => {
  // GEÄNDERT (Auftrag, 12.09.2026): der Prüfgegenstand ist ausdrücklich der DATEI-Toast
  // (Titel: „beim echten Datei-Sichern") — der Sichern-Knopf bleibt unter internem Speicher
  // verborgen (kein „ungespeichert"-Zustand). Datei-Modus erzwungen (Topf A).
  await page.addInitScript(() => {
    try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {}
  });
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'identity');
  await setzeFeld(page, 'telephone', '0151 12345678');
  await page.waitForSelector('#tb-save-knopf', { state: 'visible' });
  await page.click('#tb-save-knopf');
  await expect(page.locator('.toast')).toContainText('Ihre Sicherung wurde als Datei gesichert.');
  await page.screenshot({ path: 'tests/e2e/.artifacts/s4-datei-toast.png', fullPage: true });
});

test('Zug 0 — Befund: in der passwortlosen Vorschau ist KEIN Sektorfeld editierbar (data-edit fehlt strukturell)', async ({ page }) => {
  await oeffneApp(page);
  await page.click('#w-anfangen');
  await page.waitForSelector('#app.an', { state: 'attached' });
  const vorschau = await page.evaluate(() => window.__vdOeffentlich.imVorschau());
  expect(vorschau).toBe(true);

  for (const sektor of ['identity', 'housing']) {
    await oeffneSektor(page, sektor);
    const html = await page.locator('#content').innerHTML();
    expect(html).not.toMatch(/data-edit="/);
    expect(html).not.toMatch(/data-wizard-start="/);
  }
});
