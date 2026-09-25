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
const { oeffneApp, depotAnlegen } = require('./helpers');

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
  await page.waitForTimeout(600);

  const namen = downloads.map((d) => d.suggestedFilename());
  expect(namen.some((n) => n.endsWith('.pdf')), 'PDF-Datei muss dabei sein: ' + namen.join(',')).toBe(true);
  expect(konsoleFehler).toEqual([]);
});
