'use strict';
/* Abnahme 3 — „Drei Abnahmen und vier Messungen" (12./13.08.2026).
   Das Mehrzeilen-Szenario aus M3/A185 (Befund 2, „Adresse"/„Partei" am Dokument): zwei
   gleichnamige Dokumente ("Mietvertrag") müssen sich in der Liste unterscheiden lassen —
   ohne zu raten, welches gemeint ist. `tests/e2e/m3-referenz-beidseitig.spec.js` (09.08.)
   prüft den PERSONEN-Verweis, nicht diesen Fall. Diese Spec fährt den vollen Klickweg und
   legt den Bildbeleg ab (A185 Bericht: „gehört in Zug 4 ... dort noch offen"). */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { oeffneApp, depotAnlegen, oeffneSektor, KERN_URL_PRIVAT_DE } = require('./helpers');

// Schnitt-Nachtrag (19.09.2026): war die rohe vivodepot.html — seit BUERGERMODUL_BUENDEL
// entfernt ist, hat die keine nativen Bereiche mehr, oeffneSektor(page, 'housing') fand darum
// nie den Knopf. Jetzt dieselbe gebackene privat-de wie oeffneApp()'s eigener Default (KERN_URL
// ist eine file://-URL, hier wird der Dateipfad selbst gebraucht — daher ohne "file://"-Präfix).
const KERN = KERN_URL_PRIVAT_DE.replace(/^file:\/\//, '');

/* Die Rotprobe navigiert direkt auf die gepflanzte Kopie (`page.goto`, kein `oeffneApp()`) —
   die Default-FSA-Attrappe aus `helpers.js` greift für diese Navigation darum nicht und wird
   selbst registriert. Dasselbe Muster wie `12-lage-blatt-schreibweg.spec.js`. */
async function fsaAttrappeVorMutantNavigation(page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({
        name: 'a162-mutant-test.vivodepot',
        createWritable: async () => ({ write: async () => {}, close: async () => {} }),
      }),
    });
  });
}

/* Der Klickweg, den beide Proben fahren — einmal am echten Kern, einmal am mutierten.
   Er steht hier, damit die Rotprobe DIESELBE Strecke geht: eine Rotprobe, die einen anderen
   Weg nimmt, belegt nichts über den Weg der grünen. */
async function zweiMietvertraegeAnlegen(page) {
  const panel = page.locator('.doku-panel');
  if (!(await panel.evaluate((el) => el.open))) await panel.locator('summary').first().click();
  const mehr = page.locator('.doku-panel .doku-mehr').first();
  for (const adresse of ['Seestraße 4, 18055 Rostock', 'Lindenweg 1, 80331 München']) {
    await page.fill('#doku-neu-name', 'Mietvertrag');
    if (!(await mehr.evaluate((el) => el.open))) await mehr.locator('summary').click();
    await page.fill('#doku-neu-adresse', adresse);
    await page.click('[data-doku-neu-add="1"]');
    if (await mehr.evaluate((el) => el.open).catch(() => false) === false) await mehr.locator('summary').click();
  }
}

test('zwei gleichnamige "Mietvertrag"-Dokumente sind über die Adresse unterscheidbar', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'housing');

  const panel = page.locator('.doku-panel');
  if (!(await panel.evaluate((el) => el.open))) await panel.locator('summary').first().click();

  async function mietvertragAnlegen(adresse) {
    await page.fill('#doku-neu-name', 'Mietvertrag');
    const mehr = page.locator('.doku-panel .doku-mehr').first();
    if (!(await mehr.evaluate((el) => el.open))) await mehr.locator('summary').click();
    await page.fill('#doku-neu-adresse', adresse);
    await page.click('[data-doku-neu-add="1"]');
    // "Mehr" schließt sich beim nächsten Öffnen des Formulars nicht automatisch wieder —
    // für den zweiten Eintrag erneut aufklappen.
    if (await mehr.evaluate((el) => el.open).catch(() => false) === false) await mehr.locator('summary').click();
  }

  await mietvertragAnlegen('Seestraße 4, 18055 Rostock');
  await mietvertragAnlegen('Lindenweg 1, 80331 München');

  const eintraege = page.locator('.doku-eintrag');
  await expect(eintraege).toHaveCount(2);

  const unterzeilen = await page.locator('.doku-eintrag-unterzeile').allTextContents();
  expect(unterzeilen.length).toBe(2);
  expect(unterzeilen).toContain('Seestraße 4, 18055 Rostock');
  expect(unterzeilen).toContain('Lindenweg 1, 80331 München');
  expect(unterzeilen[0]).not.toBe(unterzeilen[1]);   // die eigentliche Zusicherung: unterscheidbar, kein Raten

  await page.waitForTimeout(3500);   // Toasts abklingen lassen, bevor der Bildbeleg entsteht
  await eintraege.first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'tests/e2e/.artifacts/m3-zwei-mietvertraege.png', fullPage: true });
});

/* ══ DER ROT-BELEG (A162-REST, Kreise-Strecke Posten 2, 21.08.2026) ═══════════════════════
   Die Probe darüber stand seit dem 13.08. und war GRÜN — aber sie hatte nie gezeigt, dass sie
   rot werden KANN. Genau das ist der Rest, den A162 offenhielt: „die Mehrzeilen-Regel ist
   bewiesen, ihre Anzeige nicht."

   GEPFLANZT WIRD DIE VERWECHSLUNG SELBST: die Unterzeile, die Adresse und Partei trägt,
   verschwindet. Dann stehen zwei Zeilen „Mietvertrag" da, ununterscheidbar — der Zustand vor
   Befund 2, und der Fall, um den es geht. Die Bürgerin müsste raten, welchen der beiden sie
   öffnet.

   Auf einer KOPIE in os.tmpdir(), nie im Arbeitsbaum (Regel 18) — dasselbe Muster wie
   `12-lage-blatt-schreibweg.spec.js`. */
test('[A162·Rot-Beleg] ohne die Unterzeile sind die zwei Mietverträge im Browser ununterscheidbar', async ({ page }) => {
  const mutantDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kern-a162-ohne-unterzeile-'));
  const mutant = path.join(mutantDir, 'kern-a162-ohne-unterzeile.html');
  const src = fs.readFileSync(KERN, 'utf8');
  const anker = "const kopfUnterzeile = unterzeile ? ('<span class=\"doku-eintrag-unterzeile\" data-doku-kopf-unterzeile=\"' + idA + '\">' + escapeHTML(unterzeile) + '</span>') : '';";
  expect(src.includes(anker), 'Anker der Unterzeile gefunden (sonst umbenannt)').toBe(true);
  fs.writeFileSync(mutant, src.replace(anker, "const kopfUnterzeile = /* GEPFLANZT (Regel 18): Unterzeile entfernt */ '';"), 'utf8');
  try {
    await fsaAttrappeVorMutantNavigation(page);
    await page.goto('file://' + mutant);
    await page.waitForSelector('#w-anlass', { state: 'visible' });
    await depotAnlegen(page);
    await oeffneSektor(page, 'housing');
    await zweiMietvertraegeAnlegen(page);

    // Beide Einträge sind da — die Mehrzeilen-REGEL trägt also weiterhin …
    await expect(page.locator('.doku-eintrag')).toHaveCount(2);
    // … aber die ANZEIGE unterscheidet sie nicht mehr: keine Unterzeile, zwei gleiche Namen.
    expect(await page.locator('.doku-eintrag-unterzeile').count(),
      'genau das ist der Fall aus Befund 2: zwei gleichnamige Dokumente ohne Unterscheidung').toBe(0);
    const namen = await page.locator('[data-doku-name]').evaluateAll((els) => els.map((e) => e.value));
    expect(namen).toEqual(['Mietvertrag', 'Mietvertrag']);
  } finally {
    fs.rmSync(mutantDir, { recursive: true, force: true });
  }
});
