// @ts-check
/* gesicherte-kopie.spec.js — eine vom Browser gesicherte Kopie der laufenden Anwendung zeigt nichts (12.10.2026,
   Befunde GESICHERTE-KOPIE-TRAEGT-KLARTEXT und RAHMENSCHUTZ-FAELLT-IN-GESICHERTER-KOPIE)

   „Seite speichern“ im Browser schreibt den Stand NACH dem Skriptlauf. Bei geöffnetem Depot standen darin die gezeigten
   Angaben, und die Datei zeigte beim Öffnen ohne Passwort ein offenes Depot mit „Auf diesem Gerät aktuell ✓“.
   GEMESSEN vor der Änderung (11./12.10.2026, Chromium, privat-de wie ausgeliefert): Name zweimal im HTML und einmal auf dem
   Bildschirm der Kopie, `#app.an` vorhanden, kein Startschirm, ein Seitenfehler des Rahmenschutz-Blocks.

   Jetzt erkennt der Kopf-Block die Kopie an der Marke `data-vd-lauf`, sperrt die folgenden Skripte, entfernt den Inhalt und
   zeigt den Hinweis, der als verborgenes Element im Dokument steht (im normalen Lauf bleibt er verborgen). Diese Probe geht den Weg eines Menschen: Depot anlegen, die Seite so sichern, wie der Browser es mit
   dem laufenden Stand tut (`page.content()`), die Datei in einem frischen Browser öffnen.

   OFFEN bleibt, bis die Feldwerte nicht mehr als Attribut gezeichnet werden: in der gesicherten Datei selbst stehen die
   Angaben weiter lesbar (letzter Fall, ausgesetzt mit Verweis auf den offenen Befund). */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const h = require('./helpers.js');

const VORNAME = 'Zwetschgenkern';
const NACHNAME = 'Quittenmus';
const PW = 'gesicherte-kopie-2026';

/* Legt ein Depot an, zeigt den Bereich mit dem Namen und gibt den serialisierten Stand der Seite zurück. */
async function offeneSeiteSichern(page, url) {
  await h.oeffneApp(page, { url });
  await h.depotAnlegen(page, { name: VORNAME + ' ' + NACHNAME, pw: PW });
  await h.oeffneSektor(page, 'identity');
  await expect(page.locator('#app.an'), 'Vorbedingung: das Depot ist offen').toHaveCount(1);
  const html = await page.content();
  expect(html.includes(VORNAME), 'Vorbedingung: der gesicherte Stand trägt den Namen (sonst prüft die Probe nichts)').toBe(true);
  return html;
}
async function kopieOeffnen(browser, html, fn) {
  const datei = path.join(os.tmpdir(), 'gesicherte-kopie-' + process.pid + '-' + Date.now() + '.html');
  fs.writeFileSync(datei, html, 'utf8');
  const kontext = await browser.newContext({ locale: 'de-DE' });
  try {
    const seite = await kontext.newPage();
    const fehler = [];
    seite.on('pageerror', (e) => fehler.push(e.message));
    await seite.goto('file://' + datei);
    await seite.waitForLoadState('domcontentloaded');
    await fn(seite, fehler);
  } finally { await kontext.close(); fs.rmSync(datei, { force: true }); }
}

for (const [slug, url] of [['privat-de', h.KERN_URL_PRIVAT_DE], ['pro-de', h.KERN_URL_PRO_DE]]) {
  test(`[Gesicherte Kopie] ${slug} · bei offenem Depot gesichert: die Kopie zeigt nur den Hinweis, kein Depot, keinen Wert, kein Eingabefeld`, async ({ page, browser }) => {
    test.setTimeout(120000);
    const html = await offeneSeiteSichern(page, url);
    await kopieOeffnen(browser, html, async (kopie, fehler) => {
      await expect(kopie.locator('#vd-gesicherte-kopie'), 'der Hinweis steht da').toBeVisible({ timeout: 15000 });
      await expect(kopie.locator('#vd-gesicherte-kopie p[lang="de"]')).toContainText('Bitte löschen Sie diese Datei.');
      await expect(kopie.locator('#vd-gesicherte-kopie p[lang="en"]')).toContainText('Please delete this file.');
      await kopie.waitForTimeout(1500);   // ein Skript, das trotz Sperre liefe, hätte jetzt gezeichnet
      expect(await kopie.locator('#app').count(), 'die Oberfläche der Anwendung ist nicht mehr im Dokument').toBe(0);
      expect(await kopie.locator('input, textarea, select, button').count(), 'kein Eingabe- oder Bedienelement').toBe(0);
      const text = await kopie.evaluate(() => document.body.innerText);
      expect(text.includes(VORNAME) || text.includes(NACHNAME), 'kein Wert aus dem Depot auf dem Bildschirm').toBe(false);
      expect(text.includes('aktuell'), 'kein Speicherstatus').toBe(false);
      expect(await kopie.evaluate(() => document.body.children.length), 'im body steht nur der Hinweis').toBe(1);
      expect(fehler, 'kein Seitenfehler: ' + fehler.join(' | ')).toEqual([]);
    });
  });
}

test('[Gesicherte Kopie·Rot-Beweis] ein normaler Start wird nie als Kopie erkannt: frisch geladen, neu geladen, nach „Zurück“', async ({ page }) => {
  test.setTimeout(90000);
  await h.oeffneApp(page, { url: h.KERN_URL_PRIVAT_DE });
  await expect(page.locator('#vd-gesicherte-kopie'), 'frisch geladen').toBeHidden();
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-vd-lauf')), 'der Start setzt die Marke').toBe('1');
  await page.reload();
  await page.waitForSelector('#w-anlass', { state: 'visible' });
  await expect(page.locator('#vd-gesicherte-kopie'), 'neu geladen').toBeHidden();
  await page.goto('about:blank');
  await page.goBack();
  await page.waitForSelector('#w-anlass', { state: 'visible' });
  await expect(page.locator('#vd-gesicherte-kopie'), 'nach „Zurück“').toBeHidden();
});

test('[Gesicherte Kopie·Rot-Beweis] ohne die Marke zeigt dieselbe gesicherte Seite wieder ein offenes Depot', async ({ page, browser }) => {
  test.setTimeout(120000);
  const html = await offeneSeiteSichern(page, h.KERN_URL_PRIVAT_DE);
  const ohneMarke = html.replace(' data-vd-lauf="1"', '');
  expect(ohneMarke, 'Vorbedingung: die Marke stand im gesicherten Stand').not.toBe(html);
  await kopieOeffnen(browser, ohneMarke, async (kopie) => {
    await kopie.waitForTimeout(2500);
    await expect(kopie.locator('#vd-gesicherte-kopie'), 'ohne Marke kein Hinweis').toBeHidden();
    expect(await kopie.locator('#app.an').count(), 'und die Kopie zeigt das offene Depot: das ist die Lage vor der Änderung').toBe(1);
  });
});

// FIXME-ID: GESICHERTE-KOPIE-TRAEGT-KLARTEXT
test.fixme('[Gesicherte Kopie·Datei] in der gesicherten Datei steht kein Wert des Depots in einem Attribut', async ({ page }) => {
  // Befund GESICHERTE-KOPIE-TRAEGT-KLARTEXT (HOCH, offen): Feldwerte werden als `value`-Attribut gezeichnet und stehen damit in der
  // gesicherten Datei. Fällt mit dem Wagen, der Feldwerte nur noch als Eigenschaft setzt.
  const html = await offeneSeiteSichern(page, h.KERN_URL_PRIVAT_DE);
  const inAttributen = (html.match(/="[^"]*"/g) || []).filter((a) => a.includes(VORNAME) || a.includes(NACHNAME));
  expect(inAttributen, 'Werte in Attributen').toEqual([]);
});
