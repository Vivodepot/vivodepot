'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — Gebwiz Kind und Sub-Depot Zug 4: Browser-Abnahme („Gebwiz Kind und Sub-Depot", 11.08.2026, echter Klickweg, drei Fälle)
   ────────────────────────────────────────────────────────────────────────
   Auftrag Zug 4: „Assistent mit Kindesnamen → Kind steht in „Kinder und
   Schutzbefohlene", Sub-Depot-Vorschlag erscheint, Ablehnen führt sauber
   weiter. Assistent ohne Namen → kein Eintrag, kein Vorschlag, Abschlusssatz
   sagt es [s. gebwiz-subdepot-vorschlag-abnahme.spec.js]. Assistent ein
   zweites Mal mit demselben Namen → keine Dublette. Dazu: Personenzahl in
   der Krisenvorsorge-Bedarfsrechnung vorher und nachher, Bildbeleg."
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

async function gebwizStarten(page) {
  await page.click('[data-anlass-auswahl]');
  await page.waitForSelector('[data-anlass="geburt"]', { state: 'visible' });
  await page.click('[data-anlass="geburt"]');
  await expect(page.locator('.wizard-frage')).toBeVisible();
}

async function bisZumNamenSchrittDurchklicken(page) {
  for (let i = 0; i < 6; i++) await page.click('#wiz-weiter');
  await expect(page.locator('#content [data-edit="guidedBirthEntryChildsNameNot"]')).toBeVisible();
}

async function gebwizMitNamenDurchlaufen(page, name) {
  await gebwizStarten(page);
  await bisZumNamenSchrittDurchklicken(page);
  await page.fill('#content [data-edit="guidedBirthEntryChildsNameNot"]', name);
  await page.click('#wiz-weiter');
  await page.click('#wiz-weiter');   // Geburtsdatum leer
  await page.click('#wiz-weiter');   // Verhältnis auf Vorgabe
}

test('Krisenvorsorge-Personenzahl VORHER — ein Mensch im Haushalt (Bildbeleg)', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'emergencyPreparedness');
  const bedarf = page.locator('[data-krisenvorsorge-bedarf]');
  await expect(bedarf).toContainText('1 Person');
  await page.screenshot({ path: 'test-results/gebwiz-krisenvorsorge-personenzahl-vorher.png' });
});

test('Assistent mit Kindesnamen → Kind in „Kinder und Schutzbefohlene" sichtbar, Ablehnen führt sauber weiter, Personenzahl NACHHER (Bildbeleg)', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await gebwizMitNamenDurchlaufen(page, 'Mia Musterfrau');

  await expect(page.locator('#modal-titel')).toContainText('Eigenes Depot für Ihr Kind?');
  await page.click('#m-abbr');   // Ablehnen
  await expect(page.locator('#modal-titel')).toHaveCount(0);

  // Sauber weiter: der Wizard ist zu, die App bedienbar, kein hängender Zustand.
  // U2-ADR-171 (25.08.2026): [data-sektor] steckt seit heute in kollabierbaren Clustern —
  // welcher offen ist, hängt vom zuletzt aktiven Bereich ab. Der Cluster-Titel (<summary>)
  // ist dagegen IMMER sichtbar, unabhängig vom Auf-/Zu-Zustand — dasselbe „bedienbar,
  // kein hängender Zustand"-Signal wie vorher der erste Sektor-Knopf.
  // Fortsetzen-Fokus (26.08.2026): der Zwölf-Bereiche-Baum (`.nav-gruppe`) steckt jetzt
  // SEINERSEITS hinter `<details class="bereiche-umschalter">` — dessen Standard-Zustand ist ZU,
  // darum ist `.nav-gruppe summary` an dieser Stelle nicht mehr zuverlässig sichtbar (hängt vom
  // zuletzt besuchten Bereich ab). Das äußere `<summary>` ("Alle Bereiche zeigen") ist die neue,
  // immer sichtbare Stelle — dieselbe Eigenschaft, die dieser Test schon immer wollte.
  await expect(page.locator('.wizard-frage')).toHaveCount(0);
  await expect(page.locator('.sidebar .bereiche-umschalter > summary')).toBeVisible();

  // Das Kind steht wirklich in „Kinder und Schutzbefohlene" — über die reguläre Sicht geprüft.
  await oeffneSektor(page, 'people');
  await expect(page.locator('#content')).toContainText('Mia Musterfrau');

  // Die Krisenvorsorge-Bedarfsrechnung zog von selbst mit (kein zweiter Rechenweg, A137-Auslöser).
  await oeffneSektor(page, 'emergencyPreparedness');
  const bedarf = page.locator('[data-krisenvorsorge-bedarf]');
  await expect(bedarf).toContainText('2 Personen');
  await page.screenshot({ path: 'test-results/gebwiz-krisenvorsorge-personenzahl-nachher.png' });
});

test('Assistent ein zweites Mal mit demselben Namen → keine Dublette', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await gebwizMitNamenDurchlaufen(page, 'Mia Musterfrau');
  await page.click('#m-abbr');   // ersten Vorschlag ablehnen, nicht Gegenstand dieser Probe

  await gebwizMitNamenDurchlaufen(page, 'Mia Musterfrau');   // zweiter Lauf, exakt derselbe Name

  const kinder = await page.evaluate(() => (window.__vdOeffentlich.ankerDaten().sektoren['people'] || {}).childrenAndDependants || []);
  expect(kinder.length, 'zwei Läufe mit demselben Namen ergeben genau einen Eintrag').toBe(1);
});
