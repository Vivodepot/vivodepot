'use strict';
/* ═════════════════════════════════════════════════════════════════
   ANFRAGE-BESCHRIFTUNG (23.11.2026) — das Feld im Dialog „Eine Anfrage öffnen“ sagt sichtbar, was hinein gehört
   ─────────────────────────────────────────────────────────────────
   Vorher trug das Textfeld nur einen unsichtbaren Namen (aria-label mit dem Titel des Dialogs); wer den Dialog sah, las nicht,
   ob ein Link, ein Text oder der Inhalt eines QR-Codes gemeint ist. Jetzt steht eine Beschriftung über dem Feld, und sie ist
   zugleich sein zugänglicher Name: das Feld ist über genau diesen Satz erreichbar, auf Deutsch und auf Englisch.
   ═════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { KERN_URL_PRIVAT_DE, KERN_URL_PRIVAT_EN, oeffneApp, depotAnlegen, inLeisteKlicken } = require('./helpers');

const FAELLE = [
  { sprache: 'de', url: KERN_URL_PRIVAT_DE, satz: 'Link, Text oder Inhalt des QR-Codes der Anfrage' },
  { sprache: 'en', url: KERN_URL_PRIVAT_EN, satz: 'Link, text or QR code content of the request' },
];

async function dialogOeffnen(page, url) {
  await oeffneApp(page, { url });
  await depotAnlegen(page);
  await inLeisteKlicken(page, '[data-uebergabe-protokoll]');
  await page.click('#anfrage-empfangen');
  await expect(page.locator('#anfrage-text')).toBeVisible();
}

for (const f of FAELLE) {
  test('[Anfrage·Beschriftung·' + f.sprache + '] die Beschriftung steht sichtbar über dem Feld und ist sein Name', async ({ page }) => {
    await dialogOeffnen(page, f.url);
    const beschriftung = page.locator('label[for="anfrage-text"]');
    await expect(beschriftung).toBeVisible();
    await expect(beschriftung).toHaveText(f.satz);
    await expect(page.getByLabel(f.satz, { exact: true })).toHaveAttribute('id', 'anfrage-text');
    const lage = await page.evaluate(() => {
      const l = document.querySelector('label[for="anfrage-text"]').getBoundingClientRect();
      const t = document.getElementById('anfrage-text').getBoundingClientRect();
      return { ueber: l.bottom <= t.top + 1, aria: document.getElementById('anfrage-text').getAttribute('aria-label') };
    });
    expect(lage.ueber, 'die Beschriftung steht über dem Feld').toBe(true);
    expect(lage.aria, 'kein zweiter, abweichender Name neben der Beschriftung').toBeNull();
  });
}

test('[Anfrage·Beschriftung·Rot-Beweis] ohne die Beschriftung findet die Probe das Feld nicht über den Satz', async ({ page }) => {
  await dialogOeffnen(page, KERN_URL_PRIVAT_DE);
  await page.evaluate(() => document.querySelector('label[for="anfrage-text"]').remove());
  await expect(page.getByLabel(FAELLE[0].satz, { exact: true })).toHaveCount(0);
});
