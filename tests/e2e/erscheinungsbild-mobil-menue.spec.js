'use strict';
/* Das Menü am schmalen Bildschirm schaltet das Erscheinungsbild nicht ab (30.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   Befund UX-MOBIL-ERSCHEINUNGSBILD-WAECHTER: bei 390 px, Touch, fiel die ganze Anwendung auf ungestaltetes HTML zurück, sobald
   das Menü über der Notfall-Ansicht aufging. Die Laufzeitprobe des Erscheinungsbilds sah die geschützte Notfall-Ansicht
   (.notfall-rahmen, data-schutz) von Seitenleiste und Hintergrund überdeckt; beide standen nicht in ueberdeckenErlaubt.
   Jetzt dürfen sie überdecken, solange das Menü offen ist (html.menue-auf).

   Geprüft in Privat und Pro, bei 390 × 844 mit Touch:
     1 · Notfall öffnen → Menü öffnen → Menü schließen → Notfall schließen → Menü öffnen → Menü schließen: kein Rückfall.
     2 · Ein offener Dialog (Einstellungen), danach Menü öffnen und schließen: kein Rückfall.
   Beide Seiten der Regel:
     3 · Rot-Beweis: dieselbe Laufzeitprobe mit der Liste ohne die zwei Menü-Einträge meldet bei offenem Menü „ueberdeckt“.
     4 · Gefangen bleibt, was die Notfall-Ansicht nach dem Schließen des Menüs noch überdeckt: html.menue-auf ist weg, und ein
         fremdes Element darüber führt weiter zum Rückfall.
     5 · Jeder Schließweg nimmt die Klasse an #app und <html> weg: Menü-Knopf, Escape, Wechsel zur breiten Ansicht. */
const { test, expect } = require('@playwright/test');
const h = require('./helpers.js');

const MOBIL = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

const zustand = (page) => page.evaluate(() => ({
  rueckfall: document.documentElement.getAttribute('data-erscheinungsbild') === 'rueckfall',
  verstoesse: ERSCHEINUNGSBILD_RUECKFALL,
}));
async function istOffen(page, offen) {
  for (const sel of ['#app', 'html']) await expect(page.locator(sel)).toHaveClass(offen ? /\bmenue-auf\b/ : /^(?!.*\bmenue-auf\b)/);
}
async function menue(page, offen) {
  await page.locator('#tb-menue').click();
  await istOffen(page, offen);
  await page.waitForTimeout(600);   // Schublade eingefahren, Laufzeitprobe (250 ms gebündelt) gelaufen
}

test('Menü über Notfall-Ansicht und Dialog lässt das Erscheinungsbild stehen, Überdeckung danach bleibt gefangen', async ({ browser }) => {
  test.setTimeout(240000);
  for (const [produkt, url] of [['privat', h.KERN_URL_PRIVAT_DE], ['pro', h.KERN_URL_PRO_DE]].filter(([p]) => p === 'privat' || h.baubar('pro-de'))) {   // pro-de nur, wo es gebaut wird: öffentlich gehen nur die zwei Privat-Produkte hinaus (h.baubar)
    const kontext = await browser.newContext(MOBIL);   // je Produkt ein frischer Kontext: kein Depot aus dem vorigen
    const page = await kontext.newPage();
    await h.oeffneApp(page, { url });
    await h.depotAnlegen(page, { pw: 'e2e-passwort-123' });
    for (let k = 0; k < 3; k++) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(150); }
    expect(await zustand(page), produkt + ': Start').toEqual({ rueckfall: false, verstoesse: null });

    const mitNotfall = produkt === 'privat';
    if (mitNotfall) {
      await menue(page, true);
      await page.locator('.sidebar [data-notfall]').click();
      await expect(page.locator('.notfall-rahmen')).toBeVisible();
      await page.waitForTimeout(600);
      await menue(page, true);
      expect(await zustand(page), produkt + ': Menü offen über Notfall').toEqual({ rueckfall: false, verstoesse: null });

      // 3 · Rot-Beweis: ohne die Menü-Einträge meldet dieselbe Probe die Überdeckung.
      const ohne = await page.evaluate(() => erscheinungsbildSchutzProbe(document, Object.assign({}, ERSCHEINUNGSBILD_REGELN, {
        ueberdeckenErlaubt: ERSCHEINUNGSBILD_REGELN.ueberdeckenErlaubt.filter((s) => s.indexOf('html.menue-auf') !== 0),
      })));
      expect(ohne, 'Rot-Beweis: alte Liste').toContainEqual({ element: '.content-narrow', grund: 'ueberdeckt' });
      expect(await page.evaluate(() => erscheinungsbildSchutzProbe(document)), 'neue Liste').toEqual([]);

      await menue(page, false);
      await page.locator('#n-schliessen').click();
      await page.waitForTimeout(600);
    }
    await menue(page, true);
    await menue(page, false);
    expect(await zustand(page), produkt + ': nach Notfall, Menü auf und zu').toEqual({ rueckfall: false, verstoesse: null });

    // 2 · Offener Dialog, dann Menü.
    await page.locator('#tb-einstellungen').click();
    await expect(page.locator('[role=dialog]:visible, [aria-modal=true]:visible').first()).toBeVisible();
    await page.waitForTimeout(600);
    expect(await zustand(page), produkt + ': Dialog offen').toEqual({ rueckfall: false, verstoesse: null });
    // Über den Knopf des Dialogs: Escape schließt diesen Dialog heute nicht (eigener Befund, MITTEL).
    await page.locator('#modal-inhalt button').filter({ hasText: /Schließen|Fertig|Abbrechen|OK/ }).last().click();
    await expect(page.locator('#modal-rueck')).not.toHaveClass(/\ban\b/);
    await page.waitForTimeout(400);
    await menue(page, true);
    await menue(page, false);
    expect(await zustand(page), produkt + ': nach Dialog, Menü auf und zu').toEqual({ rueckfall: false, verstoesse: null });

    // 5 · Escape und der Wechsel zur breiten Ansicht schließen das Menü; danach steht menue-auf weder an #app noch an <html>.
    await menue(page, true);
    await page.keyboard.press('Escape');
    await istOffen(page, false);
    await menue(page, true);
    await page.setViewportSize({ width: 1280, height: 844 });
    await istOffen(page, false);
    await page.setViewportSize(MOBIL.viewport);
    await page.waitForTimeout(600);
    expect(await zustand(page), produkt + ': nach Escape und breiter Ansicht').toEqual({ rueckfall: false, verstoesse: null });

    // 4 · Nach dem Schließen des Menüs (html.menue-auf ist weg) prüft der Wächter wieder: ein fremdes Element über der
    //     Notfall-Ansicht führt weiter zum Rückfall.
    if (mitNotfall) {
      await menue(page, true);
      await page.locator('.sidebar [data-notfall]').click();
      await expect(page.locator('.notfall-rahmen')).toBeVisible();
      if (await page.locator('#app.menue-auf').count()) await menue(page, false);
      await istOffen(page, false);
      await page.evaluate(() => {
        const r = document.querySelector('.notfall-rahmen').getBoundingClientRect();
        const d = document.createElement('div');
        d.style.cssText = 'position:fixed;z-index:9999;background:#fff;left:0;top:' + r.top + 'px;width:100vw;height:' + r.height + 'px';
        document.body.appendChild(d);
      });
      await page.waitForTimeout(600);
      const z = await zustand(page);
      expect(z.rueckfall, produkt + ': fremde Überdeckung fällt zurück').toBe(true);
      expect(z.verstoesse).toContainEqual({ element: '.content-narrow', grund: 'ueberdeckt' });
    }
    await kontext.close();
  }
});
