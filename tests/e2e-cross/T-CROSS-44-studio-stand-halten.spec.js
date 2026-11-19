'use strict';
/* ═════════════════════════════════════════════════
   T-CROSS-44 — Studio, Wagen S-G (10.11.2026): der Stand eines Wegs bleibt, „Zurück zur Auswahl“ fragt, „Weiter“ rollt in den Blick
   ─────────────────────────────────────────────────
   S1: Weg „Anfrage an Personen“ ausfüllen → über die Marke im Kopf hinaus → mit der Kachel zurück: der Stand ist da.
       „Zurück zur Auswahl“ fragt einmal; „Weiter bearbeiten“ behält, „Verwerfen und zur Auswahl“ leert.
   S3: Nach „Weiter“ liegt die Überschrift des neuen Schritts im Fenster und trägt den Fokus (die Seite war vorher weit unten).
   ROT-BEWEIS: GENERATOR_HTML_PATH=<Kopie von 569c0b1cc:vivodepot-studio.html> → alle Tests rot.
   ═════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const H = require('./support/helpers');

const URL = process.env.GENERATOR_HTML_PATH ? 'file://' + path.resolve(process.env.GENERATOR_HTML_PATH) : H.URLS.generator;

async function oeffnen(browser) {
  const ctx = await browser.newContext({ locale: 'de-DE' });
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.click('#sp-de');
  return { ctx, p };
}
async function anfrageBeginnen(p) {
  await p.evaluate(() => { const d = document.getElementById('start-weitere'); if (d) d.open = true; });   // seit S-1 unter „Weitere Wege“
  await p.click('#ein-anfrage');
  await p.fill('#aa-von', 'Bürgerservice Musterstadt');
  await p.fill('#aa-vorgang', 'Anfrage-2026-11-10');
  await p.click('#aa-weiter-1');
  await p.fill('#aa-zweck', 'Termin im Bürgerservice vereinbaren');
}

test.describe('T-CROSS-44 Studio · Stand halten', () => {
  test('Marke und zurück: der Stand der Anfrage ist da', async ({ browser }) => {
    const { ctx, p } = await oeffnen(browser);
    await anfrageBeginnen(p);
    await p.click('#marke-start');
    await expect(p.locator('#raum-anfrage')).toBeHidden();
    await p.evaluate(() => { const d = document.getElementById('start-weitere'); if (d) d.open = true; });   // seit S-1 unter „Weitere Wege“
    await p.click('#ein-anfrage');
    await expect(p.locator('#aa-schritt-2')).toBeVisible();
    await expect(p.locator('#aa-zweck')).toHaveValue('Termin im Bürgerservice vereinbaren');
    await ctx.close();
  });

  test('„Zurück zur Auswahl“ fragt einmal; Weiter bearbeiten behält, Verwerfen leert', async ({ browser }) => {
    const { ctx, p } = await oeffnen(browser);
    await p.evaluate(() => { const d = document.getElementById('start-weitere'); if (d) d.open = true; });   // seit S-1 unter „Weitere Wege“
    await p.click('#ein-anfrage');
    await p.fill('#aa-von', 'Bürgerservice Musterstadt');
    await p.click('#marke-start');
    await p.evaluate(() => { const d = document.getElementById('start-weitere'); if (d) d.open = true; });   // seit S-1 unter „Weitere Wege“
    await p.click('#ein-anfrage');
    await expect(p.locator('#aa-von')).toHaveValue('Bürgerservice Musterstadt');
    await p.click('#aa-zurueck-1');
    const dlg = p.locator('#dlg-verlassen');
    await expect(dlg).toBeVisible();
    await expect(dlg.locator('#vl-weiter')).toHaveText('Weiter bearbeiten');
    await expect(dlg.locator('#vl-verwerfen')).toHaveText('Verwerfen und zur Auswahl');
    await p.click('#vl-weiter');
    await expect(dlg).toBeHidden();
    await expect(p.locator('#raum-anfrage')).toBeVisible();
    await expect(p.locator('#aa-von')).toHaveValue('Bürgerservice Musterstadt');
    await p.click('#aa-zurueck-1');
    await p.click('#vl-verwerfen');
    await expect(p.locator('#raum-start')).toBeVisible();
    await p.evaluate(() => { const d = document.getElementById('start-weitere'); if (d) d.open = true; });   // seit S-1 unter „Weitere Wege“
    await p.click('#ein-anfrage');
    await expect(p.locator('#aa-von')).toHaveValue('');
    await p.click('#aa-zurueck-1');
    await expect(p.locator('#dlg-verlassen')).toBeHidden();   // leerer Weg: keine Frage
    await expect(p.locator('#raum-start')).toBeVisible();
    await ctx.close();
  });

  test('Schrittwechsel: die Überschrift liegt im Fenster und trägt den Fokus', async ({ browser }) => {
    const { ctx, p } = await oeffnen(browser);
    await p.setViewportSize({ width: 1280, height: 720 });
    await p.evaluate(() => { const d = document.getElementById('start-weitere'); if (d) d.open = true; });   // seit S-1 unter „Weitere Wege“
    await p.click('#ein-anfrage');
    await p.fill('#aa-von', 'Bürgerservice Musterstadt');
    await p.evaluate(() => { document.body.style.minHeight = '3000px'; window.scrollTo({ top: 400, behavior: 'instant' }); });
    await p.click('#aa-weiter-1');
    const h = p.locator('#aa-schritt-2 h1');
    await expect(h).toBeVisible();
    await expect.poll(async () => {
      const r = await h.evaluate((e) => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, h: innerHeight }; });
      return r.top >= 0 && r.bottom <= r.h;
    }).toBe(true);
    const leiste = await p.locator('#aa-schritte').evaluate((e) => { const b = e.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; });
    expect(leiste).toBe(true);
    await expect(h).toBeFocused();
    await ctx.close();
  });
});
