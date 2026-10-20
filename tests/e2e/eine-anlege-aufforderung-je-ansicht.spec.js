// @ts-check
/* eine-anlege-aufforderung-je-ansicht.spec.js — in jeder Ansicht der Umschau genau EINE Anlege-Aufforderung (09.10.2026)
   Probe: höchstens eine sichtbare Anlege-Aufforderung (`h.ANLEGE_WEG`: Hinweis oben oder Karten-Knopf) je Ansicht (vorher: Hinweis oben UND Karte im Inhalt).
   Gegenprobe: mindestens eine — sonst würde die Probe auch grün, wenn beide fehlen. Beides zusammen: genau eine.
   Dazu: kein Warndreieck am Hinweis, derselbe Wortlaut an Hinweis und Karte, nach dem Anlegen keine mehr. */
const { test, expect } = require('@playwright/test');
const h = require('./helpers.js');
// Öffentlicher Zuschnitt (20.10.2026, öffentlicher Lauf v933): erkannt an der öffentlichen Kopfzeile der Wurzeldatei; Weichen je Test mit Grund, gedeckelt
// in tests/e2e-oeffentlich-weichen.test.js.
const OEFFENTLICHER_ZUSCHNITT = require('../../tools/lib/wurzel-kopfzeile.js').imOeffentlichenZuschnitt(require('node:path').join(__dirname, '..', '..'));

const PRODUKTE = [['privat-de', h.KERN_URL_PRIVAT_DE], ['privat-en', h.KERN_URL_PRIVAT_EN], ['pro-de', h.KERN_URL_PRO_DE], ['pro-en', h.KERN_URL_PRO_EN]];

// Ohne Destrukturierung im Kopf: die E2E-Zählung (A423) liest eckige Klammern im Schleifenkopf als Werteliste.
for (const produkt of PRODUKTE) {
  const [slug, url] = produkt;
  test(`[Eine Aufforderung] ${slug}: jede Ansicht der Umschau hat genau einen sichtbaren Weg zum Anlegen`, async ({ page }) => {
    // FIXME-ID: OEFFENTLICH-KEIN-PRO-AUFFORDERUNG
    test.skip(OEFFENTLICHER_ZUSCHNITT && slug.startsWith('pro-'), 'öffentlich kein Pro-Produkt');
    await page.setViewportSize({ width: 1280, height: 800 });
    await h.oeffneApp(page, { url });
    await page.click('#w-anfangen');
    await page.waitForSelector('#app.an', { state: 'attached' });
    const wege = page.locator(h.ANLEGE_WEG + ':visible');
    await expect(wege, 'Landeansicht').toHaveCount(1);
    const ids = await page.evaluate(() => Array.from(new Set(Array.from(document.querySelectorAll('#sidebar [data-sektor]')).map((e) => e.getAttribute('data-sektor')))));
    expect(ids.length).toBeGreaterThan(3);
    let mitKarte = 0;
    for (const id of ids) {
      await h.oeffneSektor(page, id);
      await expect(wege, `Bereich ${id}: genau eine Anlege-Aufforderung`).toHaveCount(1);
      if (await page.locator('#content [data-bereich-leer="vorschau"]').count()) {
        mitKarte += 1;
        await expect(page.locator('#tb-pw-hinweis'), `Bereich ${id}: mit Karte fällt der obere Hinweis weg`).toBeHidden();
      } else {
        await expect(page.locator('#tb-pw-hinweis'), `Bereich ${id}: ohne Karte bleibt der Hinweis der Weg`).toBeVisible();
      }
    }
    expect(mitKarte, 'mindestens ein leerer Bereich zeigt die Karte (sonst prüft die Probe nur einen Zweig)').toBeGreaterThan(0);
  });
}

test('[Eine Aufforderung] ein Wort, kein Warndreieck, keine Linie (privat-de, 1280 px)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await page.click('#w-anfangen');
  await page.waitForSelector('#tb-pw-hinweis', { state: 'attached' });   // die Landeansicht zeigt die Karte, der Hinweis ist dort ausgeblendet; Text und Gestalt bleiben messbar
  await expect(page.locator('#tb-pw-hinweis .tb-pw-cta')).toHaveText('Depot anlegen');
  await expect(page.locator('#tb-pw-hinweis .ico'), 'das Symbol am Hinweis ist ausgeblendet (Erscheinungsbild)').toBeHidden();
  const rand = await page.locator('#tb-pw-hinweis').evaluate((el) => getComputedStyle(el).borderTopColor);
  expect(rand, 'keine sichtbare Linie').toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  const ids = await page.evaluate(() => Array.from(new Set(Array.from(document.querySelectorAll('#sidebar [data-sektor]')).map((e) => e.getAttribute('data-sektor')))));
  for (const id of ids) {
    await h.oeffneSektor(page, id);
    const karte = page.locator('#content [data-bereich-leer="vorschau"] [data-umschau-eintragen]');
    if (await karte.count()) { await expect(karte).toHaveText('Depot anlegen'); break; }
  }
});

test('[Eine Aufforderung] nach dem Anlegen steht keine mehr (privat-de, 1280 px)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await h.depotAnlegen(page);
  await expect(page.locator(h.ANLEGE_WEG + ':visible')).toHaveCount(0);
});

test('[Eine Aufforderung] „Sub-Depots“: genau ein Weg, der Knopf im Inhalt mit dem Wort „Depot anlegen“ (privat-de, 1280 px)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await page.click('#w-anfangen');
  await page.waitForSelector('#app.an', { state: 'attached' });
  await page.locator('.topbar button', { hasText: 'Mein Depot' }).first().click();
  await page.getByText('Sub-Depots', { exact: true }).first().click();
  await expect(page.locator('#sub-pw-link')).toHaveText('Depot anlegen');
  await expect(page.locator(h.ANLEGE_WEG + ':visible'), 'vorher standen hier zwei Wege mit zwei Wörtern: der Hinweis oben und „Passwort jetzt setzen →“').toHaveCount(1);
  await expect(page.locator('#tb-pw-hinweis')).toBeHidden();
  await page.locator('#sub-pw-link').click();
  await expect(page.locator('#modal-rueck.an #id-pw'), 'der Knopf führt in das Anlegen des eigenen Depots').toBeVisible();
});
