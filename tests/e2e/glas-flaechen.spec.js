// @ts-check
/* glas-flaechen.spec.js — Glas auf der ganzen Fläche (U2-ADR-473 W5a, 06.10.2026)
   Klasse „eine spezifischere Regel schlägt das Glas“: an 7aeff3596 war die Kopfleiste trotz Glas-Regel deckend, weil eine Regel mit mehr
   Spezifität ihre Fläche setzte. Gemessen wird darum im Browser, was WIRKT: Kopf, Leiste, Fußzeile, Dialog und Abdunklung haben eine Fläche
   mit Deckkraft < 1 und einen backdrop-filter — tags und nachts. Mit „Transparenz reduzieren“ und im Hochkontrast sind sie deckend. */
const { test, expect } = require('@playwright/test');
const h = require('./helpers.js');

const FLAECHEN = ['.topbar', '#sidebar', '#app-fuss', '#modal-rueck', '#modal-rueck .modal'];

async function wirkt(page) {
  return page.evaluate((sel) => Object.fromEntries(sel.map((s) => {
    const el = document.querySelector(s); if (!el) return [s, null];
    const cs = getComputedStyle(el);
    const m = cs.backgroundColor.match(/[\d.]+/g) || [];
    const alpha = m.length >= 4 ? Number(m[3]) : (cs.backgroundColor === 'transparent' ? 0 : 1);
    return [s, { alpha, blur: (cs.backdropFilter || cs.webkitBackdropFilter || 'none') !== 'none' }];
  })), FLAECHEN);
}

async function mitDialog(page) {
  await page.evaluate(() => window.__vdOeffentlich.ui.modal({ titel: 'Probe', koerperHTML: '<p>Probe-Dialog zur Messung</p>', primaerLabel: 'OK', onPrimaer: () => true }));
  await page.waitForSelector('#modal-rueck .modal', { state: 'visible' });
}

test('[Glas] Kopf, Leiste, Fußzeile, Dialog und Abdunklung sind Glas, tags und nachts', async ({ page }) => {
  await h.oeffneApp(page);
  await h.depotAnlegen(page, { name: 'Elisabeth Muster', pw: 'e2e-passwort-123' });
  await mitDialog(page);
  for (const [modus, knopf] of [['tag', null], ['nacht', '#tb-nacht']]) {
    if (knopf) { await page.evaluate(() => document.getElementById('tb-nacht').click()); await page.waitForTimeout(300); }
    const w = await wirkt(page);
    for (const s of FLAECHEN) {
      expect(w[s], modus + ' ' + s + ' fehlt').not.toBeNull();
      if (s === '#modal-rueck' && modus === 'nacht') continue;   // die Abdunklung ist nachts der Schleier des Kerns
      expect(w[s].alpha, modus + ' ' + s + ': Fläche deckend — eine spezifischere Regel schlägt das Glas').toBeLessThan(1);
      expect(w[s].blur, modus + ' ' + s + ': kein backdrop-filter').toBe(true);
    }
  }
});

test('[Glas·Rückfall] mit „Transparenz reduzieren“ und im Hochkontrast sind die Flächen deckend', async ({ page, context }) => {
  await h.oeffneApp(page);
  await h.depotAnlegen(page, { name: 'Elisabeth Muster', pw: 'e2e-passwort-123' });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
  let w = await wirkt(page);
  for (const s of ['.topbar', '#sidebar', '#app-fuss']) expect(w[s].blur, 'reduziert ' + s).toBe(false);
  await cdp.send('Emulation.setEmulatedMedia', { features: [] });
  await page.click('#tb-kontrast'); await page.waitForTimeout(300);
  w = await wirkt(page);
  for (const s of ['.topbar', '#sidebar']) { expect(w[s].blur, 'Hochkontrast ' + s).toBe(false); expect(w[s].alpha, 'Hochkontrast ' + s).toBe(1); }
});

test('[Glas·Rot-Beweis] eine spezifischere deckende Regel wird gefunden', async ({ page }) => {
  await h.oeffneApp(page);
  await h.depotAnlegen(page, { name: 'Elisabeth Muster', pw: 'e2e-passwort-123' });
  await page.evaluate(() => { const s = new CSSStyleSheet(); s.replaceSync('html body #app .topbar.topbar { background: #f6f5f1; }'); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; });
  const w = await wirkt(page);
  expect(w['.topbar'].alpha).toBe(1);
});
