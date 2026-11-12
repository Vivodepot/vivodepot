// @ts-check
/* gruppenkarte-titel-ganz.spec.js — die Kopfzeile einer Gruppenkarte steht ganz (Zielbild 05 „Identität & Person“, 05.11.2026)
   Bei 768 px brachen die Titel zugeklappter Karten mitten im Wort („Ausweis & Aufenth alt“), bei 1440 px endeten die Inhaltszeilen
   auf „…“ („Art, Aufent…“). DIE KLASSE: jede Kopfzeile einer Gruppenkarte in jeder Breite. Verlangt, je Breite 1440, 1100, 768, 390:
     1. kein Wort eines Titels oder einer Inhaltszeile steht auf zwei Zeilen (je Wort genau ein Zeilenrechteck);
     2. keine Inhaltszeile ist abgeschnitten (scrollWidth ≤ clientWidth);
     3. die Seite rollt nicht seitlich (scrollWidth ≤ Fensterbreite).
     4. jede Pille der Wege am Seitenende steht ganz im Bild, ohne inneres Rollen (bei 390 stand „Geführt au…“ abgeschnitten).
   Gemessen in „Identität & Person“ und „Gesundheit“ (lange Titel und Beschriftungen). */
const { test, expect } = require('@playwright/test');
const h = require('./helpers.js');

const BREITEN = [[1440, 900], [1100, 900], [768, 1024], [390, 844]];

function KOPFZEILEN() {
  const funde = [];
  const woerterGebrochen = (el) => {
    const t = el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild : null;
    if (!t) return [];
    const aus = [];
    const re = /\S+/g; let m;
    while ((m = re.exec(t.textContent))) {
      const r = document.createRange(); r.setStart(t, m.index); r.setEnd(t, m.index + m[0].length);
      const zeilen = new Set([...r.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top)));
      if (zeilen.size > 1) aus.push(m[0]);
    }
    return aus;
  };
  for (const k of document.querySelectorAll('#content details.feldgruppen-karte')) {
    if (k.hidden || !k.offsetParent) continue;
    const titel = k.querySelector('.feldgruppen-karte-titel');
    const inhalt = k.querySelector('.feldgruppen-karte-inhalt');
    for (const w of titel ? woerterGebrochen(titel) : []) funde.push('Titel „' + titel.textContent + '“ bricht in „' + w + '“');
    if (inhalt && inhalt.offsetParent) {
      for (const w of woerterGebrochen(inhalt)) funde.push('Inhalt „' + inhalt.textContent + '“ bricht in „' + w + '“');
      if (inhalt.scrollWidth > inhalt.clientWidth + 1) funde.push('Inhalt abgeschnitten: „' + inhalt.textContent + '“');
    }
  }
  for (const w of document.querySelectorAll('#content .bereich-wege')) {
    if (!w.offsetParent) continue;
    if (w.scrollWidth > w.clientWidth + 1) funde.push('Wege-Reihe rollt in sich: ' + w.scrollWidth + ' > ' + w.clientWidth);
    const rand = Math.min(innerWidth, document.documentElement.clientWidth);
    for (const p of w.querySelectorAll(':scope > * > details > summary, :scope > details > summary')) {
      const r = p.getBoundingClientRect();
      if (r.width && (r.left < -1 || r.right > rand + 1)) funde.push('Pille nicht ganz sichtbar: „' + p.textContent.trim() + '“');
    }
  }
  const sw = document.scrollingElement.scrollWidth;
  if (sw > innerWidth) funde.push('seitliches Rollen: ' + sw + ' > ' + innerWidth);
  return funde;
}

/* Ein Bereich über die Oberfläche öffnen: bei schmaler Breite liegt die Seitenleiste hinter dem Menü-Knopf. */
async function bereichOeffnen(page, sektor) {
  if ((page.viewportSize() || { width: 1280 }).width < 768) await page.locator('#tb-menue').click();
  await h.oeffneSektor(page, sektor);
}

for (const [breite, hoehe] of BREITEN) {
  test(`[Gruppenkarte·Kopf ganz] privat-de · ${breite} px: kein Wort gebrochen, keine Zeile gekappt, kein seitliches Rollen`, async ({ page }) => {
    await page.setViewportSize({ width: breite, height: hoehe });
    await h.oeffneApp(page);
    await h.depotAnlegen(page);
    await h.einmalDialogeSchliessen(page);
    const funde = [];
    for (const sektor of ['identity', 'health']) {
      await bereichOeffnen(page, sektor);
      await page.waitForTimeout(300);
      const karten = await page.locator('#content details.feldgruppen-karte:not([hidden])').count();
      expect(karten, sektor + ': Karten gerendert').toBeGreaterThan(2);
      funde.push(...(await page.evaluate(KOPFZEILEN)).map((f) => sektor + ': ' + f));
    }
    expect(funde).toEqual([]);
  });
}

/* Rot-Beweis: die alte Regel (Pillen in einer Reihe, die in sich rollt) fällt bei 390 auf. */
test('[Gruppenkarte·Kopf ganz·Rot-Beweis] privat-de · 390 px: eine rollende Wege-Reihe wird gefunden', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await h.oeffneApp(page);
  await h.depotAnlegen(page);
  await h.einmalDialogeSchliessen(page);
  await bereichOeffnen(page, 'identity');
  await page.waitForTimeout(300);
  await page.addStyleTag({ content: '#app .content .bereich-wege { flex-wrap: nowrap !important; overflow-x: auto !important; }' });
  const funde = await page.evaluate(KOPFZEILEN);
  expect(funde.some((f) => /Wege-Reihe rollt|Pille nicht ganz/.test(f)), funde.join(' | ')).toBe(true);
});
