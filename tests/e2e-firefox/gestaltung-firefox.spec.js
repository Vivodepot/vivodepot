'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Gestaltung in Firefox (17.11.2026) — ein gebackenes Produkt muss in Firefox gestaltet laden, über file:// und über http.
   Anlass: ein Firefox-artiger Browser zeigte das Produkt über file:// ungestaltet, Chromium gestaltet. Der Kern gestaltet über
   ein konstruiertes Stylesheet (erscheinungsbildAnwenden: CSSStyleSheet + adoptedStyleSheets, Rückfall insertRule in
   #design-system); eine Laufzeitprobe (erscheinungsbildSchutzProbe) kann auf Browser-Standard zurückfallen
   (<html data-erscheinungsbild="rueckfall">). Gemessen wird, was der Mensch sieht: die Schrift des Körpers ist die des
   Erscheinungsbilds, nicht der Browser-Standard, und es gab keinen Rückfall. Ein Fall läuft zusätzlich mit
   privacy.resistFingerprinting (gehärtete Firefox-Ableger), weil die Laufzeitprobe Farben über eine Zeichenfläche liest.
   Bei Rot nennt die Meldung die Konsole und die Seitenfehler, damit die Ursache im Lauf steht.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { KERN_URL } = require('../e2e/helpers');   // das gebackene Produkt privat-de

const DATEI = decodeURIComponent(KERN_URL.replace(/^file:\/\//, ''));

async function messen(page, url) {
  const meldungen = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') meldungen.push(m.type() + ': ' + m.text().slice(0, 300)); });
  page.on('pageerror', (e) => meldungen.push('pageerror: ' + String(e && e.message).slice(0, 300)));
  await page.goto(url);
  await page.waitForSelector('#w-anlegen', { state: 'visible' });
  await page.waitForTimeout(1500);   // die Laufzeitprobe läuft gebündelt nach 250 ms und nach Änderungen
  const r = await page.evaluate(() => ({
    rueckfall: document.documentElement.getAttribute('data-erscheinungsbild'),
    blaetter: (document.adoptedStyleSheets || []).length,
    schrift: getComputedStyle(document.body).fontFamily,
    grund: getComputedStyle(document.body).backgroundColor,
  }));
  return { r, meldungen };
}

function pruefen({ r, meldungen }) {
  const bericht = JSON.stringify(r) + '\n' + meldungen.join('\n');
  expect(r.rueckfall, 'Rückfall auf Browser-Standard\n' + bericht).not.toBe('rueckfall');
  expect(r.schrift, 'Körperschrift ist Browser-Standard, das Erscheinungsbild wirkt nicht\n' + bericht).not.toMatch(/^(serif|"?Times)/i);
}

test('[Gestaltung·Firefox] das gebackene Produkt lädt über file:// gestaltet', async ({ page }) => {
  test.setTimeout(30000);
  pruefen(await messen(page, KERN_URL));
});

test('[Gestaltung·Firefox] das gebackene Produkt lädt über http gestaltet', async ({ page }) => {
  test.setTimeout(30000);
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(fs.readFileSync(DATEI));
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  try {
    pruefen(await messen(page, 'http://127.0.0.1:' + server.address().port + '/' + path.basename(DATEI)));
  } finally { server.close(); }
});

/* Der gehärtete Fall startet einen eigenen Browser: test.use({ launchOptions }) in einer describe-Gruppe verlangt einen neuen
   Worker, und Playwright bricht den ganzen Lauf ab (19.11.2026, Beleg der Wagenstufe rot in 2 s). */
test('[Gestaltung·Firefox] gehärteter Firefox: das gebackene Produkt lädt über file:// gestaltet', async ({ playwright }) => {
  test.setTimeout(30000);
  const browser = await playwright.firefox.launch(require('../../tools/lib/netz-sperre.js').mitSperre({ firefoxUserPrefs: { 'privacy.resistFingerprinting': true } }));
  try {
    const page = await browser.newPage();
    pruefen(await messen(page, KERN_URL));
  } finally { await browser.close(); }
});
