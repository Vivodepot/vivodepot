'use strict';
/* Das nackte Gerüst im Browser (U2-ADR-473 Nachtrag, v894, 02.10.2026)
   ───────────────────────────────────────────────────────────────────────────────────────────────
   Die öffentliche Datei ist das Gerüst (Entscheidung 03.09.2026): ohne Erscheinungsbild-Modul, also ohne jeden
   Gestaltungswert. Zugesichert ist nicht, dass es schön aussieht, sondern dass es trägt:
     · es lädt ohne Seitenfehler und zeigt KEIN Profil (keine Token-Werte, kein konstruierter Stylesheet);
     · die Schutzregeln greifen: der Text erreicht den Mindestkontrast (Browser-Vorgaben), der Hinweis auf ungesicherte
       Eingaben ist sichtbar, und die Notfall-Ansicht ist ohne Umweg erreichbar.
   Alle übrigen Browser-Proben laufen gegen das gebackene Erzeugnis (tests/e2e/global-setup.js); diese eine gegen das Gerüst. */
const { test, expect } = require('@playwright/test');
const { KERN_URL_NACKT, oeffneApp } = require('./helpers.js');

function kontrast(a, b) {
  const L = (rgb) => {
    const k = rgb.map((c) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
  };
  const x = L(a), y = L(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test('[Gerüst·nackt] lädt ohne Seitenfehler und zeigt kein Profil', async ({ page }) => {
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(String(e && e.message)));
  await oeffneApp(page, { url: KERN_URL_NACKT });
  const zustand = await page.evaluate(() => ({
    gueltig: typeof ERSCHEINUNGSBILD !== 'undefined' && ERSCHEINUNGSBILD.gueltig,
    grund: typeof ERSCHEINUNGSBILD !== 'undefined' ? ERSCHEINUNGSBILD.grund : null,
    blaetter: document.adoptedStyleSheets.length,
    salbei: getComputedStyle(document.documentElement).getPropertyValue('--salbei-dunkel'),
    ink: getComputedStyle(document.documentElement).getPropertyValue('--ink'),
  }));
  expect(zustand).toEqual({ gueltig: false, grund: 'kein-modul', blaetter: 0, salbei: '', ink: '' });
  expect(fehler).toEqual([]);
});

test('[Gerüst·nackt] Schutzregeln: Mindestkontrast, Hinweis auf Ungesichertes sichtbar, Notfall erreichbar', async ({ page }) => {
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(String(e && e.message)));
  await oeffneApp(page, { url: KERN_URL_NACKT });
  const farben = await page.evaluate(() => {
    const rgb = (s) => (s.match(/\d+(\.\d+)?/g) || []).slice(0, 4).map(Number);
    let el = document.body, grund = null;
    while (el && !grund) { const c = rgb(getComputedStyle(el).backgroundColor); if (c.length === 3 || (c.length === 4 && c[3] > 0)) grund = c.slice(0, 3); el = el.parentElement; }
    return { text: rgb(getComputedStyle(document.body).color).slice(0, 3), grund: grund || [255, 255, 255] };
  });
  expect(kontrast(farben.text, farben.grund)).toBeGreaterThanOrEqual(4.5);

  await page.click('#w-anfangen');                                  // passwortlose Vorschau: Eingaben sind ungesichert
  await page.waitForSelector('#app.an', { state: 'attached' });
  await expect(page.locator('#tb-pw-hinweis')).toBeVisible();      // der Weg zum Sichern steht sichtbar da
  // Ein Depot anlegen, wie tests/e2e/helpers.js#depotAnlegen — aber ohne auf die Einmal-Dialoge zu warten: das
  // Notfall-Blatt-Angebot erscheint im Gerüst nicht (es hat keinen Sprachsatz, seit S8), und das ist hier nicht Gegenstand.
  await page.click('#tb-pw-hinweis');
  await page.waitForSelector('#id-pw', { state: 'visible' });
  await page.fill('#id-vorname', 'Maria');
  await page.fill('#id-nachname', 'Mustermann');
  await page.fill('#id-pw', 'e2e-passwort-123');
  await page.fill('#id-pw2', 'e2e-passwort-123');
  await page.click('#m-ok');
  await page.waitForSelector('#tb-pw-hinweis', { state: 'hidden' });
  // Die Einmal-Dialoge nach dem Anlegen (Wiederherstellungs-Code, Notfall-Blatt) liegen auch im Produkt über der Sitzung;
  // ohne Sprachsatz fehlen ihre Erkennungszeichen, also abräumen über den Ablehnungs-Knopf, bis der Modal-Host frei ist.
  for (let i = 0; i < 10 && await page.locator('#modal-rueck.an').count(); i++) {
    await page.locator('#m-zweit').click({ timeout: 2000 }).catch(() => page.locator('#m-ok').click({ timeout: 2000 }).catch(() => {}));
    await page.waitForTimeout(150);
  }
  await expect(page.locator('#modal-rueck.an')).toHaveCount(0);
  const notfall = page.locator('[data-notfall]').first();
  await expect(notfall).toBeVisible();
  await notfall.click();
  expect(fehler).toEqual([]);
});
