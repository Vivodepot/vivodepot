'use strict';
/* ═══════════════════════════════════════════════════════════
   E2E — A5 (11.11.2026): der Sprachknopf im Menü des offenen Depots liegt OHNE Scrollen im Blickfeld — am Telefon (390 px, im
   Schubfach) wie am Desktop (1024 × 768, Seitenleiste). Ein Knopf, der erst nach dem Scrollen auftaucht, ist für die Person nicht da.
   Die Probe legt das Depot über die Oberfläche an (keine Testfläche).
   ═══════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { produktHtml, depotImProduktAnlegen } = require('../produkt-html-erzeugen.js');

const PW = 'pw-a5-blickfeld-4711';

for (const [name, breite, hoehe] of [['390 px', 390, 844], ['1024 × 768', 1024, 768]]) {
  test('A5: der Sprachknopf im Menü liegt ohne Scrollen im Blickfeld — ' + name, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width: breite, height: hoehe });
    const { umschlag } = await depotImProduktAnlegen('privat-en', PW, (V) => { V.akteurSelbstErklaeren('Amina'); });   // Vorbereitung, nicht der geprüfte Weg
    const datei = path.join(os.tmpdir(), 'a5-blickfeld-' + process.pid + '-' + breite + '.vivodepot');
    fs.writeFileSync(datei, typeof umschlag === 'string' ? umschlag : JSON.stringify(umschlag), 'utf8');
    await page.goto('file://' + produktHtml('privat-de'));   // das ausgelieferte Produkt; geöffnet wird über die Oberfläche
    await page.click('#w-datei');
    await page.setInputFiles('#co-datei', datei);
    await page.fill('#co-pw', PW);
    await page.click('#w-oeffnen');
    await page.waitForSelector('#app.an', { state: 'attached' });
    fs.rmSync(datei, { force: true });   // die Datei ist gelesen; kein Rest im Temp-Verzeichnis
    await page.waitForTimeout(500);
    const menue = page.locator('#tb-menue');
    if (await menue.isVisible() && (await menue.getAttribute('aria-expanded')) !== 'true') { await menue.click(); await page.waitForTimeout(500); }
    const knopf = page.locator('#sb-sprache');
    await expect(knopf).toHaveCount(1);
    const r = await knopf.evaluate((e) => { const b = e.getBoundingClientRect(); return { oben: b.top, unten: b.bottom, links: b.left, rechts: b.right, h: window.innerHeight, w: window.innerWidth }; });
    expect(r.oben).toBeGreaterThanOrEqual(0);
    expect(r.unten).toBeLessThanOrEqual(r.h);
    expect(r.links).toBeGreaterThanOrEqual(0);
    expect(r.rechts).toBeLessThanOrEqual(r.w);
  });
}
