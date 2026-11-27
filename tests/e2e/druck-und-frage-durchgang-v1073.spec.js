'use strict';
/* Zwei Stellen aus dem Durchgang als fremde Nutzerin am Stand v1073 (25.11.2026).
   N1 — Am Handy stand nach der Sicherungskopie in der Kopfleiste nur der Knopf „Ja, angekommen“, die Frage dazu nicht: der Satz
   des Speicherstatus ist unter 760 px ausgeblendet. Jetzt steht die kurze Frage (saveStatusUnbestaetigtFrage) beim Knopf; am
   breiten Bildschirm bleibt der ganze Satz und die kurze Frage verborgen.
   N3 — Der Browser-Druck einer Bereichsseite kam leer heraus: die Druckregel blendete jedes Kind von body ohne data-druckbar aus,
   auch wenn gar kein druckbares Blatt offen war. Jetzt greift sie nur, solange ein solches Blatt im Dokument steht. */
const { test, expect } = require('@playwright/test');
const { depotAnlegen, oeffneSektor, KERN_URL_PRIVAT_DE } = require('./helpers');

async function unbestaetigtAnlegen(page, breite) {
  await page.setViewportSize({ width: breite, height: breite < 768 ? 812 : 900 });
  await page.addInitScript(() => {
    try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {}
  });
  await page.goto(KERN_URL_PRIVAT_DE);
  await page.waitForSelector('#w-anlegen', { state: 'visible' });
  await page.evaluate(() => { try { delete window.showSaveFilePicker; } catch (_) {} });
  await depotAnlegen(page);
  await expect(page.locator('.tb-save-status')).toHaveClass(/ist-unbestaetigt/, { timeout: 5000 });
}

test('[N1·375] nach der Sicherungskopie steht am Handy die Frage beim Knopf „Ja, angekommen“', async ({ page }) => {
  await unbestaetigtAnlegen(page, 375);
  const frage = page.locator('#tb-save-status .tb-save-frage');
  const knopf = page.locator('#tb-save-knopf');
  await expect(knopf).toBeVisible();
  await expect(frage).toBeVisible();
  // Der erwartete Text aus dem deutschen Sprachmodul (ohne Testfläche des Kerns).
  const erwartet = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', '..', 'tools', 'textsatz-de-modul.json'), 'utf8'))
    .texte['strings:saveStatusUnbestaetigtFrage.text'];
  const text = (await frage.textContent()).trim();
  expect(text.length, 'die Frage hat einen Text').toBeGreaterThan(0);
  expect(text).toBe(erwartet);
  const f = await frage.boundingBox(), k = await knopf.boundingBox();
  expect(Math.abs((f.y + f.height / 2) - (k.y + k.height / 2)), 'Frage und Knopf in einer Zeile').toBeLessThan(k.height);
  expect(k.x - (f.x + f.width), 'die Frage steht direkt vor dem Knopf').toBeLessThan(24);
});

test('[N1·1280] am breiten Bildschirm steht der ganze Satz, die kurze Frage bleibt verborgen', async ({ page }) => {
  await unbestaetigtAnlegen(page, 1280);
  await expect(page.locator('#tb-save-status .tb-save-text')).toBeVisible();
  await expect(page.locator('#tb-save-status .tb-save-frage')).toBeHidden();
});

test('[N3] der Browser-Druck einer Bereichsseite enthält die Feldinhalte, ein offenes Druckblatt blendet sie aus', async ({ page }) => {
  await page.goto(KERN_URL_PRIVAT_DE);
  await page.waitForSelector('#w-anlegen', { state: 'visible' });
  await depotAnlegen(page, { name: 'Maria Mustermann' });
  await oeffneSektor(page, 'identity');
  await page.emulateMedia({ media: 'print' });
  const sichtbar = () => page.evaluate(() => {
    const feld = [...document.querySelectorAll('#content input, #content textarea')].find((e) => e.value === 'Maria');
    return feld ? feld.checkVisibility({ checkVisibilityCSS: true }) : null;
  });
  expect(await sichtbar(), 'im Druck steht das Feld mit dem Vornamen').toBe(true);
  // Rot-Beweis: steht ein druckbares Blatt im Dokument, druckt nur dieses; die Bereichsseite tritt zurück.
  await page.evaluate(() => { const b = document.createElement('div'); b.id = 'probe-blatt'; b.setAttribute('data-druckbar', ''); b.textContent = 'Blatt'; document.body.appendChild(b); });
  expect(await sichtbar(), 'mit offenem Druckblatt ist die Bereichsseite im Druck ausgeblendet').toBe(false);
  await page.evaluate(() => document.getElementById('probe-blatt').remove());
  expect(await sichtbar(), 'nach dem Schließen des Blatts druckt die Bereichsseite wieder').toBe(true);
});
