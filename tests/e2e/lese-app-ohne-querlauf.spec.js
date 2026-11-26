'use strict';
/* ═══════════════════════════════════════════════════════
   Lese-App am Handy: keine Ansicht ist breiter als das Fenster (LESE-KOPF-390, 03.11.2026)
   ───────────────────────────────────────────────────────
   Fund bei 390 px: der Kopf (Marke, Link, Etikett, Hilfe, Schließen) war 417 px breit, in der Notfall-Ansicht 461 px; das
   Handy scrollte waagerecht, „Schließen" war abgeschnitten. Diese Probe öffnet eine echte Depot-Datei und misst JEDE Ansicht aus
   tests/e2e/support/lese-app-ansichten.js bei 390, 360 und 320 px, auf Deutsch, auf Englisch und als Empfänger-Ausschnitt: die Seite ist nicht breiter als das
   Fenster, und kein Teil des Kopfs ragt über den rechten Rand. Dass jede Ansicht der Lese-App in der Liste steht, prüft
   tests/lese-app-ansichten-vollstaendig.test.js.
   VD_LESE_DATEI=<pfad> misst eine andere Fassung der Lese-App (Rot-Beweis gegen den Stand vor dem Fix).
   ═══════════════════════════════════════════════════════ */
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { test, expect } = require('@playwright/test');
const { ladeKern } = require('../load-kern.js');
const { ANSICHTEN, querlaufMessen } = require('./support/lese-app-ansichten.js');

const LESE_URL = 'file://' + (process.env.VD_LESE_DATEI || path.join(__dirname, '..', '..', 'vivodepot-lesen.html'));
const PW = 'lese-querlauf-2026-passwort';
const WEGWERF = [];   // je Lauf angelegte Verzeichnisse der Depot-Dateien; afterAll räumt sie
test.afterAll(() => { for (const d of WEGWERF) fs.rmSync(d, { recursive: true, force: true }); });

async function depotDatei(art) {
  // art: 'de' | 'en' — das eigene Depot; 'ausschnitt' — ein Empfänger-Ausschnitt (Band „Ein Ausschnitt aus dem Vivodepot von …").
  const sprache = art === 'en' ? 'en' : null;
  const geschrieben = [];
  function FakeBlob(teile) { this._text = String((teile && teile[0]) || ''); }
  const handle = { name: 'q.vivodepot', createWritable: async () => ({ write: async (b) => { geschrieben.push(b._text); }, close: async () => {} }) };
  const { V } = ladeKern({ Blob: FakeBlob, showSaveFilePicker: async () => handle });
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'givenName', 'Elisabeth');
  V.sektorFeldSetzen('identity', 'familyName', 'Wredenhagen-Sonnenschein');
  if (sprache) V.getData().textsprache = sprache;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lese-querlauf-'));
  WEGWERF.push(dir);
  const pfad = path.join(dir, art + '.vivodepot');
  if (art === 'ausschnitt') {
    await V.empfaengerkreisSetzen({ name: 'Notfall', bausteine: ['notfall'] });
    const { umschlag } = await V.empfaengerDateiErzeugen(V.empfaengerkreiseListe()[0], PW);
    fs.writeFileSync(pfad, V.dateiMitMagic(JSON.stringify(umschlag)), 'utf8');
    return pfad;
  }
  await V.depotHerunterladen();
  fs.writeFileSync(pfad, geschrieben[geschrieben.length - 1], 'utf8');
  return pfad;
}

for (const breite of [390, 360, 320]) {
  for (const sprache of ['de', 'en', 'ausschnitt']) {
    test('[Lese-App·Querlauf] ' + breite + ' px, ' + sprache + ': keine Ansicht ist breiter als das Fenster', async ({ browser }) => {
      const datei = await depotDatei(sprache);
      const ctx = await browser.newContext({ viewport: { width: breite, height: 844 }, locale: sprache === 'en' ? 'en-GB' : 'de-DE' });
      const page = await ctx.newPage();
      const seitenfehler = [];
      page.on('pageerror', (e) => seitenfehler.push(e.message));
      const befunde = [];
      const messen = async (name) => { for (const b of await page.evaluate(querlaufMessen)) befunde.push(name + ': ' + b); };

      await page.goto(LESE_URL);
      await messen('renderWelcome (Start)');
      await page.locator('#datei-input').setInputFiles(datei);
      await expect(page.locator('#pw-feld')).toBeVisible();
      await messen('renderPasswort');
      await page.locator('#pw-feld').fill(PW);
      await page.locator('#pw-form').evaluate((f) => f.requestSubmit());
      await expect(page.locator('body')).toContainText('Elisabeth', { timeout: 15000 });
      await messen('renderVollExport');
      if (sprache === 'ausschnitt') await expect(page.locator('.sub-banner')).toBeVisible();
      const reiter = page.locator('#sidebar .nav-item');
      const n = await reiter.count();
      expect(n, 'die Depot-Ansicht hat Reiter').toBeGreaterThan(sprache === 'ausschnitt' ? 0 : 3);
      // Unter 720 px stehen die Bereiche hinter dem Menüknopf (H-2, 22.11.2026): vor jedem Tipp das Menü öffnen und mitmessen.
      const menue = page.locator('#nav-menue-knopf');
      for (let i = 0; i < n; i++) {
        const r = reiter.nth(i);
        if (await menue.isVisible()) { await menue.click(); if (i === 0) await messen('renderVollExport, Menü der Bereiche offen'); }
        const t = (await r.innerText()).trim();
        await r.click();
        await messen('renderVollExport, Reiter „' + t + '"');
      }
      await page.locator('#btn-hilfe').click();
      await messen('renderVollExport, Hilfe');

      for (const [name, aufruf] of Object.entries(ANSICHTEN)) {
        if (aufruf === 'ablauf') continue;
        await page.evaluate(aufruf);
        await messen(name);
      }
      await ctx.close();
      expect(seitenfehler, 'Fehler der Seite').toEqual([]);
      expect(befunde, 'Ansichten mit waagerechtem Überlauf bei ' + breite + ' px').toEqual([]);
    });
  }
}

test('[Lese-App·Querlauf·Rot-Beweis] die Messung meldet einen Kopf, der über den Rand ragt, auch wenn die Seite ihn verdeckt', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(LESE_URL);
  await page.evaluate(() => renderNotfall());
  expect(await page.evaluate(querlaufMessen)).toEqual([]);
  await page.evaluate(() => { const b = document.createElement('button'); b.textContent = 'x'; b.style.cssText = 'width:600px;flex-shrink:0'; document.querySelector('.topbar').appendChild(b); });
  const breit = await page.evaluate(querlaufMessen);
  expect(breit.some((z) => /^Seite \d+ px breit/.test(z)), breit.join(' | ')).toBe(true);
  await page.evaluate(() => { document.documentElement.style.overflowX = 'hidden'; document.body.style.overflowX = 'hidden'; document.querySelector('.topbar').style.overflow = 'hidden'; });
  const verdeckt = await page.evaluate(querlaufMessen);
  expect(verdeckt.some((z) => / endet bei \d+ px$/.test(z)), verdeckt.join(' | ')).toBe(true);
  await ctx.close();
});

test('[Lese-App·Querlauf·Rot-Beweis] die Messung meldet zwei Teile des Kopfs, die einander überlappen', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(LESE_URL);
  await page.evaluate(() => renderNotfall());
  await page.evaluate(() => { const l = document.querySelector('.tb-marke-link'); l.style.cssText = 'flex-shrink:1;min-width:0;width:10px;white-space:nowrap;grid-row:1;grid-column:1'; });
  const ueber = await page.evaluate(querlaufMessen);
  expect(ueber.some((z) => / überlappt /.test(z)), ueber.join(' | ')).toBe(true);
  await ctx.close();
});
