'use strict';
/* ═══════════════════════════════════════════════════════
   Lese-App: Benutzbarkeit zum Launch im Browser (22.11.2026)
   ───────────────────────────────────────────────────────
   Die Befunde der Prüfung vom 22.11.2026, die nur im Browser zu sehen sind, an einer echten Depot-Datei bei 375 px und 1280 px:
     H-2  am Handy: Menüknopf mit dem aktuellen Bereich; ein Wechsel schließt das Menü, der neue Bereich steht oben, hat den Fokus
     H-1  Hilfe in der Notfall-Sicht (ohne Bereichsleiste): „Zurück zu den Angaben“ zeigt die Angaben wieder
     H-3  beschädigte Datei: eigene Meldung, nicht „Passwort passt nicht“; falsches Passwort: Eingabe bleibt stehen
     M-1  „Drucken“: auf dem Blatt keine Bedienung, im vollen Depot alle Bereiche
     M-6  ein eingefügter Freigabe-Link führt zur Passwortabfrage
     M-2  die Fassung am Fuß des Eingangsschirms
   Bilder: tests/e2e/.artifacts/lese-benutzbarkeit-*.png (nicht eingecheckt).
   Die Quelltext-Proben je Befund: tests/lese-app-benutzbarkeit-launch.test.js.
   ═══════════════════════════════════════════════════════ */
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { test, expect } = require('@playwright/test');
const { ladeKern } = require('../load-kern.js');

const LESE_URL = 'file://' + path.join(__dirname, '..', '..', 'vivodepot-lesen.html');
const BILDER = path.join(__dirname, '.artifacts');
const PW = 'lese-benutzbarkeit-2026-passwort';
const WEGWERF = [];
test.afterAll(() => { for (const d of WEGWERF) fs.rmSync(d, { recursive: true, force: true }); });

async function depotDatei() {
  const geschrieben = [];
  function FakeBlob(teile) { this._text = String((teile && teile[0]) || ''); }
  const handle = { name: 'b.vivodepot', createWritable: async () => ({ write: async (b) => { geschrieben.push(b._text); }, close: async () => {} }) };
  const { V } = ladeKern({ Blob: FakeBlob, showSaveFilePicker: async () => handle });
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Tester');
  V.sektorFeldSetzen('identity', 'givenName', 'Elisabeth');
  V.sektorFeldSetzen('identity', 'familyName', 'Wredenhagen');
  await V.depotHerunterladen();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lese-benutzbarkeit-'));
  WEGWERF.push(dir);
  const pfad = path.join(dir, 'depot.vivodepot');
  fs.writeFileSync(pfad, geschrieben[geschrieben.length - 1], 'utf8');
  return { pfad, text: geschrieben[geschrieben.length - 1], dir };
}

async function oeffnen(page, datei, pw) {
  await page.goto(LESE_URL);
  await page.locator('#datei-input').setInputFiles(datei);
  await expect(page.locator('#pw-feld')).toBeVisible();
  await page.locator('#pw-feld').fill(pw);
  await page.locator('#pw-form').evaluate((f) => f.requestSubmit());
}

test('[Lese-Benutzbarkeit·H-2·375] Bereiche hinter dem Menüknopf; ein Wechsel ist sichtbar, hat den Fokus und aria-current', async ({ browser }) => {
  const { pfad } = await depotDatei();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: 'de-DE' });
  const page = await ctx.newPage();
  const fehler = []; page.on('pageerror', (e) => fehler.push(e.message));
  await oeffnen(page, pfad, PW);
  await expect(page.locator('body')).toContainText('Elisabeth', { timeout: 15000 });
  const knopf = page.locator('#nav-menue-knopf');
  await expect(knopf).toBeVisible();
  await expect(page.locator('#sidebar')).toBeHidden();
  await page.screenshot({ path: path.join(BILDER, 'lese-benutzbarkeit-375-depot.png'), fullPage: false });
  await knopf.click();
  await expect(knopf).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#sidebar')).toBeVisible();
  await page.screenshot({ path: path.join(BILDER, 'lese-benutzbarkeit-375-menue.png'), fullPage: false });
  const ziel = page.locator('#sidebar .nav-item[data-sektor]').nth(2);
  const titel = (await ziel.innerText()).trim();
  await ziel.click();
  await expect(page.locator('#sidebar')).toBeHidden();
  await expect(knopf).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#nav-menue-titel')).toHaveText(titel);
  await expect(ziel).toHaveAttribute('aria-current', 'page');
  expect(await page.evaluate(() => document.activeElement && document.activeElement.id)).toBe('content');
  const oben = await page.evaluate(() => document.getElementById('content').getBoundingClientRect().top);
  expect(oben, 'der neue Bereich beginnt im Bild').toBeLessThan(812);
  expect(oben).toBeGreaterThanOrEqual(-1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.screenshot({ path: path.join(BILDER, 'lese-benutzbarkeit-375-gewechselt.png'), fullPage: false });
  expect(fehler).toEqual([]);
  await ctx.close();
});

test('[Lese-Benutzbarkeit·H-2·1280] am Rechner bleibt die Bereichsleiste stehen, kein Menüknopf', async ({ browser }) => {
  const { pfad } = await depotDatei();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: 'de-DE' });
  const page = await ctx.newPage();
  await oeffnen(page, pfad, PW);
  await expect(page.locator('body')).toContainText('Elisabeth', { timeout: 15000 });
  await expect(page.locator('#nav-menue-knopf')).toBeHidden();
  await expect(page.locator('#sidebar')).toBeVisible();
  await expect(page.locator('#btn-drucken')).toBeVisible();
  await page.screenshot({ path: path.join(BILDER, 'lese-benutzbarkeit-1280-depot.png'), fullPage: false });
  await ctx.close();
});

test('[Lese-Benutzbarkeit·H-1] Hilfe in der Notfall-Sicht: „Zurück zu den Angaben“ zeigt dieselben Angaben wieder, ohne neuen QR-Code', async ({ browser }) => {
  for (const breite of [375, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: breite, height: 812 }, locale: 'de-DE' });
    const page = await ctx.newPage();
    await page.goto(LESE_URL);
    await page.evaluate(() => renderNotfall());
    await expect(page.locator('#content')).toBeVisible();
    await expect(page.locator('#sidebar')).toHaveCount(0);
    const vorher = (await page.locator('#content').innerText()).trim();
    expect(vorher.length, 'die Notfall-Sicht zeigt etwas').toBeGreaterThan(0);
    const ersteZeile = vorher.split('\n')[0];
    await page.locator('#btn-hilfe').click();
    await expect(page.locator('#hilfe-ansicht')).toBeVisible();
    await expect(page.locator('#btn-hilfe')).toHaveAttribute('aria-expanded', 'true');
    // Bildbefund: der Rückweg ist kein Fehler — nicht rot, auch nicht in der Notfall-Sicht
    const zurueckFarbe = await page.locator('#btn-hilfe-zurueck').evaluate((b) => [getComputedStyle(b).color, getComputedStyle(b).borderTopColor]);
    for (const f of zurueckFarbe) {
      const [r, g, b] = f.match(/\d+/g).map(Number);
      expect(r - Math.max(g, b), 'Rückweg ohne Rotton: ' + f).toBeLessThan(60);
    }
    expect((await page.locator('#content').innerText()).includes(ersteZeile), 'die Angaben treten hinter die Hilfe').toBe(false);
    await page.screenshot({ path: path.join(BILDER, 'lese-benutzbarkeit-' + breite + '-hilfe-notfall.png'), fullPage: false });
    await page.locator('#btn-hilfe-zurueck').click();
    await expect(page.locator('#hilfe-ansicht')).toHaveCount(0);
    expect((await page.locator('#content').innerText()).trim()).toBe(vorher);
    await ctx.close();
  }
});

test('[Lese-Benutzbarkeit·H-3] beschädigte Datei: eigene Meldung; falsches Passwort: Meldung, Eingabe bleibt stehen', async ({ browser }) => {
  const { text, dir } = await depotDatei();
  // Beschädigt: die verschlüsselten Einheiten sind kein Base64 mehr (veränderte Datei); die Form des Umschlags stimmt,
  // erst das Öffnen nach dem Passwort scheitert — daran darf nicht „Das Passwort stimmt nicht.“ stehen.
  const magie = text.indexOf('{');
  expect(magie, 'die Depot-Datei trägt nach der Kennung ein JSON').toBeGreaterThanOrEqual(0);
  const umschlag = JSON.parse(text.slice(magie));
  for (const e of Object.values(umschlag.einheiten)) e.iv = '!!!';
  const kaputt = path.join(dir, 'kaputt.vivodepot');
  fs.writeFileSync(kaputt, text.slice(0, magie) + JSON.stringify(umschlag), 'utf8');
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: 'de-DE' });
  const page = await ctx.newPage();
  await oeffnen(page, kaputt, PW);
  await expect(page.locator('#pw-fehler')).toBeVisible();
  await expect(page.locator('#pw-fehler')).toContainText('Am Passwort liegt es nicht');
  await page.screenshot({ path: path.join(BILDER, 'lese-benutzbarkeit-375-beschaedigt.png'), fullPage: false });
  // Falsches Passwort an der heilen Datei
  const heil = path.join(dir, 'depot.vivodepot');
  await oeffnen(page, heil, 'falsch-falsch-falsch');
  await expect(page.locator('#pw-fehler')).toContainText('Das Passwort stimmt nicht.', { timeout: 20000 });
  await expect(page.locator('#pw-feld')).toHaveValue('falsch-falsch-falsch');
  await expect(page.locator('label[for="pw-feld"]')).toBeVisible();
  await page.locator('#pw-anzeigen').check();
  await expect(page.locator('#pw-feld')).toHaveAttribute('type', 'text');
  await ctx.close();
});

test('[Lese-Benutzbarkeit·M-1] Drucken: auf dem Blatt keine Bedienung, alle Bereiche des Depots', async ({ browser }) => {
  const { pfad } = await depotDatei();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: 'de-DE' });
  const page = await ctx.newPage();
  await oeffnen(page, pfad, PW);
  await expect(page.locator('body')).toContainText('Elisabeth', { timeout: 15000 });
  const bereiche = await page.locator('#sidebar .nav-item[data-sektor]').count();
  // window.print anhalten, um den Zustand während des Drucks zu sehen
  await page.evaluate(() => { window.__druckZustand = null; window.print = () => {
    window.__druckZustand = { bereiche: document.querySelectorAll('#druck-inhalt .druck-bereich').length, klasse: document.body.classList.contains('druck-alle') };
  }; });
  await page.locator('#btn-drucken').click();
  const z = await page.evaluate(() => window.__druckZustand);
  expect(z.klasse).toBe(true);
  expect(z.bereiche).toBe(bereiche);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('#sidebar')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await ctx.close();
});

test('[Lese-Benutzbarkeit·M-6·M-2] ein eingefügter Freigabe-Link führt zur Passwortabfrage; die Fassung steht am Eingang', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, locale: 'de-DE' });
  const page = await ctx.newPage();
  await page.goto(LESE_URL);
  await expect(page.locator('[data-lese-fassung]')).toContainText(/Fassung v\d+\.\d+\.\d+ vom/);
  // Bildbefund: Impressum und Datenschutz nicht in Browser-Blau
  for (const sel of ['.herkunft-impressum-link', '.herkunft-datenschutz-link']) {
    const farbe = await page.locator(sel).evaluate((a) => getComputedStyle(a).color);
    expect(farbe, sel).not.toBe('rgb(0, 0, 238)');
    expect(farbe, sel).not.toBe('rgb(85, 26, 139)');
  }
  await page.screenshot({ path: path.join(BILDER, 'lese-benutzbarkeit-375-eingang.png'), fullPage: true });
  await page.evaluate(() => renderEinfuegen());
  await page.locator('#qr-text').fill('https://beispiel.invalid/vivodepot-lesen.html#eqr=eyJ2IjoyfQ');
  await page.locator('#btn-qr-lesen').click();
  await expect(page.locator('#pw-feld')).toBeVisible();
  // Unlesbarer Text: Meldung, der Text bleibt stehen
  await page.evaluate(() => renderEinfuegen());
  await page.locator('#qr-text').fill('etwas anderes');
  await page.locator('#btn-qr-lesen').click();
  await expect(page.locator('#qr-fehler')).toBeVisible();
  await expect(page.locator('#qr-text')).toHaveValue('etwas anderes');
  await ctx.close();
});
