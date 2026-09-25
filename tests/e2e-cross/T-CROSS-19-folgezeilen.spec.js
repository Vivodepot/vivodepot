'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   T-CROSS-19 (A382) — DIE FOLGE-ZEILEN: ZURÜCKGENOMMEN, IM BROWSER BELEGT
   ────────────────────────────────────────────────────────────────────────────
   Diese Probe hat bis zum 20.08.2026 im Browser geprüft, dass der Erzeuger
   sagt, was ohne eines der drei Tauglich-Häkchen gilt.

   **Die Produktentscheidung vom 20.08.2026 streicht die Häkchen selbst**
   (Laufzettel „nach der Entscheidungsrunde", Posten 1). Damit fällt der
   Gegenstand weg — und die Probe wird UMGEDREHT statt gelöscht: sie belegt am
   gerenderten Erzeuger, dass die Häkchen und ihre Folge-Zeilen fort sind.

   WARUM SIE IM BROWSER BLEIBT UND NICHT IN DEN NODE-HARNISCH WANDERT: dort ist
   `getElementById` nie null (Phantom-DOM), eine Abwesenheit liesse sich also
   gar nicht messen. Genau die Eigenschaft, die die Probe damals hierher
   gebracht hat, macht sie auch für die Gegenrichtung nötig.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const path = require('node:path');

const REPO = path.join(__dirname, '..', '..');
const URL = 'file://' + path.join(REPO, 'vivodepot-template-generator.html');

async function zumTemplateSchritt(p) {
  await p.goto(URL);
  await p.waitForSelector('#start-leer', { state: 'visible' });
  await p.click('#start-leer');
  await p.waitForSelector('#tpl-anzahl', { state: 'visible' });   // der Schritt steht
}

test.describe('T-CROSS-19 · die Sorge-Markierung ist zurückgenommen', () => {
  test('die drei Häkchen sind im gerenderten Erzeuger nicht mehr vorhanden', async ({ page }) => {
    await zumTemplateSchritt(page);
    for (const id of ['tpl-anker', 'tpl-sub', 'tpl-sorgerecht']) {
      await expect(page.locator('#' + id)).toHaveCount(0);
    }
  });

  test('und mit ihnen die Folge-Zeilen aus A382', async ({ page }) => {
    await zumTemplateSchritt(page);
    for (const id of ['folge-anker', 'folge-sub', 'folge-sorgerecht']) {
      await expect(page.locator('#' + id)).toHaveCount(0);
    }
    await expect(page.locator('.folge-zeile')).toHaveCount(0);
  });

  test('Gegenprobe: der Template-Schritt selbst steht unverändert', async ({ page }) => {
    /* Ohne sie wäre „nichts gefunden" auch dann grün, wenn die Seite gar nicht geladen hätte
       oder der Schritt nicht erschienen wäre — eine Abwesenheits-Probe braucht einen Zeugen
       für die Anwesenheit des Ganzen. */
    await zumTemplateSchritt(page);
    await expect(page.locator('#tpl-anzahl')).toBeVisible();
    await expect(page.locator('#fertig-oeffnen')).toBeVisible();
  });
});
