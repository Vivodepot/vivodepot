'use strict';
/* Befund HIDDEN-SCHLAEGT-DISPLAY (MITTEL, 01.11.2026): ein Element mit dem Attribut hidden war sichtbar, weil eine Klasse display
   setzt (.btn: inline-flex) und die Browser-Vorgabe für [hidden] schwächer ist als jede Autorenregel. Gefunden an der Pille
   „Wieder sechs Wörter nehmen“ im Anlege-Dialog, Zustand A. Die Klasse ist breiter: jedes Element mit hidden und gesetztem display.
   Diese Probe geht über ALLE Elemente mit hidden in den gerenderten Zuständen von Privat und Pro und verlangt display: none.
   Der statische Wächter gegen die Klasse (Regel im Gerüst, kein display-!important ohne :not([hidden])) steht in
   tests/hidden-regel-geruest.test.js.

   Dazu der Fund der Gestaltungsleitung (01.11.2026): bei 390 px lagen die sechs Wörter hinter der Knopfleiste. Seit diesem Wagen
   steht der Wortblock über dem Passwortfeld (GL-Entscheid 31.10.2026, Abweichung 1); die Probe misst, dass er ohne Scrollen ganz
   über der Knopfleiste und im Fenster steht. */
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

const PRODUKTE = [['privat-de', h.KERN_URL_PRIVAT_DE], ['pro-de', h.KERN_URL_PRO_DE]].filter(([slug]) => h.baubar(slug));   // pro-de nur, wo es gebaut wird: öffentlich gehen nur die zwei Privat-Produkte hinaus (h.baubar)

async function anlegeDialogOeffnen(page, url) {
  await h.oeffneApp(page, { url });
  await page.click('#w-anfangen');
  await page.waitForSelector(':is([data-anlegen-weg], [data-bereich-leer="vorschau"] [data-umschau-eintragen]):visible', { state: 'attached' });
  await page.click(':is([data-anlegen-weg], [data-bereich-leer="vorschau"] [data-umschau-eintragen]):visible');
  await page.waitForSelector('#id-vorname', { state: 'visible' });
}

// Jedes Element mit hidden, dessen berechnete Anzeigeart nicht none ist — mit Kennung, damit die rote Meldung die Stelle nennt.
const sichtbareHidden = (page) => page.evaluate(() => [...document.querySelectorAll('[hidden]')]
  .filter((el) => el.getAttribute('hidden') !== 'until-found' && getComputedStyle(el).display !== 'none')
  .map((el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '')));

for (const [name, url] of PRODUKTE) {
  test(`[HIDDEN-SCHLAEGT-DISPLAY] ${name}: kein Element mit hidden ist sichtbar — Start, Vorschau, Anlege-Dialog A und B`, async ({ page }) => {
    await h.oeffneApp(page, { url });
    expect(await sichtbareHidden(page), 'Startschirm').toEqual([]);
    await anlegeDialogOeffnen(page, url);
    expect(await sichtbareHidden(page), 'Anlege-Dialog, Zustand A (Vorschlag)').toEqual([]);
    await expect(page.locator('#id-pw-vorschlag-knopf')).toBeHidden();
    await page.click('#id-pw-eigen-weg');   // Zielbild 01: das Passwort-Feld steht erst beim eigenen Passwort da
    await page.fill('#id-pw', 'sommer2026!');
    await expect(page.locator('#id-pw-vorschlag-knopf')).toBeVisible();
    expect(await sichtbareHidden(page), 'Anlege-Dialog, Zustand B (eigenes Passwort)').toEqual([]);
    await page.click('#id-pw-vorschlag-knopf');
    expect(await sichtbareHidden(page), 'Anlege-Dialog, zurück in Zustand A').toEqual([]);
  });

  test(`[PW-Wortblock-390] ${name}: die sechs Wörter stehen bei 390 px ohne Scrollen über der Knopfleiste`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await anlegeDialogOeffnen(page, url);
    await expect(page.locator('#id-pw-vorschlag-woerter')).toBeVisible();
    const m = await page.evaluate(() => {
      const woerter = document.getElementById('id-pw-vorschlag-woerter');
      const feld = document.getElementById('id-pw2');   // Zielbild 01: die Probe steht direkt unter den Wörtern
      // „Ohne Scrollen“: jeden Scrollbereich über den Wörtern an den Anfang setzen, dann messen.
      for (let el = woerter.parentElement; el; el = el.parentElement) el.scrollTop = 0;
      window.scrollTo(0, 0);
      const w = woerter.getBoundingClientRect();
      const fuss = woerter.closest('.modal').querySelector('.modal-aktionen').getBoundingClientRect();
      // Zielbild 01: sechs Kacheln im Raster, zwei Spalten bei 390 px; kein Wort bricht in seiner Kachel um.
      const li = [...woerter.querySelectorAll('li')];
      const spalten = new Set(li.map((e) => Math.round(e.getBoundingClientRect().left))).size;
      const umbrochen = li.filter((e) => { const r = document.createRange(); r.selectNodeContents(e); return r.getClientRects().length > 1; }).length;
      return { wOben: w.top, wUnten: w.bottom, fussOben: fuss.top, fenster: window.innerHeight, feldOben: feld.getBoundingClientRect().top,
        kacheln: li.length, spalten, umbrochen };
    });
    expect(m.wOben, 'Wörter beginnen im Fenster').toBeGreaterThanOrEqual(0);
    expect(m.wUnten, 'Wörter enden über der Knopfleiste').toBeLessThanOrEqual(m.fussOben);
    expect(m.wUnten, 'Wörter enden im Fenster').toBeLessThanOrEqual(m.fenster);
    expect(m.wUnten, 'Wortblock steht über der Probe').toBeLessThanOrEqual(m.feldOben);
    expect(m.kacheln, 'sechs Wörter als sechs Kacheln').toBe(6);
    expect(m.spalten, 'zwei Spalten bei 390 px').toBe(2);
    expect(m.umbrochen, 'kein Wort bricht in seiner Kachel um').toBe(0);
  });
}
