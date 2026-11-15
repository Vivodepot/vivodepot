'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Nach einer Aktualisierung zeigt schon der erste Aufruf die neue Fassung (11.11.2026)
   ────────────────────────────────────────────────────────────────────────
   BEFUND. Wer die Anwendung schon einmal geladen hatte, bekam nach einer Aktualisierung beim ersten Aufruf
   die alte Fassung aus der abgelegten Schale und erst beim zweiten die neue. Der neue Worker übernahm zwar
   sofort (U2-ADR-190), die geladene Seite blieb aber die alte.

   ZUSICHERUNG. Übernimmt ein neuer Worker, während kein Depot offen ist, lädt die Seite sich einmal selbst
   neu: Der erste Aufruf endet auf der neuen Fassung, ohne Hinweis und ohne Zutun (U2-ADR-190: kein Toast,
   kein Banner, kein „Neu laden“). Ist ein Depot offen, wird nicht neu geladen.

   AUFBAU. Ein lokaler Server liefert zwei Fassungen derselben Anwendung: A wie gebaut, B mit anderem
   Namen der Schale in sw.js und einer Marke im Kopf der Seite. Der Umschalter steht in der Probe.
   Lokaler Server statt file://, weil der Service Worker nur auf einem echten Origin registriert; das Proben-Produkt
   trägt den Service Worker (wie tests/e2e/sw-navigation-ohne-anhang.spec.js).

   GEGENPROBE. Vor dem Umschalten trägt die Seite die Marke nicht; nach dem Umschalten liefert der Server
   sie nachweislich aus. Ohne beides bewiese eine Marke am Ende nichts.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { test, expect } = require('@playwright/test');
const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup.js');
const { _serviceWorkerVorhandenAufText } = require('../../tools/lib/produkt-text-erzeugen.js');
const { fsaStandardAttrappeEinrichten, depotAnlegen } = require('./helpers');

const REPO_ROOT = path.join(__dirname, '..', '..');
const MARKE = '<meta name="probe-fassung" content="B">';
const SCHALE_B = 'vivodepot-shell-probe-fassung-b';

const seite = () => _serviceWorkerVorhandenAufText(fs.readFileSync(GEBACKENE_PRODUKT_PFADE['privat-de'], 'utf8'), true, 'dem Proben-Produkt');

function zweiFassungenServer() {
  const zustand = { fassung: 'A' };
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const pfad = new URL(req.url, 'http://127.0.0.1').pathname;
      const b = zustand.fassung === 'B';
      if (pfad === '/sw.js') {
        let sw = fs.readFileSync(path.join(REPO_ROOT, 'sw.js'), 'utf8');
        if (b) sw = sw.replace(/const CACHE = '[^']*';/, "const CACHE = '" + SCHALE_B + "';");
        res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
        res.end(sw); return;
      }
      if (pfad === '/' || pfad === '/vivodepot.html') {
        let html = seite();
        if (b) html = html.replace('</head>', MARKE + '</head>');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(html); return;
      }
      if (pfad === '/manifest.webmanifest') {
        res.writeHead(200, { 'Content-Type': 'application/manifest+json' });
        res.end(fs.readFileSync(path.join(REPO_ROOT, 'manifest.webmanifest'))); return;
      }
      res.writeHead(404); res.end();
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, zustand }));
  });
}

const traegtMarke = (page) => page.evaluate(() => !!document.querySelector('meta[name="probe-fassung"]')).catch(() => false);

async function bedient(page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20_000 });
}

// Erster Besuch und ein zweiter Aufruf: Danach kommt die Seite aus der abgelegten Schale der Fassung A.
async function ersteFassungLaden(page, adresse) {
  await fsaStandardAttrappeEinrichten(page);
  await page.goto(adresse);
  await page.waitForSelector('#w-anlegen', { state: 'visible' });
  await bedient(page);
  await page.reload();
  await page.waitForSelector('#w-anlegen', { state: 'visible' });
  await bedient(page);
  expect(await traegtMarke(page), 'Gegenprobe: Fassung A trägt die Marke nicht').toBe(false);
}

test.use({ serviceWorkers: 'allow' });

test('ohne offenes Depot endet der erste Aufruf nach einer Aktualisierung auf der neuen Fassung', async ({ page, request }) => {
  test.setTimeout(90_000);
  const { srv, zustand } = await zweiFassungenServer();
  const adresse = `http://127.0.0.1:${srv.address().port}/vivodepot.html`;
  try {
    await ersteFassungLaden(page, adresse);

    zustand.fassung = 'B';
    const vomServer = await (await request.get(adresse)).text();
    expect(vomServer.includes(MARKE), 'Gegenprobe: der Server liefert jetzt Fassung B').toBe(true);

    await page.goto(adresse);                       // der erste Aufruf nach der Aktualisierung
    await expect.poll(() => traegtMarke(page), {
      message: 'der erste Aufruf endet auf der neuen Fassung', timeout: 30_000,
    }).toBe(true);
    await expect(page.locator('#w-anlegen'), 'die Seite steht wieder am Anfang, ohne Hinweis').toBeVisible();
    expect(await page.evaluate(() => caches.keys()), 'es liegt nur die Schale der neuen Fassung').toEqual([SCHALE_B]);
  } finally { await new Promise((ok) => srv.close(ok)); }
});

test('ein offenes Depot wird bei einer Aktualisierung nicht neu geladen', async ({ page }) => {
  test.setTimeout(120_000);
  const { srv, zustand } = await zweiFassungenServer();
  const adresse = `http://127.0.0.1:${srv.address().port}/vivodepot.html`;
  try {
    await ersteFassungLaden(page, adresse);
    await depotAnlegen(page);
    await page.evaluate(() => { window.__probeNichtNeuGeladen = true; });

    zustand.fassung = 'B';
    await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); await reg.update(); });
    // Der neue Worker hat übernommen, sobald nur noch die neue Schale liegt.
    await page.waitForFunction(async (name) => JSON.stringify(await caches.keys()) === JSON.stringify([name]), SCHALE_B, { timeout: 30_000 });
    await page.waitForTimeout(3000);                // Zeit, in der ein Neuladen geschähe

    expect(await page.evaluate(() => window.__probeNichtNeuGeladen === true).catch(() => false), 'die Seite wurde nicht neu geladen').toBe(true);
    await expect(page.locator('#app.an'), 'das Depot ist weiter offen').toHaveCount(1);
    expect(await traegtMarke(page), 'die offene Seite ist weiter Fassung A').toBe(false);
  } finally { await new Promise((ok) => srv.close(ok)); }
});
