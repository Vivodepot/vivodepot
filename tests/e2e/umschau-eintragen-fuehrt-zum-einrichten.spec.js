// @ts-check
/* umschau-eintragen-fuehrt-zum-einrichten.spec.js — ein Klick ins Feld in der Umschau öffnet „Depot anlegen“ (06.10.2026)
   Befund UMSCHAU-EINTRAGEN-STILL: eine Nutzerin konnte „gar nichts eintragen“ und glaubte an eine Freischaltung. In der
   Umschau (ohne Depot) war jeder Feldwert reiner Text, ein Klick bewirkte nichts. Gemessen wird in allen vier Produkten,
   bei 1280 und 390 px: Startseite → „Hier anfangen“ → erste Karte öffnen → Klick ins erste Feld → der Dialog „Depot
   anlegen“ ist offen und nennt den Grund; nach dem Anlegen steht der Fokus im angeklickten Feld. */
const { test, expect } = require('@playwright/test');
const h = require('./helpers.js');

const PRODUKTE = [['privat-de', h.KERN_URL_PRIVAT_DE], ['privat-en', h.KERN_URL_PRIVAT_EN], ['pro-de', h.KERN_URL_PRO_DE], ['pro-en', h.KERN_URL_PRO_EN]];
const BREITEN = [[1280, 800], [390, 844]];

async function umschauFeldKlicken(page) {
  await page.click('#w-anfangen');
  await page.waitForSelector('#app.an', { state: 'attached' });
  const karte = page.locator('#content details summary').first();
  if (await karte.count()) await karte.click();
  const feld = page.locator('#content [data-umschau-eintragen][data-umschau-feld]').first();
  await expect(feld, 'in der Umschau ist der Feldwert eine Schaltfläche').toBeVisible();
  const feldId = await feld.getAttribute('data-umschau-feld');
  await feld.click();
  return feldId;
}

for (const [slug, url] of PRODUKTE) {
  for (const [breite, hoehe] of BREITEN) {
    test(`[Umschau → Einrichten] ${slug} · ${breite} px: Klick ins Feld öffnet „Depot anlegen“ mit Grund`, async ({ page }) => {
      await page.setViewportSize({ width: breite, height: hoehe });
      await h.oeffneApp(page, { url });
      await umschauFeldKlicken(page);
      await expect(page.locator('#modal-rueck.an #id-pw')).toBeVisible();
      await expect(page.locator('#modal-rueck [data-anlegen-grund]')).toBeVisible();
    });
  }
}

test('[Umschau → Einrichten] nach dem Anlegen steht der Fokus im angeklickten Feld (privat-de, 1280 px)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  const feldId = await umschauFeldKlicken(page);
  await page.fill('#id-vorname', 'Erika');
  await page.fill('#id-nachname', 'Probe');
  await page.fill('#id-pw', 'e2e-passwort-123');
  await page.fill('#id-pw2', 'e2e-passwort-123');
  await page.click('#m-ok');
  await page.waitForSelector('#tb-pw-hinweis', { state: 'hidden' });
  await h.einmalDialogeSchliessen(page);
  const imFeld = await page.evaluate((id) => { const a = document.activeElement; return !!(a && a.closest && a.closest('[data-feld="' + id + '"]')); }, feldId);
  expect(imFeld).toBe(true);
});

test('[Umschau → Einrichten] Fokus auch in ein Auswahlfeld: Familienstand (privat-de, 1280 px)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await page.click('#w-anfangen');
  await page.waitForSelector('#app.an', { state: 'attached' });
  await page.evaluate(() => document.querySelectorAll('#content details').forEach((d) => { d.open = true; }));
  await page.click('#content [data-umschau-eintragen][data-umschau-feld="maritalStatus"]');
  await page.fill('#id-vorname', 'Erika'); await page.fill('#id-nachname', 'Probe');
  await page.fill('#id-pw', 'e2e-passwort-123'); await page.fill('#id-pw2', 'e2e-passwort-123');
  await page.click('#m-ok');
  await page.waitForSelector('#tb-pw-hinweis', { state: 'hidden' });
  await h.einmalDialogeSchliessen(page);
  const aktiv = await page.evaluate(() => { const a = document.activeElement; return { tag: a && a.tagName, imFeld: !!(a && a.closest && a.closest('[data-feld="maritalStatus"]')) }; });
  expect(aktiv.imFeld, 'Fokus im Familienstand').toBe(true);
  expect(['SELECT', 'TEXTAREA'], 'ein Auswahl- bzw. Mehrzeilenfeld, nicht nur Text').toContain(aktiv.tag);
});

test('[Umschau → Einrichten·Abdeckung] jedes Feld mit „Eintragen“ hat nach dem Anlegen ein fokussierbares Bedienelement (privat-de, alle Bereiche)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await page.click('#w-anfangen');
  await page.waitForSelector('#app.an', { state: 'attached' });
  const ziele = await page.evaluate(() => {
    const ids = [...new Set([...document.querySelectorAll('[data-sektor]')].map((e) => e.getAttribute('data-sektor')))];
    const aus = [];
    for (const s of ids) {
      window.__vdOeffentlich.oeffneSektor(s);
      document.querySelectorAll('#content details').forEach((d) => { d.open = true; });
      for (const b of document.querySelectorAll('#content [data-umschau-eintragen][data-umschau-feld]')) aus.push([s, b.getAttribute('data-umschau-feld')]);
    }
    return aus;
  });
  expect(ziele.length, 'Voraussetzung: die Umschau zeigt Eintragen-Schaltflächen').toBeGreaterThan(20);
  await page.evaluate(() => { window.__vdOeffentlich.oeffneSektor('identity'); document.querySelectorAll('#content details').forEach((d) => { d.open = true; }); });
  await page.click('#content [data-umschau-eintragen][data-umschau-feld]');
  await page.fill('#id-vorname', 'Erika'); await page.fill('#id-nachname', 'Probe');
  await page.fill('#id-pw', 'e2e-passwort-123'); await page.fill('#id-pw2', 'e2e-passwort-123');
  await page.click('#m-ok');
  await page.waitForSelector('#tb-pw-hinweis', { state: 'hidden' });
  await h.einmalDialogeSchliessen(page);
  const ohne = await page.evaluate((ziele) => {
    const aus = [];
    for (const [s, f] of ziele) {
      window.__vdOeffentlich.oeffneSektor(s);
      document.querySelectorAll('#content details').forEach((d) => { d.open = true; });
      const z = document.querySelector('[data-feld="' + f + '"]');
      if (!z || !z.querySelector('input,select,textarea,button')) aus.push(s + '/' + f);
    }
    return aus;
  }, ziele);
  expect(ohne, 'Felder ohne fokussierbares Bedienelement nach dem Anlegen').toEqual([]);
});

test('[Umschau → Einrichten·Rot-Beweis] ohne den Delegaten bleibt der Klick still — die Probe merkt es', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await page.click('#w-anfangen');
  await page.waitForSelector('#app.an', { state: 'attached' });
  // Den Weg kappen: jede Schaltfläche verliert ihr Kennzeichen, wie vor dem Fix ein bloßer Text.
  await page.evaluate(() => document.addEventListener('click', (e) => e.stopImmediatePropagation(), true));
  const karte = page.locator('#content details summary').first();
  if (await karte.count()) await karte.click({ force: true });
  await page.locator('#content [data-umschau-eintragen]').first().click();
  await page.waitForTimeout(500);
  await expect(page.locator('#modal-rueck.an #id-pw')).toHaveCount(0);
});

/* Befund UMSCHAU-KNOPFTEXT-NICHT-EINDEUTIG (08.10.2026, WCAG 2.4.6, 2.5.3): die Feld-Schaltflächen trugen alle denselben sichtbaren
   Text „nicht hinterlegt Eintragen“, der Feldname stand nur im aria-label. Jetzt nennt der sichtbare Text das Feld und ist der
   zugängliche Name. Geprüft in jedem Bereich: kein aria-label, der Text enthält die Feldbeschriftung, innerhalb des Bereichs eindeutig. */
function knopftextFunde(knoepfe) {
  const aus = []; const gesehen = new Map();
  for (const k of knoepfe) {
    if (k.aria !== null) aus.push(k.feld + ': aria-label weicht vom sichtbaren Text ab');
    if (!k.label || !k.text.includes(k.label)) aus.push(k.feld + ': sichtbarer Text nennt das Feld nicht');
    const schon = gesehen.get(k.sektor + '|' + k.text);
    if (schon) aus.push(k.feld + ': gleicher Text wie ' + schon); else gesehen.set(k.sektor + '|' + k.text, k.feld);
  }
  return aus;
}
async function knopftextPruefen(page, url) {
    await page.setViewportSize({ width: 1280, height: 800 });
    await h.oeffneApp(page, { url });
    await page.click('#w-anfangen');
    await page.waitForSelector('#app.an', { state: 'attached' });
    const knoepfe = await page.evaluate(() => {
      const ids = [...new Set([...document.querySelectorAll('[data-sektor]')].map((e) => e.getAttribute('data-sektor')))];
      const aus = [];
      for (const s of ids) {
        window.__vdOeffentlich.oeffneSektor(s);
        document.querySelectorAll('#content details').forEach((d) => { d.open = true; });
        for (const b of document.querySelectorAll('#content [data-umschau-eintragen][data-umschau-feld]')) {
          const zeile = b.closest('.feld-zeile'); const lab = zeile && zeile.querySelector('.feld-label');
          aus.push({ sektor: s, feld: b.getAttribute('data-umschau-feld'), aria: b.getAttribute('aria-label'),
            text: b.textContent.replace(/\s+/g, ' ').trim(), label: lab && lab.firstChild ? lab.firstChild.textContent.replace(/\s+/g, ' ').trim() : '' });   // nur die Beschriftung, ohne Pflicht-Marke
        }
      }
      return aus;
    });
    expect(knoepfe.length, 'Voraussetzung: die Umschau zeigt Feld-Schaltflächen').toBeGreaterThan(20);
    expect(knopftextFunde(knoepfe)).toEqual([]);
    // Der längere Text darf auf dem Telefon nichts seitwärts schieben (gemessen 08.10.2026: bis 469 px Inhalt in 327 px Knopf).
    // Frisch bei 390 px geladen: ein Wechsel der Fenstergröße im laufenden Depot zeigte einen Überlauf der Hülle, den es beim Laden nicht gibt.
    await page.setViewportSize({ width: 390, height: 844 });
    await h.oeffneApp(page, { url });
    await page.click('#w-anfangen');
    await page.waitForSelector('#app.an', { state: 'attached' });
    const breit = await page.evaluate(() => {
      const ids = [...new Set([...document.querySelectorAll('[data-sektor]')].map((e) => e.getAttribute('data-sektor')))];
      const aus = [];
      for (const s of ids) {
        window.__vdOeffentlich.oeffneSektor(s);
        document.querySelectorAll('#content details').forEach((d) => { d.open = true; });
        const se = document.scrollingElement;
        if (se.scrollWidth > se.clientWidth + 1) aus.push(s + ': ' + se.scrollWidth + ' > ' + se.clientWidth);
        for (const k of document.querySelectorAll('#content [data-umschau-eintragen]')) if (k.scrollWidth > k.clientWidth + 1) { aus.push(s + '/' + k.getAttribute('data-umschau-feld')); break; }
      }
      return aus;
    });
    expect(breit, 'bei 390 px kein seitlicher Überlauf in der Umschau').toEqual([]);
}
test('[Umschau·Knopftext] privat-de: jede Feld-Schaltfläche nennt ihr Feld, eindeutig je Bereich, ohne abweichendes aria-label', async ({ page }) => {
  await knopftextPruefen(page, h.KERN_URL_PRIVAT_DE);
});
test('[Umschau·Knopftext] privat-en: jede Feld-Schaltfläche nennt ihr Feld, eindeutig je Bereich, ohne abweichendes aria-label', async ({ page }) => {
  await knopftextPruefen(page, h.KERN_URL_PRIVAT_EN);
});

test('[Umschau·Knopftext·Rot-Beweis] der frühere Wortlaut (gleicher Text, Feldname nur im aria-label) fällt auf', () => {
  const alt = ['vorname', 'nachname'].map((f) => ({ sektor: 'identity', feld: f, aria: f + ' — Eintragen', text: 'nicht hinterlegt Eintragen', label: f }));
  const funde = knopftextFunde(alt);
  expect(funde.some((z) => /aria-label/.test(z))).toBe(true);
  expect(funde.some((z) => /nennt das Feld nicht/.test(z))).toBe(true);
  expect(funde.some((z) => /gleicher Text/.test(z))).toBe(true);
});
