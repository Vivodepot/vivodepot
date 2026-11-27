// @ts-check
/* umschau-eintragen-fuehrt-zum-einrichten.spec.js — aus der Umschau führt ein Klick sichtbar zu „Depot anlegen“ (06.10.2026)
   Befund UMSCHAU-EINTRAGEN-STILL: eine Nutzerin konnte „gar nichts eintragen“ und glaubte an eine Freischaltung; ein Klick
   bewirkte nichts. Seit Befund U1 (Variante A, P01) zeigt „Erst umsehen“ ein erfundenes, schreibgeschütztes Beispiel: kein Feld
   ist dort eine Eintragen-Schaltfläche, der eine Weg ist der Hauptknopf „Eigenes Depot anlegen“ im Streifen über der Ansicht.
   Gemessen wird in allen vier Produkten, bei 1280 und 390 px: Startseite → „Hier anfangen“ → Hauptknopf → der Dialog „Depot
   anlegen“ ist offen und nennt den Grund; nach dem Anlegen steht man im Bereich, der offen war, leer und bedienbar.
   Die Feld-Schaltfläche der leeren Vorschau (Rückfall eines Produkts ohne Beispielwerte) prüfen tests/umschau-eintragen-klasse.test.js
   und tests/umschau-knopftext-eindeutig.test.js am Kern. */
const { test, expect } = require('@playwright/test');
const h = require('./helpers.js');

const PRODUKTE = [['privat-de', h.KERN_URL_PRIVAT_DE], ['privat-en', h.KERN_URL_PRIVAT_EN], ['pro-de', h.KERN_URL_PRO_DE], ['pro-en', h.KERN_URL_PRO_EN]].filter(([slug]) => h.baubar(slug));
const BREITEN = [[1280, 800], [390, 844]];
const HAUPTKNOPF = '#content [data-beispiel] [data-anlegen-weg]';

async function umsehen(page) {
  await page.click('#w-anfangen');
  await page.waitForSelector('#app.an', { state: 'attached' });
  await expect(page.locator(HAUPTKNOPF), 'über dem Beispiel steht der Hauptknopf').toBeVisible();
}

async function anlegenAbschliessen(page) {
  await page.fill('#id-vorname', 'Erika');
  await page.fill('#id-nachname', 'Probe');
  if (await page.isVisible('#id-pw-eigen-weg')) await page.click('#id-pw-eigen-weg');   // Zielbild 01: Passwort-Feld erst beim eigenen Passwort
  await page.fill('#id-pw', 'e2e-passwort-123');
  await page.fill('#id-pw2', 'e2e-passwort-123');
  await page.click('#m-ok');
  await page.waitForSelector('#tb-pw-hinweis', { state: 'hidden' });
  await h.einmalDialogeSchliessen(page);
}

// Rein: die Bereiche, in denen das Beispiel eine Feld-Schaltfläche zeigt (es soll keine geben).
function schreibschutzFunde(zaehlung) {
  return zaehlung.filter((z) => z.knoepfe > 0).map((z) => z.sektor + ': ' + z.knoepfe + ' Feld-Schaltfläche(n)');
}

for (const [slug, url] of PRODUKTE) {
  for (const [breite, hoehe] of BREITEN) {
    test(`[Umschau → Einrichten] ${slug} · ${breite} px: der Hauptknopf im Beispiel öffnet „Depot anlegen“ mit Grund`, async ({ page }) => {
      await page.setViewportSize({ width: breite, height: hoehe });
      await h.oeffneApp(page, { url });
      await umsehen(page);
      await page.click(HAUPTKNOPF);
      await expect(page.locator('#modal-rueck.an #id-vorname')).toBeVisible();   // Zielbild 01: das Passwort-Feld kommt erst mit dem eigenen Passwort
      await expect(page.locator('#modal-rueck [data-anlegen-grund]')).toBeVisible();
    });
  }
}

test('[Umschau → Einrichten] nach dem Anlegen: im offenen Bereich, leer, ohne Beispiel (privat-de, 1280 px)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await umsehen(page);
  const vorher = await page.locator('#sidebar [data-sektor]').count();
  await h.oeffneSektor(page, 'identity');
  await page.click(HAUPTKNOPF);
  await anlegenAbschliessen(page);
  await expect(page.locator('#content [data-beispiel]'), 'vom Beispiel bleibt nichts').toHaveCount(0);
  await page.evaluate(() => document.querySelectorAll('#content details').forEach((d) => { d.open = true; }));
  await expect(page.locator('#content [data-feld="familyName"] input').first(), 'zurück im Bereich Identität').toBeVisible();
  // Der Name aus dem Anlegen steht in Identität; der Beispielname („Mustermann“) geht nicht mit.
  await expect(page.locator('#content [data-feld="familyName"] input').first(), 'der Beispielname ging nicht mit').toHaveValue('Probe');
  expect(await page.locator('#sidebar [data-sektor]').count(), 'alle Bereiche').toBe(vorher);
});

test('[Umschau → Einrichten] aus einem anderen Bereich führt der Hauptknopf dorthin zurück: Gesundheit (privat-de, 1280 px)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await umsehen(page);
  await h.oeffneSektor(page, 'health');
  await page.click(HAUPTKNOPF);
  await anlegenAbschliessen(page);
  await page.evaluate(() => document.querySelectorAll('#content details').forEach((d) => { d.open = true; }));
  await h.rubrikOeffnen(page, '[data-feld="bloodType"]');
  await expect(page.locator('#content [data-feld="bloodType"]').first(), 'zurück im Bereich Gesundheit').toBeVisible();
});

test('[Umschau → Einrichten·Abdeckung] jedes Feld des Beispiels hat nach dem Anlegen ein fokussierbares Bedienelement (privat-de, alle Bereiche)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await umsehen(page);
  const ziele = await page.evaluate(() => {
    const ids = [...new Set([...document.querySelectorAll('[data-sektor]')].map((e) => e.getAttribute('data-sektor')))];
    const aus = [];
    for (const s of ids) {
      window.__vdOeffentlich.oeffneSektor(s);
      document.querySelectorAll('#content details').forEach((d) => { d.open = true; });
      for (const z of document.querySelectorAll('#content [data-feld]')) aus.push([s, z.getAttribute('data-feld')]);
    }
    return aus;
  });
  expect(ziele.length, 'Voraussetzung: das Beispiel zeigt Felder').toBeGreaterThan(20);
  await page.evaluate(() => { window.__vdOeffentlich.oeffneSektor('identity'); });
  await page.click(HAUPTKNOPF);
  await anlegenAbschliessen(page);
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
  await umsehen(page);
  // Den Weg kappen: kein Klick erreicht den Delegaten, wie vor dem Fix ein bloßer Text.
  await page.evaluate(() => document.addEventListener('click', (e) => e.stopImmediatePropagation(), true));
  await page.click(HAUPTKNOPF);
  await page.waitForTimeout(500);
  await expect(page.locator('#modal-rueck.an #id-pw')).toHaveCount(0);
});

/* Das Beispiel ist schreibgeschützt: in keinem Bereich ist ein Feld eine Eintragen-Schaltfläche, und bei 390 px schiebt nichts
   seitwärts. Frisch bei 390 px geladen: ein Wechsel der Fenstergröße im laufenden Depot zeigte einen Überlauf der Hülle, den es
   beim Laden nicht gibt. */
async function schreibschutzPruefen(page, url) {
  for (const [breite, hoehe] of BREITEN) {
    await page.setViewportSize({ width: breite, height: hoehe });
    await h.oeffneApp(page, { url });
    await umsehen(page);
    const r = await page.evaluate(() => {
      const ids = [...new Set([...document.querySelectorAll('[data-sektor]')].map((e) => e.getAttribute('data-sektor')))];
      const zaehlung = []; const breit = [];
      for (const s of ids) {
        window.__vdOeffentlich.oeffneSektor(s);
        document.querySelectorAll('#content details').forEach((d) => { d.open = true; });
        zaehlung.push({ sektor: s, knoepfe: document.querySelectorAll('#content [data-umschau-eintragen][data-umschau-feld]').length });
        const se = document.scrollingElement;
        if (se.scrollWidth > se.clientWidth + 1) breit.push(s + ': ' + se.scrollWidth + ' > ' + se.clientWidth);
      }
      return { zaehlung, breit };
    });
    expect(r.zaehlung.length, 'Voraussetzung: Bereiche gesehen').toBeGreaterThan(3);
    expect(schreibschutzFunde(r.zaehlung), breite + ' px: keine Feld-Schaltfläche im Beispiel').toEqual([]);
    expect(r.breit, breite + ' px: kein seitlicher Überlauf in der Umschau').toEqual([]);
  }
}
test('[Umschau·Schreibgeschützt] privat-de: kein Feld des Beispiels ist eine Schaltfläche, kein Überlauf bei 390 px', async ({ page }) => {
  await schreibschutzPruefen(page, h.KERN_URL_PRIVAT_DE);
});
test('[Umschau·Schreibgeschützt] privat-en: kein Feld des Beispiels ist eine Schaltfläche, kein Überlauf bei 390 px', async ({ page }) => {
  await schreibschutzPruefen(page, h.KERN_URL_PRIVAT_EN);
});

/* Kopfleiste mit Beispiel-Streifen auf schmalen Handys (320 und 375 px): nichts schiebt seitwärts, weder in der Übersicht noch in
   einem Bereich; Kopf, Unterzeile und Streifen bleiben in der Breite, und der Hauptknopf liegt frei und nimmt den Tipp an. */
for (const breite of [320, 375]) {
  test(`[Umschau·Streifen·Handy] ${breite} px: Kopfleiste und Streifen ohne Überlauf, der Hauptknopf liegt frei (privat-de)`, async ({ page }) => {
    await page.setViewportSize({ width: breite, height: 800 });
    await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
    await umsehen(page);
    const r = await page.evaluate(() => {
      const ids = [...new Set([...document.querySelectorAll('[data-sektor]')].map((e) => e.getAttribute('data-sektor')))];
      const breit = [];
      const vw = document.documentElement.clientWidth;
      const ausserhalb = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return (b.left < -1 || b.right > vw + 1) ? sel + ': ' + Math.round(b.left) + '…' + Math.round(b.right) + ' bei ' + vw : null; };
      for (const s of ids) {
        window.__vdOeffentlich.oeffneSektor(s);
        const se = document.scrollingElement;
        if (se.scrollWidth > se.clientWidth + 1) breit.push(s + ': ' + se.scrollWidth + ' > ' + se.clientWidth);
        for (const sel of ['.topbar', '#kopf-unterzeile', '#content [data-beispiel]', '#content [data-beispiel] [data-anlegen-weg]']) { const a = ausserhalb(sel); if (a) breit.push(s + ' · ' + a); }
      }
      window.__vdOeffentlich.oeffneSektor(ids[0]);
      const k = document.querySelector('#content [data-beispiel] [data-anlegen-weg]');
      k.scrollIntoView({ block: 'center' });
      const kb = k.getBoundingClientRect();
      const oben = document.elementFromPoint(kb.left + kb.width / 2, kb.top + kb.height / 2);
      return { bereiche: ids.length, breit, tap: !!oben && (oben === k || k.contains(oben)) };
    });
    expect(r.bereiche, 'Voraussetzung: Bereiche gesehen').toBeGreaterThan(3);
    expect(r.breit, breite + ' px: kein seitlicher Überlauf, Kopf und Streifen in der Breite').toEqual([]);
    expect(r.tap, breite + ' px: der Hauptknopf liegt frei').toBe(true);
  });
}

test('[Umschau·Schreibgeschützt·Rot-Beweis] ein Bereich mit Feld-Schaltfläche fällt auf', () => {
  const funde = schreibschutzFunde([{ sektor: 'identity', knoepfe: 0 }, { sektor: 'health', knoepfe: 2 }]);
  expect(funde).toEqual(['health: 2 Feld-Schaltfläche(n)']);
});
