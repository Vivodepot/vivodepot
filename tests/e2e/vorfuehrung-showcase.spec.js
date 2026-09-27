'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Vorführung am Stand (AB_WERK_SHOWCASE, 15.09.2026) — ein iPad-großes
   Fenster, die gebackene Datei allein in einem Ordner, kein Netz.
   ────────────────────────────────────────────────────────────────────────
   Ablauf wie am Stand: Kaltstart → Schleife läuft durch alle Stationen →
   Berührung → Bedienung → 90 s ohne Berührung → zurück in die Schleife.
   Zeit über page.clock — der Test wartet keine 90 Sekunden.
   Mit VORFUEHRUNG_BILDER=<ordner> legt er je Station ein Bildschirmfoto ab.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const WERKZEUG = require('../../tools/vorfuehrung-showcase-erzeugen.js');

const BILDER = process.env.VORFUEHRUNG_BILDER || '';

function gebackeneDatei(sprache) {
  // Derselbe Weg wie die Auslieferung (EN mit Sprachmodul) — nicht nur die Nutzlast.
  // Nie auf dem blanken Kern: das erzeugte Produkt derselben Sprache trägt Sprachmodul und Bereichsquellen.
  const produktText = fs.readFileSync(require('../produkt-html-erzeugen.js').produktHtml('privat-' + sprache), 'utf8');
  const { text, nutzlast } = WERKZEUG.vorfuehrungDateiErzeugen({ sprache, produktText });
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'vorfuehrung-e2e-'));
  fs.writeFileSync(path.join(ordner, 'vivodepot.html'), text, 'utf8');
  return { url: 'file://' + path.join(ordner, 'vivodepot.html'), nutzlast };
}

async function foto(page, name) {
  if (!BILDER) return;
  fs.mkdirSync(BILDER, { recursive: true });
  await page.screenshot({ path: path.join(BILDER, name + '.png') });
}

test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true });

test('[Vorführung·DE] Kaltstart → Schleife → Berührung → Leerlauf → Schleife', async ({ page }) => {
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(String(e)));
  // Die bekannte Browser-Meldung zu frame-ancestors im <meta>-CSP kommt vom Kern selbst, nicht von der Vorführung.
  page.on('console', (m) => { if (m.type() === 'error' && !/frame-ancestors/.test(m.text())) fehler.push(m.text()); });
  const anfragen = [];
  page.on('request', (r) => { if (!r.url().startsWith('file://') && !r.url().startsWith('data:')) anfragen.push(r.url()); });

  const { url, nutzlast } = gebackeneDatei('de');
  await page.clock.install();
  await page.goto(url);

  await expect(page.locator('#vorfuehrung-streifen')).toHaveText(nutzlast.texte.streifen);
  await expect(page.locator('#vorfuehrung-schleife')).toBeVisible();
  await expect(page.locator('#w-anlass')).toBeHidden();

  for (let i = 0; i < nutzlast.stationen.length; i++) {
    await expect(page.locator('#vorfuehrung-schleife .vorfuehrung-karte-text')).toHaveText(nutzlast.stationen[i].text);
    await foto(page, 'de-station-' + (i + 1) + '-' + nutzlast.stationen[i].ansicht);
    await page.clock.runFor(8000);
  }
  // Nach der letzten Station wieder die erste.
  await expect(page.locator('#vorfuehrung-schleife .vorfuehrung-karte-text')).toHaveText(nutzlast.stationen[0].text);

  // Berührung: Schleife weg, Bedienung frei, Streifen bleibt.
  await page.locator('#vorfuehrung-schleife').click();
  await expect(page.locator('#vorfuehrung-schleife')).toHaveCount(0);
  await expect(page.locator('#vorfuehrung-streifen')).toBeVisible();
  await foto(page, 'de-bedienung');

  // Leerlauf: Hinweis 10 s vor Ablauf, danach Schleife wieder an.
  await page.clock.runFor(81000);
  await expect(page.locator('#vorfuehrung-warnung')).toBeVisible();
  await foto(page, 'de-leerlauf-hinweis');
  await page.clock.runFor(10000);
  await expect(page.locator('#vorfuehrung-warnung')).toHaveCount(0);
  await expect(page.locator('#vorfuehrung-schleife')).toBeVisible();

  expect(anfragen, 'keine Netzanfrage').toEqual([]);
  expect(fehler, 'keine Seitenfehler').toEqual([]);
});

test('[Vorführung·EN] Streifen und erste Station auf Englisch', async ({ page }) => {
  const { url, nutzlast } = gebackeneDatei('en');
  await page.clock.install();
  await page.goto(url);
  await expect(page.locator('#vorfuehrung-streifen')).toHaveText('Demonstration · sample data of a fictional person');
  await expect(page.locator('#vorfuehrung-schleife .vorfuehrung-karte-text')).toHaveText(nutzlast.stationen[0].text);
  await expect(page.locator('#tb-pw-hinweis')).toBeHidden();
  await foto(page, 'en-station-1');
});
