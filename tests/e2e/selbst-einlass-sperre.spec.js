'use strict';
/* Die Sperre der Erweiterung aus Dateien im Browser (04.10.2026, Wort der Gegenlesung) — beide Wege, positiv:
   Weg 1: in den Einstellungen fehlt der Knopf (#einst-modul-einlassen), an seiner Stelle steht der Hinweis.
   Weg 2: eine Depot-Datei mit einem eingebetteten Modul, das nicht ab Werk ist, wird beim Öffnen nicht eingelassen —
   der Hinweis nach dem Öffnen erscheint, und der Text des Moduls wirkt nicht.
   Die Datei entsteht wie in der Node-Probe: ein Kern legt das Depot an, legt das Modul hinein und serialisiert es. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, einstellungenAbschnittOeffnen } = require('./helpers');
const { ladeKern } = require('../load-kern.js');

const PW = 'sperre-e2e-pw-2026-10-04';

async function depotMitFremdemModul() {
  const Q = ladeKern({ produkt: 'privat-de' }).V;
  await Q.depotAnlegen(PW);
  Q.akteurSelbstErklaeren('Fremd');
  const d = JSON.parse(JSON.stringify(Q.getData()));
  d.textsatzModule = (d.textsatzModule || []).concat([{ modulTyp: 'textsatz', moduleVersion: 1, sprache: 'fr', texte: { 'strings:fussQuellcode.text': 'FREMD-E2E' } }]);
  d.textsprache = 'fr';
  Q.setData(d);
  return JSON.parse(JSON.stringify(await Q.depotSerialisieren()));
}

test('[Sperre·E2E·Weg 1] in den Einstellungen fehlt der Knopf, an seiner Stelle steht der Hinweis', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.locator('#tb-einstellungen').click();
  await einstellungenAbschnittOeffnen(page, '#einst-modul-einlassen-gesperrt');
  await expect(page.locator('#einst-modul-einlassen-gesperrt')).toBeVisible();
  await expect(page.locator('#einst-modul-einlassen')).toHaveCount(0);
});

test('[Sperre·E2E·Weg 2] ein Modul in einer geöffneten Depot-Datei wird nicht eingelassen', async ({ page }) => {
  const umschlag = await depotMitFremdemModul();
  await oeffneApp(page);
  await page.evaluate(async ([u, pw]) => { await window.__vdOeffentlich.depotLaden(u, pw); window.__vdOeffentlich.betreteApp(); }, [umschlag, PW]);
  await expect(page.locator('#erweiterungen-gesperrt-hinweis')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('body')).not.toContainText('FREMD-E2E');
  await page.evaluate(() => window.__vdOeffentlich.flowEinstellungen());
  await expect(page.locator('body')).toContainText('vorübergehend nicht aktiv');
});
