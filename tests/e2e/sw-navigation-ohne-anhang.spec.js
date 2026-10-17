'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Service Worker im Browser: eine Navigation mit Anhang trifft die Schale auch nach einem Release
   (Befund SW-NAVIGATION-MIT-ANHANG-VERFEHLT-SPEICHER, 14.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Eine abgelegte App startet oft mit dem Anhang ihrer ersten Adresse (`/?von=startseite`). Vergleicht der Service
   Worker die volle Adresse, geht diese Navigation nach jedem Release als Seitenabruf an den Dienst und zählt dort
   erneut als Download.

   AUFBAU. Ein lokaler Dienst-Nachbau liefert das gebackene Produkt mit Service Worker und zählt jeden Seitenabruf
   (Accept text/html), so wie der Dienst zählt. Ablauf: erster Besuch auf `/?von=startseite`, der Service Worker
   übernimmt; dann ein Release (sw.js mit neuem CACHE-Namen, Aktualisierung, Wechsel des Workers); dann dieselbe
   Adresse in einem neuen Tab. Erwartet: kein weiterer Seitenabruf am Dienst.

   ROT-BEWEIS im selben Aufbau: derselbe Dienst liefert sw.js mit dem vollen Vergleich (ohne ignoreSearch).

   Lokaler HTTP-Server statt file://: ein Service Worker registriert nur auf einem echten Origin.
   Wächter ohne Browser: tests/sw-navigation-ohne-anhang.test.js.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { test, expect } = require('@playwright/test');
const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup.js');
const { _serviceWorkerVorhandenAufText } = require('../../tools/lib/produkt-text-erzeugen.js');

const REPO_ROOT = path.join(__dirname, '..', '..');
const KENNUNG = 'privat-de';
const OPTION = 'istNavigation ? { ignoreSearch: true } : undefined';

const produktMitServiceWorker = () => _serviceWorkerVorhandenAufText(fs.readFileSync(GEBACKENE_PRODUKT_PFADE[KENNUNG], 'utf8'), true, 'dem Proben-Produkt');

function swText({ fassung, ohneIgnoreSearch }) {
  let s = fs.readFileSync(path.join(REPO_ROOT, 'sw.js'), 'utf8').replace(/const CACHE = '[^']*';/, "const CACHE = 'vivodepot-shell-" + fassung + "';");
  if (ohneIgnoreSearch) {
    if (!s.includes(OPTION)) throw new Error('Rot-Beweis ohne Anker: die Option steht nicht in der erwarteten Form in sw.js');
    s = s.replace(OPTION, 'undefined');
  }
  return s;
}

function starteDienst({ ohneIgnoreSearch = false } = {}) {
  const zustand = { seitenabrufe: 0, fassung: 'probe-1' };
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.pathname === '/sw.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
        res.end(swText({ fassung: zustand.fassung, ohneIgnoreSearch }));
        return;
      }
      if (u.pathname === '/' || u.pathname === '/vivodepot.html') {
        if (/(^|,)\s*text\/html\b/i.test(req.headers.accept || '')) zustand.seitenabrufe += 1;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(produktMitServiceWorker());
        return;
      }
      if (u.pathname === '/manifest.webmanifest') {
        res.writeHead(200, { 'Content-Type': 'application/manifest+json' });
        res.end(fs.readFileSync(path.join(REPO_ROOT, 'manifest.webmanifest')));
        return;
      }
      res.writeHead(404); res.end();
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, zustand }));
  });
}

async function bedient(page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20_000 });
}

/** Erster Besuch, Release, dieselbe Adresse. Liefert die Seitenabrufe nach dem Release. */
async function releaseDurchspielen(browser, optionen) {
  const { srv, zustand } = await starteDienst(optionen);
  const adresse = 'http://127.0.0.1:' + srv.address().port + '/?von=startseite';
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  try {
    const erste = await context.newPage();
    await erste.goto(adresse);
    await bedient(erste);
    await erste.reload();
    await bedient(erste);

    // Release: neuer CACHE-Name; der Kern aktiviert den wartenden Worker selbst, wenn nichts ungesichert ist.
    zustand.fassung = 'probe-2';
    const gewechselt = erste.evaluate(() => new Promise((ok) => navigator.serviceWorker.addEventListener('controllerchange', () => ok(true), { once: true })));
    await erste.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
    await Promise.race([gewechselt, new Promise((_, nein) => setTimeout(() => nein(new Error('kein Wechsel des Service Workers nach dem Release')), 20_000))]);
    // `controllerchange` feuert, sobald der neue Worker aktiv wird; sein `activate` räumt den alten Speicher erst danach.
    await erste.waitForFunction(async () => JSON.stringify(await caches.keys()) === JSON.stringify(['vivodepot-shell-probe-2']),
      null, { timeout: 20_000 }).catch(async () => {
      throw new Error('nach dem Release liegt nicht nur der Speicher der neuen Fassung: ' + JSON.stringify(await erste.evaluate(() => caches.keys())));
    });

    const vorher = zustand.seitenabrufe;
    const zweite = await context.newPage();
    await zweite.goto(adresse);
    await zweite.waitForSelector('#w-anlass', { state: 'visible' });
    return zustand.seitenabrufe - vorher;
  } finally {
    await context.close();
    await new Promise((ok) => srv.close(ok));
  }
}

test.use({ serviceWorkers: 'allow' });

test('[SW·Navigation mit Anhang] nach einem Release erreicht /?von= den Dienst nicht erneut', async ({ browser }) => {
  expect(await releaseDurchspielen(browser), 'die Navigation mit Anhang zählte nach dem Release erneut am Dienst').toBe(0);
});

test('[SW·Navigation mit Anhang·Rot-Beweis] mit dem vollen Vergleich zählt dieselbe Navigation erneut', async ({ browser }) => {
  expect(await releaseDurchspielen(browser, { ohneIgnoreSearch: true }), 'auch ohne ignoreSearch kein Abruf — die Probe misst den Fehler nicht').toBe(1);
});
