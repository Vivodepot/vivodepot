'use strict';
/* ════════════════════════════════════════════════════════════════════════
   T-CROSS-12 — D48: Passwort-Mismatch im „Depot sichern"-Modal sichtbar
   ────────────────────────────────────────────────────────────────────────
   Befund: ungleiche Passwörter → „Sichern" → Meldung erschien im Modal-Fuß, von der iOS-Tastatur
   verdeckt → „nichts passiert". Fix: Inline-Meldung direkt unter Feld 2, beide Felder rot,
   Live-Prüfung nach blur, scrollIntoView. LAUF: Mac/CI via test:e2e:cross.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect, devices } = require('@playwright/test');
const path = require('node:path');

const KERN_URL = require('./support/helpers.js').URLS.kern;   // das gebackene Produkt, nicht das Gerüst

// Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): der Anlege-Weg holt jetzt ein Dateiziel VOR
// dem Anlegen (showSaveFilePicker) — ohne Attrappe fragt hier sonst der Nicht-FSA-Namens-Dialog
// (#datei-name), den diese Spec nicht bedient, und #app.an bliebe aus.
async function fsaAttrappeEinrichten(page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({ name: 't-cross-12.vivodepot', createWritable: async () => ({ write: async () => {}, close: async () => {} }) }),
    });
  });
}

async function modalOeffnen(page) {
  await fsaAttrappeEinrichten(page);
  await page.goto(KERN_URL);
  await page.waitForSelector('#w-anlass', { state: 'visible' });
  await page.click('#w-anfangen');                                  // Vorschau
  await page.waitForSelector('#tb-pw-hinweis', { state: 'visible' });
  await page.click('#tb-pw-hinweis');                               // → flowDepotAnlegen-Modal (Setup-first)
  await page.waitForSelector('#id-pw', { state: 'visible' });       // Mismatch-Prüfung lebt jetzt auf #id-pw/#id-pw2
}

test('D48 — Mismatch: keine Meldung vor erstem blur; nach blur Inline + Felder markiert', async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices['iPhone SE'] });
  const page = await ctx.newPage();
  await modalOeffnen(page);

  await page.fill('#id-pw', 'passwort-eins');
  await page.fill('#id-pw2', 'passwort-zwei');
  // (1) VOR dem ersten blur des Bestätigungsfelds: KEINE Meldung.
  await expect(page.locator('#id-pw2-fehler')).toBeHidden();

  // (2) blur des Bestätigungsfelds → Inline-Meldung + beide Felder markiert.
  await page.locator('#id-pw2').evaluate((e) => e.blur());
  await expect(page.locator('#id-pw2-fehler')).toBeVisible();
  await expect(page.locator('#id-pw2-fehler')).toContainText('stimmen nicht überein');
  expect(await page.locator('#id-pw').evaluate((e) => e.classList.contains('feld-fehler'))).toBe(true);
  expect(await page.locator('#id-pw2').evaluate((e) => e.classList.contains('feld-fehler'))).toBe(true);

  await ctx.close();
});

test('D48 — Sichern bei Mismatch legt NICHT an; korrigiert → angelegt', async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices['iPhone SE'] });
  const page = await ctx.newPage();
  await modalOeffnen(page);
  // Setup-first verlangt Vor-/Nachname VOR dem Passwort-Gate — sonst blockt die Vorname-Pflicht
  // (nicht der Mismatch). Erst danach ist der Mismatch die relevante Schranke.
  await page.fill('#id-vorname', 'Anker');
  await page.fill('#id-nachname', 'Test');

  await page.fill('#id-pw', 'passwort-eins');
  await page.fill('#id-pw2', 'passwort-zwei');
  await page.click('#m-ok');                                        // Sichern bei Mismatch
  await expect(page.locator('#id-pw2-fehler')).toBeVisible();       // Inline-Meldung
  await expect(page.locator('#id-pw2')).toBeVisible();              // Modal bleibt offen (kein Anlegen)

  // Korrigieren → gleich → Markierung weg, Sichern legt an.
  await page.fill('#id-pw2', 'passwort-eins');
  await expect(page.locator('#id-pw2-fehler')).toBeHidden();
  await page.click('#m-ok');
  await page.waitForSelector('#app.an', { state: 'attached' });     // angelegt, Modal zu
  await expect(page.locator('#id-pw2')).toHaveCount(0);

  await ctx.close();
});
