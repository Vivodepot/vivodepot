'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Studio per Ziehen und Ablegen: Halten und Ziehen mit dem FINGER (UX-RbB 12.11.2026, Schritt 3)
   ────────────────────────────────────────────────────────────────────────
   Mit Berührung gibt es kein verlässliches HTML-Ziehen. Das Studio bindet darum Zeigerereignisse (zeigerZiehenBinden): halten
   (320 ms), dann ziehen. Die Probe fährt echte Berührungsereignisse (Chromium, CDP Input.dispatchTouchEvent) bei 390 × 844:
     1. Baustein aus der Bausteinliste auf eine Karte halten und ziehen: er steht davor, nicht am Ende.
     2. Eine Karte halten und nach oben ziehen: die Reihenfolge ändert sich; das Bearbeitungsblatt öffnet dabei nicht.
     3. Rollen ohne Halten (sofort bewegen) zieht nichts: kein Baustein kommt hinzu, die Reihenfolge bleibt.
   Seit 14.11.2026 gibt es eine Arbeitsfläche; bis dahin fuhr die Probe 1 bis 3 im einfachen Weg und die Arbeitsfläche als 4.
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
  await page.waitForSelector('#raum-start', { state: 'visible' });
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
const kartenNamen = (page) => page.$$eval('#tpl-felder .vk .vk-name', (els) => els.map((e) => (e.querySelector('.vk-name-eingabe') ? e.querySelector('.vk-name-eingabe').value : (e.firstChild ? e.firstChild.textContent : '')).trim()));
/* Am Telefon öffnet ein neuer Baustein das Bearbeitungsblatt von unten: wie eine Person schließen, bevor es weitergeht. */
async function blattZu(page) { if (await page.locator('#feld-editor:not([hidden])').count()) await page.locator('#ed-speichern').tap(); }
async function zurListe(page, abstand) { await page.evaluate((a) => { const l = document.getElementById('tpl-felder'); window.scrollTo({ top: l.getBoundingClientRect().top + window.scrollY - a, behavior: 'instant' }); }, abstand); }
async function punkt(loc, anteilY, x) {
  const b = await loc.boundingBox();
  return { x: x != null ? x : b.x + 24, y: b.y + b.height * anteilY };
}

test('Studio: Halten und Ziehen mit dem Finger (390 px)', async ({ browser }, testInfo) => {
  test.setTimeout(120000);
  const { ctx, page } = await oeffnen(browser);
  try {
    const cdp = await ctx.newCDPSession(page);
    await expect(page.locator('#raum-start')).toBeVisible();
    await page.locator('#start-leer').tap();
    await expect(page.locator('#raum-bau')).toBeVisible();
    /* S-2 (N68/N69): am Telefon öffnen die Bausteine als Blatt von unten; die häufigen Bausteine stehen offen in ihrer Gruppe */
    await page.locator('#pal-auf').tap();
    await expect(page.locator('#palette.an')).toBeVisible();
    const pal = page.locator('#pal-liste > .pal-eintrag[data-kat]');
    expect(await pal.count(), 'Vorprobe: Bausteinliste der Arbeitsfläche mit mindestens drei Bausteinen').toBeGreaterThanOrEqual(3);
    const namen = await pal.evaluateAll((els) => els.slice(0, 3).map((e) => e.querySelector('span').textContent.trim()));
    await pal.nth(0).locator('.pal-plus').tap(); await blattZu(page);
    await pal.nth(1).locator('.pal-plus').tap(); await blattZu(page);
    expect(await kartenNamen(page), 'Vorprobe: zwei Bausteine per Antippen in der Folge des Antippens').toEqual([namen[0], namen[1]]);

    /* 1. Baustein aus der Bausteinliste vor die erste Karte ziehen */
    const quelle = pal.nth(2);
    const karten = page.locator('#tpl-felder .vk');
    /* Bausteinliste und Vorlage zugleich im Bild: die Liste steht über der Vorlage */
    await quelle.scrollIntoViewIfNeeded();
    await zurListe(page, 700);
    const qb = await quelle.boundingBox(), kb = await karten.nth(0).boundingBox();
    expect(qb && kb && qb.y > 120 && kb.y + 40 < 844, `Vorprobe: Bausteinliste und Vorlage zugleich im Bild (Eintrag bei y=${qb && qb.y}, Karte bei y=${kb && kb.y})`).toBeTruthy();
    await fingerZiehen(page, cdp, await punkt(quelle, 0.5), await punkt(karten.nth(0), 0.12, 150), 450);
    await blattZu(page);
    expect.soft(await kartenNamen(page), 'Halten und Ziehen aus der Bausteinliste setzt den Baustein vor die erste Karte; Ereignisse: ' + await ereignisse(page)).toEqual([namen[2], namen[0], namen[1]]);

    /* 2. Eine Karte halten und nach oben ziehen — am Griff ⋮⋮ links; rechts in der Namenszeile stehen seit dem Nachwagen
       (Dummy 14.11.2026) die Symbolknöpfe ✎ ↑ ↓ ✕, auf einem Knopf beginnt kein Ziehen */
    await zurListe(page, 150);
    await fingerZiehen(page, cdp, await punkt(karten.nth(2), 0.12), await punkt(karten.nth(0), 0.1), 450);
    expect.soft(await kartenNamen(page), 'Eine Karte halten und nach oben ziehen ordnet um; Ereignisse: ' + await ereignisse(page)).toEqual([namen[1], namen[2], namen[0]]);
    expect.soft(await page.locator('#eigenschaften.editor-offen').count(), 'Das Ziehen öffnet das Bearbeitungsblatt nicht').toBe(0);

    /* 3. ohne Halten: sofort bewegen = Rollen, nichts wird gezogen */
    await zurListe(page, 150);
    const vorher = await kartenNamen(page);
    await fingerZiehen(page, cdp, await punkt(karten.nth(2), 0.12), await punkt(karten.nth(0), 0.1), 0);
    expect.soft(await kartenNamen(page), 'Rollen ohne Halten zieht nichts').toEqual(vorher);
  } finally {
    await page.screenshot({ path: testInfo.outputPath('studio-ziehen-finger-390.png'), fullPage: true }).catch(() => {});
    await ctx.close();
  }
});
