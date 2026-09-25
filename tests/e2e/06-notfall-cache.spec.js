'use strict';
/* Reise — Notfall-Cache: eine Akut-Angabe eintragen, in den Notfall-Modus wechseln,
   die rote Notfall-Sicht zeigt die Angabe (ohne Passwort lesbar). */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, setzeModus } = require('./helpers');

test('Notfall-Sicht zeigt die akute Allowlist (Blutgruppe), die übrigen Daten nicht', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  // Eine Akut-Angabe (Auswahl) im Gesundheits-Bereich setzen. Inline-Edit-Modell (immer
  // editierbar): direkt am Feld-Select setzen + sektorweit speichern, kein #b-bearb/#b-fertig.
  await oeffneSektor(page, 'health');
  await page.selectOption('[data-edit="bloodType"]', 'A+');
  await page.evaluate(() => { window.__vdOeffentlich.bearbeitungSpeichern(); window.__vdOeffentlich.renderContent(); });

  // In den Notfall-Modus wechseln → rote Notfall-Sicht mit der Blutgruppe.
  await setzeModus(page, 'notfall');
  await expect(page.locator('.notfall-rahmen')).toBeVisible();
  await expect(page.locator('#content')).toContainText('A +');
  // Notfall-Sicht ist nur lesend (gesperrt-Hinweis vorhanden).
  await expect(page.locator('.notfall-rahmen .gesperrt')).toBeVisible();
});

// U2-ADR-078 (12.07.2026): der Stufe-1-Einstieg „Im Notfall …" (#w-notfall, passwortlose
// Welcome-Tür + Datei-Dialog #nf-datei) wurde ersatzlos zurückgenommen — kein Node-Suite-Nachzug
// hatte diesen E2E-Test erfasst. Test entfernt, kein Ersatz (Feature existiert nicht mehr).
