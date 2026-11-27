'use strict';
/* Kopfleiste am Handy nach dem Desktop-Dummy (Z. 199–212, 17.11.2026) im echten Browser.
   Belegt bei 320, 375 und 390 px, in der Vorschau und in der echten Sitzung:
     • im Kopf stehen Marke (Zeichen ohne Wort), Depot-Pille, Lupe, Speicher-Status und der Knopf „Darstellung“; Menü-Knopf,
       Einstellungen und Schließen stehen nicht im Kopf (Seitenleiste über den Tab „Bereiche“, D13);
     • der Depot-Name steht bei 375 und 390 voll, bei 320 sichtbar; die Pille ist mindestens 24 px breit; die Kopfleiste läuft nicht über;
     • der Anlege-Hinweis der Vorschau steht in der Zeile unter dem Kopf, sichtbar ohne Antippen;
     • „Darstellung“ hat 44 px, einen Namen für Vorleseprogramme und zeigt mit einem Antippen Schriftgröße, Kontrast und Nacht; Escape schließt;
     • die über den Tab „Bereiche“ geöffnete Seitenleiste bleibt offen, wenn sich die Höhe ändert (Tastatur, Adresszeile); Rot-Beweis
       mit dem alten Schließweg, der am unsichtbaren Menü-Knopf maß;
     • Rot-Beweis: mit Menü-Knopf, Einstellungen und Schließen im Kopf fällt der volle Name bei 375 durch. */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { oeffneApp, depotAnlegen, schubfachOeffnen, KERN_URL } = require('./helpers');

async function kopf(page) {
  return page.evaluate(() => {
    const sichtbar = (e) => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
    const tb = document.querySelector('.topbar');
    const pille = document.getElementById('tb-depot-pille');
    const name = document.getElementById('tb-depot-name');
    const d = document.getElementById('tb-darstellung');
    const zeile = document.getElementById('kopf-unterzeile');
    const db = d ? d.getBoundingClientRect() : { width: 0, height: 0 };
    return {
      ueberlauf: tb.scrollWidth - tb.clientWidth,
      menue: sichtbar(document.getElementById('tb-menue')),
      einstellungen: sichtbar(document.getElementById('tb-einstellungen')),
      schliessen: sichtbar(document.getElementById('tb-schliessen')),
      logoWort: sichtbar(document.querySelector('.topbar .logo-wort')),
      lupe: sichtbar(document.getElementById('tb-lupe')),
      pilleBreite: pille.getBoundingClientRect().width,
      nameSichtbar: sichtbar(name),
      nameVoll: name.scrollWidth <= name.clientWidth + 1,
      darstellung: { sichtbar: sichtbar(d), breite: db.width, hoehe: db.height, name: d ? d.getAttribute('aria-label') : '' },
      hinweisInZeile: !!zeile && zeile.contains(document.getElementById('tb-pw-hinweis')),
      zeileSichtbar: sichtbar(zeile),
      hinweisSichtbar: sichtbar(document.getElementById('tb-pw-hinweis')),
      speicherImKopf: tb.contains(document.getElementById('tb-save-status')),
      speicherSichtbar: sichtbar(document.getElementById('tb-save-status')),
    };
  });
}

function gemeinsam(k, breite) {
  expect(k.ueberlauf, `${breite}: die Kopfleiste läuft nicht über`).toBeLessThanOrEqual(1);
  expect(k.menue || k.einstellungen || k.schliessen, `${breite}: Menü, Einstellungen, Schließen nicht im Kopf`).toBe(false);
  expect(k.logoWort, `${breite}: die Marke steht als Zeichen ohne Wort`).toBe(false);
  expect(k.lupe, `${breite}: die Lupe steht im Kopf`).toBe(true);
  expect(k.pilleBreite, `${breite}: die Depot-Pille ist mindestens 24 px breit`).toBeGreaterThanOrEqual(24);
  expect(k.nameSichtbar, `${breite}: der Depot-Name ist sichtbar`).toBe(true);
  if (breite >= 375) expect(k.nameVoll, `${breite}: der Depot-Name steht voll`).toBe(true);
  expect(k.darstellung.sichtbar && k.darstellung.breite >= 44 && k.darstellung.hoehe >= 44, `${breite}: „Darstellung“ mit 44 px`).toBe(true);
  expect(k.darstellung.name.length, `${breite}: „Darstellung“ hat einen Namen für Vorleseprogramme`).toBeGreaterThan(0);
}

for (const breite of [320, 375, 390]) {
  test(`Kopfleiste ${breite}: Vorschau und echte Sitzung nach dem Dummy`, async ({ page }) => {
    await page.setViewportSize({ width: breite, height: 800 });
    await oeffneApp(page);
    await page.locator('#w-anfangen').click();                          // Vorschau
    await page.waitForSelector('#app.an', { state: 'attached' });
    // Die leere Vorschau eines Produkts ohne Beispielwerte (Aufbau): „Erst umsehen“ zeigt sonst das erfundene, schreibgeschützte Beispiel
    // (tests/umsehen-beispiel-gefuellt.test.js), in dem der Hinweis dem Streifen weicht und nichts eingetragen wird.
    await page.evaluate(() => { const d = window.__vdOeffentlich.ankerDaten(); delete d._beispiel; d.sektoren = Object.fromEntries(Object.keys(d.sektoren || {}).map((k) => [k, {}])); window.__vdOeffentlich.renderContent(); });
    await page.locator('#bt-uebersicht').click();                       // Ansicht ohne eigene Anlege-Karte: der Hinweis steht (T-CROSS-11)
    await page.waitForSelector('#tb-pw-hinweis', { state: 'visible' });
    await page.waitForTimeout(300);
    const vorschau = await kopf(page);
    expect(vorschau.hinweisInZeile && vorschau.zeileSichtbar, `${breite}: der Anlege-Hinweis steht in der Zeile unter dem Kopf`).toBe(true);
    gemeinsam(vorschau, breite);
    // Die Zeile spannt die ganze Breite direkt unter dem Kopf, der Inhalt beginnt links darunter, der Hinweis nimmt den Tap an.
    const lage = await page.evaluate(() => {
      const r = (e) => e.getBoundingClientRect();
      const tb = r(document.querySelector('.topbar')), z = r(document.getElementById('kopf-unterzeile')), c = r(document.getElementById('content'));
      const pw = document.getElementById('tb-pw-hinweis'), p = r(pw);
      const oben = document.elementFromPoint(p.left + p.width / 2, p.top + p.height / 2);
      return { zLinks: z.left, zBreite: z.width, zOben: z.top, tbUnten: tb.bottom, zHoehe: z.height, zUnten: z.bottom, cLinks: c.left, cOben: c.top,
        tap: !!oben && (oben === pw || pw.contains(oben)), vw: document.documentElement.clientWidth };
    });
    expect(lage.zLinks <= 1 && lage.zBreite >= lage.vw - 1, `${breite}: die Zeile spannt die ganze Breite`).toBe(true);
    expect(Math.abs(lage.zOben - lage.tbUnten) <= 1 && lage.zHoehe <= 120, `${breite}: die Zeile steht direkt unter dem Kopf und ist niedrig`).toBe(true);
    expect(lage.cLinks <= 1 && lage.cOben >= lage.zUnten - 1, `${breite}: der Inhalt beginnt links unter der Zeile`).toBe(true);
    expect(lage.tap, `${breite}: Tap trifft den Anlege-Hinweis`).toBe(true);

    await oeffneApp(page);                                              // frisch, denn depotAnlegen beginnt selbst mit „Erst umsehen“
    await depotAnlegen(page);
    await page.setViewportSize({ width: breite, height: 800 });
    await page.waitForTimeout(300);
    const echt = await kopf(page);
    gemeinsam(echt, breite);
    expect(echt.speicherImKopf, `${breite}: der Speicher-Status steht im Kopf (U2-ADR-211)`).toBe(true);
    expect(echt.zeileSichtbar, `${breite}: ohne Anlege-Hinweis keine leere Zeile unter dem Kopf`).toBe(false);

    const leiste = page.locator('#tb-a11y');
    await expect(leiste).toBeHidden();
    await page.locator('#tb-darstellung').click();
    await expect(page.locator('#tb-darstellung')).toHaveAttribute('aria-expanded', 'true');
    for (const id of ['#tb-schrift', '#tb-kontrast', '#tb-nacht']) await expect(page.locator(id)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(leiste).toBeHidden();
    await expect(page.locator('#tb-darstellung')).toHaveAttribute('aria-expanded', 'false');
  });
}

test('Kopfleiste 1280: Schriftgröße, Kontrast und Nacht stehen einzeln im Kopf, „Darstellung“ nicht', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await oeffneApp(page);
  await depotAnlegen(page);
  await expect(page.locator('#tb-darstellung')).toBeHidden();
  for (const id of ['#tb-schrift', '#tb-kontrast', '#tb-nacht', '#tb-einstellungen']) await expect(page.locator(id)).toBeVisible();
});

test('Kopfleiste 375 Rot-Beweis: mit Menü, Einstellungen und Schließen im Kopf steht der Name nicht voll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.addStyleTag({ content: '.topbar .tb-menue.tb-menue, .topbar #tb-einstellungen#tb-einstellungen, .topbar #tb-schliessen#tb-schliessen, .topbar .logo-wort.logo-wort { display: inline-flex !important; }' });
  await page.waitForTimeout(200);
  const k = await kopf(page);
  expect(k.nameVoll && k.ueberlauf <= 1, 'Rot-Beweis: der alte Kopf trägt den vollen Namen nicht').toBe(false);
});

const NEU_SCHLIESSWEG = "if (menueOffen() && !(window.matchMedia && window.matchMedia('(max-width:767px)').matches)) schliesseMenue();";
const ALT_SCHLIESSWEG = "{ const knopf = document.getElementById('tb-menue'); if (menueOffen() && (!knopf || !knopf.getClientRects().length)) schliesseMenue(); }";

async function leisteNachHoehenwechsel(page, url) {
  await page.setViewportSize({ width: 375, height: 800 });
  await oeffneApp(page, url ? { url } : undefined);
  await depotAnlegen(page);
  await page.setViewportSize({ width: 375, height: 800 });
  await schubfachOeffnen(page);
  await expect(page.locator('#app')).toHaveClass(/menue-auf/);
  await page.setViewportSize({ width: 375, height: 600 });   // Tastatur oder Adresszeile
  await page.waitForTimeout(300);
  return page.evaluate(() => document.getElementById('app').classList.contains('menue-auf'));
}

test('Kopfleiste 375: die Seitenleiste bleibt offen, wenn sich die Höhe ändert; ab 768 schließt sie', async ({ page }) => {
  expect(await leisteNachHoehenwechsel(page), 'Höhenwechsel bei 375: die Seitenleiste bleibt offen').toBe(true);
  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(page.locator('#app')).not.toHaveClass(/menue-auf/);
});

test('Kopfleiste 375 Rot-Beweis: mit dem alten Schließweg schließt der Höhenwechsel die Seitenleiste', async ({ page }) => {
  const original = decodeURIComponent(KERN_URL.replace(/^file:\/\//, ''));
  const text = fs.readFileSync(original, 'utf8');
  expect(text.split(NEU_SCHLIESSWEG).length, 'der Schließweg steht genau einmal im gebackenen Produkt').toBe(2);
  const kopie = path.join(path.dirname(original), 'rot-beweis-schliessweg-' + process.pid + '-' + path.basename(original));
  fs.writeFileSync(kopie, text.replace(NEU_SCHLIESSWEG, ALT_SCHLIESSWEG));
  try {
    expect(await leisteNachHoehenwechsel(page, 'file://' + kopie), 'Rot-Beweis: der alte Schließweg schließt').toBe(false);
  } finally { fs.rmSync(kopie, { force: true }); }
});

for (const breite of [320, 375, 390]) {
  test(`Kopfleiste ${breite} ungespeichert: der Sichern-Knopf drückt die Depot-Pille nicht zusammen, nichts liegt übereinander`, async ({ page }) => {
    await page.addInitScript(() => { try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {} });
    await page.setViewportSize({ width: breite, height: 800 });
    await oeffneApp(page);
    await depotAnlegen(page);
    await page.setViewportSize({ width: breite, height: 800 });
    await schubfachOeffnen(page);
    await require('./helpers').oeffneSektor(page, 'identity');
    const feld = page.locator('[data-edit="telephone"]');
    await feld.scrollIntoViewIfNeeded();
    await feld.click({ force: true });
    await page.keyboard.type('030 1234567');
    await page.keyboard.press('Tab');
    await expect(page.locator('#tb-save-knopf')).toBeVisible();
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const tb = document.querySelector('.topbar'), p = document.getElementById('tb-depot-pille');
      const k = [...tb.children].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getBoundingClientRect());
      let ueber = 0; for (let i = 1; i < k.length; i++) if (k[i].left < k[i - 1].right - 1) ueber++;
      return { pille: p.getBoundingClientRect().width, rand: p.scrollWidth - p.clientWidth, ueber, lauf: tb.scrollWidth - tb.clientWidth };
    });
    expect(m.pille, `${breite}: die Depot-Pille ist mindestens 24 px breit`).toBeGreaterThanOrEqual(24);
    expect(m.rand, `${breite}: nichts ragt über den Rahmen der Depot-Pille`).toBeLessThanOrEqual(1);
    expect(m.ueber, `${breite}: kein Element des Kopfs liegt über dem nächsten`).toBe(0);
    expect(m.lauf, `${breite}: die Kopfleiste läuft nicht über`).toBeLessThanOrEqual(1);
  });
}
