'use strict';
/* ═══════════════════════════════════════════════════════════════════
   Stick-Mittelweg über die Oberfläche: schließen, sichern, Kopie geräumt
   ───────────────────────────────────────────────────────────────────
   Die Node-Proben (tests/stick-browser-kopie-raeumen.test.js) messen das Modell und das
   Räumen selbst. Diese Reise misst, was keine von ihnen sehen kann: dass der Weg der
   Bürgerin dort ankommt — Datei vom „Stick" per `file://` öffnen, arbeiten, auf den
   Schließen-Knopf drücken, den Primärknopf des Dialogs nehmen, und danach steht im
   Browser dieses fremden Rechners nichts mehr von diesem Depot.

   Der Stick wird ehrlich nachgestellt, soweit es headless geht: ein eigener Ordner, die
   Produktdatei mit `tools/stick-ausgabe-backen.js` als Stick-Ware gebacken (derselbe Weg,
   den die Auslieferung nimmt), Aufruf über `file://`. Was NICHT nachgestellt ist: echtes
   Dateisystem eines Sticks und der native Speichern-Dialog — dafür die Handcheckliste.
   ═══════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { dateiBacken } = require('../../tools/stick-ausgabe-backen.js');

// S8 (U2-ADR-428): die Datei, die auf den Stick geht, ist das gebackene deutsche Produkt — das nackte Gerüst trägt keinen Satz und zeigt keinen Eingangsschirm.
const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup.js');
const KERN = GEBACKENE_PRODUKT_PFADE['privat-de'];
const PW = 'stick-schliessen-probe-2026';

function stickDateiBauen() {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'stick-ware-'));
  const ziel = path.join(ordner, 'vivodepot.html');
  fs.copyFileSync(KERN, ziel);
  const stand = dateiBacken(ziel, 'stick');
  if (!stand.istStick) throw new Error('Vorbedingung: die Datei ist nicht als Stick-Ware gebacken');
  return { ziel, aufraeumen: () => fs.rmSync(ordner, { recursive: true, force: true }) };
}

/* Die FSA-Attrappe ist hier kein Testhaken, sondern der Chromium-Weg selbst: `createWritable`
   und ein erfülltes `close()` sind die echte Schreibbestätigung, an der das Räumen hängt. */
async function fsaAttrappe(page) {
  await page.addInitScript(() => {
    window.__geschrieben = null;
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({
        name: 'stick.vivodepot',
        createWritable: async () => { let s = ''; return {
          write: async (c) => { s += typeof c === 'string' ? c : await c.text(); },
          close: async () => { window.__geschrieben = s; },
        }; },
      }),
    });
  });
}

async function depotAnlegenUndFuellen(page, url) {
  await page.goto(url);
  await page.waitForSelector('#w-anlass', { state: 'visible', timeout: 30000 });
  await page.evaluate(async (pw) => {
    await window.__vdOeffentlich.depotAnlegen(pw);
    window.__vdOeffentlich.akteurSelbstErklaeren('Probe');
    window.__vdOeffentlich.sektorFeldSetzen('identity', 'givenName', 'Anna');
    await window.__vdOeffentlich.depotInternSichern({ ueberschreiben: true });
  }, PW);
}

const kopieDa = (page) => page.evaluate(async () => (await window.__vdOeffentlich.VdStore.liste()).length);

test('[Stick] Schließen sichert auf den Stick und räumt danach die Browser-Kopie', async ({ page }) => {
  const stick = stickDateiBauen();
  try {
    await fsaAttrappe(page);
    await depotAnlegenUndFuellen(page, 'file://' + stick.ziel);
    expect(await page.evaluate(() => window.__vdOeffentlich.stickWegGilt()), 'Vorbedingung: der Stick-Weg gilt').toBe(true);
    expect(await kopieDa(page), 'Vorbedingung: eine Browser-Kopie liegt vor').toBe(1);

    await page.evaluate(() => window.__vdOeffentlich.flowAppSchliessen());
    const dialog = page.locator('#m-ok');
    await expect(dialog).toBeVisible();
    // Der Hinweis benennt das Restrisiko, bevor sie klickt.
    await expect(page.locator('.modal, #overlay-inhalt').first()).toContainText('Stick');
    await dialog.click();
    await page.waitForFunction(() => window.__geschrieben !== null, null, { timeout: 15000 });

    await expect.poll(() => kopieDa(page), { timeout: 10000 }).toBe(0);
    expect(await page.evaluate(() => window.__geschrieben.length), 'auf dem Stick liegen keine Bytes').toBeGreaterThan(100);
  } finally { stick.aufraeumen(); }
});

test('[Stick] ohne Stick-Merkmal bleibt die Kopie — dieselbe Reise, gewöhnliche Datei', async ({ page }) => {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'download-ware-'));
  const ziel = path.join(ordner, 'vivodepot.html');
  try {
    fs.copyFileSync(KERN, ziel);
    await fsaAttrappe(page);
    await depotAnlegenUndFuellen(page, 'file://' + ziel);
    expect(await page.evaluate(() => window.__vdOeffentlich.stickWegGilt())).toBe(false);
    await page.evaluate(() => window.__vdOeffentlich.flowAppSchliessen());
    await page.locator('#m-ok').click();
    await page.waitForFunction(() => window.__geschrieben !== null, null, { timeout: 15000 });
    await page.waitForTimeout(1000);
    expect(await kopieDa(page), 'die Kopie der eigenen Download-Datei wurde geräumt').toBe(1);
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
});
