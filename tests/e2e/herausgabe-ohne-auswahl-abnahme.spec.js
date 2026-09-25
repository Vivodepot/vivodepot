'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Herausgabe ohne Auswahl" (13.08.2026), Zug 4 — Browser-Abnahme am GEFÜLLTEN
   Depot. Nicht der Dialog ist der Nachweis, sondern die erzeugte DATEI (Download abgefangen,
   Bytes gelesen, Feld nachweislich abwesend/anwesend).
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, setzeFeld } = require('./helpers');

const ARTIFACTS = path.join(__dirname, '.artifacts');
if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });

test('vcard-identitaet: unverändert korrekt — Auswahl greift, wie vor diesem Auftrag schon', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'identity');
  await setzeFeld(page, 'givenName', 'Maria');
  await setzeFeld(page, 'familyName', 'Mustermann');
  await setzeFeld(page, 'telephone', '0891234567');

  await page.evaluate(() => window.__vdOeffentlich.flowFormatExport('vcard-identitaet'));
  const modal = page.locator('#modal-inhalt');
  await expect(modal.locator('li[data-feld="telephone"]')).toBeVisible();
  await page.screenshot({ path: path.join(ARTIFACTS, 'herausgabe-vcard-identitaet-dialog.png'), fullPage: true });

  await page.click('#exp-zurueckhalten-weg');
  await page.locator('.export-zz[data-feld="telephone"] .export-zz-btn').click();   // Telefon zurückhalten

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#m-ok'),
  ]);
  const inhalt = fs.readFileSync(await download.path(), 'utf8');
  expect(inhalt).toContain('FN:Maria Mustermann');
  expect(inhalt).not.toContain('0891234567');   // Nachweis: die Datei, nicht der Dialog
});

test('vcard-menschen: VORHER — Dialog behauptete eine Auswahl, die den Erzeuger nie erreichte', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.evaluate(() => window.__vdOeffentlich.personHinzufuegen({ name: 'Peter Nachbar', tel: '0891112233', beziehung: 'Nachbar' }));

  // Die alte Verdrahtung (flowExportUebersicht direkt, wie flowFormatExport es vor Zug 1 tat) —
  // derselbe Dialog-Code, unverändert, zeigt weiterhin dieselbe Irreführung: „nichts hinterlegt",
  // obwohl echte Kontaktdaten existieren. Das IST der Vorher-Zustand, nicht nachgestellt.
  await page.evaluate(() => {
    window.__vdOeffentlich.flowExportUebersicht({ sektorId: 'people', titel: 'Meine Menschen als Kontaktkarten', aufFortfahren: () => {} });
  });
  const modal = page.locator('#modal-inhalt');
  await expect(modal).toContainText('In diesem Bereich ist nichts hinterlegt');
  await page.screenshot({ path: path.join(ARTIFACTS, 'herausgabe-vcard-menschen-vorher-irrefuehrend.png'), fullPage: true });
  await page.click('#m-abbr');
});

test('vcard-menschen: NACHHER — Dialog wird übersprungen, Download läuft ehrlich direkt', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.evaluate(() => window.__vdOeffentlich.personHinzufuegen({ name: 'Peter Nachbar', tel: '0891112233', beziehung: 'Nachbar' }));

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.evaluate(() => window.__vdOeffentlich.flowFormatExport('vcard-menschen')),
  ]);
  // U2-ADR-120: NACH jedem erfolgreichen Download öffnet sich unabhängig davon der
  // Übergabe-Protokoll-Nachtrag („Wem haben Sie das gegeben?") — das ist die bestehende,
  // von diesem Auftrag unberührte Zusage. Der Nachweis hier gilt allein der AUSWAHL-Dialog-
  // Anzeige (data-feld-Zeilen aus flowExportUebersicht), die jetzt NICHT mehr dazwischentritt.
  const nachModal = await page.locator('#modal-inhalt').innerHTML();
  expect(nachModal).not.toContain('data-feld=');

  const inhalt = fs.readFileSync(await download.path(), 'utf8');
  expect(inhalt).toContain('FN:Peter Nachbar');
  await page.screenshot({ path: path.join(ARTIFACTS, 'herausgabe-vcard-menschen-nachher-direktdownload.png'), fullPage: true });
});

test('ics-vorsorge: VORHER — Dialog behauptete eine Auswahl (Sektor vorsorge), die icsKalender() nie liest', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.evaluate(() => {
    window.__vdOeffentlich.flowExportUebersicht({ sektorId: 'advanceCare', titel: 'Termine für den Kalender', aufFortfahren: () => {} });
  });
  const modal = page.locator('#modal-inhalt');
  await expect(modal).toContainText('In diesem Bereich ist nichts hinterlegt');
  await page.screenshot({ path: path.join(ARTIFACTS, 'herausgabe-ics-vorsorge-vorher-irrefuehrend.png'), fullPage: true });
  await page.click('#m-abbr');
});

test('ics-vorsorge: NACHHER — Dialog wird übersprungen, Download läuft ehrlich direkt', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.evaluate(() => window.__vdOeffentlich.flowFormatExport('ics-vorsorge')),
  ]);
  const nachModal = await page.locator('#modal-inhalt').innerHTML();
  expect(nachModal).not.toContain('data-feld=');
  const inhalt = fs.readFileSync(await download.path(), 'utf8');
  expect(inhalt).toContain('BEGIN:VCALENDAR');
  await page.screenshot({ path: path.join(ARTIFACTS, 'herausgabe-ics-vorsorge-nachher-direktdownload.png'), fullPage: true });
});

// U2-ADR-NNN (17.09.2026): der offene JSON-Vollexport ("json"-Format) ist entfernt — eine
// unverschlüsselte Volldatei war von einer Weitergabe nicht zu unterscheiden. Der hier geprüfte
// Sensibel-Opt-in für menschen/institutionen/bevollmaechtigte gilt für `vollExportJSON()`
// unverändert weiter (die Funktion bleibt internes Meßinstrument, s.
// tests/u2-adr-102-vollexport-weitergabe-filtert.test.js), nur ohne Oberflächen-Weg mehr dorthin
// — die Zusicherung ist darum auf Funktionsebene geprüft, nicht mehr über einen echten Download:
// tests/vollexport-ueber-sektoren-hinaus.test.js ("menschen/institutionen/bevollmaechtigte/…
// werden unter !sensibel zurückgehalten", dieselbe Persona "Peter Nachbar").
