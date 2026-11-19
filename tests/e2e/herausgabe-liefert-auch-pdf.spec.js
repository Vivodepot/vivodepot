'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Herausgabe-Vollständigkeit (Auftrag 14.09.2026) — Produktentscheidung: alles,
   was herausgegeben wird, wird auch als PDF herausgegeben, damit es überprüfbar
   ist. Vor diesem Auftrag lieferten `flowZusammenstellungHerausgeben`
   ("Selbst zusammenstellen"/Teilmenge) und `flowAnlassExport` (Anlass) NUR die
   JSON-Datei — `anlassAusgaben()` berechnete `pdfModell` bereits (Kommentar
   dort: "die drei Ausgaben entstehen aus EINEM Lauf"), aber nichts zeichnete
   oder gab das PDF je aus. `anlassPdfAusgeben()` schließt die Lücke, mit
   derselben Zeichenfunktion (`zeichneVollDepotPdf`) wie das Gesamt-/Bereichs-PDF.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, ausgabeWegHerunterladen } = require('./helpers');

const PW = 'e2e-passwort-123';

function konsoleFehlerSammeln(page) {
  const funde = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (m.text().includes('frame-ancestors')) return;   // bekannter, harmloser CSP-Meta-Hinweis
    funde.push(m.text());
  });
  page.on('pageerror', (e) => funde.push('pageerror: ' + e.message));
  return funde;
}

async function uebersichtBestaetigen(page) {
  if (await page.locator('#m-ok').isVisible().catch(() => false)) await page.locator('#m-ok').click();
}

test('Zusammenstellung (Teilmenge) liefert JSON UND PDF', async ({ page }) => {
  const konsoleFehler = konsoleFehlerSammeln(page);
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  await page.evaluate(() => { window.__vdOeffentlich.sektorFeldSetzen('identity', 'givenName', 'Maria'); });

  const downloads = [];
  page.on('download', (d) => downloads.push(d));
  await page.evaluate(() => { window.__vdOeffentlich.flowZusammenstellungHerausgeben(['identity.givenName'], 'Testliste'); });
  await page.waitForTimeout(300);
  await uebersichtBestaetigen(page);
  await page.waitForTimeout(600);

  const namen = downloads.map((d) => d.suggestedFilename());
  expect(namen.some((n) => n.endsWith('.pdf')), 'PDF-Datei muss dabei sein: ' + namen.join(',')).toBe(true);
  expect(konsoleFehler).toEqual([]);
});

test('Anlass-Export liefert JSON UND PDF', async ({ page }) => {
  const konsoleFehler = konsoleFehlerSammeln(page);
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });

  const downloads = [];
  page.on('download', (d) => downloads.push(d));
  const anlassId = await page.evaluate(() => Object.keys(window.__vdOeffentlich.SITUATION_BY_ID || {})[0] || null);
  expect(anlassId, 'mindestens ein Anlass/Situation muss existieren').toBeTruthy();
  await page.evaluate((id) => { window.__vdOeffentlich.flowAnlassExport(id); }, anlassId);
  await page.waitForTimeout(300);
  await uebersichtBestaetigen(page);
  /* B3 (12.11.2026): Nach dem Herausgeben zeigt der Ergebnis-Dialog zwei gleichrangige Wege, PDF und Datei.
     Beide stammen aus demselben Lauf; die Probe geht beide Wege und verlangt beide Dateien. Seit U-5 Rest (17.11.2026) stehen die Wege
     auf der Seite „Fertig“ ([data-anlass-ergebnis]); [data-ergebnis-weg] sind dort die Knöpfe „Speichern“. */
  const ergebnis = page.locator('[data-anlass-ergebnis]');
  await expect(ergebnis, 'der Ergebnis-Dialog bietet die Wege an').toBeVisible();
  await ergebnis.locator('[data-ergebnis-weg="pdf"]').click();
  await page.waitForTimeout(600);
  // Ohne Stelle fragt der erste Weg einmal nach, an wen es ging; die Probe trägt keine ein und wählt „Später“.
  if (await page.locator('#modal-rueck.an').isVisible().catch(() => false)) await page.locator('#m-zweit').click();
  await ergebnis.locator('[data-ergebnis-weg="datei"]').click();
  await page.waitForTimeout(600);

  const namen = downloads.map((d) => d.suggestedFilename());
  expect(namen.some((n) => n.endsWith('.pdf')), 'PDF-Datei muss dabei sein: ' + namen.join(',')).toBe(true);
  expect(namen.some((n) => n.endsWith('.json')), 'Datei zum Einlesen muss dabei sein: ' + namen.join(',')).toBe(true);
  expect(konsoleFehler).toEqual([]);
});
