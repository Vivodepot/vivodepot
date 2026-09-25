'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Die Herausgabe kommt ohne Kästchen aus" (12.08.2026) — der interaktive
   Rückhalte-Weg. Der Node-DOM-Stub kann `box.querySelector()`-Verdrahtung nicht nachstellen
   (liefert dort immer ein frisches Phantom-Element statt des echten Ziels) — dieselbe Probe
   braucht darum einen echten Browser. Node-seitig geprüft (Normalweg-Inhalt, Topf-B-Zeilen):
   tests/export-luecken-topf-b-dialog.test.js, tests/sammelfix-ux.test.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, setzeFeld } = require('./helpers');

test('Normalweg zeigt keine Kästchen, Rückhalte-Weg toggelt per Knopf, Zählzeile stimmt', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'identity');
  await setzeFeld(page, 'givenName', 'Maria');
  await setzeFeld(page, 'familyName', 'Mustermann');
  await setzeFeld(page, 'nationality', 'deutsch');   // schema-sensibel — startet zurückgehalten

  await page.evaluate(() => {
    window._testErgebnis = null;
    window.__vdOeffentlich.flowExportUebersicht({ sektorId: 'identity', titel: 'Test-Herausgabe',
      aufFortfahren: (o) => { window._testErgebnis = o; } });
  });

  const modal = page.locator('#modal-inhalt');
  await expect(modal.locator('input[type="checkbox"]')).toHaveCount(0);
  await expect(modal.locator('li[data-feld="givenName"]')).toBeVisible();

  await page.click('#exp-zurueckhalten-weg');
  await expect(modal.locator('input[type="checkbox"]')).toHaveCount(0);
  const zaehlzeileVorher = await modal.locator('.export-zaehlzeile').textContent();

  // Ein zurückgehaltenes Feld (schema-/nutzer-sensibel) "Doch mitgeben" — Zählzeile steigt um 1.
  const dochMitgeben = modal.locator('.export-zz-btn-zurueck').first();
  await expect(dochMitgeben).toBeVisible();
  const vorherZahl = parseInt(zaehlzeileVorher, 10);
  await dochMitgeben.click();
  await expect(modal.locator('.export-zaehlzeile')).toHaveText(new RegExp('^' + (vorherZahl + 1) + ' von'));

  // Deckel-Test (Auftrags-Abnahmebedingung): jede Zeile lesbar ohne den Modal-Titel.
  await page.evaluate(() => { document.getElementById('modal-titel').style.display = 'none'; });
  const ersteZeile = await modal.locator('.export-zz').first().textContent();
  expect(ersteZeile).toMatch(/(Zurückhalten|Doch mitgeben)$/);

  await page.click('#m-ok');
  await page.waitForTimeout(50);
  const ergebnis = await page.evaluate(() => window._testErgebnis);
  // Fünf-größere-Reste (13.08.2026), Zug 1: exportAuswahlEphemerAnwenden reicht seither immer
  // _zurueckgehaltenAnzahl mit (der PDF-Teilauszug-Vermerk braucht sie) — kein zweiter Zähler,
  // additiv zum bestehenden Ergebnis-Objekt.
  expect(ergebnis).toEqual({ sensibel: false, _zurueckgehaltenAnzahl: 0 });

  // Ephemer: nach dem Export ist die persistente Sensibel-Markierung unverändert (Zug 3).
  const sensibelFelderDanach = await page.evaluate(() => JSON.stringify(window.data && window.data.sensibelFelder));
  expect(sensibelFelderDanach === undefined || sensibelFelderDanach === '{}' || sensibelFelderDanach === undefined).toBeTruthy();
});

test('Trefferflächen: die Zeilen-Knöpfe im Rückhalte-Weg sind 44px auch am Desktop-Mauszeiger', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'identity');
  await setzeFeld(page, 'givenName', 'Maria');
  await page.evaluate(() => {
    window.__vdOeffentlich.flowExportUebersicht({ sektorId: 'identity', titel: 'Test', aufFortfahren: () => {} });
  });
  await page.click('#exp-zurueckhalten-weg');
  const knopf = page.locator('.export-zz-btn').first();
  const box = await knopf.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
});

/* „Pruefebene, zweiter Durchgang" (13.08.2026), Zug 4b: der Herausgabe-Auftrag
   (12.08.2026) hat diese Probe manuell im Browser gefahren und per Bildbeleg dokumentiert
   (`zug6-dialog-erneut-geoeffnet.png`) — aber keine der drei E2E-Proben oben deckt sie. Ohne
   einen dauerhaften Wächter hätte der Fehler von vor dem 19.06. (eine Freigabe überlebte das
   erneute Öffnen) heute keine Probe, die ihn fängt. Zurückhalten → doch mitgeben → herausgeben
   → Dialog erneut öffnen → die Freigabe darf NICHT überlebt haben. */
test('Ephemer: eine „doch mitgeben"-Freigabe im Rückhalte-Weg überlebt das erneute Öffnen NICHT', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'identity');
  await setzeFeld(page, 'givenName', 'Maria');
  await setzeFeld(page, 'nationality', 'deutsch');   // schema-sensibel — startet zurückgehalten

  const oeffneDialog = () => page.evaluate(() => {
    window.__vdOeffentlich.flowExportUebersicht({ sektorId: 'identity', titel: 'Test', aufFortfahren: () => {} });
  });
  const zeileNationalitaet = () => page.locator('.export-zz[data-feld="nationality"]');

  // ── Erster Durchlauf: zurückgehalten, dann per Knopf freigegeben ──────────────────────
  await oeffneDialog();
  await page.click('#exp-zurueckhalten-weg');
  await expect(zeileNationalitaet()).toHaveClass(/export-zz-gehalten/);
  await zeileNationalitaet().locator('.export-zz-btn').click();
  await expect(zeileNationalitaet()).not.toHaveClass(/export-zz-gehalten/);
  await expect(zeileNationalitaet().locator('.export-zz-btn')).toHaveText('Zurückhalten');

  // Herausgeben — dieselbe Ephemer-Mechanik (`exportAuswahlEphemerAnwenden`) wie sonst.
  await page.click('#m-ok');
  await page.waitForTimeout(50);

  // ── Zweiter Durchlauf: derselbe Dialog, erneut geöffnet ────────────────────────────────
  await oeffneDialog();
  await page.click('#exp-zurueckhalten-weg');
  await expect(zeileNationalitaet()).toHaveClass(/export-zz-gehalten/,
    'ROT ERWARTET, wenn falsch: eine Freigabe aus dem VORIGEN Export darf hier nicht mehr stehen — ' +
    'sonst wäre die Ephemer-Zusage aus U2-ADR-024 §1 gebrochen, ohne dass eine Probe es bemerkt.');
  await expect(zeileNationalitaet().locator('.export-zz-btn')).toHaveText('Doch mitgeben');
});

test('ein Bereich, in dem alles schema-sensibel ist, zeigt den „nichts geht mit"-Hinweis, kein leerer Zustand', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'health');
  await page.selectOption('[data-edit="bloodType"]', { value: 'A+' });
  await page.evaluate(() => { window.__vdOeffentlich.bearbeitungSpeichern(); window.__vdOeffentlich.renderContent(); });
  await page.evaluate(() => {
    window.__vdOeffentlich.flowExportUebersicht({ sektorId: 'health', titel: 'Test', aufFortfahren: () => {} });
  });
  const modal = page.locator('#modal-inhalt');
  await expect(modal.locator('.export-geht-liste')).toHaveCount(0);
  await expect(modal).toContainText('geht nur mit, wenn Sie es unter');
  // Der Zurückhalten-Weg bleibt trotzdem erreichbar — "nichts geht mit" ist keine Sackgasse.
  await expect(modal.locator('#exp-zurueckhalten-weg')).toBeVisible();
});
