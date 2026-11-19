'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Freigabe mit Häkchen in Gruppen (Entscheidung 17.11.2026) — die sechs Punkte im echten Browser.
   Ersetzt die Probe des Rückhalte-Wegs („ohne Kästchen“, 12.08.2026). Node-seitig: tests/herausgabe-haekchen-gruppen.test.js.
   P1 Satz über der Liste · P2 Häkchen je Angabe, ein Klick auf das Label hakt ab · P3 Gruppen, mehrere offen, Gruppen-Häkchen
   gemischt mit „x von y“ · P4 Arzttermin: Anamnese angehakt; Bereich: Sensibles ohne Häkchen · P5 Zusammenfassung, bei 0 gesperrt ·
   P6 Leertaste am Gruppen-Häkchen.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

async function gesundheit(page) {
  await page.evaluate(() => {
    const V = window.__vdOeffentlich;
    V.sektorFeldSetzen('health', 'chronicConditionsDiagnoses', [{ text: 'Rheuma' }]);
    V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
    V.sektorFeldSetzen('health', 'medicationOngoing', [{ text: 'Methotrexat' }]);
  });
}

test('Arzttermin: Satz, Gruppen, Anamnese angehakt, Zusammenfassung, Abhaken und Gruppen-Häkchen', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await gesundheit(page);
  await page.evaluate(() => window.__vdOeffentlich.flowAnlassExport('arzt'));
  const modal = page.locator('#modal-inhalt');
  const S = await page.evaluate(() => {
    const s = window.__vdOeffentlich.STRINGS;
    return { satz: s.exportHaekchenSatz, zus: s.exportZusammenfassung };
  });

  // P1: der Satz über der Liste (ohne frühere Herausgabe keine Stelle).
  await expect(modal.locator('.export-haekchen-satz')).toHaveText(S.satz);
  // P4 (Entscheidung 17.11.2026): beim Arzttermin sind die Anamnese-Angaben angehakt, auch die sensiblen.
  for (const f of ['chronicConditionsDiagnoses', 'allergiesMedicationFoodOther', 'medicationOngoing']) {
    const h = modal.locator('input.export-haken[data-feld="' + f + '"]');
    if (!(await h.isVisible())) await h.locator('xpath=ancestor::details[1]/summary/span[contains(@class,"export-gruppe-titel")]').click();
    await expect(h).toBeChecked();
  }
  // P3: mehr als eine Gruppe (ein Block ohne Angabe steht gesperrt mit „fehlt noch“).
  const gruppen = modal.locator('.export-gruppe');
  expect(await gruppen.count()).toBeGreaterThan(1);
  // P5: Zusammenfassung über dem Knopf.
  const zus = modal.locator('#export-zusammenfassung');
  const vorher = await zus.textContent();
  expect(vorher).toMatch(/^\d+ /);
  const nVorher = parseInt(vorher, 10);

  // P2: Klick auf das Label hakt ab; die Zusammenfassung zählt mit, die Gruppe steht gemischt.
  const id = await modal.locator('input.export-haken[data-feld="medicationOngoing"]').getAttribute('id');
  await modal.locator('label[for="' + id + '"]').click();
  await expect(modal.locator('input.export-haken[data-feld="medicationOngoing"]')).not.toBeChecked();
  await expect(zus).toHaveText(new RegExp('^' + (nVorher - 1) + ' '));
  const kopf = modal.locator('input.export-haken[data-feld="chronicConditionsDiagnoses"]').locator('xpath=ancestor::details[1]').locator('[data-gruppen-haken]');
  {
    await expect(kopf).toHaveCount(1);
    await expect(kopf).toHaveAttribute('aria-checked', /mixed|false/);
    // P6: Leertaste am Gruppen-Häkchen hakt alle der Gruppe an.
    await kopf.focus();
    await page.keyboard.press(' ');
    const kopfNeu = modal.locator('input.export-haken[data-feld="chronicConditionsDiagnoses"]').locator('xpath=ancestor::details[1]').locator('[data-gruppen-haken]');
    await expect(kopfNeu).toHaveAttribute('aria-checked', 'true');
  }
});

test('Bereich: Sensibles ohne Häkchen, bei 0 ist „Herausgeben“ gesperrt', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await gesundheit(page);
  await page.evaluate(() => {
    window.__vdOeffentlich.flowExportUebersicht({ sektorId: 'health', titel: 'Probe', aufFortfahren: () => { window._hinaus = true; } });
  });
  const modal = page.locator('#modal-inhalt');
  await expect(modal.locator('input.export-haken:checked')).toHaveCount(0);
  await expect(page.locator('#m-ok')).toBeDisabled();
  // Ein Häkchen setzen: der Knopf wird frei.
  const erstes = modal.locator('input.export-haken').first();
  if (!(await erstes.isVisible())) await erstes.locator('xpath=ancestor::details[1]/summary/span[contains(@class,"export-gruppe-titel")]').click();
  await erstes.check();
  await expect(page.locator('#m-ok')).toBeEnabled();
});
