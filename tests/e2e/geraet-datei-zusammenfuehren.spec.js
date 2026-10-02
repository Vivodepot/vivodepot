'use strict';
/* Gerät und Datei zusammenführen (U2-ADR-463, Ablage ohne Netz, Teil 2) — zwei Geräte, eine Datei.
   Gerät A legt das Depot an und gibt die Datei weiter. Gerät B (ein eigener Browser-Kontext, eigener Gerätespeicher)
   ändert in ihr die Straße; Gerät A ändert in seinem Stand das Telefon. Öffnet A nun die Datei von B, fragt der
   Konflikt-Dialog — „Beide zusammenführen" übernimmt beide Änderungen, ohne Rückfrage, weil jede nur auf einer Seite
   geschah. Die Logik je Fall (Listen, Register, Geister-Eintrag, entfernt gegen geändert) prüft
   tests/fassungen-eintraege-zusammenfuehren.test.js. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, setzeFeld } = require('./helpers');

const PW = 'zusammen-pw-463';

async function fsaAttrappe(page) {
  await page.evaluate(() => {
    window.__zusammenBytes = null;
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({
        name: 'zusammen.vivodepot',
        createWritable: async () => {
          let stueck = '';
          return {
            write: async (c) => { stueck += typeof c === 'string' ? c : (c && typeof c.text === 'function' ? await c.text() : ''); },
            close: async () => { window.__zusammenBytes = stueck; },
          };
        },
      }),
    });
  });
}
async function schliessenUndBytes(page) {
  await page.click('#tb-marke');
  const ok = page.locator('#m-ok');
  if (await ok.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)) await ok.click();
  await page.waitForSelector('#w-anlass', { state: 'visible', timeout: 10000 });
  const bytes = await page.evaluate(() => window.__zusammenBytes);
  expect(bytes).toBeTruthy();
  return bytes;
}
function alsDatei(bytes, name) {
  const p = path.join(os.tmpdir(), name + '-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.vivodepot');
  fs.writeFileSync(p, bytes, 'utf8');
  return p;
}
async function oeffnen(page, datei) {
  await page.click('#w-datei');
  await page.setInputFiles('#co-datei', datei);
  await page.fill('#co-pw', PW);
  await page.click('#w-oeffnen');
}

test('[Zusammenführen] zwei Geräte ändern verschiedene Felder derselben Datei — beide Änderungen bleiben', async ({ browser }) => {
  const dateien = [];
  const ctxA = await browser.newContext(), ctxB = await browser.newContext();
  try {
    const a = await ctxA.newPage();
    await oeffneApp(a);
    await fsaAttrappe(a);
    await depotAnlegen(a, { name: 'Anna Zusammen', pw: PW });
    await oeffneSektor(a, 'identity');
    await setzeFeld(a, 'street', 'Rosenweg 1');
    const gemeinsam = alsDatei(await schliessenUndBytes(a), 'zusammen-gemeinsam');
    dateien.push(gemeinsam);

    // Gerät B: dieselbe Datei, die Straße geändert.
    const b = await ctxB.newPage();
    await oeffneApp(b);
    await fsaAttrappe(b);
    await oeffnen(b, gemeinsam);
    await b.waitForSelector('#app.an', { state: 'attached', timeout: 10000 });
    await oeffneSektor(b, 'identity');
    await setzeFeld(b, 'street', 'Lindenallee 2');
    const vonB = alsDatei(await schliessenUndBytes(b), 'zusammen-von-b');
    dateien.push(vonB);

    // Gerät A: sein eigener Stand, das Telefon geändert.
    await oeffnen(a, gemeinsam);
    await a.waitForSelector('#app.an', { state: 'attached', timeout: 10000 });
    await oeffneSektor(a, 'identity');
    await setzeFeld(a, 'telephone', '0301 4630000');
    await schliessenUndBytes(a);

    // A öffnet die Datei von B: der Konflikt-Dialog bietet den dritten Weg.
    await oeffnen(a, vonB);
    const zusammen = a.locator('#m-dritt');
    await expect(zusammen).toBeVisible({ timeout: 10000 });
    await zusammen.click();
    await a.waitForSelector('#app.an', { state: 'attached', timeout: 10000 });
    await oeffneSektor(a, 'identity');
    await expect(a.locator('[data-edit="street"]')).toHaveValue('Lindenallee 2');
    await expect(a.locator('[data-edit="telephone"]')).toHaveValue('0301 4630000');
  } finally {
    await ctxA.close(); await ctxB.close();
    for (const d of dateien) fs.rmSync(d, { force: true });
  }
});
