'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — Vorführlauf „Zugang zum Recht" (Auftrag, 10.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Öffnet ein echtes Vorführ-Depot (tests/fixtures/vorfuehrung-zugang-zum-recht/,
   erzeugt mit tools/vorfuehrung-zugang-zum-recht-demodepot-erzeugen.js) über
   den echten Öffnen-Weg (#w-datei/#co-datei/#co-pw/#w-oeffnen — dasselbe
   Muster wie tests/e2e/durchstich-buergerweg.spec.js Schritt 7), geht bis
   zum fertigen Beratungshilfe-Auszug und legt bei jedem Schritt einen
   nummerierten Screenshot ab. Zweifacher Zweck: Beleg, dass der Weg heute
   durchgeht, und Rückfallebene, falls die Live-Vorführung klemmt.

   NACHTRAG 21.09.2026 (Template zugang-zum-recht, U2-ADR-427): der Zugangs-Auszug steht nicht mehr im Kern,
   sondern als Template im Rezept von privat-de/privat-en. Diese Spec öffnet darum das aus dem Rezept GEBAUTE
   Produkt (KERN_URL_PRIVAT_DE / KERN_URL_PRIVAT_EN aus helpers.js, von globalSetup gebacken), nicht den bloßen Kern —
   die EN-Probe lief bis dahin ebenfalls in privat-de mit angedocktem Sprachmodul: der Beleg für „das Template ist eingelassen,
   auch in der englischen Fassung" ist der Auszug, den das Produkt selbst liefert — ohne Depot-Kopie (die Datei
   stammt aus der Zeit davor; die Stufe 81 faltet ihre Kopie zur Ab-Werk-Saat des Produkts zurück).

   Kein interner Ablage-Pfad in dieser Datei — Screenshots landen in
   `test-results/`, das übliche Playwright-Ausgabeverzeichnis; wohin sie
   von dort aus kopiert werden, ist Sache des Berichts, nicht dieser Spec.
   ════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { oeffneApp, oeffneSektor, depotAnlegen, KERN_URL_PRIVAT_DE, KERN_URL_PRIVAT_EN } = require('./helpers');

const PW = 'zugang-zum-recht-vorfuehrung-2026';
const FIXTURE_DIR = path.join(__dirname, '..', 'fixtures', 'vorfuehrung-zugang-zum-recht');
const SHOT_DIR = 'test-results/vorfuehrung-zugang-zum-recht';

async function vorfuehrlauf(page, { depotDatei, spracheLabel, schrittPrefix, produktUrl }) {
  let n = 0;
  const shot = async (name) => {
    n += 1;
    await page.screenshot({ path: `${SHOT_DIR}/${schrittPrefix}-${String(n).padStart(2, '0')}-${name}.png`, fullPage: true });
  };

  // 1 · Willkommen.
  await oeffneApp(page, { url: produktUrl });
  await shot('willkommen');

  // 2 · „Schon ein Vivodepot? Datei öffnen" → Datei wählen → Passwort → Öffnen.
  await page.click('#w-datei');
  await page.setInputFiles('#co-datei', path.join(FIXTURE_DIR, depotDatei));
  await page.waitForSelector('#co-pw', { state: 'visible' });
  await shot('datei-gewaehlt-passwort-eingabe');
  await page.fill('#co-pw', PW);
  await page.click('#w-oeffnen');
  await page.waitForSelector('#app.an', { state: 'attached' });
  await shot('depot-geoeffnet');

  // 2b · Das Demo-Depot stammt von vor dem Kennungs-Umbau: der Kern zeigt beim Öffnen den
  // Migrations-Hinweis (migrationsHinweisZeigen). „Später" ist der Weg der Bürgerin, die gerade
  // vorführt. Nur wegklicken, wenn er erscheint — ein frisch geschriebenes Demo-Depot hat ihn nicht.
  const migrationsHinweis = page.locator('#migrations-hinweis');
  if (await migrationsHinweis.waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false)) {
    await page.click('#m-zweit');
    await expect(migrationsHinweis).toHaveCount(0);
  }

  // 3 · Sektor „Vermögen" — der Zielsektor des Beratungshilfe-Auszugs.
  await oeffneSektor(page, 'assets');
  await shot('sektor-vermoegen');

  // 4 · Der Beratungshilfe-Auszug ist ab Werk da, ohne Einlass — Knopf sichtbar.
  const knopf = page.locator('[data-zugang-recht-dokument]');
  await expect(knopf, `Beratungshilfe-Auszug-Knopf sichtbar (${spracheLabel})`).toBeVisible();
  await shot('auszug-knopf-sichtbar');

  // 5 · Auszug öffnen.
  await knopf.click();
  const overlay = page.locator('#pv-dok-overlay');
  await expect(overlay).toBeVisible();
  await shot('auszug-geoeffnet');

  // 6 · Der Auszug ist LÄNGER als ein Bildschirm (#pv-dok-overlay scrollt eigenständig,
  // overflow-y:auto) — ein fullPage-Screenshot im Standard-Viewport zeigt nur Teil 0. Für den
  // vollständigen, vorführbaren Auszug (alle vier Teile) die Fensterhöhe auf die tatsächliche
  // Scroll-Höhe der Overlay-Karte anheben, dann erst den Beleg-Screenshot nehmen.
  const vollHoehe = await overlay.evaluate((el) => el.scrollHeight);
  await page.setViewportSize({ width: 1280, height: Math.min(vollHoehe + 40, 8000) });
  await shot('auszug-vollstaendig');

  return overlay;
}

test('Beratungshilfe-Auszug — DE: Depot öffnen bis fertiger Auszug, alle vier Teile gefüllt', async ({ page }) => {
  const overlay = await vorfuehrlauf(page, { depotDatei: 'demo-de.vivodepot', spracheLabel: 'DE', schrittPrefix: 'de', produktUrl: KERN_URL_PRIVAT_DE });

  await expect(overlay).toContainText('Beratungshilfe');
  await expect(overlay).toContainText('keine amtliche Vorlage, kein Antrag');
  await expect(overlay).toContainText('Elisabeth');
  await expect(overlay).toContainText('Wredenhagen Sonnenschein');
  await expect(overlay).toContainText('München');
  await expect(overlay).toContainText('Amtsgericht München');

  const text = await overlay.innerText();
  expect(text, 'keine unbeantwortete Frage im Vorführ-Depot').not.toContain('nicht erfasst');
  expect(text).not.toContain('undefined');
});

test('Beratungshilfe-Auszug — EN: derselbe Weg geht auf Englisch genauso durch', async ({ page }) => {
  const overlay = await vorfuehrlauf(page, { depotDatei: 'demo-en.vivodepot', spracheLabel: 'EN', schrittPrefix: 'en', produktUrl: KERN_URL_PRIVAT_EN });

  // Der DOKUMENT-INHALT ist Englisch — das ist der Geltungsbereich des angedockten
  // EN-Sprachmoduls (tools/textsatz-en-modul.json). Die umgebende App-Oberfläche (Toolbar-
  // Knöpfe „Drucken"/„Als PDF sichern"/„Schließen", der Werkzeugleisten-Hinweis oben) bleibt
  // Deutsch — das ist kein Fund, sondern der geprüfte Geltungsbereich (s. Bericht).
  await expect(overlay).toContainText('Advice assistance — preparatory extract');
  await expect(overlay).toContainText('Part 0 — the person');
  await expect(overlay).toContainText('First name? Elisabeth');
  await expect(overlay).toContainText('Surname? Wredenhagen Sonnenschein');

  const text = await overlay.innerText();
  expect(text, 'keine unbeantwortete Frage in der EN-Fassung').not.toContain('nicht erfasst');
  expect(text).not.toContain('undefined');
});

/* Der Beleg, dass das PRODUKT den Auszug liefert: die Demo-Depots oben tragen ihre eigene Kopie des Moduls (sie wurden mit
   einem Kern angelegt, der den Auszug in jedes Depot einließ), die Proben davor bleiben deshalb auch ohne das Template im
   Rezept grün (gemessen 21.09.2026: templatePfade entfernt, beide Tests grün). Ein FRISCH angelegtes Depot im gebauten
   Produkt trägt keine Kopie — sieht es den Auszug, kommt er aus dem Template. */
async function auszugImFrischenDepot(page, produktUrl) {
  await oeffneApp(page, { url: produktUrl });
  await depotAnlegen(page);
  await oeffneSektor(page, 'assets');
  const knopf = page.locator('[data-zugang-recht-dokument]');
  await expect(knopf, 'Beratungshilfe-Auszug-Knopf im frischen Depot des Produkts').toBeVisible();
  await knopf.click();
  const overlay = page.locator('#pv-dok-overlay');
  await expect(overlay).toBeVisible();
  return overlay;
}

test('Beratungshilfe-Auszug — DE ohne Depot-Kopie: ein frisch angelegtes Depot in privat-de trägt ihn aus dem Template', async ({ page }) => {
  const overlay = await auszugImFrischenDepot(page, KERN_URL_PRIVAT_DE);
  await expect(overlay).toContainText('Beratungshilfe');
  await expect(overlay).toContainText('Teil 0');
});

test('Beratungshilfe-Auszug — EN ohne Depot-Kopie: ein frisch angelegtes Depot in privat-en zeigt ihn englisch', async ({ page }) => {
  const overlay = await auszugImFrischenDepot(page, KERN_URL_PRIVAT_EN);
  await expect(overlay).toContainText('Advice assistance — preparatory extract');
  await expect(overlay).toContainText('About the applicant');
});
