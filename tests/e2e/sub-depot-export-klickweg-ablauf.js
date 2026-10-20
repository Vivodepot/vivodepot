'use strict';
/* Ablauf der Probe „Sub-Depot als verschlüsselte Datei exportieren, über den echten Klickweg“ — gemeinsam für
   tests/e2e/sub-depot-export-klickweg.spec.js (Chromium, Suite) und tests/e2e-drei-browser/sub-depot-export-klickweg.spec.js
   (Chromium, Firefox, WebKit). Herleitung im Kopf der Spec unter tests/e2e. */
const fs = require('node:fs');
const path = require('node:path');
const { expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

const ANKER_PW = 'export-klickweg-anker-482';
const SUB_PW = 'export-klickweg-sub-917';
const SUB_VORNAME = 'Klara';

function konsoleMitschneiden(page, testInfo) {
  const zeilen = [];
  page.on('console', (m) => zeilen.push('[' + m.type() + '] ' + m.text()));
  page.on('pageerror', (e) => zeilen.push('[pageerror] ' + (e && e.stack ? e.stack : String(e))));
  return {
    zeilen,
    schreiben() { fs.writeFileSync(testInfo.outputPath('konsole.txt'), zeilen.join('\n') + '\n', 'utf8'); },
  };
}

/** Kein Datei-Dialog des Systems: die Anwendung gibt die Datei über das Herunterladen aus. */
async function ohneDateiDialog(page) {
  await page.addInitScript(() => {
    try { Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: undefined }); } catch (_) {}
  });
}

async function zurVerwaltung(page) {
  await page.click('#tb-depot-pille');
  await page.waitForSelector('#tb-depot-menue-verwaltung', { state: 'visible' });
  await page.click('#tb-depot-menue-verwaltung');
}

async function subDepotAnlegen(page) {
  await zurVerwaltung(page);
  await page.waitForSelector('#sub-neu', { state: 'visible' });
  await page.click('#sub-neu');
  await page.waitForSelector('#id-vorname', { state: 'visible' });
  await page.fill('#id-vorname', SUB_VORNAME);
  await page.fill('#id-pw', SUB_PW);
  await page.fill('#id-pw2', SUB_PW);
  await page.click('#m-ok');
  await page.waitForSelector('#id-vorname', { state: 'detached' });
  const karte = page.locator('[data-blackbox]').last();
  await karte.waitFor({ state: 'visible' });
  return karte.getAttribute('data-blackbox');
}

async function subDepotBetreten(page, uuid) {
  await page.click(`[data-entsiegeln="${uuid}"]`);
  await page.waitForSelector('#sub-auf', { state: 'visible' });
  await page.fill('#sub-auf', SUB_PW);
  await page.click('#m-ok');
  await page.waitForSelector('#sub-auf', { state: 'detached' });
  await page.click(`[data-betreten="${uuid}"]`);
  await page.waitForSelector('#app.modus-vollmacht', { state: 'attached' });
}

/** Der Klickweg: Karte → Dialog → Primärknopf → Datei. Liefert den Pfad der heruntergeladenen Datei. */
async function exportierenUeberKlickweg(page, uuid, testInfo) {
  await page.click(`[data-blackbox="${uuid}"]`);
  await page.waitForSelector('#m-ok', { state: 'visible' });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15_000 }),
    page.click('#m-ok'),
  ]);
  const ziel = testInfo.outputPath('sub-depot-export.json');   // im Ausgabeordner des Tests, den Playwright selbst verwaltet
  await download.saveAs(ziel);
  return ziel;
}

async function wiederOeffnen(page, datei) {
  await page.addInitScript(() => {
    try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {}
  });
  await page.reload();
  await page.waitForSelector('#w-anlegen', { state: 'visible' });
  await page.click('#w-datei');
  await page.setInputFiles('#co-datei', datei);
  await page.fill('#co-pw', SUB_PW);
  await page.click('#w-oeffnen');
  // Der Vorname des Sub-Depots steht nur in den Klartext-Angaben der Karte, nicht im verschlüsselten Inhalt; geprüft wird
  // darum, dass die Datei mit dem Passwort des Sub-Depots zu einer laufenden Anwendung öffnet.
  await page.waitForSelector('#app.an', { state: 'attached', timeout: 15_000 });
}

async function durchspielen(page, testInfo, { nachBetreten }) {
  const konsole = konsoleMitschneiden(page, testInfo);
  let datei = null;
  try {
    await ohneDateiDialog(page);
    await oeffneApp(page);
    await depotAnlegen(page, { pw: ANKER_PW });
    const uuid = await subDepotAnlegen(page);
    if (nachBetreten) { await subDepotBetreten(page, uuid); await zurVerwaltung(page); await page.locator(`[data-blackbox="${uuid}"]`).waitFor(); }

    // Gezählt wird ab dem Klick auf den Export: Meldungen beim Laden der Seite (etwa der Hinweis des Browsers zu
    // frame-ancestors im meta-Element) gehören nicht zu diesem Weg.
    const abExport = konsole.zeilen.length;
    datei = await exportierenUeberKlickweg(page, uuid, testInfo);
    const inhalt = JSON.parse(fs.readFileSync(datei, 'utf8'));
    expect(inhalt.dateiTyp, 'die Datei ist keine Übergabe-Datei').toBe('vivodepot-blackbox-export');
    expect(inhalt.umschlag && inhalt.umschlag.depotUUID, 'die Datei trägt ein anderes Depot').toBe(uuid);
    expect(konsole.zeilen.slice(abExport).filter((z) => z.startsWith('[pageerror]') || z.startsWith('[error]')),
      'beim Export gab es einen Fehler in der Seite').toEqual([]);

    const abOeffnen = konsole.zeilen.length;
    await wiederOeffnen(page, datei);
    expect(konsole.zeilen.slice(abOeffnen).filter((z) => z.startsWith('[pageerror]') || (z.startsWith('[error]') && !/frame-ancestors/.test(z))),
      'beim Wiederöffnen gab es einen Fehler in der Seite').toEqual([]);
  } finally {
    konsole.schreiben();
  }
}

module.exports = { durchspielen };
