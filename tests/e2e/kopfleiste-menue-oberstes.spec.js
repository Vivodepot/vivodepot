// @ts-check
/* kopfleiste-menue-oberstes.spec.js — ein aufgeklapptes Menü der Kopfleiste ist am Klickpunkt das oberste Element (07.10.2026)
   Befund KOPFLEISTE-MENUE-UNTER-INHALT: mit dem Ab-Werk-Erscheinungsbild (Glas) lag das Depot-Menü unter den Inhaltskarten.
   backdrop-filter macht die Kopfleiste zu einem eigenen Stapelkontext; ohne eigene Ebene zählte der z-index des Menüs nur darin,
   und die später gezeichneten Glas-Karten fingen die Klicks ab — „Sicherungskopie erstellen“ war sichtbar, aber nicht klickbar.
   Gemessen wird, was der Klick trifft: je Menüeintrag elementFromPoint in seiner Mitte, dazu Playwrights Klickprüfung (trial,
   ohne force) — in allen vier Produkten, 1280 und 390 px, hell, „Transparenz reduzieren“, nachts und im Hochkontrast.
   Dieselbe Klasse in der Fläche (Befund REFM-VORSCHLAEGE-IM-GLAS): ein Vorfahr mit backdrop-filter wird zum Bezugsrahmen für
   position: fixed — die Personen-Auswahl lag in einer Glas-Karte bei (844, −103) statt unter dem Feld. Gemessen: Lage und oberstes
   Element der Liste (privat-de/-en; Pro führt die Personen-Auswahl nicht); dazu der Klassenwächter in allen vier Produkten, dass
   jedes Aufklapp-Element innerhalb von Glas hier eine eigene Probe hat. */
const { test, expect } = require('@playwright/test');
const h = require('./helpers.js');

const PRODUKTE = [['privat-de', h.KERN_URL_PRIVAT_DE], ['privat-en', h.KERN_URL_PRIVAT_EN], ['pro-de', h.KERN_URL_PRO_DE], ['pro-en', h.KERN_URL_PRO_EN]];
const BREITEN = [[1280, 800], [390, 844]];
const PILLE = '#tb-depot-pille';
const MENUE = '#tb-depot-menue';

async function menueOeffnen(page) {
  if (await page.locator(MENUE).isHidden()) await page.click(PILLE);
  await expect(page.locator(MENUE)).toBeVisible();
}

/* Je sichtbarem Menüeintrag: liegt der Eintrag selbst (oder ein Kind davon) im Mittelpunkt ganz oben? → Liste der verdeckten */
async function verdeckte(page, eintraege = MENUE + ' [role=menuitem]') {
  return page.evaluate((sel) => [...document.querySelectorAll(sel)]
    .filter((el) => el.offsetParent !== null && el.getBoundingClientRect().height > 0)
    .map((el) => {
      const r = el.getBoundingClientRect();
      const y = r.top + r.height / 2;
      // drei Punkte: links (dort lag die Leiste darüber), Mitte, rechts
      for (const x of [r.left + 8, r.left + r.width / 2, r.right - 8]) {
        const oben = document.elementFromPoint(x, y);
        if (!el.contains(oben)) return el.id + ' @' + Math.round(x) + ' ← ' + (oben ? (oben.tagName.toLowerCase() + (oben.id ? '#' + oben.id : '') + (oben.className && typeof oben.className === 'string' ? '.' + oben.className.split(' ')[0] : '')) : 'nichts');
      }
      return null;
    }).filter(Boolean), eintraege);
}

/* Eine Inhaltskarte unter das Menü schieben — so lag es im Fund (div.feld-zeile in details.feldgruppen-karte). */
async function karteUnterMenue(page) {
  await page.evaluate(() => {
    const k = document.querySelector('#content .feldgruppen-karte, #content .sektion, #content .karte');
    const c = document.getElementById('content');
    if (!k || !c) return;
    const top = document.querySelector('.topbar').getBoundingClientRect().bottom;
    const ziel = k.getBoundingClientRect().top - top - 10;
    if (c.scrollHeight > c.clientHeight) c.scrollTop += ziel; else window.scrollBy(0, ziel);
  });
}

async function pruefen(page, sicht) {
  await karteUnterMenue(page);
  await menueOeffnen(page);
  expect(await verdeckte(page), sicht + ': verdeckte Menüeinträge').toEqual([]);
  await page.locator('#tb-depot-menue-sicherungskopie').click({ trial: true, timeout: 3000 });   // Klickprüfung ohne force
  await page.keyboard.press('Escape');
}

for (const [slug, url] of PRODUKTE) {
  for (const [breite, hoehe] of BREITEN) {
    test(`[Kopfleiste·Menü oben] ${slug} · ${breite} px: jeder Eintrag des Depot-Menüs ist am Klickpunkt oben`, async ({ page, context }) => {
      await page.setViewportSize({ width: breite, height: hoehe });
      await h.oeffneApp(page, { url });
      await h.depotAnlegen(page, { name: 'Elisabeth Muster', pw: 'e2e-passwort-123' });
      await expect(page.locator('#content .feldgruppen-karte, #content .sektion, #content .karte').first(), 'Voraussetzung: Inhaltskarten liegen unter dem Menü').toBeAttached();
      await pruefen(page, 'hell');
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
      await pruefen(page, 'Transparenz reduziert');
      await cdp.send('Emulation.setEmulatedMedia', { features: [] });
      await page.evaluate(() => document.getElementById('tb-nacht').click()); await page.waitForTimeout(300);
      await pruefen(page, 'nachts');
      await page.evaluate(() => document.getElementById('tb-kontrast').click()); await page.waitForTimeout(300);
      await pruefen(page, 'Hochkontrast');
    });
  }
}

test('[Leiste·Suchvorschläge oben] die Vorschläge der Suche liegen am Klickpunkt oben, über den Glas-Karten (privat-de, 1280 px)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await h.depotAnlegen(page, { name: 'Elisabeth Muster', pw: 'e2e-passwort-123' });
  await karteUnterMenue(page);
  await page.fill('#suche-eingabe', 'Pflege');
  await expect(page.locator('#suche-vorschlaege li').first()).toBeVisible();
  expect(await verdeckte(page, '#suche-vorschlaege li'), 'verdeckte Suchvorschläge').toEqual([]);
});

/* Aufklapp-Elemente (fixed/absolute) mit einem Glas-Vorfahren, je Bereich. Jedes muss hier eine eigene Probe haben. */
const GEPRUEFT = ['depot-menue', 'suche-vorschlaege', 'refm-vorschlaege'];
async function aufklappImGlas(page) {
  return page.evaluate(() => {
    const POP = '[role=listbox],[role=menu],[role=tooltip],[class*=vorschlaege],[class*=popover],[class*=tooltip],[class*=menue]:not(.depot-menue-eintrag),[class*=aufklapp],[class*=datum],[class*=kalender],[class*=dropdown]';
    const aus = new Set();
    for (const el of document.querySelectorAll(POP)) {
      if (!['fixed', 'absolute'].includes(getComputedStyle(el).position)) continue;
      for (let a = el.parentElement; a; a = a.parentElement) {
        const c = getComputedStyle(a);
        if ((c.backdropFilter || c.webkitBackdropFilter || 'none') !== 'none') { aus.add(String(el.className || el.id).split(' ')[0]); break; }
      }
    }
    return [...aus];
  });
}

for (const [slug, url] of PRODUKTE) {
  test(`[Glas·Aufklapp·Klasse] ${slug}: jedes Aufklapp-Element innerhalb von Glas hat hier eine eigene Probe (alle Bereiche)`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await h.oeffneApp(page, { url });
    await h.depotAnlegen(page, { name: 'Elisabeth Muster', pw: 'e2e-passwort-123' });
    const ids = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-sektor]')].map((e) => e.getAttribute('data-sektor')))]);
    expect(ids.length, 'Voraussetzung: Bereiche gefunden').toBeGreaterThan(5);
    const gefunden = new Set();
    for (const id of ids) {
      await page.evaluate((s) => window.__vdOeffentlich.oeffneSektor(s), id);
      await page.evaluate(() => document.querySelectorAll('#content details').forEach((d) => { d.open = true; }));
      for (const k of await aufklappImGlas(page)) gefunden.add(k);
    }
    expect([...gefunden].filter((k) => !GEPRUEFT.includes(k)), 'neues Aufklapp-Element in Glas ohne eigene Probe').toEqual([]);
    expect(gefunden.has('depot-menue'), 'Positivkontrolle: das Depot-Menü liegt in Glas').toBe(true);
    // Die Personen-Auswahl gibt es in den Privat-Produkten (Vorsorge, Gesundheit); Pro führt diese Bereiche nicht.
    if (slug.startsWith('privat-')) expect(gefunden.has('refm-vorschlaege'), 'Positivkontrolle: die Personen-Auswahl liegt in Glas').toBe(true);
  });
}

async function personenAuswahlOeffnen(page) {
  await page.evaluate(() => { window.__vdOeffentlich.personHinzufuegen({ name: 'Anna Beispiel' }); window.__vdOeffentlich.bearbeitungSpeichern(); window.__vdOeffentlich.oeffneSektor('health'); });
  await page.evaluate(() => document.querySelectorAll('#content details').forEach((d) => { d.open = true; }));
  const eingabe = page.locator('#content input.refm-name').first();
  await eingabe.scrollIntoViewIfNeeded();
  await eingabe.click();
  await eingabe.fill('Ann');
  const liste = eingabe.locator('xpath=ancestor::*[contains(@class,"refm-combo")]').locator('.refm-vorschlaege');
  await expect(liste.locator('li').first()).toBeVisible();
  return { eingabe, liste };
}

for (const [slug, url] of PRODUKTE.filter(([p]) => p.startsWith('privat-'))) {
  for (const [breite, hoehe] of BREITEN) {
    test(`[Glas·Personen-Auswahl] ${slug} · ${breite} px: die Vorschläge liegen unter dem Feld und am Klickpunkt oben`, async ({ page }) => {
      await page.setViewportSize({ width: breite, height: hoehe });
      await h.oeffneApp(page, { url });
      await h.depotAnlegen(page, { name: 'Elisabeth Muster', pw: 'e2e-passwort-123' });
      const { eingabe, liste } = await personenAuswahlOeffnen(page);
      const e = await eingabe.boundingBox(); const l = await liste.boundingBox();
      expect(Math.abs(l.x - e.x), 'links bündig mit dem Feld').toBeLessThanOrEqual(2);
      expect(Math.abs(l.y - (e.y + e.height + 3)), 'direkt unter dem Feld').toBeLessThanOrEqual(2);
      expect(await verdeckte(page, '#content .refm-vorschlaege:not([hidden]) li'), 'verdeckte Vorschläge').toEqual([]);
      await liste.locator('li').first().click({ trial: true, timeout: 3000 });
    });
  }
}

test('[Glas·Personen-Auswahl·Rot-Beweis] mit der Fensterrechnung allein läge die Liste in der Glas-Karte weit neben dem Feld', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await h.depotAnlegen(page, { name: 'Elisabeth Muster', pw: 'e2e-passwort-123' });
  const { eingabe, liste } = await personenAuswahlOeffnen(page);
  const e = await eingabe.boundingBox();
  await liste.evaluate((l, e) => { l.style.left = Math.round(e.x) + 'px'; l.style.top = Math.round(e.y + e.height + 3) + 'px'; }, e);   // ohne Abzug des Bezugsrahmens
  const l = await liste.boundingBox();
  expect(Math.abs(l.x - e.x) + Math.abs(l.y - (e.y + e.height + 3)), 'ohne Abzug muss die Lage abweichen').toBeGreaterThan(20);
});

test('[Kopfleiste·Menü oben·Rot-Beweis] ohne eigene Ebene der Kopfleiste liegt das Menü unter den Glas-Karten (privat-de, 1280 px)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await h.depotAnlegen(page, { name: 'Elisabeth Muster', pw: 'e2e-passwort-123' });
  await page.evaluate(() => { const s = new CSSStyleSheet(); s.replaceSync('html body .topbar { z-index: auto !important; position: static !important; }'); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; });
  await karteUnterMenue(page);
  await menueOeffnen(page);
  expect(await verdeckte(page), 'ohne die Ebene muss die Messung den verdeckten Eintrag finden').toContainEqual(expect.stringContaining('tb-depot-menue-sicherungskopie @'));
});
