'use strict';
/* ABN-B11 (11.11.2026): Anlass-Blatt — zuerst die Angaben, die Ausgabe-Knöpfe am Ende des Blatts;
   „nur am Bildschirm“ an eigenen Notizfeldern ist ein Symbol mit title, kein sichtbarer Fließtext. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

test('Anlass „Arzt“: Ausgabe-Knöpfe stehen nach den Angaben-Zeilen', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.click('[data-anlass-auswahl="1"]');
  await page.waitForSelector('[data-anlass="arzt"]', { state: 'visible' });
  await page.click('[data-anlass="arzt"]');
  await page.waitForSelector('#b-pdf', { state: 'attached' });

  const r = await page.evaluate(() => {
    const zeilen = Array.from(document.querySelectorAll('#content .feld-zeile'));
    const pdf = document.getElementById('b-pdf');
    const her = document.getElementById('b-anlass-herausgeben');
    const FOLGT = Node.DOCUMENT_POSITION_FOLLOWING;
    const nach = (a, b) => !!(a.compareDocumentPosition(b) & FOLGT);   // b steht nach a
    return {
      zeilen: zeilen.length,
      pdfNachAllen: zeilen.every((z) => nach(z, pdf)),
      herNachAllen: !her || zeilen.every((z) => nach(z, her)),
      herDa: !!her,
    };
  });
  expect(r.zeilen).toBeGreaterThan(0);
  expect(r.pdfNachAllen).toBe(true);
  expect(r.herDa).toBe(true);
  expect(r.herNachAllen).toBe(true);
});

test('„nur am Bildschirm“ steht auf keinem Anlass-Blatt als sichtbarer Fließtext', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.click('[data-anlass-auswahl="1"]');
  await page.waitForSelector('[data-anlass]', { state: 'visible' });
  const ids = await page.$$eval('[data-anlass]', (k) => k.map((e) => e.getAttribute('data-anlass')));
  expect(ids.length).toBeGreaterThan(0);
  for (const id of ids) {
    await page.evaluate((i) => { const k = document.querySelector('[data-anlass="' + i + '"]'); if (k) k.click(); }, id);
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => ({
      text: document.getElementById('content').innerText,
      marker: Array.from(document.querySelectorAll('#content .sensibel-marker')).map((m) => m.textContent.trim()),
    }));
    expect(r.text, 'Anlass ' + id).not.toMatch(/nur am Bildschirm/);
    for (const t of r.marker) expect(t, 'Marker auf ' + id).not.toMatch(/Bildschirm/);
    await page.evaluate(() => { const b = document.querySelector('[data-anlass-auswahl="1"]'); if (b) b.click(); });
    await page.waitForTimeout(100);
  }
});
