// @ts-check
/* pdf-vorschau-rahmen.spec.js — die PDF-Vorschau ohne Rahmen (15.10.2026, Befund PDF-VORSCHAU-VON-CSP-BLOCKIERT).
   GEMESSEN vor der Änderung (Chromium, 78e466890): Beim Öffnen der Vorschau meldete der Browser einen Verstoß gegen
   `frame-src` (die Richtlinie hat kein `frame-src`, es gilt `default-src 'none'`), der Rahmen blieb leer, und er trug kein
   `sandbox`. Jetzt zeichnet die Vorschau keinen Rahmen, nennt Name und Größe und bietet das Herunterladen an; die
   Richtlinie bleibt unverändert. Der Wächter tests/iframe-sandbox-klasse.test.js hält, dass ein künftiger Rahmen `sandbox` trägt. */
const { test, expect } = require('@playwright/test');
const { inLeisteKlicken, oeffneApp, depotAnlegen } = require('./helpers');

async function pdfVorschauOeffnen(page) {
  await oeffneApp(page);
  await depotAnlegen(page);
  await inLeisteKlicken(page, '[data-mappe]');
  await page.waitForSelector('#mappe-add', { state: 'visible' });
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#mappe-add')]);
  await chooser.setFiles({ name: 'vorschau.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 Rahmenprobe', 'utf8') });
  await page.locator('#mappe-besch').waitFor({ state: 'visible' });
  await page.fill('#mappe-besch', 'Rahmenprobe');
  await page.click('#m-ok');
  await page.evaluate(() => {
    window.__rahmenVerstoesse = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__rahmenVerstoesse.push(e.violatedDirective + ' ' + e.blockedURI));
  });
  await page.click('[data-mappe-id]');
  await page.waitForTimeout(1000);
  return page.evaluate(() => window.__rahmenVerstoesse);
}

test('[PDF-Vorschau·ohne Rahmen] die Vorschau zeichnet keinen Rahmen, nennt Name und Größe, und die Richtlinie meldet nichts', async ({ page }) => {
  test.setTimeout(90000);
  const verstoesse = await pdfVorschauOeffnen(page);
  console.log('[PDF-Vorschau·ohne Rahmen] ' + JSON.stringify({ verstoesse }));
  expect(verstoesse, 'Verstöße der Richtlinie beim Öffnen der Vorschau').toEqual([]);
  await expect(page.locator('iframe'), 'kein Rahmen im Dokument').toHaveCount(0);
  await expect(page.locator('.mappe-vorschau-datei')).toContainText('vorschau.pdf');
  await expect(page.locator('[data-mappe-herunterladen]')).toBeVisible();
});

/* Rot-Beweis: derselbe Rahmen wie vor der Änderung, in die offene Vorschau gesetzt, löst den Verstoß wieder aus. */
test('[PDF-Vorschau·Rot-Beweis] ein Rahmen mit blob:-Adresse wird von der Richtlinie blockiert', async ({ page }) => {
  test.setTimeout(90000);
  await pdfVorschauOeffnen(page);
  await page.evaluate(() => {
    const u = URL.createObjectURL(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    const f = document.createElement('iframe');
    f.src = u;
    document.body.appendChild(f);
  });
  await page.waitForTimeout(1000);
  const verstoesse = await page.evaluate(() => window.__rahmenVerstoesse);
  expect(verstoesse.some((v) => /^frame-src/.test(v)), 'der alte Rahmen ist wieder blockiert: ' + JSON.stringify(verstoesse)).toBe(true);
});
