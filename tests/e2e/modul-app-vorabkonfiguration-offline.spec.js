'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Modul-App offline: die Vor-Depot-Konfiguration nach dem ERSTEN Besuch
   (Befund-Kandidat 13.10.2026, Modul-Apps über tools/modul-app-packen.js)
   ────────────────────────────────────────────────────────────────────────
   Eine Modul-App (Weg B, U2-ADR-182) ist ein Ordner mit vivodepot.html, sw.js, manifest.webmanifest
   und der Begleitdatei vorabkonfiguration.js (Sprache, Branding, signierte Module). Der Kern lädt
   die Begleitdatei über ein eingefügtes <script> (_vorDepotSkriptNachladen), beim Booten.

   Die Lücke, gelesen: sw.js legt bei der Installation nur die Schale ab ('./', './vivodepot.html',
   './manifest.webmanifest'). Den Service Worker meldet der Kern erst beim `load` der Seite an
   (serviceWorkerRegistrieren). Beim ersten Besuch ist die Begleitdatei also schon geladen, bevor
   ein Service Worker die Seite bedient, und sie liegt danach nicht in seinem Speicher. Erst ein
   zweiter Besuch mit Netz holt sie durch den Service Worker, der sie dann ablegt. Wer nach dem
   ersten Besuch ohne Netz neu lädt, bekommt die Schale, aber nicht die Konfiguration: Die
   Englisch-App startet dann ohne ihr Sprachmodul.

   Die Probe: erster Besuch mit Netz, bis der Service Worker die Seite bedient; dann ohne Netz neu
   laden. Erwartet: die Konfiguration ist geladen (window.__vorDepotKonfiguration ist das Array aus
   der Begleitdatei). Der Server antwortet mit `Cache-Control: no-store`, damit nicht der
   HTTP-Speicher des Browsers die Lücke verdeckt.

   ROT-BEWEIS im selben Aufbau: der Server liefert sw.js ohne den Eintrag './vorabkonfiguration.js' in SCHALE.
   Dann fehlt die Konfiguration ohne Netz nach dem ersten Besuch.

   GERÜST-TEST (Klasse-B-Wächter, 14.10.2026): eine Modul-App IST das Gerüst mit gebackenem Erscheinungsbild
   (geruestMitErscheinungsbild(), so legt modul-app-packen.js sie ab); Sprache und Module kommen erst aus der
   Begleitdatei. Das Gerüst ist hier der Gegenstand, nicht ein Produkt, das versehentlich roh geladen wird.

   Lokaler HTTP-Server statt file://: ein Service Worker registriert nur auf einem echten Origin, und
   unter file:// lädt der Kern die Begleitdatei gar nicht (wie die Offline-Probe der Vorführung).
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { test, expect } = require('@playwright/test');
const { geruestMitErscheinungsbild } = require('../../tools/lib/pages-erzeugnis.js');

const REPO_ROOT = path.join(__dirname, '..', '..');
const APP_PFAD = '/module-apps/probe/';
// Ein leeres Bündel-Array genügt: gemessen wird, ob die Datei ankommt, nicht ihr Inhalt.
const VORABKONFIGURATION = 'window.__vorDepotKonfiguration = [];\n';
const TYPEN = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webmanifest': 'application/manifest+json' };

/* Der Ordner, wie modul-app-packen.js ihn legt: Gerüst mit Erscheinungsbild, sw.js und Manifest aus dem Repo. */
const EINTRAG_ZEILE = /\n\s*'\.\/vorabkonfiguration\.js',/;
function modulAppDateien({ swOhneEintrag = false } = {}) {
  let sw = fs.readFileSync(path.join(REPO_ROOT, 'sw.js'), 'utf8');
  if (swOhneEintrag) {
    if (!EINTRAG_ZEILE.test(sw)) throw new Error('Rot-Beweis ohne Anker: der Eintrag steht nicht in der erwarteten Form in sw.js');
    sw = sw.replace(EINTRAG_ZEILE, '\n');
  }
  return {
    'vivodepot.html': geruestMitErscheinungsbild(),
    'sw.js': sw,
    'manifest.webmanifest': fs.readFileSync(path.join(REPO_ROOT, 'manifest.webmanifest'), 'utf8'),
    'vorabkonfiguration.js': VORABKONFIGURATION,
  };
}

function serverStarten(dateien) {
  const abrufe = { 'vorabkonfiguration.js': 0 };
  return new Promise((ok) => {
    const server = http.createServer((req, res) => {
      const pfad = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (!pfad.startsWith(APP_PFAD)) { res.writeHead(404); res.end(); return; }
      const name = pfad.slice(APP_PFAD.length) || 'vivodepot.html';
      if (!Object.prototype.hasOwnProperty.call(dateien, name)) { res.writeHead(404); res.end(); return; }
      if (name in abrufe) abrufe[name] += 1;
      res.writeHead(200, { 'Content-Type': TYPEN[path.extname(name)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(dateien[name]);
    });
    server.listen(0, '127.0.0.1', () => ok({ server, abrufe }));
  });
}

const konfigurationGeladen = (page) => page.waitForFunction(
  () => Array.isArray(window.__vorDepotKonfiguration), null, { timeout: 8_000 }).then(() => true, () => false);

test.use({ serviceWorkers: 'allow' });

/** Erster Besuch mit Netz, dann ohne Netz neu laden. Liefert, ob die Konfiguration ohne Netz geladen ist. */
async function ersterBesuchDannOffline(browser, dateien) {
  const { server, abrufe } = await serverStarten(dateien);
  const url = 'http://127.0.0.1:' + server.address().port + APP_PFAD + 'vivodepot.html';
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  try {
    // 1) Erster Besuch mit Netz: die Konfiguration kommt an, der Service Worker übernimmt die Seite.
    const erste = await context.newPage();
    await erste.goto(url);
    expect(await konfigurationGeladen(erste), 'erster Besuch: Konfiguration nicht geladen (Aufbau der Probe)').toBe(true);
    await erste.evaluate(() => navigator.serviceWorker.ready);
    await erste.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20_000 });
    const abrufeErsterBesuch = abrufe['vorabkonfiguration.js'];
    expect(abrufeErsterBesuch, 'erster Besuch: die Begleitdatei wurde nie vom Server geholt (Aufbau der Probe)').toBeGreaterThan(0);

    // 2) Ohne Netz neu laden. Die Schale kommt aus dem Speicher des Service Workers; die Konfiguration muss es auch.
    await context.setOffline(true);
    const zweite = await context.newPage();
    await zweite.goto(url);
    await zweite.waitForSelector('body', { state: 'attached' });
    const offlineGeladen = await konfigurationGeladen(zweite);
    expect(abrufe['vorabkonfiguration.js'], 'ohne Netz hat der Server geantwortet — die Probe misst nicht offline').toBe(abrufeErsterBesuch);
    return offlineGeladen;
  } finally {
    await context.close();
    await new Promise((ok) => server.close(ok));
  }
}

test('[Modul-App·offline] nach dem ersten Besuch lädt die App ihre Vor-Depot-Konfiguration auch ohne Netz', async ({ browser }) => {
  expect(await ersterBesuchDannOffline(browser, modulAppDateien()),
    'ohne Netz nach dem ersten Besuch fehlt die Vor-Depot-Konfiguration: sw.js hat vorabkonfiguration.js nicht abgelegt').toBe(true);
});

test('[Modul-App·offline·Rot-Beweis] ohne den Eintrag in SCHALE fehlt die Konfiguration ohne Netz', async ({ browser }) => {
  expect(await ersterBesuchDannOffline(browser, modulAppDateien({ swOhneEintrag: true })),
    'auch ohne den Eintrag kam die Konfiguration ohne Netz an — die Probe misst den Fehler nicht').toBe(false);
});
