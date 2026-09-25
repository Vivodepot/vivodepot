'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „Das Datei-Signal" (10.08.2026), Zug 3 — die Firefox-Abnahme.
   Firefox hat KEIN File System Access API — genau der Weg, auf dem die
   Kopfzeile bisher fälschlich „nicht aktuell" zeigte (S1-Befund). KEIN
   FSA-Mock hier (anders als tests/e2e/helpers.js oeffneApp), sonst würde
   der zu prüfende Weg verdeckt — dieselbe Bauart wie
   tests/e2e-firefox/zug7-firefox-abnahme.spec.js.
   ════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { test, expect } = require('@playwright/test');
const { depotAnlegen } = require('../e2e/helpers');

const { KERN_URL } = require('../e2e/helpers');   // das gebackene Produkt, nicht das Gerüst der rohen Datei
const PW = 's1-firefox-abnahme-852';

async function oeffneAppOhneFsa(page) {
  await page.goto(KERN_URL);
  await page.waitForSelector('#w-anlass', { state: 'visible' });
}

async function klasse(page) {
  return page.locator('.tb-save-status').getAttribute('class');
}

/* Der heutige Weg (Gerätespeicher + „Sicherungskopie erstellen“, U2-ADR-237): frisch angelegt liegt das Depot im Gerätespeicher —
   die Kopfzeile sagt „Auf diesem Gerät aktuell“, es gibt keinen Download. Die Sicherungskopie ist in Firefox (kein FSA) ein
   echter Download; ob die Datei ankam, kann Vivodepot nicht wissen — die Kopfzeile bleibt ehrlich UNBESTÄTIGT, bis die Bürgerin
   es bestätigt. Sie sagt weder „gespeichert“ noch die alte, falsche Aussage „keine Datei“. */
async function sicherungskopieHerunterladen(page) {
  await page.click('#tb-depot-pille');
  await page.waitForSelector('#tb-depot-menue-sicherungskopie', { state: 'visible' });
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#tb-depot-menue-sicherungskopie')]);
  return download;
}

test('[S1·Firefox] frisch angelegt: Gerätespeicher, kein Download — nach der Sicherungskopie ehrlich unbestätigt', async ({ page }) => {
  await oeffneAppOhneFsa(page);
  const hatPicker = await page.evaluate(() => 'showSaveFilePicker' in window);
  expect(hatPicker, 'Firefox hat File System Access nicht — sonst testet dieser Lauf den falschen Weg').toBe(false);
  const downloads = [];
  page.on('download', (d) => downloads.push(d.suggestedFilename()));

  await depotAnlegen(page, { pw: PW });
  await expect(page.locator('.tb-save-status')).toHaveClass(/ist-gespeichert/);
  await expect(page.locator('.tb-save-status')).toContainText('Auf diesem Gerät');
  expect(downloads, 'das Anlegen lädt nichts herunter — das Depot liegt im Gerätespeicher').toEqual([]);

  const download = await sicherungskopieHerunterladen(page);
  expect(download.suggestedFilename(), 'die Sicherungskopie ist eine .vivodepot-Datei').toMatch(/\.vivodepot$/);
  const k = await klasse(page);
  expect(k, 'ob die Datei angekommen ist, weiß Vivodepot nicht — unbestätigt').toMatch(/ist-unbestaetigt/);
  expect(k).not.toMatch(/ist-gespeichert/);
  expect(k).not.toMatch(/ist-keine-datei/);
});

test('[S1·Firefox] Sicherungskopie in frischem Kontext geöffnet: Signal steht sofort, ohne jede Eingabe', async ({ browser }, testInfo) => {
  const ctxA = await browser.newContext({ acceptDownloads: true });
  const a = await ctxA.newPage();
  await a.goto(KERN_URL);
  await a.waitForSelector('#w-anlass', { state: 'visible' });
  await depotAnlegen(a, { pw: PW });
  const download = await sicherungskopieHerunterladen(a);
  const tmpPfad = path.join(os.tmpdir(), 's1-firefox-open-' + testInfo.workerIndex + '.vivodepot');
  await download.saveAs(tmpPfad);
  expect(fs.existsSync(tmpPfad), 'die heruntergeladene Datei muss real auf der Platte liegen').toBe(true);
  await ctxA.close();

  // Frischer Kontext (der Gerätespeicher des ersten ist weg): über den echten Datei-Input öffnen.
  const ctxB = await browser.newContext();
  const page = await ctxB.newPage();
  await page.goto(KERN_URL);
  await page.waitForSelector('#w-anlass', { state: 'visible' });
  await page.click('#w-datei');
  await page.waitForSelector('#co-pw', { state: 'visible' });
  await page.setInputFiles('#co-datei', tmpPfad);
  await page.fill('#co-pw', PW);
  await page.click('#w-oeffnen');
  await page.waitForSelector('#app.an', { state: 'attached' });

  await expect(page.locator('.tb-save-status')).toHaveClass(/ist-gespeichert/);
  await expect(page.locator('.tb-save-status')).toContainText('Sicherungsdatei');
  expect(await klasse(page)).not.toMatch(/ist-keine-datei/);

  fs.rmSync(tmpPfad, { force: true });
  await ctxB.close();
});
