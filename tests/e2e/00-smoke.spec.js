'use strict';
/* E2E-Smoke (Teil 7) — die Single-File-App lädt offline und zeigt den Welcome-Screen. */
const { test, expect } = require('@playwright/test');
const { oeffneApp } = require('./helpers');

// Bekannt-folgenlose Browser-Hinweise: die CSP-Direktiven 'frame-ancestors'/'report-uri'/'sandbox'
// wirken NUR als echter HTTP-Header, nicht im <meta>-CSP. Bei file:// stehen keine Header zur
// Verfügung; der Meta-CSP der App ist bewusst gesetzt, und Chromium loggt den Hinweis auf error-
// Level. Das ist KEIN App-Fehler → aus der „null Konsolen-Meldungen"-Schranke herausgefiltert.
// Echte JS-Fehler laufen weiter ungefiltert durch (pageerror + jede andere error-Meldung).
const KONSOLE_HARMLOS = [
  /Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored when delivered via/i,
];
const istHarmloseKonsole = (t) => KONSOLE_HARMLOS.some((re) => re.test(String(t)));

test('App lädt über file:// und zeigt den Welcome-Screen ohne Konsolen-Fehler', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);

  await expect(page.locator('.welcome-brand')).toBeVisible();
  // Lage A (Strang 2 Commit A): drei ADR-Eingänge — Wizard, „Hier anfangen", Datei-Pfad.
  await expect(page.locator('#w-anlass')).toBeVisible();
  await expect(page.locator('#w-anfangen')).toBeVisible();
  await expect(page.locator('#w-datei')).toBeVisible();
  // U2-ADR-078 (12.07.2026): die passwortlose Notfall-Tür (#w-notfall) wurde ersatzlos entfernt
  // (Stufe-1-Cache-Rücknahme) — kein Ersatz-Locator, das Feature existiert nicht mehr.

  expect(fehler, 'keine JS-/Konsolen-Fehler beim Laden').toEqual([]);
});
