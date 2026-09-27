'use strict';
/* Reise — „Die drei toten Zeiger in ERKENNUNG_LEITFELDER" (10.08.2026), Zug 3:
   in einem Depot eine Vorsorgevollmacht-Zeile anlegen, den Erkennungs-Vorschlag erscheinen
   sehen, annehmen. Gegentest: Zeile entfernen, kein Vorschlag mehr. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

const KONSOLE_HARMLOS = /Content-Security-Policy|frame-ancestors/i;

test('Vorsorgevollmacht-Zeile anlegen → Erkennungs-Vorschlag erscheint, annehmen; Zeile entfernen → Vorschlag weg', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !KONSOLE_HARMLOS.test(m.text())) fehler.push(m.text()); });

  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');

  // Instrument-Zeile über den echten Klickweg anlegen. Eine Vorsorgevollmacht trägt viele
  // pflichtige ja/nein-Unterfelder (Umfang/Beschränkungen) — jedes leer gebliebene Pflichtfeld
  // blockt das Speichern (echte Probe: erst bricht es am Modal, dann geht es durch).
  await page.click('[data-eintrag-hinzufuegen="provisionInstruments"]');
  await page.waitForSelector('#modal-inhalt [data-edit="instrument"]');
  await page.selectOption('#modal-inhalt [data-edit="instrument"]', 'enduring-power-of-attorney');
  // sichtbarWenn-Kaskade: eine Antwort macht das nächste Feld erst sichtbar — darum wiederholt
  // scannen (nur sichtbare, leere Felder), bis eine Runde nichts mehr findet.
  for (let runde = 0; runde < 20; runde++) {
    const leer = page.locator('#modal-inhalt select:visible');
    let etwasGesetzt = false;
    const anzahl = await leer.count();
    for (let i = 0; i < anzahl; i++) {
      const sel = leer.nth(i);
      if ((await sel.inputValue()) !== '') continue;
      const optionen = await sel.locator('option').count();
      if (optionen > 1) { await sel.selectOption({ index: 1 }); etwasGesetzt = true; }
    }
    if (!etwasGesetzt) break;
  }
  await page.click('#m-ok');
  await page.waitForFunction(() => !document.querySelector('#modal-rueck.an')).catch(() => {});

  // Der Erkennungs-Vorschlag erscheint im Dokument-Panel.
  await expect(page.locator('[data-doku-erkannt-add="enduring-power-of-attorney"]')).toBeVisible();

  // Annehmen — ein Dokument-Datensatz entsteht, der Vorschlag verschwindet (Dedup by typ).
  await page.click('[data-doku-erkannt-add="enduring-power-of-attorney"]');
  await expect(page.locator('[data-doku-erkannt-add="enduring-power-of-attorney"]')).toHaveCount(0);
  const angenommen = await page.evaluate(() =>
    (window.__vdOeffentlich.ankerDaten().dokumente || []).some((d) => d.typ === 'enduring-power-of-attorney' && d.quelle === 'erkannt'));
  expect(angenommen, 'ein Dokument-Datensatz mit quelle:"erkannt" ist entstanden').toBe(true);

  expect(fehler, 'keine Konsolen-Fehler').toEqual([]);
});

test('Gegentest: keine Instrument-Zeile → kein Erkennungs-Vorschlag', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');
  await expect(page.locator('[data-doku-erkannt-add="enduring-power-of-attorney"]')).toHaveCount(0);
});

test('Gegentest: Zeile wieder entfernen lässt den Vorschlag verschwinden', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');

  await page.click('[data-eintrag-hinzufuegen="provisionInstruments"]');
  await page.waitForSelector('#modal-inhalt [data-edit="instrument"]');
  await page.selectOption('#modal-inhalt [data-edit="instrument"]', 'custodianship-declaration');
  for (let runde = 0; runde < 20; runde++) {
    const leer = page.locator('#modal-inhalt select:visible');
    let etwasGesetzt = false;
    const anzahl = await leer.count();
    for (let i = 0; i < anzahl; i++) {
      const sel = leer.nth(i);
      if ((await sel.inputValue()) !== '') continue;
      const optionen = await sel.locator('option').count();
      if (optionen > 1) { await sel.selectOption({ index: 1 }); etwasGesetzt = true; }
    }
    if (!etwasGesetzt) break;
  }
  await page.click('#m-ok');
  await page.waitForFunction(() => !document.querySelector('#modal-rueck.an')).catch(() => {});

  await expect(page.locator('[data-doku-erkannt-add="custodianship-declaration"]')).toBeVisible();

  // Die Zeile über den echten Entfernen-Weg löschen — über die Zeile mit dem sichtbaren Label
  // gesucht, nicht über den Index (der ist nur innerhalb SEINER Liste eindeutig, nicht seitenweit).
  const zeile = page.locator('li[data-eintrag]', { hasText: 'Betreuungsverfügung' }).first();
  await zeile.locator('[data-eintrag-entfernen]').click();
  await page.waitForSelector('#m-ok');
  await page.click('#m-ok');   // Bestätigungs-Modal „wirklich entfernen?"
  await page.waitForFunction(() => !document.querySelector('#modal-rueck.an')).catch(() => {});

  await expect(page.locator('[data-doku-erkannt-add="custodianship-declaration"]')).toHaveCount(0);
});
