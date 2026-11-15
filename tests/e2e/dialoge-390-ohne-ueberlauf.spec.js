'use strict';
// SPDX-License-Identifier: EUPL-1.2
// Copyright (c) 2026 Vivodepot GmbH, Berlin.
/* Stufe 4 (UX-Bewertung 11.11.2026, Abschnitt 10): Dialoge und Hilfe laufen bei 390 px und am Desktop nicht über.
   Geöffnet werden: Eingangsschirm (#overlay-inhalt), Anlegen, Einstellungen, „Daten herausgeben", „Wohin einlesen?" und die Hilfe.
   Je Dialog gilt: die Seite rollt nicht seitlich (scrollWidth <= innerWidth), der Dialog liegt mit Rändern im Fenster, und sein
   Inhalt ragt nicht über ihn hinaus (scrollWidth <= clientWidth). Messwerkzeug der Maße: tools/dialog-streuung-messen.js. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, ANLEGE_WEG } = require('./helpers');

// Klick im DOM: die Seitenleiste ist am Handy eingefahren, der Weg zum Dialog ist derselbe Knopf wie am Schreibtisch.
const klick = (page, sel) => page.evaluate((s) => document.querySelector(s).click(), sel);

/* senkrecht: false für das Hilfe-Blatt; es steht in einem Overlay, das nach unten rollt, nur die Breite zählt. */
async function pruefe(page, selektor, name, { senkrecht = true } = {}) {
  const m = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { links: r.left, rechts: r.right, oben: r.top, unten: r.bottom, sw: el.scrollWidth, cw: el.clientWidth,
      seiteSw: document.documentElement.scrollWidth, iw: window.innerWidth, ih: window.innerHeight };
  }, selektor);
  expect(m, name + ': ' + selektor + ' ist da').not.toBeNull();
  expect(m.seiteSw, name + ': Seite rollt nicht seitlich').toBeLessThanOrEqual(m.iw);
  expect(m.links, name + ': linker Rand im Fenster').toBeGreaterThanOrEqual(-0.5);
  expect(m.rechts, name + ': rechter Rand im Fenster').toBeLessThanOrEqual(m.iw + 0.5);
  if (senkrecht) {
    expect(m.oben, name + ': oberer Rand im Fenster').toBeGreaterThanOrEqual(-0.5);
    expect(m.unten, name + ': unterer Rand im Fenster').toBeLessThanOrEqual(m.ih + 0.5);
  }
  expect(m.sw, name + ': Inhalt ragt nicht über den Dialog').toBeLessThanOrEqual(m.cw + 1);
}
async function modalZu(page) {
  const offen = await page.locator('#modal-rueck.an').count();
  if (!offen) return;
  for (const sel of ['#m-abbr', '#m-x']) {
    if (await page.locator(sel).isVisible().catch(() => false)) { await page.click(sel); break; }
  }
  if (await page.locator('#modal-rueck.an').count()) await page.keyboard.press('Escape');
  await page.waitForSelector('#modal-rueck.an', { state: 'detached', timeout: 5000 }).catch(() => {});
}
async function hilfePruefen(page, name) {
  await klick(page, '[data-hilfe]');
  await page.waitForSelector('#hilfe-overlay .hilfe-blatt', { state: 'visible' });
  await pruefe(page, '#hilfe-overlay .hilfe-blatt', name + ' Hilfe, Übersicht', { senkrecht: false });
  await pruefe(page, '#hilfe-overlay .hilfe-toolbar', name + ' Hilfe, Leiste');
  await page.click('#hilfe-overlay [data-hilfe-thema]');
  await page.waitForSelector('#hilfe-zurueck', { state: 'visible' });
  await pruefe(page, '#hilfe-overlay .hilfe-blatt', name + ' Hilfe, Thema', { senkrecht: false });
  await page.evaluate(() => { const o = document.getElementById('hilfe-overlay'); if (o) o.remove(); });
}

for (const [breite, hoehe] of [[390, 844], [1280, 800]]) {
  test.describe('Dialoge bei ' + breite + ' px', () => {
    test.use({ viewport: { width: breite, height: hoehe }, locale: 'de-DE' });

    test('Eingangsschirm, Anlegen und Hilfe bleiben im Fenster', async ({ page }) => {
      await oeffneApp(page);
      await pruefe(page, '#overlay-inhalt', 'Eingangsschirm');
      await page.click('#w-anfangen');
      await page.waitForSelector('#app.an', { state: 'attached' });
      await page.waitForSelector(ANLEGE_WEG + ':visible', { state: 'attached' });
      await klick(page, '[data-anlegen-weg], [data-umschau-eintragen], #tb-pw-hinweis');
      await page.waitForSelector('#modal-rueck.an #modal-inhalt', { state: 'visible' });
      await pruefe(page, '#modal-inhalt', 'Anlegen');
      await modalZu(page);
      await hilfePruefen(page, 'Vorschau');
    });

    test('Einstellungen, Herausgeben und Einlesen bleiben im Fenster', async ({ page }) => {
      test.setTimeout(120_000);
      await oeffneApp(page);
      await depotAnlegen(page);
      await klick(page, '#tb-einstellungen');
      await page.waitForSelector('#modal-rueck.an #modal-inhalt', { state: 'visible' });
      await pruefe(page, '#modal-inhalt', 'Einstellungen');
      await modalZu(page);
      await klick(page, '[data-weitergeben-zentral]');
      await page.waitForSelector('#modal-rueck.an #modal-inhalt', { state: 'visible' });
      await pruefe(page, '#modal-inhalt', 'Herausgeben');
      await modalZu(page);
      await klick(page, '[data-einlesen-zentral]');
      await page.waitForSelector('#modal-rueck.an #modal-inhalt', { state: 'visible' });
      await pruefe(page, '#modal-inhalt', 'Einlesen');
      await modalZu(page);
      await hilfePruefen(page, 'Depot');
    });
  });
}
