'use strict';
/* ═════════════════════════════════════════════════
   T-CROSS-43 — Studio, Assistent: die Vorschau zeigt den Namen der Einrichtung (Befund: doppelte ID as-k-name, 10.11.2026)
   ─────────────────────────────────────────────────
   Die Person tippt den Namen der Einrichtung; die Karte „von <Einrichtung>“ in der Vorschau zeigt ihn sofort. Vor dem Fix trug
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
  await p.click('#ein-vorlage');
  return { ctx, p };
}

test.describe('T-CROSS-43 Studio · Vorschau zeigt den Namen', () => {
  test('nach der Eingabe steht der Name der Einrichtung in der Vorschau, die Ansprechperson nicht', async ({ browser }) => {
    const { ctx, p } = await assistentOeffnen(browser);
    const kopf = p.locator('.as-kopf b').first();
    await expect(kopf).toHaveText('Ihre Einrichtung');
    await p.fill('#as-name', NAME);
    await expect(kopf).toHaveText(NAME);
    if (await p.locator('#as-k-name').isVisible()) {
      await p.fill('#as-k-name', 'Erika Beispiel');
      await expect(kopf).toHaveText(NAME);
      await expect(p.locator('#as-k-name')).toHaveValue('Erika Beispiel');
    }
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
