'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Journey (a), Durchklick-Abnahme 23.09.2026 (Auftrag): ein Empfängerkreis mit
   einem BEREICH als Baustein, Datei mit eigenem Passwort erzeugen, die Datei WIEDER ÖFFNEN.
   Gemessen wird, was der Empfänger sieht: der gewählte Bereich ist da, ein nicht gewählter
   (Gesundheit) NICHT — und das Anker-Passwort öffnet die Kreis-Datei nicht.
   Läuft gegen die Auslieferungs-Bytes (global-setup über tests/produkt-test-backen.js,
   Byte-Gleichheit in tests/e2e-artefakt-gleich-auslieferung.test.js).
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  KERN_URL_PRIVAT_DE, KERN_URL_PRIVAT_EN, oeffneApp, depotAnlegen, fsaStandardAttrappeEinrichten,
} = require('./helpers.js');

const ANKER_PW = 'anker-pw-journey-a-2026';
const FACH_PW = 'fach-pw-journey-a-2026';
const WOHNEN = 'JOURNEY-WOHNEN-ORT-4711';
const GESUNDHEIT = 'JOURNEY-KV-NUMMER-0815';

async function journey(page, browser, url) {
  test.setTimeout(180000);
  const fehler = [];
  page.on('pageerror', (e) => fehler.push('pageerror: ' + e.message));
  await fsaStandardAttrappeEinrichten(page);
  await oeffneApp(page, { url });
  await depotAnlegen(page, { pw: ANKER_PW });

  await page.evaluate(([w, g]) => {
    const V = window.__vdOeffentlich;
    // Ein ab Werk NICHT sensibles Wohnfeld: seit SENSIBEL-FILTER-BEREICHSBAUSTEIN hält ein Bereichs-Baustein sensible Felder
    // zurück (tests/empfaenger-sensibel-filter.test.js); vorher stand hier der Ablageort des Mietvertrags (sensibel).
    V.sektorFeldSetzen('housing', 'tenancyTerminationHandover', w);
    V.sektorFeldSetzen('health', 'insuranceNumber', g);
    V.bearbeitungSpeichern();
  }, [WOHNEN, GESUNDHEIT]);

  await page.evaluate(() => window.__vdOeffentlich.flowEinstellungen());
  const kreisNeu = page.locator('#einst-kreis-anlegen');
  await kreisNeu.scrollIntoViewIfNeeded().catch(() => {});
  if (!(await kreisNeu.isVisible().catch(() => false))) {
    await page.locator('#modal-inhalt details.einst-abschnitt:has(#einst-kreis-anlegen):not([open]) > summary').click();
  }
  await kreisNeu.click();
  await page.fill('#kreis-name', 'Journey Hausverwaltung');
  const wohnenBox = page.locator('[id="kreis-b-bereich:housing"]');
  await expect(wohnenBox, 'Baustein bereich:housing fehlt im Kreis-Dialog').toHaveCount(1);
  await wohnenBox.check();
  await expect(page.locator('[id="kreis-b-bereich:health"]')).not.toBeChecked();
  await page.click('#m-ok');

  const dl = page.waitForEvent('download', { timeout: 15000 });
  await page.locator('[data-kreis-datei]').first().click();
  await page.fill('#kreis-pw', FACH_PW);
  await page.fill('#kreis-pw2', FACH_PW);
  await page.click('#m-ok');
  const download = await dl;
  const datei = path.join(os.tmpdir(), 'journey-a-' + process.pid + '-' + Date.now() + '.vivodepot');
  fs.copyFileSync(await download.path(), datei);
  expect(fs.statSync(datei).size).toBeGreaterThan(200);

  // Empfänger: frische Seite, gleiche Auslieferungs-Bytes, NUR die Kreis-Datei.
  const kontext = await browser.newContext();   // frischer Speicher: der Empfänger hat nichts vom Anker
  const seite = await kontext.newPage();
  seite.on('pageerror', (e) => fehler.push('empfaenger-pageerror: ' + e.message));
  await fsaStandardAttrappeEinrichten(seite);
  await oeffneApp(seite, { url });

  await seite.click('#w-datei');
  await seite.setInputFiles('#co-datei', datei);
  await seite.fill('#co-pw', ANKER_PW);
  await seite.click('#w-oeffnen');
  await expect(seite.locator('#app.an'), 'das ANKER-Passwort darf die Kreis-Datei nicht öffnen').toHaveCount(0);

  await seite.fill('#co-pw', FACH_PW);
  await seite.click('#w-oeffnen');
  await seite.waitForSelector('#app.an', { state: 'attached', timeout: 20000 });
  const stand = await seite.evaluate(() => JSON.stringify(window.__vdOeffentlich.ankerDaten()));
  expect(stand, 'der gewählte Bereich (Wohnen) fehlt beim Empfänger').toContain(WOHNEN);
  expect(stand, 'ein NICHT gewählter Bereich (Gesundheit) ist beim Empfänger sichtbar — Leck').not.toContain(GESUNDHEIT);
  expect(fehler).toEqual([]);
  await kontext.close();
  fs.rmSync(datei, { force: true });
}

test('[Journey a·privat-de] Empfängerkreis mit Bereich Wohnen: Datei mit Fachpasswort, Empfänger sieht nur Wohnen', async ({ page, browser }) => { await journey(page, browser, KERN_URL_PRIVAT_DE); });
test('[Journey a·privat-en] Empfängerkreis mit Bereich Wohnen: Datei mit Fachpasswort, Empfänger sieht nur Wohnen', async ({ page, browser }) => { await journey(page, browser, KERN_URL_PRIVAT_EN); });
