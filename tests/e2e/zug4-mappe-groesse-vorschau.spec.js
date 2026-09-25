'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Zug 4a/4b (Auftrag „Erfolg ohne Wirkung", 08.08.2026) — Mappe im echten Browser
   ────────────────────────────────────────────────────────────────────────
   Zug 4a: eine Byte-Obergrenze VOR dem Ablegen, mit einer eigenen Meldung
   (statt einer Quota-Überraschung erst beim nächsten Speichern).
   Zug 4b: PDF-Vorschau über eine Blob-URL (Chrome/Edge/Firefox blockieren die
   vorherige Data-URL im iframe — leerer Rahmen) und ein Herunterladen-Knopf
   für JEDE Ablage, nicht nur für autoritative FHIR-Importe.
   FileReader/canvas Image/`<iframe>`-Rendering sind Browser-only — dafür
   dieser Rauchtest statt eines Node-Tests (s. tests/zug4-mappe-dataurl-blob.test.js
   für die reine dataUrlZuBlob()-Logik). */
const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

async function oeffneMappeSicht(page) {
  await page.click('[data-mappe]');
  await page.waitForSelector('#mappe-add', { state: 'visible' });
}

async function dateiHochladen(page, datei) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click('#mappe-add'),
  ]);
  await chooser.setFiles(datei);
}

test.beforeEach(async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneMappeSicht(page);
});

test('Zug 4a: eine Datei über der Grenze wird VOR dem Ablegen abgelehnt, mit eigener Meldung', async ({ page }) => {
  const gross = Buffer.alloc(6 * 1024 * 1024, 'A');   // 6 MB > MAPPE_MAX_BYTES (5 MB)
  await dateiHochladen(page, { name: 'zu-gross.pdf', mimeType: 'application/pdf', buffer: gross });

  // toContainText() wartet (auto-retry) statt einer Momentaufnahme — der Toast-Host leert sich
  // nach 3200 ms, eine sofortige allTextContents()-Momentaufnahme kann eine leere Zwischenphase treffen.
  // GEÄNDERT (Auftrag, 12.09.2026): Autosave-Toasts (ADR-237, Klasse „toast ok") stapeln
  // sich neben dem Fehler-Toast — auf die Fehler-Klasse eingeengt, statt auf irgendeinen Toast.
  await expect(page.locator('#toast-host .toast.fehler')).toContainText(/zu groß/);
  // Kein Metadaten-Dialog — die Datei kam nie so weit.
  await expect(page.locator('#mappe-besch')).toHaveCount(0);
  // Und sie liegt nicht in der Mappe.
  await expect(page.locator('[data-mappe-id]')).toHaveCount(0);
});

test('Zug 4a: eine Datei innerhalb der Grenze wird ganz normal abgelegt (Gegenprobe)', async ({ page }) => {
  const klein = Buffer.from('%PDF-1.4 winziger Testinhalt', 'utf8');
  await dateiHochladen(page, { name: 'klein.pdf', mimeType: 'application/pdf', buffer: klein });
  await page.locator('#mappe-besch').waitFor({ state: 'visible' });
  await page.click('#m-ok');
  await expect(page.locator('[data-mappe-id]')).toHaveCount(1);
});

test('Zug 4b: PDF-Vorschau nutzt eine blob:-URL (nicht data:) und ein Herunterladen-Knopf funktioniert', async ({ page }) => {
  const inhalt = '%PDF-1.4 Zug4b Testinhalt, byte-genau geprüft';
  await dateiHochladen(page, { name: 'eigenes-dokument.pdf', mimeType: 'application/pdf', buffer: Buffer.from(inhalt, 'utf8') });
  await page.locator('#mappe-besch').waitFor({ state: 'visible' });
  await page.fill('#mappe-besch', 'Mein eigenes Dokument');
  await page.click('#m-ok');

  await page.click('[data-mappe-id]');
  const iframe = page.locator('iframe.mappe-vorschau-pdf');
  await expect(iframe).toBeVisible();
  const src = await iframe.getAttribute('src');
  expect(src, 'die Vorschau muss über eine Objekt-URL laufen, keine data:-URL (die blockieren Chrome/Edge/Firefox im iframe)').toMatch(/^blob:/);

  // Herunterladen-Knopf: vorher nur für autoritative FHIR-Importe gebaut — hier ein EIGENER Upload.
  const knopf = page.locator('[data-mappe-herunterladen]');
  await expect(knopf).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    knopf.click(),
  ]);
  const pfad = await download.path();
  const roh = fs.readFileSync(pfad, 'utf8');
  expect(roh).toBe(inhalt);   // Bytes rein, Bytes raus — dieselbe Prüfung wie beim autoritativen Original
});
