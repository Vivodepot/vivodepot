'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Studio per Ziehen und Ablegen: Halten und Ziehen mit dem FINGER (UX-RbB 12.11.2026, Schritt 3)
   ────────────────────────────────────────────────────────────────────────
   Mit Berührung gibt es kein verlässliches HTML-Ziehen. Das Studio bindet darum Zeigerereignisse (zeigerZiehenBinden): halten
   (320 ms), dann ziehen. Die Probe fährt echte Berührungsereignisse (Chromium, CDP Input.dispatchTouchEvent) bei 390 × 844:
     1. Baustein aus der Palette auf eine Frage halten und ziehen: er steht davor, nicht am Ende.
     2. Eine Frage halten und nach oben ziehen: die Reihenfolge ändert sich.
     3. Rollen ohne Halten (sofort bewegen) zieht nichts: kein Baustein kommt hinzu, die Reihenfolge bleibt.
     4. In der Arbeitsfläche (Expertensicht): eine Karte halten und ziehen ordnet um.
   Rot-Beweis: STUDIO_DATEI=<Quelltext vor der Änderung> — ohne Palette im einfachen Weg und ohne Zeigerbindung rot.
   Rot-Beweis gemessen 12.11.2026 gegen dce400a33: 1 failed („Palette im einfachen Weg mit mindestens drei Bausteinen“), mit dem Bau: 1 passed.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const path = require('node:path');

const STUDIO_URL = 'file://' + (process.env.STUDIO_DATEI || path.join(__dirname, '..', '..', 'vivodepot-studio.html'));

async function oeffnen(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, locale: 'de-DE' });
  await ctx.route('**', (r) => (/^(file|data|blob):/.test(r.request().url()) ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);   // kein Warten ohne Ende an einem verdeckten Knopf
  /* Mitschrift der Zeiger- und Berührungsereignisse: steht im Fehlertext, wenn das Ziehen nichts tut */
  await page.addInitScript(() => {
    window.__ev = [];
    ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchmove', 'touchend', 'touchcancel', 'contextmenu', 'dragstart'].forEach((n) => {
      document.addEventListener(n, (e) => { if (window.__ev.length < 400) window.__ev.push(n + (e.pointerType ? ':' + e.pointerType : '') + (e.cancelable === false ? '!' : '') + (n === 'pointerdown' || n === 'pointerup' || n === 'pointercancel' ? '@' + Math.round(e.clientX) + ',' + Math.round(e.clientY) + '>' + ((e.target && e.target.tagName) || '') + '.' + String((e.target && e.target.className) || '').slice(0, 24) : '')); }, true);
    });
  });
  await page.goto(STUDIO_URL);
  await page.waitForSelector('#raum-eingang', { state: 'visible' });
  return { ctx, page };
}
async function fingerZiehen(page, cdp, von, nach, haltenMs) {
  const t = (x, y) => [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: t(von.x, von.y) });
  await page.waitForTimeout(haltenMs);
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: t(von.x + (nach.x - von.x) * i / 10, von.y + (nach.y - von.y) * i / 10) });
    await page.waitForTimeout(25);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(150);
}
const ereignisse = (page) => page.evaluate(() => { const c = []; (window.__ev || []).forEach((n) => { if (/^pointer(down|up|cancel)/.test(n) || c[c.length - 1] !== n) c.push(n); }); return JSON.stringify(c.slice(-14)); });
const frageNamen = (page) => page.$$eval('#as-felder .as-frage .as-frage-name', (els) => els.map((e) => e.textContent.replace(/\s*\*\s*$/, '').trim()));
async function punkt(loc, anteilY, x) {
  const b = await loc.boundingBox();
  return { x: x != null ? x : b.x + 24, y: b.y + b.height * anteilY };
}

test('Studio: Halten und Ziehen mit dem Finger (390 px)', async ({ browser }, testInfo) => {
  test.setTimeout(120000);
  const { ctx, page } = await oeffnen(browser);
  try {
    const cdp = await ctx.newCDPSession(page);
    await page.locator('#ein-vorlage').tap();
    await expect(page.locator('#raum-assistent')).toBeVisible();
    const pal = page.locator('#as-pal-liste details[open] .pal-eintrag[data-kat]');
    expect(await pal.count(), 'Vorprobe: Palette im einfachen Weg mit mindestens drei Bausteinen').toBeGreaterThanOrEqual(3);
    const namen = await pal.evaluateAll((els) => els.slice(0, 3).map((e) => e.querySelector('span').textContent.trim()));
    await pal.nth(0).locator('.pal-plus').tap();
    await pal.nth(1).locator('.pal-plus').tap();
    expect(await frageNamen(page), 'Vorprobe: zwei Bausteine per Antippen in der Folge des Antippens').toEqual([namen[0], namen[1]]);

    /* 1. Baustein aus der Palette vor die erste Frage ziehen */
    const quelle = pal.nth(2);
    /* Palette und Bogen zugleich im Bild: die Palette steht unter dem Bogen, der Bogen beginnt unter der Kopfzeile */
    await page.evaluate(() => { const l = document.getElementById('as-felder'); window.scrollTo({ top: l.getBoundingClientRect().top + window.scrollY - 110, behavior: 'instant' }); });
    const qb = await quelle.boundingBox();
    expect(qb && qb.y > 0 && qb.y + qb.height < 844, `Vorprobe: Palette und Bogen zugleich im Bild (Eintrag bei y=${qb && qb.y})`).toBeTruthy();
    await fingerZiehen(page, cdp, await punkt(quelle, 0.5), await punkt(page.locator('#as-felder .as-frage').nth(0), 0.2, 150), 450);
    expect.soft(await frageNamen(page), 'Halten und Ziehen aus der Palette setzt den Baustein vor die erste Frage; Ereignisse: ' + await ereignisse(page)).toEqual([namen[2], namen[0], namen[1]]);

    /* 2. Eine Frage halten und nach oben ziehen */
    await page.evaluate(() => { const l = document.getElementById('as-felder'); window.scrollTo({ top: l.getBoundingClientRect().top + window.scrollY - 150, behavior: 'instant' }); });   // der Bogen liegt unter der Kopfzeile
    const fragen = page.locator('#as-felder .as-frage');
    await fingerZiehen(page, cdp, await punkt(fragen.nth(2), 0.3, 200), await punkt(fragen.nth(0), 0.2, 200), 450);
    expect.soft(await frageNamen(page), 'Eine Frage halten und nach oben ziehen ordnet um; Ereignisse: ' + await ereignisse(page)).toEqual([namen[1], namen[2], namen[0]]);

    /* 3. ohne Halten: sofort bewegen = Rollen, nichts wird gezogen */
    const vorher = await frageNamen(page);
    await fingerZiehen(page, cdp, await punkt(fragen.nth(2), 0.3, 200), await punkt(fragen.nth(0), 0.2, 200), 0);
    expect.soft(await frageNamen(page), 'Rollen ohne Halten zieht nichts').toEqual(vorher);

    /* 4. Arbeitsfläche: eine Karte halten und ziehen */
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.locator('#as-fachebene').tap();
    await expect(page.locator('#raum-bau')).toBeVisible();
    const karten = page.locator('#tpl-felder .vk');
    expect(await karten.count()).toBe(3);
    const kn = () => page.$$eval('#tpl-felder .vk .vk-name', (els) => els.map((e) => (e.firstChild ? e.firstChild.textContent : '').trim()));
    const e0 = await kn();
    await karten.nth(2).scrollIntoViewIfNeeded();
    await page.evaluate(() => { const l = document.getElementById('tpl-felder'); window.scrollTo({ top: l.getBoundingClientRect().top + window.scrollY - 150, behavior: 'instant' }); });
    await fingerZiehen(page, cdp, await punkt(karten.nth(2), 0.12, 200), await punkt(karten.nth(0), 0.1, 200), 450);
    expect.soft(await kn(), 'Arbeitsfläche: eine Karte halten und nach oben ziehen ordnet um').toEqual([e0[2], e0[0], e0[1]]);
    expect.soft(await page.locator('#eigenschaften.editor-offen').count(), 'Das Ziehen öffnet das Bearbeitungsblatt nicht').toBe(0);
  } finally {
    await page.screenshot({ path: testInfo.outputPath('studio-ziehen-finger-390.png'), fullPage: true }).catch(() => {});
    await ctx.close();
  }
});
