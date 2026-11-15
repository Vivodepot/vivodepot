'use strict';
/* Befund (11.11.2026, Demo myhealth/en, iPad hoch 768 × 1024): „Create depot“ in der Kopfleiste wird zum schmalen Streifen und verdeckt den
   Chip „Emergency“. Gehalten: in der Umschau (Beispielansicht) überdeckt kein Kopfleisten-Element ein anderes, bei 768 × 1024 und 1180 × 820,
   deutsch und englisch. */
const { test, expect } = require('@playwright/test');
const { oeffneApp } = require('./helpers');

for (const [b, h] of [[768, 1024], [1180, 820], [390, 844]]) for (const en of [false, true]) {
  test(`[Kopfleiste·Umschau] ${b} × ${h}${en ? ' EN' : ' DE'}: nichts in der Kopfleiste überdeckt etwas`, async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext({ viewport: { width: b, height: h } });
    const page = await ctx.newPage();
    await oeffneApp(page);
    if (en && await page.locator('#vor-depot-sprache').count()) await page.click('#vor-depot-sprache');
    await page.click('#w-anfangen');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: (process.env.BANNER_BILD || '/tmp/banner') + `-${b}${en ? 'en' : 'de'}.png` });
    const schneidend = await page.evaluate(() => {
      const k = [...document.querySelectorAll('.topbar button, .topbar a, .topbar .chip, #topbar-cta, .topbar [role="button"]')]
        .filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none'; });
      const out = [];
      for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) {
        if (k[i].contains(k[j]) || k[j].contains(k[i])) continue;
        const a = k[i].getBoundingClientRect(), c = k[j].getBoundingClientRect();
        if (Math.min(a.right, c.right) - Math.max(a.left, c.left) > 1 && Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 1) out.push((k[i].id || k[i].className) + ' × ' + (k[j].id || k[j].className));
      }
      return out;
    });
    expect(schneidend).toEqual([]);
    await ctx.close();
  });
}

/* Der Hinweis „Create depot“ in der Notfall-Ansicht der Beispielansicht (Befund 11.11.2026): sein Text steht ganz da oder die Leiste schaltet
   auf das kurze Wort um; gekappt („Crea“) darf er nie sein. */
for (const [b, h] of [[768, 1024], [820, 1180], [1024, 768]]) {
  test(`[Kopfleiste·Notfall] ${b} × ${h}: der Hinweis zum Depot-Anlegen ist nicht gekappt und überdeckt nichts`, async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext({ viewport: { width: b, height: h } });
    const page = await ctx.newPage();
    await oeffneApp(page);
    await page.click('#w-anfangen');
    await page.waitForTimeout(2000);
    await page.locator('[data-nav-notfall], #nav-notfall, .sidebar >> text=/Notfall|Emergency/').first().click({ timeout: 8000 }).catch(async () => { await page.getByText(/^(Notfall|Emergency)$/).first().click(); });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: (process.env.BANNER_BILD || '/tmp/banner') + `-notfall-${b}.png` });
    const m = await page.evaluate(() => {
      const e = document.getElementById('tb-pw-hinweis'); if (!e || e.hidden || !e.getClientRects().length) return { sichtbar: false };
      const c = [...e.querySelectorAll('.tb-pw-cta, .tb-pw-cta-kurz')].find((x) => x.getClientRects().length);
      return { sichtbar: true, gekappt: !!(c && c.scrollWidth > c.clientWidth + 1), text: c && c.textContent };
    });
    if (m.sichtbar) expect(m.gekappt, 'Hinweis gekappt: ' + JSON.stringify(m)).toBe(false);
    await ctx.close();
  });
}
