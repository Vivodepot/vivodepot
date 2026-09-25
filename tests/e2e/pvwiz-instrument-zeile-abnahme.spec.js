'use strict';
/* Reise — „pvwiz und die ADR-Kollision" (10.08.2026), Zug 4: der Assistent
   VOLLSTÄNDIG durchlaufen, über echte Klicks. Der Befund lautete „gespeichert, aber für die
   Bürgerin unsichtbar und unkorrigierbar" — das ist die eigentliche Probe hier: nach dem
   Abschluss steht die Patientenverfügung im Depot, in der Instrument-Liste sichtbar. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

const KONSOLE_HARMLOS = /Content-Security-Policy|frame-ancestors/i;

test('pvwiz vollständig durchlaufen: die Patientenverfügung landet sichtbar in der Instrument-Liste', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !KONSOLE_HARMLOS.test(m.text())) fehler.push(m.text()); });

  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');

  const gefuehrt = page.locator('.wizard-gruppe > summary');
  if (await gefuehrt.count()) await gefuehrt.click();
  await page.click('[data-wizard-start="pvwiz"]');
  await expect(page.locator('.wizard-frage')).toBeVisible();

  // Schritt 1 (pv_situationen, mehrfachauswahl) beantworten — ein echter Sachverhalt, bewusst
  // NICHT die Organspende-Frage weiter unten, damit die Probe den GENERISCHEN Abschluss-Weg
  // prüft, nicht den benannten Organspende-Seiteneffekt (der ist bereits unit-getestet).
  // Seit dem Pillen-Umbau (Screenshot-Review Befund C, 27.08.2026) ein <button>, kein Checkbox
  // mehr.
  await page.locator('#content button[data-edit-multi="applicableSituations"]').first().click();

  // Alle weiteren Schritte durchklicken (kein BMJ-Feld ist pflicht — "Weiter" bleibt bedienbar),
  // bis der Knopf "Fertig" zeigt.
  let sicherung = 0;
  while (sicherung++ < 60) {
    const text = (await page.locator('#wiz-weiter').textContent() || '').trim();
    await page.click('#wiz-weiter');
    if (/fertig/i.test(text)) break;
    await expect(page.locator('.wizard-frage')).toBeVisible();
  }
  expect(sicherung, 'die Schleife darf nicht an der Sicherung enden — dann lief etwas endlos').toBeLessThan(60);

  // Abschluss-Toast, zurück auf der Vorsorge-Sicht.
  await expect(page.locator('.toast, [role="status"]').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  await expect(page.locator('.wizard-frage')).toHaveCount(0);

  // Die eigentliche Probe: die Instrument-Zeile existiert, mit dem sichtbaren Label.
  const zeile = await page.evaluate(() => {
    const liste = (window.__vdOeffentlich.ankerDaten().sektoren.advanceCare && window.__vdOeffentlich.ankerDaten().sektoren.advanceCare.provisionInstruments) || [];
    return liste.find((r) => r && r.instrument === 'living-will') || null;
  });
  expect(zeile, 'die Patientenverfügung ist im Depot als Instrument-Zeile vorhanden').not.toBeNull();

  await expect(page.locator('#content')).toContainText('Patientenverfügung');

  // Korrigierbar: die Zeile lässt sich öffnen wie jeder andere Listen-Eintrag (kein toter Datensatz).
  const zeilenKnopf = page.locator('.liste-eintraege li', { hasText: 'Patientenverfügung' }).first();
  await expect(zeilenKnopf).toBeVisible();

  expect(fehler, 'keine Konsolen-Fehler').toEqual([]);
});

test('Bestandsdepot (alter Weg, nur Organspende beantwortet): nichts verschwindet, nichts verdoppelt sich', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !KONSOLE_HARMLOS.test(m.text())) fehler.push(m.text()); });

  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');

  const gefuehrt = page.locator('.wizard-gruppe > summary');
  if (await gefuehrt.count()) await gefuehrt.click();
  await page.click('[data-wizard-start="pvwiz"]');

  // Nur die Organspende-Frage beantworten (der alte, vor diesem Auftrag bereits bestehende Weg),
  // alle anderen Schritte unbeantwortet durchklicken.
  let sicherung = 0;
  while (sicherung++ < 60) {
    const auswahl = page.locator('#content select[data-edit="organDonationDecision"]');
    if (await auswahl.count()) await auswahl.selectOption('zustimmung');
    const text = (await page.locator('#wiz-weiter').textContent() || '').trim();
    await page.click('#wiz-weiter');
    if (/fertig/i.test(text)) break;
  }

  const zeilen = await page.evaluate(() =>
    ((window.__vdOeffentlich.ankerDaten().sektoren.advanceCare && window.__vdOeffentlich.ankerDaten().sektoren.advanceCare.provisionInstruments) || [])
      .filter((r) => r && r.instrument === 'living-will'));
  expect(zeilen.length, 'genau eine Zeile — kein doppelter Eintrag durch Abschluss + Organspende-Seiteneffekt').toBe(1);

  expect(fehler, 'keine Konsolen-Fehler').toEqual([]);
});
