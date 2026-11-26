'use strict';
/* ═════════════════════════════════════════════════
   T-CROSS-43 — Studio, Vorschau der Anfrage: sie zeigt den Namen der Stelle (Befund: doppelte ID as-k-name, 10.11.2026)
   ─────────────────────────────────────────────────
   Die Person tippt am Start den Namen der Stelle; die Karte „von <Stelle>“ in der Vorschau der Anfrage zeigt ihn. Vor dem Fix trug
   die Kopfzeile der Vorschau dieselbe ID wie das Eingabefeld „Ansprechperson“ (as-k-name); getElementById griff das Eingabefeld,
   die Vorschau blieb bei „Ihre Einrichtung“. Dazu: keine ID kommt im geladenen Dokument zweimal vor, und der Name der
   Ansprechperson landet nicht in der Vorschau.
   ROT-BEWEIS: GENERATOR_HTML_PATH=<kopie von e22e6a50a:vivodepot-studio.html> → beide Tests rot.
   ═════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const H = require('./support/helpers');

const URL = process.env.GENERATOR_HTML_PATH ? 'file://' + path.resolve(process.env.GENERATOR_HTML_PATH) : H.URLS.generator;
const NAME = 'Sportverein Beispielstadt';

async function assistentOeffnen(browser) {
  const ctx = await browser.newContext({ locale: 'de-DE' });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.click('#sp-de');
  return { ctx, p };
}

test.describe('T-CROSS-43 Studio · Vorschau zeigt den Namen', () => {
  test('nach der Eingabe steht der Name der Stelle in der Vorschau der Anfrage, die Ansprechperson nicht', async ({ browser }) => {
    const { ctx, p } = await assistentOeffnen(browser);
    await p.setViewportSize({ width: 1280, height: 900 });
    const kopf = p.locator('#anfrage-vorschau .as-kopf b').first();
    await p.click('#start-leer');
    await expect(kopf).toHaveText('Ihre Stelle');
    await p.click('#marke-start');
    await p.fill('#as-name', NAME);
    await expect(p.locator('#start-angaben')).not.toHaveAttribute('open', '');   // M5 (22.11.2026): die Angaben öffnen sich nicht beim Tippen
    await p.click('#start-angaben > summary');
    await p.fill('#as-k-name', 'Erika Beispiel');
    await p.evaluate(() => { const d = document.getElementById('start-weitere'); if (d) d.open = true; });   // seit S-1 unter „Weitere Wege“
    await p.click('#as-beispiele [data-beispiel="andere"]');
    await expect(kopf).toHaveText(NAME);
    await expect(p.locator('#as-k-name')).toHaveValue('Erika Beispiel');
    await ctx.close();
  });

  test('keine ID kommt im geladenen Dokument zweimal vor', async ({ browser }) => {
    const { ctx, p } = await assistentOeffnen(browser);
    const doppelt = await p.evaluate(() => {
      const n = {};
      document.querySelectorAll('[id]').forEach((e) => { n[e.id] = (n[e.id] || 0) + 1; });
      return Object.entries(n).filter(([, k]) => k > 1).map(([id, k]) => id + ' ×' + k);
    });
    expect(doppelt).toEqual([]);
    await ctx.close();
  });
});
