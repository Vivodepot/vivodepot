'use strict';
/* Die untere Tableiste schaltet das Erscheinungsbild nicht ab (05.11.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   Befund NOTFALL-MOBIL-TABLEISTE-RUECKFALL: bei 390 px fiel die ganze Anwendung auf ungestaltetes HTML zurück, sobald die Mitte der
   geschützten Notfall-Ansicht (.notfall-rahmen, data-schutz) hinter der festen unteren Tableiste (#bottom-tabs) lag. Die Laufzeitprobe
   des Erscheinungsbilds prüft den Mittelpunkt mit elementFromPoint; die Tableiste gehört zum Rahmen der App, stand aber nicht in
   ueberdeckenErlaubt. Ob es traf, hing allein von der Höhe der Ansicht ab, also von der Menge der eingetragenen Angaben.

   1 · Befund-Probe: die Höhe wird so eingestellt, dass die Mitte 30 px über dem unteren Rand liegt (hinter der Tableiste); verlangt
       ist: kein Rückfall. Grün mit "#bottom-tabs" in ueberdeckenErlaubt; rot ohne diesen Eintrag.
   2 · Gegenprobe: die Zulassung gilt nur der Tableiste. Ein fremdes Element an derselben Stelle führt weiter zum Rückfall
       ({ element: '.content-narrow', grund: 'ueberdeckt' }).
   3 · Gegenprobe: die Zulassung gilt nur in Leistenform (ERSCHEINUNGSBILD_REGELN.leistenform: unten bündig, höchstens 96 px bzw.
       ein Achtel der Fensterhöhe). Zieht das Stilblatt des Erscheinungsbild-Moduls die Tableiste auf 100vh, folgt der Rückfall.
       Die Regel kommt erst in der Notfall-Ansicht ins Modulblatt: eine von Anfang an bildschirmhohe Leiste ließe das Anlegen
       nicht zu. */
const { test, expect } = require('@playwright/test');
const h = require('./helpers.js');

async function notfallOeffnen(browser, url) {
  const kontext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await kontext.newPage();
  await h.oeffneApp(page, { url });
  await h.depotAnlegen(page, { pw: 'e2e-passwort-123' });
  for (let k = 0; k < 3; k++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(150); }
  await page.evaluate(() => document.querySelector('.sidebar [data-notfall]').click());
  await expect(page.locator('.notfall-rahmen')).toBeVisible();
  await expect(page.locator('#bottom-tabs')).toBeVisible();
  return { kontext, page };
}
async function notfallMitteUnten(browser) {
  const { kontext, page } = await notfallOeffnen(browser, h.KERN_URL_PRIVAT_DE);
  const leiste = await page.evaluate(() => document.getElementById('bottom-tabs').getBoundingClientRect().height);
  expect(leiste, 'Voraussetzung: die Tableiste hat Leistenform').toBeLessThanOrEqual(Math.min(96, 844 / 8));
  // Höhe so wählen, dass die Mitte der Ansicht 30 px über dem unteren Rand liegt — dort steht die Tableiste.
  await page.evaluate(() => {
    const el = document.querySelector('.notfall-rahmen');
    const r = el.getBoundingClientRect();
    const ziel = 2 * (innerHeight - 30 - r.top);
    const fueller = document.createElement('div');
    fueller.style.height = Math.max(0, ziel - r.height) + 'px';
    el.appendChild(fueller);
  });
  const oben = await page.evaluate(() => {
    const r = document.querySelector('.notfall-rahmen').getBoundingClientRect();
    const o = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return o && o.closest('#bottom-tabs') ? 'bottom-tabs' : (o && o.className);
  });
  expect(oben, 'Voraussetzung: die Mitte liegt hinter der Tableiste').toBe('bottom-tabs');
  return { kontext, page };
}
const zustand = (page) => page.evaluate(() => ({
  rueckfall: document.documentElement.getAttribute('data-erscheinungsbild') === 'rueckfall',
  verstoesse: ERSCHEINUNGSBILD_RUECKFALL,
}));

test('Notfall-Ansicht am Handy: deren Mitte hinter der unteren Tableiste führt nicht zum Rückfall', async ({ browser }) => {
  const { kontext, page } = await notfallMitteUnten(browser);
  await page.waitForTimeout(800);   // Laufzeitprobe (250 ms gebündelt)
  expect(await zustand(page), 'die Tableiste der App darf die Notfall-Ansicht überdecken').toEqual({ rueckfall: false, verstoesse: null });
  await kontext.close();
});

test('Gegenprobe: ein fremdes Element an derselben Stelle führt weiter zum Rückfall', async ({ browser }) => {
  const { kontext, page } = await notfallMitteUnten(browser);
  await page.waitForTimeout(800);
  expect((await zustand(page)).rueckfall, 'vor dem fremden Element').toBe(false);
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;z-index:99999;background:#fff;left:0;bottom:0;width:100vw;height:120px';
    document.body.appendChild(d);
  });
  await page.waitForTimeout(800);
  const z = await zustand(page);
  expect(z.rueckfall, 'fremde Überdeckung fällt zurück').toBe(true);
  expect(z.verstoesse).toContainEqual({ element: '.content-narrow', grund: 'ueberdeckt' });
  await kontext.close();
});

test('Gegenprobe: das Modul zieht die Tableiste auf 100vh — dann gilt die Überlagerung wieder', async ({ browser }) => {
  const { kontext, page } = await notfallOeffnen(browser, h.KERN_URL_PRIVAT_DE);
  await page.waitForTimeout(800);
  expect((await zustand(page)).rueckfall, 'vor der Änderung am Modulblatt').toBe(false);
  const r = await page.evaluate(() => {
    _ebModulBlatt.insertRule('.bottom-tabs { height: 100vh; }', _ebModulBlatt.cssRules.length);
    document.body.appendChild(document.createElement('div'));   // stößt die Laufzeitprobe an wie jede Änderung am Baum
    const b = document.getElementById('bottom-tabs').getBoundingClientRect();
    const n = document.querySelector('.notfall-rahmen').getBoundingClientRect();
    const o = document.elementFromPoint(n.left + n.width / 2, n.top + n.height / 2);
    return { hoehe: b.height, oben: !!(o && o.closest('#bottom-tabs')) };
  });
  expect(r.hoehe, 'Voraussetzung: die Leiste ist über die Leistenform gezogen').toBeGreaterThan(96);
  expect(r.oben, 'Voraussetzung: die Leiste liegt über der Mitte der Ansicht').toBe(true);
  await page.waitForTimeout(800);
  const z = await zustand(page);
  expect(z.rueckfall, 'die übergroße Leiste fällt zurück').toBe(true);
  expect(z.verstoesse).toContainEqual({ element: '.content-narrow', grund: 'ueberdeckt' });
  await kontext.close();
});
