'use strict';
/* ═══════════════════════════════════════════════════════
   Lese-App im echten Browser: eine englische Datei erscheint englisch (B3 + ZS2, 19.09.2026)
   ───────────────────────────────────────────────────────
   Die Node-Proben (tests/lese-app-abwerk-sprache, tests/lese-app-en-basis-und-zusicherung) belegen die
   Texte; dieser Test belegt, dass sie beim Empfänger ANKOMMEN: eine echte Depot-Datei mit
   `textsprache: 'en'` wird in vivodepot-lesen.html geöffnet, und die Ansicht trägt die englische
   Ab-Werk-Basis und die App-eigenen englischen Zusicherungssätze — kein deutscher Satz dazwischen.
   Die Datei entsteht bei jedem Lauf im Node-Teil des Tests (echter Kern, echtes Passwort).
   ═══════════════════════════════════════════════════════ */
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { test, expect } = require('@playwright/test');
const { ladeKern } = require('../load-kern.js');

const LESE_URL = 'file://' + path.join(__dirname, '..', '..', 'vivodepot-lesen.html');
const PW = 'lese-en-2026-passwort';

async function depotDatei(sprache) {
  const geschrieben = [];
  function FakeBlob(teile) { this._text = String((teile && teile[0]) || ''); }
  const handle = { name: 'en.vivodepot', createWritable: async () => ({ write: async (b) => { geschrieben.push(b._text); }, close: async () => {} }) };
  const { V } = ladeKern({ Blob: FakeBlob, showSaveFilePicker: async () => handle });
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'givenName', 'Elisabeth');
  V.sektorFeldSetzen('identity', 'familyName', 'Wredenhagen-Sonnenschein');
  if (sprache) V.getData().textsprache = sprache;
  await V.depotHerunterladen();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lese-en-'));
  const pfad = path.join(dir, (sprache || 'de') + '.vivodepot');
  fs.writeFileSync(pfad, geschrieben[geschrieben.length - 1], 'utf8');
  return pfad;
}

test('[Lese-App·EN] eine englische Datei öffnet in der Lese-App: die Ansicht ist englisch, die Werte stehen da, und kein deutscher Zusicherungssatz erscheint', async ({ page }) => {
  const pfad = await depotDatei('en');
  await page.goto(LESE_URL);
  await page.locator('#datei-input').setInputFiles(pfad);
  await page.locator('#pw-feld').fill(PW);
  await page.locator('#pw-form').evaluate((f) => f.requestSubmit());
  await expect(page.locator('body')).toContainText('Elisabeth', { timeout: 15000 });
  const text = await page.locator('body').innerText();
  await test.info().attach('lese-app-en.txt', { body: text, contentType: 'text/plain' });
  expect(text).toContain('Wredenhagen-Sonnenschein');
  // Die Oberfläche der Lese-App ist englisch: eigene Texte (App-Tabelle) und die Zusicherungssätze (App-eigen)
  for (const englisch of ['Depot view', 'Close', 'Origin of the content:', 'All of this information comes from Vivodepot itself.']) expect(text, 'englischer Satz „' + englisch + '" fehlt').toContain(englisch);
  // ... und kein deutscher Satz der App steht dazwischen (die Bereichsnamen der Datei selbst bleiben, wie die Datei sie trägt)
  for (const deutsch of ['Depot-Ansicht', 'Schließen', 'Herkunft der Inhalte', 'Stand der Erweiterungen', 'unverschlüsselt', 'Diese Angaben stammen']) expect(text, 'deutscher Satz „' + deutsch + '" in der englischen Ansicht').not.toContain(deutsch);
});


/* ── Die Seiten VOR dem Entschlüsseln folgen der Browsersprache und haben einen sichtbaren Umschalter ──
 19.09.2026: de → Deutsch, sonst Englisch; ein Umschalter DE/EN; kein Hinweis zur
   Sprache in der Datei (der Kopf verrät nichts). Nach dem Entschlüsseln gilt die Sprache der Datei. */
async function seiteMitLocale(browser, locale) {
  const ctx = await browser.newContext({ locale });
  const page = await ctx.newPage();
  await page.goto(LESE_URL);
  return { ctx, page };
}

test('[Lese-App·Vorsprache] Browser de: Willkommen und Passwort deutsch, mit Umschalter; der Umschalter wechselt beide Seiten auf Englisch', async ({ browser }) => {
  const { ctx, page } = await seiteMitLocale(browser, 'de-DE');
  await expect(page.locator('h1')).toHaveText('Vivodepot — Lese-Ansicht');
  await expect(page.locator('#sprache-de')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#sprache-en').click();
  await expect(page.locator('h1')).toHaveText('Vivodepot — Reading view');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  // Passwortseite in der gewählten Sprache: eine Datei wählen
  const pfad = await depotDatei(null);
  await page.locator('#datei-input').setInputFiles(pfad);
  await expect(page.locator('h1')).toHaveText('Enter password');
  await expect(page.locator('#pw-feld')).toHaveAttribute('placeholder', 'Password');
  await page.locator('#sprache-de').click();
  await expect(page.locator('h1')).toHaveText('Passwort eingeben');
  await ctx.close();
});

test('[Lese-App·Vorsprache] Browser en: Willkommen und Passwort englisch; der Umschalter wechselt auf Deutsch', async ({ browser }) => {
  const { ctx, page } = await seiteMitLocale(browser, 'en-GB');
  await expect(page.locator('h1')).toHaveText('Vivodepot — Reading view');
  await expect(page.locator('#sprache-en')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#sprache-de').click();
  await expect(page.locator('h1')).toHaveText('Vivodepot — Lese-Ansicht');
  await ctx.close();
});

test('[Lese-App·Vorsprache] nach dem Entschlüsseln gilt die Sprache der DATEI, nicht die des Browsers oder des Umschalters', async ({ browser }) => {
  // englischer Browser + deutsche Datei → Deutsch
  let t = await seiteMitLocale(browser, 'en-GB');
  await t.page.locator('#datei-input').setInputFiles(await depotDatei(null));
  await t.page.locator('#pw-feld').fill(PW);
  await t.page.locator('#pw-form').evaluate((f) => f.requestSubmit());
  await expect(t.page.locator('body')).toContainText('Elisabeth', { timeout: 15000 });
  expect(await t.page.locator('body').innerText()).toContain('Depot-Ansicht');
  await t.ctx.close();
  // deutscher Browser + englische Datei → Englisch
  t = await seiteMitLocale(browser, 'de-DE');
  await t.page.locator('#datei-input').setInputFiles(await depotDatei('en'));
  await t.page.locator('#pw-feld').fill(PW);
  await t.page.locator('#pw-form').evaluate((f) => f.requestSubmit());
  await expect(t.page.locator('body')).toContainText('Elisabeth', { timeout: 15000 });
  expect(await t.page.locator('body').innerText()).toContain('Depot view');
  await t.ctx.close();
});

test('[Lese-App·Vorsprache] der Kopf der Datei verrät die Sprache nicht: die Datei trägt keinen Klartext-Sprachhinweis', async () => {
  const pfad = await depotDatei('en');
  const roh = fs.readFileSync(pfad, 'utf8');
  const kopf = JSON.parse(roh.slice(roh.indexOf('{')));
  expect(JSON.stringify(Object.keys(kopf))).not.toMatch(/sprache|lang|locale/i);
  expect(roh).not.toContain('textsprache');
});
