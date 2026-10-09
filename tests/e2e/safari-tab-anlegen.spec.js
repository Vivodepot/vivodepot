// @ts-check
/* safari-tab-anlegen.spec.js — auf dem iOS-Tab endet „Depot anlegen“ in der App oder mit einer Datei (06.10.2026, SAFARI-TAB-SPEICHER-OHNE-DATEI)
   Das WebKit-Signal wird simuliert (navigator.standalone = false, wie Safari auf iPhone/iPad im Tab); ohne Signal (Chromium wie es ist)
   bleibt der Weg unverändert. Erwartet: zuerst das Angebot „In der App anlegen“; wer im Browser bleibt, bekommt nach dem Anlegen
   den Schritt „Als Datei ablegen“. */
const { test, expect } = require('@playwright/test');
const h = require('./helpers.js');

const PW = 'e2e-passwort-123';
const fs = require('node:fs');
const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup.js');

/* Safari lädt das Produkt von einer Web-Adresse, nie aus einer Datei — und von file: aus bietet der Kern bewusst kein Anlegen in
   der App an (_istDateiHerkunft). Darum kommt das gebackene Produkt hier über eine https-Adresse (page.route, kein Netz). */
const ADRESSE = 'https://probe.invalid/vivodepot.html';
async function ueberWebAdresse(page, slug = 'privat-de') {
  const html = fs.readFileSync(GEBACKENE_PRODUKT_PFADE[slug]);
  await page.route('https://probe.invalid/**', (route) => (route.request().url() === ADRESSE
    ? route.fulfill({ status: 200, contentType: 'text/html', body: html }) : route.fulfill({ status: 404, body: '' })));
}

async function anlegenBisDialog(page) {
  await ueberWebAdresse(page);
  await h.oeffneApp(page, { url: ADRESSE });
  await page.click('#w-anlegen');
}

test('[Safari-Tab] iOS im Tab: „Depot anlegen“ bietet zuerst das Anlegen in der App an, im Browser danach den Datei-Schritt', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { value: false, configurable: true }); });
  await page.setViewportSize({ width: 390, height: 844 });
  await anlegenBisDialog(page);
  await expect(page.locator('#modal-rueck.an #safari-app-anlegen')).toBeVisible();
  await page.locator('#modal-rueck.an button', { hasText: /Im Browser anlegen/ }).click();
  await expect(page.locator('#modal-rueck.an #id-pw')).toBeVisible();
  await page.fill('#id-vorname', 'Erika'); await page.fill('#id-nachname', 'Probe');
  await page.fill('#id-pw', PW); await page.fill('#id-pw2', PW);
  await page.click('#m-ok');
  await expect(page.locator('#modal-rueck.an #safari-datei-nach-anlegen')).toBeVisible({ timeout: 15000 });
});

test('[Safari-Tab·Gegenprobe] ohne WebKit-Signal: kein App-Angebot, kein Datei-Schritt (U2-ADR-244 unverändert)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await anlegenBisDialog(page);
  await expect(page.locator('#modal-rueck.an #id-pw')).toBeVisible();
  await expect(page.locator('#safari-app-anlegen')).toHaveCount(0);
  await page.fill('#id-vorname', 'Erika'); await page.fill('#id-nachname', 'Probe');
  await page.fill('#id-pw', PW); await page.fill('#id-pw2', PW);
  await page.click('#m-ok');
  await page.waitForSelector('#tb-pw-hinweis', { state: 'hidden' });
  await page.waitForTimeout(800);
  await expect(page.locator('#safari-datei-nach-anlegen')).toHaveCount(0);
});

/* Wiederherstellungs-Hülle (U2-ADR-430): der Datei-Schritt reiht sich VOR das einzige Code-Angebot ein. Gemessen auf Schreibtisch-
   Safari (WebKit-Signal über CSS.supports): „Später“ im Datei-Schritt → genau ein Code-Angebot → der eingerichtete Code öffnet das
   Depot aus der Sicherungskopie in einem zweiten Fenster. */
async function bytesAttrappe(page) {
  await page.evaluate(() => {
    window.__sicherungBytes = null;
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: async () => ({ name: 'probe.vivodepot',
      createWritable: async () => { let s = ''; return { write: async (c) => { s += typeof c === 'string' ? c : await c.text(); }, close: async () => { window.__sicherungBytes = s; } }; } }) });
  });
}

for (const slug of ['privat-de', 'privat-en', 'pro-de', 'pro-en']) {
  test(`[Safari-Tab·Hülle] ${slug} · WebKit-Tab: „Später“ im Datei-Schritt führt genau einmal zum Code-Angebot, und der Code öffnet das Depot`, async ({ page, browser }) => {
    await page.addInitScript(() => {
      const echt = CSS.supports.bind(CSS);
      CSS.supports = (a, b) => (a === 'font' && b === '-apple-system-body') ? true : echt(a, b);
      window.__whcAngebote = 0;
      new MutationObserver(() => { const el = document.getElementById('whc-angebot'); if (el && !el.__gezaehlt) { el.__gezaehlt = true; window.__whcAngebote += 1; } })
        .observe(document, { childList: true, subtree: true });
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await ueberWebAdresse(page, slug);
    await h.oeffneApp(page, { url: ADRESSE });
    await bytesAttrappe(page);
    await page.click('#w-anlegen');
    await expect(page.locator('#modal-rueck.an #id-pw')).toBeVisible();
    await page.fill('#id-vorname', 'Erika'); await page.fill('#id-nachname', 'Probe');
    await page.fill('#id-pw', PW); await page.fill('#id-pw2', PW);
    await page.click('#m-ok');
    await expect(page.locator('#modal-rueck.an #safari-datei-nach-anlegen')).toBeVisible({ timeout: 15000 });
    await page.click('#m-zweit');                                       // „Später“
    const ende = Date.now() + 15000;
    while (Date.now() < ende && !(await page.locator('#whc-angebot').isVisible().catch(() => false))) {
      if (await page.locator('#wiedereinstieg-hinweis').isVisible().catch(() => false)) await page.click('#m-ok');
      await page.waitForTimeout(100);
    }
    await expect(page.locator('#whc-angebot')).toBeVisible();
    await page.click('#m-ok');                                          // Code einrichten
    const code = (await page.locator('#whc-code').textContent()).replace(/\s/g, '').match(/.{1,4}/g).join('-');
    await page.fill('#whc-kontrolle', code);
    await page.click('#m-ok');
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => window.__whcAngebote), 'genau ein Code-Angebot je Anlegen').toBe(1);
    // Danach folgen wie immer Notfall-Blatt (U2-ADR-095 B) bzw. sein Angebot — an den festen Griffen schließen.
    const frist = Date.now() + 10000;
    while (Date.now() < frist) {
      if (await page.locator('#nfb-schliessen').isVisible().catch(() => false)) await page.click('#nfb-schliessen');
      else if (await page.locator('#nfb-angebot').isVisible().catch(() => false)) await page.click('#m-zweit');
      else if (!(await page.locator('#modal-rueck.an').count()) && !(await page.locator('#notfallblatt-overlay:visible').count())) break;
      await page.waitForTimeout(100);
    }
    expect(await page.evaluate(() => window.__whcAngebote), 'auch danach kein zweites Code-Angebot').toBe(1);
    await page.click('#tb-depot-pille');
    await page.click('#tb-depot-menue-sicherungskopie');
    await expect.poll(() => page.evaluate(() => window.__sicherungBytes && window.__sicherungBytes.includes('"wiederherstellung"')), { timeout: 15000 }).toBe(true);
    const datei = require('node:path').join(require('node:os').tmpdir(), 'safari-huelle-' + process.pid + '-' + Date.now() + '.vivodepot');
    require('node:fs').writeFileSync(datei, await page.evaluate(() => window.__sicherungBytes), 'utf8');
    try {
      const p2 = await browser.newPage();
      await ueberWebAdresse(p2, slug);
      await h.oeffneApp(p2, { url: ADRESSE });
      await p2.click('#w-datei');
      await p2.setInputFiles('#co-datei', datei);
      await p2.click('#co-code');
      await p2.fill('#whc-code-ein', code);
      await p2.fill('#whc-pw-neu', 'e2e-neues-passwort-456');
      await p2.fill('#whc-pw-neu2', 'e2e-neues-passwort-456');
      await p2.click('#whc-oeffnen');
      await p2.waitForSelector('#app.an', { state: 'attached', timeout: 15000 });
      await p2.close();
    } finally { require('node:fs').rmSync(datei, { force: true }); }
  });
}
