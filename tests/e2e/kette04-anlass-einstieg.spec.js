'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Kette, Auftrag 4 — Browser-Abnahme (Ebene 2 des Testkonzepts)
   ────────────────────────────────────────────────────────────────────────────
   „Der ganze Weg über die Oberfläche — Kachel, Liste, Häkchen, herausgeben.
   ELF ZEILEN, NICHT 178. Über die Oberfläche, nicht über globale Variablen:
   was ein Mensch nicht anklicken kann, ist nicht geprüft."

   Die Node-Proben messen die Modelle; DIESE Probe misst, dass ein Mensch den Weg
   findet und geht.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

test('der Weg nach draußen: Herausgeben-Tür → Anlass → Übersicht — wenige Zeilen, nicht das ganze Depot', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  // Ein Depot mit Gesundheitsdaten — der Fall, für den es die Anlässe gibt.
  await oeffneSektor(page, 'health');
  await page.fill('[data-edit="insuranceNumber"]', 'A123456780');
  await page.keyboard.press('Tab');
  await page.fill('[data-edit="implantsProsthesesPacemakers"]', 'Hüft-TEP rechts');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(150);

  // Die Tür „Herausgeben" — ohne neuen Menüpunkt, sie gab es schon.
  await page.click('[data-weitergeben-zentral]');
  const tuer = page.locator('#modal-inhalt');
  await expect(tuer).toBeVisible();

  // ZUG 1: Anlässe stehen zur Wahl — und es sind WENIGE Zeilen.
  const anlassKnoepfe = tuer.locator('[data-hz-anlass]');
  const anzahl = await anlassKnoepfe.count();
  expect(anzahl, 'mindestens ein Anlass steht zur Wahl').toBeGreaterThan(0);
  expect(anzahl, 'eine überschaubare Liste, nicht 178 Zeilen').toBeLessThan(30);

  // Und der Weg zum freien Zusammenstellen steht daneben.
  await expect(tuer.locator('[data-hz-zusammenstellen]')).toHaveCount(1);

  // ZUG 1: ein Anlass führt in die Übersicht „das wird herausgegeben".
  await anlassKnoepfe.first().click();
  await page.waitForTimeout(250);
  const uebersicht = page.locator('#modal-inhalt');
  await expect(uebersicht).toBeVisible();
  const zeilen = await uebersicht.locator('.export-geht-liste li, .export-zz').count();
  expect(zeilen, 'die Übersicht zeigt die Felder des Anlasses, nicht das ganze Depot').toBeLessThan(40);

  // Es ist der OPT-OUT-Zweig, nicht die am 12.08. abgeschaffte Kästchenliste.
  await expect(uebersicht.locator('.export-auswahl'), 'keine Kästchenliste').toHaveCount(0);
});

test('das freie Zusammenstellen: suchen, aufnehmen, ein leeres Feld an Ort und Stelle füllen', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  await page.click('[data-weitergeben-zentral]');
  await page.click('[data-hz-zusammenstellen]');
  await page.waitForTimeout(250);

  // 1 · Suchfeld, 2 · Treffer, 3 · Liste, 4 · Knopf
  await expect(page.locator('#zus-suche')).toBeVisible();
  await expect(page.locator('#zus-treffer')).toBeVisible();

  await page.fill('#zus-suche', 'Versichertennummer');
  await page.waitForTimeout(200);
  const treffer = page.locator('[data-zus-treffer]');
  expect(await treffer.count(), 'die Suche findet über die Beschriftung').toBeGreaterThan(0);

  // Das Feld ist LEER — und genau dort füllbar, ohne den Bildschirm zu verlassen.
  const fuellFeld = page.locator('[data-zus-fuellen]').first();
  await expect(fuellFeld, 'ein leeres Feld wird nicht versteckt, sondern angeboten').toBeVisible();
  await fuellFeld.fill('A123456780');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(250);

  // Danach ist es aufgenommen — und die Liste steht.
  const aufgenommen = page.locator('[data-zus-kennung]');
  expect(await aufgenommen.count(), 'das gefüllte Feld ist aufgenommen').toBeGreaterThan(0);

  // Und der Wert steht im BEREICH, nicht nur in dieser Ausgabe.
  const imBereich = await page.evaluate(() => window.__vd && window.__vd.feldRohwert
    ? window.__vd.feldRohwert('health', 'insuranceNumber') : null);
  if (imBereich !== null) expect(imBereich).toBe('A123456780');
});
