'use strict';
// SPDX-License-Identifier: EUPL-1.2
// Copyright (c) 2026 Vivodepot GmbH, Berlin.
/* Pflichtblock Anbieterprüfung im Browser-Aussteller — Sichtbarkeit und Bedienung, je 1440 und 390 Pixel breit.
   Beide Blöcke (vor F-6 und für den Stapel in F-8) sind sichtbar, die Seite rollt bei 390 nicht seitlich,
   die Beleg-Datei wird im Browser gehasht (der Hash steht am Block), der Schalter sperrt die Felder.
   Mit VD_AP_BILDER=<ordner> legt die Spec je Zustand (leer, ausgefüllt, abgeschaltet) ein Bild je Block ab. */
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const crypto = require('node:crypto');

// VD_AP_ISSUER=<pfad> nur für den Rot-Beweis des Kopfs gegen einen älteren Stand der Datei.
const ISSUER_URL = 'file://' + (process.env.VD_AP_ISSUER || path.join(__dirname, '..', '..', 'vivodepot-vc-issuer.html'));
const BILDER = process.env.VD_AP_BILDER || '';
const BELEG = Buffer.from('Registerauszug HRB 12345 (Testbeleg)');
const BELEG_HASH = crypto.createHash('sha256').update(BELEG).digest('hex');
// Deutsche Oberfläche des Browsers: Datumsfeld und Dateiknopf erscheinen so, wie die Operatorin sie sieht.
test.use({ locale: 'de-DE', launchOptions: { args: ['--lang=de-DE'] } });

function paket(nr) {
  const b = JSON.parse(JSON.stringify(require(path.join(__dirname, '..', '..', 'docs', 'template-generator', 'beispiel-submission.json'))));
  b.submissionId = '3f2504e0-4f89-41d3-9a0c-03050000000' + nr;
  b.anbieter.anbieterId = 'institution/stapel-' + nr + '-de';
  b.anbieter.anbieterName = 'Stapel-Anbieter ' + nr;
  return { name: 'sub-' + nr + '.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(b)) };
}
async function lesen(page, id) {
  return page.evaluate((i) => anbieterPruefungAusBlock(document.getElementById(i)), id);   // eslint-disable-line no-undef
}
async function kopfBild(page, name) {
  if (!BILDER) return;
  await page.locator('.ta-banner').screenshot({ path: path.join(BILDER, name + '.png') });
}
async function bild(page, id, name) {
  if (!BILDER) return;
  await page.locator('#' + id).screenshot({ path: path.join(BILDER, name + '.png') });
}

for (const breite of [1440, 390]) {
  test.describe('Anbieterprüfung bei ' + breite + ' px', () => {
    test.use({ viewport: { width: breite, height: 900 } });

    test('beide Blöcke sichtbar, kein seitliches Rollen, leer → ausgefüllt → abgeschaltet', async ({ page }) => {
      const fehler = [];
      page.on('pageerror', (e) => fehler.push(String(e)));
      await page.goto(ISSUER_URL);
      await page.setInputFiles('#stapelDatei', [paket(1), paket(2)]);
      await expect(page.locator('#stapelStatus')).toHaveText(/2 Pakete geladen/);

      for (const [id, art] of [['apEinzelBlock', 'einzel'], ['apStapelBlock', 'stapel']]) {
        const b = page.locator('#' + id);
        await b.scrollIntoViewIfNeeded();
        await expect(b).toBeVisible();
        await expect(b).toHaveAttribute('data-zustand', 'leer');
        expect(await lesen(page, id)).toBeNull();
        await bild(page, id, art + '-leer-' + breite);

        await b.locator('label.ap-methode', { hasText: 'Registerauszug' }).click();
        await expect(b).toHaveAttribute('data-zustand', 'teil');
        await b.locator('input[type=date]').fill('2026-11-06');
        await b.locator('[data-ap="geprueftVon"]').fill('Prüferin A');
        await b.locator('input[type=file]').setInputFiles({ name: 'beleg.pdf', mimeType: 'application/pdf', buffer: BELEG });
        await expect(b).toHaveAttribute('data-beleg-hash', BELEG_HASH);
        await expect(b).toHaveAttribute('data-zustand', 'voll');
        expect(await lesen(page, id)).toEqual({ methode: 'registerauszug', geprueftAm: '2026-11-06', geprueftVon: 'Prüferin A', belegHash: BELEG_HASH });
        await bild(page, id, art + '-ausgefuellt-' + breite);

        await b.locator('label.ap-schalter').click();
        await expect(b).toHaveAttribute('data-zustand', 'ohne');
        await expect(b.locator('input[type=date]')).toBeDisabled();
        expect(await lesen(page, id)).toEqual({ abgeschaltet: true });
        await bild(page, id, art + '-abgeschaltet-' + breite);
      }
      await expect(page.locator('#apStapelBlock [data-ap="zeilen"] .ap-chip')).toHaveCount(2);
      await expect(page.locator('#apStapelBlock [data-ap="zeilen"]')).toContainText('Stapel-Anbieter 2');

      const ueberlauf = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(ueberlauf, 'kein seitliches Rollen').toBeLessThanOrEqual(0);
      expect(fehler).toEqual([]);
    });
  });
}

// Befund VC-ISSUER-KOPF-390 (06.11.2026): der Produktkopf ragte bei 390 px über den Rand (Link nowrap, Kopf ohne Umbruch).
// Muster: der Kopf bricht um, der Link steht dann rechts in eigener Zeile. Mit VD_AP_BILDER legt der Test ein Bild des Kopfs ab.
test.describe('Produktkopf bei 390 px', () => {
  test.use({ viewport: { width: 390, height: 900 } });
  test('Kopf ragt nicht über den Rand: scrollWidth <= 390', async ({ page }) => {
    await page.goto(ISSUER_URL);
    await expect(page.locator('.produkt-kopf-link')).toBeVisible();
    await kopfBild(page, 'kopf-390-' + (process.env.VD_AP_ISSUER ? 'vorher' : 'nachher'));
    const breite = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(breite, 'scrollWidth der Seite').toBeLessThanOrEqual(390);
    const rechts = await page.locator('.produkt-kopf-link').evaluate((el) => el.getBoundingClientRect().right);
    expect(rechts, 'Link im Bild').toBeLessThanOrEqual(390);
  });
});
