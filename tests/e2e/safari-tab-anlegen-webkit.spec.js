// @ts-check
/* safari-tab-anlegen-webkit.spec.js — die Safari-Wege in WebKit, über eine Web-Adresse (11.10.2026,
   Befund WEBKIT-SAFARI-REGELN-NUR-NACHGESTELLT)

   @webkit-gegenstueck-zu: tests/e2e/safari-tab-anlegen.spec.js

   Die Probe daneben fährt Chromium und stellt beide Signale nach, an denen der Kern Safari erkennt. Hier läuft WebKit selbst:
   - Schreibtisch-Safari: das Signal (CSS.supports mit dem Systemschrift-Schlüsselwort) kommt von WebKit, nichts ist nachgestellt.
     Anlegen, Datei-Schritt, „Später“, Code-Angebot; für die deutschen Produkte danach neu laden und mit dem Passwort
     wieder öffnen. Die englischen Produkte laufen bis zum Code-Angebot: der Wiedereinstieg wird hier über seine deutschen
     Beschriftungen gegriffen.
   - iPhone im Tab: WebKit mit iPhone-Profil, ebenfalls ohne gesetzten Wert.
   GEMESSEN auf dem eigenen Runner (11.10.2026, zwei Läufe): Playwright-WebKit trägt navigator.standalone von sich aus, mit
   iPhone-Profil und am Schreibtisch, beide Male mit dem Wert false. Am Schreibtisch erscheint darum vor dem Anlegen
   das Angebot „In der App anlegen“ (privat-de und pro-de so gemessen).
   Die Annahme, das Feld gebe es nur auf dem iPhone, stimmt für dieses WebKit nicht; darum wird hier nichts gesetzt, und
   der erste Fall hält fest, was WebKit liefert. Ob das Schreibtisch-Safari eines Macs dasselbe liefert, zeigt diese Probe
   nicht; das hält das Release-Blatt als Sichtprüfung am Gerät.
   WebKit wird selbst gestartet, weil die Hauptkonfiguration nur Chromium als Projekt führt. */
const { test, expect, webkit, devices } = require('@playwright/test');
const fs = require('node:fs');
const h = require('./helpers.js');
const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup.js');

const PW = 'e2e-passwort-123';
/* Safari lädt das Produkt von einer Web-Adresse, nie aus einer Datei. Das gebackene Produkt kommt über page.route, kein Netz. */
const ADRESSE = 'https://probe.invalid/vivodepot.html';

async function ueberWebAdresse(page, slug) {
  const html = fs.readFileSync(GEBACKENE_PRODUKT_PFADE[slug]);
  await page.route('https://probe.invalid/**', (route) => (route.request().url() === ADRESSE
    ? route.fulfill({ status: 200, contentType: 'text/html', body: html }) : route.fulfill({ status: 404, body: '' })));
}

/* Ein eigener WebKit-Browser je Fall; er wird in jedem Ausgang geschlossen. */
async function inWebkit(kontext, fn) {
  const browser = await webkit.launch(require('../../tools/lib/netz-sperre.js').mitSperre());
  try {
    const k = await browser.newContext(Object.assign({ locale: 'de-DE' }, kontext));
    await fn(await k.newPage());
  } finally { await browser.close(); }
}

async function ankerDialogAusfuellen(page) {
  await expect(page.locator('#modal-rueck.an #id-pw')).toBeVisible();
  await page.fill('#id-vorname', 'Erika'); await page.fill('#id-nachname', 'Probe');
  await page.fill('#id-pw', PW); await page.fill('#id-pw2', PW);
  await page.click('#m-ok');
}

async function signale(page) {
  await page.goto('about:blank');
  return page.evaluate(() => ({
    systemschrift: CSS.supports('font', '-apple-system-body'),
    standaloneVorhanden: 'standalone' in navigator,
    standalone: String(navigator['standalone']),
    beruehrungspunkte: navigator.maxTouchPoints,
    zeigerFrage: matchMedia('(pointer:coarse)').media,   // der Kern fragt ohne Leerzeichen; WebKit muss die Schreibweise annehmen
  }));
}

test('[Safari-Tab·WebKit] die Signale, wie WebKit sie von sich aus liefert, mit iPhone-Profil und am Schreibtisch', async () => {
  for (const [name, kontext] of [['iPhone-Profil', devices['iPhone 13']], ['Schreibtisch', { viewport: { width: 1280, height: 800 } }]]) {
    await inWebkit(kontext, async (page) => {
      const s = await signale(page);
      console.log('[Safari-Tab·WebKit] gemessen, ' + name + ': ' + JSON.stringify(s));
      expect(s.systemschrift, name + ': das Systemschrift-Signal kommt von WebKit selbst').toBe(true);
      // Gemessen 11.10.2026: das Feld ist da. Fällt dieser Fall, hat sich WebKit geändert, und die zwei Fälle darunter gehören neu gelesen.
      expect(s.standaloneVorhanden, name + ': navigator.standalone ist in Playwright-WebKit vorhanden').toBe(true);
      expect(s.zeigerFrage, name + ': WebKit nimmt (pointer:coarse) ohne Leerzeichen als gültige Medienabfrage an').not.toBe('not all');
    });
  }
});

/* Was nach „Depot anlegen“ zuerst erscheint: das Angebot „In der App anlegen“ oder gleich der Anlege-Dialog. Wer das Angebot
   sieht, bleibt im Browser. Zurück kommt, welcher der beiden Wege es war. */
async function bisZumAnlegeDialog(page) {
  await page.click('#w-anlegen');
  const angebot = page.locator('#modal-rueck.an #safari-app-anlegen');
  const dialog = page.locator('#modal-rueck.an #id-pw');
  await expect(angebot.or(dialog).first(), 'nach „Depot anlegen“ erscheint das App-Angebot oder der Anlege-Dialog').toBeVisible({ timeout: 15000 });
  const mitAngebot = await angebot.isVisible();
  if (mitAngebot) await page.click('#m-zweit');   // der zweite Knopf des Angebots führt im Browser weiter, in jeder Sprache
  return mitAngebot;
}

// Im öffentlichen Zuschnitt nur die baubaren Produkte (helpers.js, baubar); im Kanon alle vier.
for (const slug of ['privat-de', 'privat-en', 'pro-de', 'pro-en'].filter(h.baubar)) {
  test(`[Safari-Tab·WebKit] ${slug} · Schreibtisch-Safari ohne nachgestelltes Signal: Anlegen, Datei-Schritt, Code-Angebot` + (slug.endsWith('-de') ? ', neu laden, wieder öffnen' : ''), async () => {
    test.setTimeout(180000);
    await inWebkit({ viewport: { width: 1280, height: 800 } }, async (page) => {
      const fehler = [];
      page.on('pageerror', (e) => fehler.push(e.message));
      await ueberWebAdresse(page, slug);
      await h.oeffneApp(page, { url: ADRESSE });
      const mitAngebot = await bisZumAnlegeDialog(page);
      console.log('[Safari-Tab·WebKit] gemessen, ' + slug + ' am Schreibtisch: App-Angebot vor dem Anlegen = ' + mitAngebot);
      await ankerDialogAusfuellen(page);
      await expect(page.locator('#modal-rueck.an #safari-datei-nach-anlegen'), 'der Datei-Schritt nach dem Anlegen').toBeVisible({ timeout: 20000 });
      await page.click('#m-zweit');                                       // „Später“
      const ende = Date.now() + 20000;
      while (Date.now() < ende && !(await page.locator('#whc-angebot').isVisible().catch(() => false))) {
        if (await page.locator('#wiedereinstieg-hinweis').isVisible().catch(() => false)) await page.click('#m-ok');
        await page.waitForTimeout(100);
      }
      await expect(page.locator('#whc-angebot'), 'das Code-Angebot folgt auf „Später“').toBeVisible();
      if (!slug.endsWith('-de')) { expect(fehler, 'kein Seitenfehler: ' + fehler.join(' | ')).toEqual([]); return; }

      await page.click('#m-ok');                                          // Code einrichten
      const code = (await page.locator('#whc-code').textContent()).replace(/\s/g, '').match(/.{1,4}/g).join('-');
      await page.fill('#whc-kontrolle', code);
      await page.click('#m-ok');
      // Danach folgen Notfall-Blatt bzw. sein Angebot: an den festen Griffen schließen.
      const frist = Date.now() + 15000;
      while (Date.now() < frist) {
        if (await page.locator('#nfb-schliessen').isVisible().catch(() => false)) await page.click('#nfb-schliessen');
        else if (await page.locator('#nfb-angebot').isVisible().catch(() => false)) await page.click('#m-zweit');
        else if (!(await page.locator('#modal-rueck.an').count()) && !(await page.locator('#notfallblatt-overlay:visible').count())) break;
        await page.waitForTimeout(100);
      }
      await expect(page.locator('#app.an'), 'das Depot ist offen').toHaveCount(1);

      // Neu laden: das Depot liegt im Gerätespeicher dieser Web-Adresse und öffnet mit dem Passwort.
      await page.reload();
      const pwFeld = page.locator('input[type="password"]:visible').first();
      await pwFeld.waitFor({ state: 'visible', timeout: 20000 });
      await expect(page.getByText('Ihr Depot ist auf diesem Gerät gespeichert'), 'der Gerätespeicher trägt das Depot').toBeVisible();
      await pwFeld.fill(PW);
      await page.getByRole('button', { name: 'Mein Depot öffnen' }).click();
      await page.waitForSelector('#app.an', { state: 'attached', timeout: 20000 });
      expect(fehler, 'kein Seitenfehler: ' + fehler.join(' | ')).toEqual([]);
    });
  });
}

test('[Safari-Tab·WebKit] Schreibtisch-Safari: „Depot anlegen“ bietet kein Anlegen in der App an, der Datei-Schritt bleibt', async () => {
  // Befund SAFARI-ERKENNUNG-TRIFFT-SCHREIBTISCH-WEBKIT (HOCH, geschlossen 13.10.2026): am Schreibtisch erschien das Angebot „In der App anlegen“,
  // das nur für iPhone und iPad gilt. GEMESSEN 11.10.2026 in Playwright-WebKit (privat-de, pro-de) und 12.10.2026 an einem
  // Mac mit Safari: navigator.standalone ist vorhanden und false, maxTouchPoints 0. Geschlossen mit iosNichtInstalliert, das zusätzlich
  // Berührungspunkte verlangt (tests/ios-nicht-installiert-handgeraet.test.js).
  test.setTimeout(120000);
  await inWebkit({ viewport: { width: 1280, height: 800 } }, async (page) => {
    await ueberWebAdresse(page, 'privat-de');
    await h.oeffneApp(page, { url: ADRESSE });
    const mitAngebot = await bisZumAnlegeDialog(page);
    expect(mitAngebot, 'am Schreibtisch erscheint das Angebot „In der App anlegen“ nicht').toBe(false);
    await ankerDialogAusfuellen(page);
    await expect(page.locator('#modal-rueck.an #safari-datei-nach-anlegen'), 'der Datei-Schritt nach dem Anlegen bleibt').toBeVisible({ timeout: 20000 });
  });
});

test('[Safari-Tab·WebKit] iPhone im Tab: „Depot anlegen“ bietet zuerst das Anlegen in der App an, im Browser danach den Datei-Schritt', async () => {
  test.setTimeout(120000);
  await inWebkit(devices['iPhone 13'], async (page) => {
    await ueberWebAdresse(page, 'privat-de');
    await h.oeffneApp(page, { url: ADRESSE });
    const mitAngebot = await bisZumAnlegeDialog(page);
    expect(mitAngebot, 'das Angebot „In der App anlegen“ erscheint, ohne dass ein Wert gesetzt wurde').toBe(true);
    await ankerDialogAusfuellen(page);
    await expect(page.locator('#modal-rueck.an #safari-datei-nach-anlegen'), 'der Datei-Schritt nach dem Anlegen').toBeVisible({ timeout: 20000 });
  });
});
