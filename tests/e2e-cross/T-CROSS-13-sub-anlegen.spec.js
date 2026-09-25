'use strict';
/* ════════════════════════════════════════════════════════════════════════
   T-CROSS-13 — D49: Sub-Depot anlegen (toter „Anlegen"-Knopf behoben)
   ────────────────────────────────────────────────────────────────────────
   Befund: Vorname „Sophie", NACHNAME LEER, beide Passwörter befüllt → „Anlegen" → NICHTS
   (kein Toast/Fehler/Schluss). Ursache: Nachname-Pflicht blockte STILL, Meldung im Modal-Fuß
   (iOS-Tastatur verdeckt). Fix: Vorname Pflicht / Nachname optional (Sub) + Inline-Validierung
   mit Rückmeldung (geteilt mit dem Anker-Setup, D48). LAUF: Mac/CI via test:e2e:cross.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect, devices } = require('@playwright/test');
const path = require('node:path');
const H = require('./support/helpers.js');   // nur für einmalDialogeSchliessen (EINE Quelle)

const KERN_URL = require('./support/helpers.js').URLS.kern;   // das gebackene Produkt, nicht das Gerüst

// Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): der Anlege-Weg holt jetzt ein Dateiziel VOR dem
// Anlegen (showSaveFilePicker) — ohne Attrappe fragt hier sonst der Nicht-FSA-Namens-Dialog
// (#datei-name), den diese Spec nicht bedient, und die Einmal-Dialoge danach blieben aus, weil nie
// wirklich angelegt wurde.
async function fsaAttrappeEinrichten(page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({ name: 't-cross-13.vivodepot', createWritable: async () => ({ write: async () => {}, close: async () => {} }) }),
    });
  });
}

async function ankerAnlegen(page) {
  await fsaAttrappeEinrichten(page);
  await page.goto(KERN_URL);
  await page.waitForSelector('#w-anlass', { state: 'visible' });
  await page.click('#w-anfangen');
  await page.waitForSelector('#tb-pw-hinweis', { state: 'visible' });
  await page.click('#tb-pw-hinweis');
  // Setup-first (vivodepot.html:12636): flowDepotAnlegen → Vorname + Nachname (Pflicht) + Passwort.
  await page.waitForSelector('#id-pw', { state: 'visible' });
  await page.fill('#id-vorname', 'Anker');
  await page.fill('#id-nachname', 'Test');
  await page.fill('#id-pw', 'anker-passwort-123');
  await page.fill('#id-pw2', 'anker-passwort-123');
  await page.click('#m-ok');
  await page.waitForSelector('#app.an', { state: 'attached' });
  // Einmal-Dialoge nach dem Anlegen wegraeumen (U2-ADR-095-Angebot, Wiedereinstiegs-Hinweis):
  // sie liegen ueber der Sitzung und faengen jeden folgenden Klick ab. EINE Quelle — der
  // gemeinsame Helfer; diese Spec bringt nur ihren eigenen Anker-Weg mit.
  await H.kern.einmalDialogeSchliessen(page);
}
async function subModalOeffnen(page) {
  // Zug 5 (Auftrag „Speicherweg ohne Datei-Picker", 09.08.2026): die Pille öffnet jetzt ein Menü
  // statt direkt zu navigieren — zwei Klicks statt einem.
  await page.click('#tb-depot-pille');
  await page.waitForSelector('#tb-depot-menue-verwaltung', { state: 'visible' });
  await page.click('#tb-depot-menue-verwaltung');          // → Verwaltete Depots
  await page.waitForSelector('#sub-neu', { state: 'visible' });
  await page.click('#sub-neu');
  await page.waitForSelector('#id-vorname', { state: 'visible' });
}

test('D49 — Sub anlegen: Vorname „Sophie" OHNE Nachname, gleiche PW → angelegt + in Übersicht', async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices['iPhone SE'] });
  const page = await ctx.newPage();
  await ankerAnlegen(page);
  await subModalOeffnen(page);
  await page.fill('#id-vorname', 'Sophie');               // KEIN Nachname (optional im Sub)
  await page.fill('#id-pw', 'sub-passwort-123');
  await page.fill('#id-pw2', 'sub-passwort-123');
  await page.click('#m-ok');
  await page.waitForSelector('#id-vorname', { state: 'detached' });   // Modal schließt
  await expect(page.locator('.verwaltete-sicht')).toContainText('Sophie');   // in Übersicht
  await ctx.close();
});

test('D49 — Sub anlegen: ungleiche PW → Inline-Mismatch unter Feld 2, keine Anlage', async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices['iPhone SE'] });
  const page = await ctx.newPage();
  await ankerAnlegen(page);
  await subModalOeffnen(page);
  await page.fill('#id-vorname', 'Sophie');
  await page.fill('#id-pw', 'sub-passwort-123');
  await page.fill('#id-pw2', 'sub-passwort-anders');
  await page.click('#m-ok');
  await expect(page.locator('#id-pw2-fehler')).toBeVisible();
  await expect(page.locator('#id-pw2-fehler')).toContainText('stimmen nicht überein');
  await expect(page.locator('#id-vorname')).toBeVisible();   // Modal bleibt offen
  await ctx.close();
});

test('D49 — Sub anlegen: fehlender Vorname → Feld-Markierung + Meldung, KEIN stilles Blockieren', async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices['iPhone SE'] });
  const page = await ctx.newPage();
  await ankerAnlegen(page);
  await subModalOeffnen(page);
  // Vorname leer; Passwörter befüllt
  await page.fill('#id-pw', 'sub-passwort-123');
  await page.fill('#id-pw2', 'sub-passwort-123');
  await page.click('#m-ok');
  await expect(page.locator('#id-vorname-fehler')).toBeVisible();
  await expect(page.locator('#id-vorname-fehler')).toContainText('Vorname erforderlich');
  expect(await page.locator('#id-vorname').evaluate((e) => e.classList.contains('feld-fehler'))).toBe(true);
  await expect(page.locator('#id-vorname')).toBeVisible();    // keine Anlage, Modal offen
  await ctx.close();
});
