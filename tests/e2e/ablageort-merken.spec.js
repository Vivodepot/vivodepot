'use strict';
/* Den Speicherort merken (U2-ADR-031, Nachtrag 01.10.2026; U2-ADR-463 Teil 3).
   Der Dateidialog liefert hier einen ECHTEN FileSystemFileHandle aus dem privaten Dateisystem des Browsers (OPFS) —
   nur ein echter Handle lässt sich in IndexedDB ablegen, eine Attrappe nicht. Geprüft wird der ganze Weg:
   ohne Zustimmung wird nichts gemerkt; mit dem Knopf im Hinweis ja; nach einem Neustart öffnet ein Knopf auf dem
   Gerätespeicher die nächste Sicherungskopie ohne Dateidialog in dieselbe Datei, und der Startschirm bietet die
   Datei mit einem Knopf an; in den Einstellungen steht der Ort und lässt sich mit einem Klick vergessen.
   Über http://localhost, denn unter file:// gibt es kein OPFS. */
const { test, expect } = require('@playwright/test');
const { depotAnlegen, einstellungenAbschnittOeffnen, starteLokalenServer } = require('./helpers');

const PW = 'ablageort-pw-463';
const NAME = 'ablage-probe.vivodepot';

async function opfsPicker(page) {
  await page.evaluate((name) => {
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => (await navigator.storage.getDirectory()).getFileHandle(name, { create: true }),
    });
  }, NAME);
}
const gemerkte = (page) => page.evaluate(() => new Promise((ok) => {
  const r = indexedDB.open('vivodepot-ablageort', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('orte');
  r.onsuccess = () => { const q = r.result.transaction('orte').objectStore('orte').getAll(); q.onsuccess = () => { ok(q.result.map((e) => e.name)); r.result.close(); }; };
}));

test('[Ablageort] merken nur mit Zustimmung, nach dem Neustart ohne Dateidialog sichern und mit einem Klick öffnen, in den Einstellungen vergessen', async ({ page }) => {
  const srv = await starteLokalenServer();
  const url = `http://localhost:${srv.address().port}/vivodepot.html`;
  try {
    await page.goto(url);
    await page.waitForSelector('#w-anlass', { state: 'visible' });
    await opfsPicker(page);
    await depotAnlegen(page, { name: 'Anna Ablage', pw: PW });

    // Die erste Sicherungskopie geht in eine neue Datei; danach bietet ein Hinweis das Merken an — gemerkt ist noch nichts.
    await page.click('#tb-depot-pille');
    await page.waitForSelector('#tb-depot-menue', { state: 'visible' });
    await page.click('#tb-depot-menue-sicherungskopie');
    // Der Hinweis wartet, bis der Dialog nach der ersten Sicherung geschlossen ist.
    const verstanden = page.locator('#m-ok');
    if (await verstanden.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) await verstanden.click();
    const merken = page.locator('.toast-tipp-btn');
    await expect(merken).toBeVisible({ timeout: 10000 });
    expect(await gemerkte(page)).toEqual([]);
    await merken.click();
    await expect.poll(() => gemerkte(page)).toEqual([NAME]);

    // Neustart, Gerätespeicher: entsperren — die nächste Sicherungskopie geht ohne Dateidialog in dieselbe Datei.
    await page.goto(url);
    await page.fill('#co-pw', PW);
    await page.click('#w-oeffnen');
    await page.waitForSelector('#app.an', { state: 'attached', timeout: 10000 });
    await page.evaluate(() => {
      window.__pickerAufrufe = 0;
      Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: async () => { window.__pickerAufrufe++; throw new DOMException('kein Dialog erwartet', 'AbortError'); } });
    });
    const vorher = await page.evaluate(async (n) => (await (await (await navigator.storage.getDirectory()).getFileHandle(n)).getFile()).lastModified, NAME);
    await page.waitForTimeout(20);
    await page.click('#tb-depot-pille');
    await page.waitForSelector('#tb-depot-menue', { state: 'visible' });
    await page.click('#tb-depot-menue-sicherungskopie');
    await expect.poll(() => page.evaluate(async (n) => (await (await (await navigator.storage.getDirectory()).getFileHandle(n)).getFile()).lastModified, NAME)).toBeGreaterThan(vorher);
    expect(await page.evaluate(() => window.__pickerAufrufe)).toBe(0);

    // Neustart ohne Gerätespeicher-Weg: der Startschirm bietet die Datei an.
    await page.goto(url);
    await page.click('#co-neu');
    const oeffnen = page.locator('#w-ablageorte [data-ablageort]');
    await expect(oeffnen).toHaveCount(1, { timeout: 10000 });
    await expect(oeffnen).toContainText(NAME);
    await oeffnen.click();
    await expect(page.locator('.crypto-datei-name')).toContainText(NAME);
    await page.fill('#co-pw', PW);
    await page.click('#w-oeffnen');
    const konfliktDatei = page.locator('#m-zweit');
    if (await konfliktDatei.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) await konfliktDatei.click();
    await page.waitForSelector('#app.an', { state: 'attached', timeout: 10000 });

    // Einstellungen: der Ort steht da und lässt sich vergessen.
    await page.locator('#tb-einstellungen').click();
    await expect(page.locator('#einst-ablageort-vergessen')).toBeAttached({ timeout: 10000 });
    await einstellungenAbschnittOeffnen(page, '#einst-ablageort');
    await expect(page.locator('#einst-ablageort')).toContainText(NAME);
    await page.locator('#einst-ablageort-vergessen').click();
    await expect.poll(() => gemerkte(page)).toEqual([]);
  } finally {
    srv.close();
  }
});
