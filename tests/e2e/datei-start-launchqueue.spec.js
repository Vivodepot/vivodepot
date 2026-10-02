'use strict';
/* Doppelklick öffnet die Datei (U2-ADR-463): der Weg NACH dem Doppelklick. Den Doppelklick selbst kann die Testumgebung
   nicht auslösen — der Browser reicht die Datei über window.launchQueue an die installierte App. Hier steht eine
   launchQueue-Attrappe, die genau das tut, was Chromium tut: setConsumer bekommt { files: [FileSystemFileHandle] }.
   Probe der Anmeldung im Manifest: tests/datei-start-manifest.test.js. */
const { test, expect } = require('@playwright/test');
const { KERN_URL } = require('./helpers');

test('[Datei-Start] eine über launchQueue übergebene Sicherungsdatei steht im Öffnen-Schirm', async ({ page }) => {
  // Chromium bringt launchQueue nativ mit (eine Zuweisung an window.launchQueue bliebe wirkungslos): die Attrappe hängt
  // an der nativen Methode, sonst als Ersatzobjekt.
  await page.addInitScript(() => {
    const fang = (fn) => { window.__launchConsumer = fn; };
    if (window.LaunchQueue && window.LaunchQueue.prototype) window.LaunchQueue.prototype.setConsumer = fang;
    else Object.defineProperty(window, 'launchQueue', { value: { setConsumer: fang }, configurable: true });
  });
  await page.goto(KERN_URL);
  await page.waitForFunction(() => typeof window.__launchConsumer === 'function');
  await page.evaluate(() => window.__launchConsumer({
    files: [{ getFile: async () => new File(['{}'], 'Mein-Depot_2026-10-01.vivodepot', { type: 'application/octet-stream' }) }],
  }));
  await expect(page.locator('.crypto-datei-name')).toContainText('Mein-Depot_2026-10-01.vivodepot');
  await expect(page.locator('#co-pw')).toBeVisible();
});

/* Befund (01.10.2026, gefunden bei der Gegenprobe des Doppelklick-Wegs): Ist schon ein Depot offen, lag der Öffnen-Schirm HINTER
   der App — launch_handler holte die Sitzung nach vorn, zu sehen war kein Passwortfeld. Jetzt geht der Weg erst über den
   gewöhnlichen Rückweg (mit Schließen-Warnung, falls etwas ungesichert ist) und zeigt dann den Schirm. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { oeffneApp, depotAnlegen } = require('./helpers');
const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup.js');

async function launchAttrappe(page) {
  await page.addInitScript(() => {
    const fang = (fn) => { window.__launchConsumer = fn; };
    if (window.LaunchQueue && window.LaunchQueue.prototype) window.LaunchQueue.prototype.setConsumer = fang;
    else Object.defineProperty(window, 'launchQueue', { value: { setConsumer: fang }, configurable: true });
  });
}
async function dateiUebergeben(page) {
  await page.evaluate(() => window.__launchConsumer({
    files: [{ name: 'Zweites-Depot.vivodepot', getFile: async () => new File(['{}'], 'Zweites-Depot.vivodepot', { type: 'application/octet-stream' }) }],
  }));
}
async function warnungBestaetigenFallsDa(page) {
  const ok = page.locator('#m-ok');
  if (await ok.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)) await ok.click();
}

test('[Datei-Start·offenes Depot] kommt eine Datei, während ein Depot offen ist, steht der Öffnen-Schirm sichtbar vorn', async ({ page }) => {
  await launchAttrappe(page);
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.waitForFunction(() => typeof window.__launchConsumer === 'function');
  await dateiUebergeben(page);
  await warnungBestaetigenFallsDa(page);
  await expect(page.locator('#co-pw')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.crypto-datei-name')).toContainText('Zweites-Depot.vivodepot');
  await expect(page.locator('#app')).not.toHaveClass(/\ban\b/);
});

test('[Datei-Start·offenes Depot·Rot-Beweis] mit dem alten Weg (Schirm direkt rendern) bleibt das Passwortfeld unsichtbar', async ({ page }) => {
  const produkt = fs.readFileSync(GEBACKENE_PRODUKT_PFADE['privat-de'], 'utf8');
  const neu = 'if (_appBereitsBetreten || data) geheZuZuhause(zeigen); else zeigen();';
  expect(produkt.split(neu).length, 'Anker trifft genau einmal').toBe(2);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'datei-start-rot-'));
  try {
    const ziel = path.join(tmp, 'vivodepot.html');
    fs.writeFileSync(ziel, produkt.replace(neu, 'zeigen();'));
    await launchAttrappe(page);
    await oeffneApp(page, { url: 'file://' + ziel });
    await depotAnlegen(page);
    await page.waitForFunction(() => typeof window.__launchConsumer === 'function');
    await dateiUebergeben(page);
    await page.waitForTimeout(800);
    await expect(page.locator('#co-pw')).toBeHidden();
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
