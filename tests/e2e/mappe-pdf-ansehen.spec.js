// @ts-check
/* mappe-pdf-ansehen.spec.js — ein PDF im Depot öffnet sichtbar in der Anwendung (17.11.2026).
   Ein zweiseitiges PDF (in der Seite mit dem eingebetteten jsPDF erzeugt) wird abgelegt und angeklickt. Erwartet: in der
   Vorschau je Seite ein <canvas> mit nicht-weißen Bildpunkten, kein Rahmen, kein Verstoß gegen die Richtlinie, kein Hinweis
   „keine Vorschau“. Ein zweiter Fall entfernt Promise.withResolvers vor dem Laden: die eingebettete legacy-Fassung
   bringt dafür Ersatz mit und zeichnet trotzdem (ältere iPads). Rot vor dem Bau: der Kern zeichnete keinen canvas. */
const { test, expect } = require('@playwright/test');
const { inLeisteKlicken, oeffneApp, depotAnlegen } = require('./helpers');

async function pdfAblegenUndOeffnen(page) {
  await oeffneApp(page);
  await depotAnlegen(page);
  const b64 = await page.evaluate(() => {
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFontSize(28); doc.text('Seite eins der Probe', 20, 40); doc.rect(20, 60, 120, 60, 'F');
    doc.addPage(); doc.setFontSize(28); doc.text('Seite zwei der Probe', 20, 40); doc.rect(20, 60, 60, 120, 'F');
    return doc.output('datauristring').split(',')[1];
  });
  await inLeisteKlicken(page, '[data-mappe]');
  await page.waitForSelector('#mappe-add', { state: 'visible' });
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#mappe-add')]);
  await chooser.setFiles({ name: 'probe-zwei-seiten.pdf', mimeType: 'application/pdf', buffer: Buffer.from(b64, 'base64') });
  await page.locator('#mappe-besch').waitFor({ state: 'visible' });
  await page.fill('#mappe-besch', 'PDF-Probe');
  await page.click('#m-ok');
  await page.evaluate(() => {
    window.__richtlinienVerstoesse = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__richtlinienVerstoesse.push(e.violatedDirective + ' ' + e.blockedURI));
  });
  await page.click('[data-mappe-id]');
}

/** Anteil nicht-weißer Bildpunkte je canvas der Vorschau. */
async function seitenMessen(page) {
  return page.evaluate(() => [...document.querySelectorAll('#modal-inhalt [data-pdf-seiten] canvas')].map((c) => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let dunkel = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200)) dunkel++;
    const r = c.getBoundingClientRect();
    return { dunkel, flaeche: c.width * c.height, sichtbar: r.width > 50 && r.height > 50 };
  }));
}

async function pruefen(page, etikett) {
  await expect(page.locator('#modal-inhalt [data-pdf-seiten] canvas')).toHaveCount(2, { timeout: 30000 });
  await page.waitForTimeout(500);
  const seiten = await seitenMessen(page);
  console.log('[' + etikett + '] ' + JSON.stringify(seiten));
  for (const s of seiten) {
    expect(s.sichtbar, 'die Seite ist sichtbar').toBe(true);
    expect(s.dunkel / s.flaeche, 'die Seite trägt gezeichneten Inhalt').toBeGreaterThan(0.01);
  }
  await expect(page.locator('iframe, embed, object'), 'kein Rahmen, kein Plug-in').toHaveCount(0);
  await expect(page.locator('#modal-inhalt .hinweis-box', { hasText: /keine Vorschau|no preview/i })).toHaveCount(0);
  await expect(page.locator('.mappe-vorschau-datei')).toContainText('probe-zwei-seiten.pdf');
  const verstoesse = await page.evaluate(() => window.__richtlinienVerstoesse);
  expect(verstoesse, 'Verstöße gegen die Richtlinie').toEqual([]);
}

test('[PDF ansehen·E2E] ein PDF im Depot öffnet sichtbar in der Anwendung', async ({ page }) => {
  test.setTimeout(120000);
  await pdfAblegenUndOeffnen(page);
  await pruefen(page, 'PDF ansehen·E2E');
});

test('[PDF ansehen·legacy] auch ohne Promise.withResolvers zeichnet die eingebettete Fassung', async ({ page }) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    try { delete Promise.withResolvers; } catch (_) { /* nichts */ }
    window.__ohneWithResolvers = typeof Promise.withResolvers === 'undefined';
  });
  await pdfAblegenUndOeffnen(page);
  expect(await page.evaluate(() => window.__ohneWithResolvers), 'Promise.withResolvers war vor dem Laden entfernt').toBe(true);
  await pruefen(page, 'PDF ansehen·legacy');
});
