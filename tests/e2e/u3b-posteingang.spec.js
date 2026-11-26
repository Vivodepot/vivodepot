'use strict';
/* u3b-posteingang.spec.js — U-3b (U2-ADR-529, Desktop-Dummy D29 und D72) im Browser, bei 1280 und 375 px.
   ─────────────────────────────────────────────────────────────────
   Zwei Dateien auf einmal über „Dateien auswählen“ auf der Seite „Einlesen“: beide warten unter „Erkannt“ mit der Marke
   „2 zuzuordnen“ (D72), die Übersicht zeigt unter „Wartet auf Sie“ eine Zeile mit „Zuordnen“ (D29), die zur Seite Einlesen
   führt. „Entfernen“ fragt nach und nimmt genau einen Eintrag heraus. Am Handy läuft nichts über den Rand.
   Rot-Beweis: vor dem Einlesen gibt es weder den Abschnitt noch die Zeile; nach dem Entfernen beider Einträge sind beide fort. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, inLeisteKlicken } = require('./helpers');

const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

async function zurUebersicht(page) {
  // Am Handy (bis 767 px) geht die Person über die Leiste unten, sonst über die Seitenleiste.
  const schmal = await page.evaluate(() => window.matchMedia('(max-width:767px)').matches);
  if (!schmal) { await page.locator('#sidebar [data-uebersicht]').click(); return; }
  await page.getByRole('navigation', { name: 'Schnellzugriff' }).getByRole('button', { name: 'Übersicht' }).click();
}

async function ueberlauf(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

for (const breite of [1280, 375]) {
  test(`[U-3b·D72/D29] zwei Dateien warten unter „Erkannt“ und in „Wartet auf Sie“ bei ${breite} px`, async ({ page }) => {
    await page.setViewportSize({ width: breite, height: 900 });
    await oeffneApp(page);
    await depotAnlegen(page);

    // Am Handy geht die Person über „Einlesen“ in der Leiste unten (Handy-Dummy), ohne das Schubfach: ein offenes oder sich
    // schließendes Schubfach verschob sonst die Seite im Bild D72 bei 375 px.
    if (breite < 768) await page.getByRole('navigation', { name: 'Schnellzugriff' }).getByRole('button', { name: 'Einlesen' }).click();
    else await inLeisteKlicken(page, '[data-einlesen-zentral]');
    // Bild nur bei geschlossenem Schubfach: die Seitenleiste liegt nicht im sichtbaren Bereich
    if (breite < 768) await expect.poll(() => page.evaluate(() => document.getElementById('sidebar').getBoundingClientRect().right <= 0)).toBe(true);
    await expect(page.locator('#content [data-ansicht="einlesen"]')).toBeVisible();
    // Rot-Beweis vorab: ohne wartende Datei kein Abschnitt „Erkannt“
    await expect(page.locator('[data-einlesen-posteingang]')).toHaveCount(0);

    const [wahl] = await Promise.all([page.waitForEvent('filechooser'), page.click('#content #einlesen-waehlen')]);
    await wahl.setFiles([
      { name: 'Befund-Hausarzt.png', mimeType: 'image/png', buffer: PNG_1x1 },
      { name: 'Notiz-Termin.txt', mimeType: 'text/plain', buffer: Buffer.from('Termin am Dienstag, bitte Unterlagen mitbringen.') },
    ]);

    const erkannt = page.locator('[data-einlesen-posteingang]');
    await expect(erkannt).toBeVisible();
    await expect(erkannt.locator('[data-posteingang-marke]')).toHaveText(/2/);
    await expect(erkannt.locator('[data-posteingang-eintrag]')).toHaveCount(2);
    // Bild und Textnotiz liest der Kern nicht ein: jede trägt „Als Dokument ablegen“, keine ein „Übernehmen“ (ADR 529, Nachtrag 23.11.2026)
    await expect(erkannt.getByRole('button', { name: 'Als Dokument ablegen' })).toHaveCount(2);
    await expect(erkannt.getByRole('button', { name: 'Übernehmen', exact: true })).toHaveCount(0);
    await expect(erkannt.locator('[data-posteingang-entfernen]')).toHaveCount(2);
    if (breite === 375) {
      expect(await ueberlauf(page), 'Einlesen bei 375 ohne Überlauf').toBeLessThanOrEqual(0);
      // Name und Angaben stehen über die volle Breite, die Knöpfe darunter (Bild D72 bei 375: sonst eine Spalte von wenigen Zeichen)
      const anteil = () => page.evaluate(() => {
        const z = document.querySelector('[data-posteingang-eintrag]');
        return z.querySelector('.uebersicht-zeile-text').getBoundingClientRect().width / z.getBoundingClientRect().width;
      });
      expect(await anteil(), 'Text der wartenden Datei über die Breite').toBeGreaterThan(0.75);
      // Rot-Beweis: ohne Umbruch der Zeile schrumpft der Text auf eine schmale Spalte
      const rot = await page.addStyleTag({ content: '[data-posteingang-eintrag] { flex-wrap: nowrap !important; } [data-posteingang-eintrag] > .uebersicht-zeile-text { flex: 1 1 auto !important; }' });
      expect(await anteil(), 'Rot-Beweis: ohne Umbruch schmal').toBeLessThan(0.5);
      await rot.evaluate((el) => el.remove());
    }
    await page.screenshot({ path: test.info().outputPath(`u3b-d72-${breite}.png`), fullPage: true });

    await zurUebersicht(page);
    const zeile = page.locator('[data-uebersicht-posteingang]');
    await expect(zeile).toBeVisible();
    await expect(zeile).toContainText('2');
    if (breite === 375) expect(await ueberlauf(page), 'Übersicht bei 375 ohne Überlauf').toBeLessThanOrEqual(0);
    await page.screenshot({ path: test.info().outputPath(`u3b-d29-${breite}.png`), fullPage: true });

    await zeile.locator('[data-uebersicht-zuordnen]').click();
    await expect(page.locator('#content [data-ansicht="einlesen"]')).toBeVisible();

    // Entfernen fragt nach und nimmt genau einen Eintrag heraus
    await page.locator('[data-posteingang-entfernen]').first().click();
    await page.locator('#m-ok').click();
    await expect(page.locator('[data-posteingang-eintrag]')).toHaveCount(1);
    await expect(page.locator('[data-posteingang-marke]')).toHaveText(/1/);

    // Rot-Beweis hinten: ist auch der zweite fort, verschwinden Abschnitt und Zeile
    await page.locator('[data-posteingang-entfernen]').first().click();
    await page.locator('#m-ok').click();
    await expect(page.locator('[data-einlesen-posteingang]')).toHaveCount(0);
    await zurUebersicht(page);
    await expect(page.locator('[data-uebersicht-posteingang]')).toHaveCount(0);
  });
}
