'use strict';
/* Feldhinweise in der Rolle Hilfe, Meldungen über der Tab-Leiste (Nachtrag zu Schritt 1 der Gestaltung, 30.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   1 · Ein Feldhinweis (.feld-hint) erbte von .feld-wert Stärke und Tinte und stand lauter als sein Label. Soll ist die Rolle
       Hilfe: 13 px am Rechner, 14 px schmal, Stärke 400, Farbe --ink3, leiser als das Label (nicht größer, leichter).
   2 · Am schmalen Bildschirm lagen Meldungen (Toasts) über der Tab-Leiste. Soll: ihre Unterkante steht 8 px über der Leiste.
   Gemessen in Privat und Pro, je bei 1440 und 390 px, Erscheinungsbild ab Werk. Rot-Beweis je Teil gegen den alten Stil. */
const { test, expect } = require('@playwright/test');
const h = require('./helpers.js');

const ALTSTAND_CSS = '.feld-hint { color: var(--ink) !important; font-size: var(--fs-xs) !important; font-weight: 550 !important; }'
  + ' body #toast-host { bottom: var(--space-5) !important; }';

async function hinweisMessen(page) {
  return page.evaluate(() => {
    const sicht = (el) => el.getClientRects().length && getComputedStyle(el).visibility === 'visible';
    const hint = [...document.querySelectorAll('.feld-zeile .feld-hint')].find(sicht);
    const label = hint && hint.closest('.feld-zeile').querySelector('.feld-label');
    if (!hint || !label) return null;
    const probe = document.createElement('span'); document.body.appendChild(probe);
    probe.style.color = 'var(--ink3)'; const ink3 = getComputedStyle(probe).color; probe.remove();
    const h = getComputedStyle(hint), l = getComputedStyle(label);
    return { groesse: parseFloat(h.fontSize), staerke: Number(h.fontWeight), farbe: h.color, ink3,
      labelGroesse: parseFloat(l.fontSize), labelStaerke: Number(l.fontWeight) };
  });
}
function hinweisFehler(m, schmal) {
  const f = [];
  if (!m) return ['kein sichtbarer Feldhinweis'];
  if (m.groesse !== (schmal ? 14 : 13)) f.push('Hinweis ' + m.groesse + ' px statt ' + (schmal ? 14 : 13));
  if (m.staerke !== 400) f.push('Hinweis Stärke ' + m.staerke + ' statt 400');
  if (m.farbe !== m.ink3) f.push('Hinweis in ' + m.farbe + ' statt --ink3');
  if (m.groesse > m.labelGroesse || m.staerke >= m.labelStaerke) f.push('Hinweis nicht leiser als das Label');
  return f;
}
async function meldungAbstand(page) {
  // Eine Meldung im Markup der Kern-Meldung (div.toast > span im #toast-host): gemessen wird die Lage, die der Stil des Hosts gibt.
  await page.evaluate(() => { const el = document.createElement('div'); el.className = 'toast info';
    const s = document.createElement('span'); s.textContent = 'Probe'; el.appendChild(s); document.getElementById('toast-host').appendChild(el); });
  const t = page.locator('#toast-host .toast').last();
  await expect(t).toBeVisible();
  return page.evaluate(() => {
    const t = [...document.querySelectorAll('#toast-host .toast')].pop().getBoundingClientRect();
    const leiste = document.querySelector('.bottom-tabs').getBoundingClientRect();
    return Math.round(leiste.top - t.bottom);
  });
}

test('Feldhinweis in der Rolle Hilfe, Meldung 8 px über der Tab-Leiste, mit Rot-Beweis', async ({ browser }) => {
  test.setTimeout(240000);
  for (const [produkt, url] of [['privat', h.KERN_URL_PRIVAT_DE], ['pro', h.KERN_URL_PRO_DE]].filter(([p]) => p === 'privat' || h.baubar('pro-de'))) {   // pro-de nur, wo es gebaut wird: öffentlich gehen nur die zwei Privat-Produkte hinaus (h.baubar)
    for (const breite of [1440, 390]) {
      const schmal = breite === 390;
      const kontext = await browser.newContext(schmal ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1440, height: 1000 } });
      const page = await kontext.newPage();
      await h.oeffneApp(page, { url });
      await h.depotAnlegen(page, { pw: 'e2e-passwort-123' });
      for (let k = 0; k < 3; k++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(150); }
      await page.evaluate(() => { const el = document.querySelector('.nav-item[data-sektor]'); el && el.click(); });
      await page.waitForTimeout(500);
      const ort = produkt + ' ' + breite;
      expect(hinweisFehler(await hinweisMessen(page), schmal), ort + ': Feldhinweis').toEqual([]);
      if (schmal) expect(await meldungAbstand(page), ort + ': Abstand Meldung zur Tab-Leiste').toBe(8);

      // Rot-Beweis: der alte Stil wird erkannt.
      await page.addStyleTag({ content: ALTSTAND_CSS });
      const alt = hinweisFehler(await hinweisMessen(page), schmal);
      expect(alt.some((x) => /Stärke/.test(x)) && alt.some((x) => /statt --ink3/.test(x)), ort + ': Rot-Beweis Hinweis').toBe(true);
      if (schmal) expect(await meldungAbstand(page), ort + ': Rot-Beweis Meldung über der Leiste').toBeLessThan(0);
      await kontext.close();
    }
  }
});
