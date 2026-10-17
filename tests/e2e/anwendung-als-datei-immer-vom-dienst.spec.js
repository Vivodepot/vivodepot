'use strict';
/* ════════════════════════════════════════════════════════════════════════
   „{marke} als Datei erhalten“ — im Browser: immer die Fassung des Dienstes
   (Befund ANWENDUNG-ALS-DATEI-OHNE-WEG, 12.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Die Frage, die nur ein Browser beantwortet: die Anwendung läuft gehostet, der Service
   Worker hat die Schale abgelegt und bedient den Tab. Die Person wählt in den Einstellungen
   „… als Datei erhalten“. Welche Fassung steht in der Datei und in ihrem Namen?

   Der Link trägt nur `?datei=1`. Ohne Ausnahme im Service Worker ginge der erste Abruf ans
   Netz, seine Antwort würde als Navigation abgelegt, und jeder spätere Abruf käme aus dem
   Speicher: eine frühere Fassung unter dem Namen der geltenden. Ohne Netz käme die
   gespeicherte Schale als Datei, ohne den Namen des Dienstes.

   AUFBAU. Ein lokaler Dienst-Nachbau liefert die gebackene Anwendung als Seite und
   beantwortet `?datei=1` wie der Dienst: `Content-Disposition: attachment`, Dateiname
   `vivodepot-<kennung>-v<stand>.html`. Der Stand steigt mit jedem Abruf, und der Inhalt trägt
   ihn als Merkmal — so ist an Datei UND Name abzulesen, ob ein Abruf den Dienst erreicht hat.

   GEMESSEN (12.10.2026, Chromium): ein Klick auf einen Link mit `download` erreicht den Dienst
   an Service Worker und Netz-Nachbildung der Probe vorbei — auch ohne die Ausnahme kam der
   zweite Klick vom Dienst. Andere Browser dürfen den Abruf durch den Service Worker führen,
   und dieselbe Adresse lässt sich auch ohne den Link aufrufen. Die Probe misst darum beides:
   den Klick (Datei und Name) und dieselbe Adresse als Navigation in einem zweiten Tab, die
   durch den Service Worker läuft (die Seite selbst ruft nichts ab: `connect-src 'none'`).

   ROT-BEWEIS im selben Aufbau: derselbe Dienst liefert `sw.js` ohne die Zeile der Ausnahme.
   Dann trägt die zweite Navigation den Stand der ersten, und der Dienst wurde nur
   einmal gefragt.

   Lokaler HTTP-Server statt file://: ein Service Worker registriert nur auf einem echten
   Origin (wie tests/e2e/sw-uebernahme-keine-same-origin-anfrage.spec.js).
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { test, expect } = require('@playwright/test');
const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup.js');
const { einstellungenAbschnittOeffnen, einmalDialogeSchliessen } = require('./helpers.js');
const { _serviceWorkerVorhandenAufText } = require('../../tools/lib/produkt-text-erzeugen.js');

const REPO_ROOT = path.join(__dirname, '..', '..');
const KENNUNG = 'privat-de';
const ERSTER_STAND = 9001;
const AUSNAHME_ZEILE = /\n[^\n]*if \(istAnwendungAlsDatei\(url\)\) return;[^\n]*\n/;

/* Die Proben-Produkte der Strecke sind ohne Service Worker gebacken (Einzeldatei). Der Dienst liefert das Produkt MIT
   (das Ausliefer-Werkzeug des Dienstes, `serviceWorkerVorhanden: true`, sw.js daneben) — derselbe Backplatz, hier gesetzt. */
const produktMitServiceWorker = () => _serviceWorkerVorhandenAufText(fs.readFileSync(GEBACKENE_PRODUKT_PFADE[KENNUNG], 'utf8'), true, 'dem Proben-Produkt');

function starteDienst({ swOhneAusnahme = false } = {}) {
  const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
  const zustand = { dateiAbrufe: 0 };
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      const istSeite = u.pathname === '/' || u.pathname === '/vivodepot.html';
      if (istSeite && u.searchParams.get('datei') === '1') {
        const stand = ERSTER_STAND + zustand.dateiAbrufe;
        zustand.dateiAbrufe += 1;
        const inhalt = '<!-- dienst-stand:' + stand + ' -->\n' + produktMitServiceWorker();
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': 'attachment; filename="vivodepot-' + KENNUNG + '-v' + stand + '.html"' });
        res.end(inhalt);
        return;
      }
      if (u.pathname === '/sw.js' && swOhneAusnahme) {
        const quelle = fs.readFileSync(path.join(REPO_ROOT, 'sw.js'), 'utf8');
        if (!AUSNAHME_ZEILE.test(quelle)) { res.writeHead(500); res.end('Rot-Beweis ohne Anker'); return; }
        res.writeHead(200, { 'Content-Type': MIME['.js'] });
        res.end(quelle.replace(AUSNAHME_ZEILE, '\n'));
        return;
      }
      if (istSeite) { res.writeHead(200, { 'Content-Type': MIME['.html'] }); res.end(produktMitServiceWorker()); return; }
      const fp = path.join(REPO_ROOT, u.pathname);
      fs.readFile(fp, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, zustand }));
  });
}

/** Die Anwendung gehostet öffnen, bis der Service Worker den Tab bedient, ein Depot anlegen, Einstellungen öffnen. */
async function bisZumEintrag(page, port) {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true,
      value: async () => ({ name: 'probe.vivodepot', createWritable: async () => ({ write: async () => {}, close: async () => {} }) }) });
  });
  await page.goto(`http://127.0.0.1:${port}/vivodepot.html`);
  await page.waitForSelector('#w-anlass', { state: 'visible' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Ein neu geladener Tab wird vom aktiven Service Worker bedient — der Zustand der installierten Anwendung.
  await page.reload();
  await page.waitForSelector('#w-anlass', { state: 'visible' });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20_000 }).catch(async () => {
    const lage = await page.evaluate(async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      return { adresse: location.href, bedient: !!navigator.serviceWorker.controller,
        registrierungen: regs.map((r) => ({ bereich: r.scope, aktiv: r.active && r.active.state, wartet: !!r.waiting, installiert: !!r.installing })) };
    });
    throw new Error('Der Service Worker bedient den Tab nicht: ' + JSON.stringify(lage));
  });

  await page.click('#w-anfangen');
  await page.waitForSelector('#app.an', { state: 'attached' });
  await page.waitForSelector('#tb-pw-hinweis', { state: 'visible' });
  await page.click('#tb-pw-hinweis');
  await page.waitForSelector('#id-pw', { state: 'visible' });
  await page.fill('#id-vorname', 'Marlies');
  await page.fill('#id-nachname', 'Sonnenschein');
  await page.fill('#id-pw', 'anwendung-als-datei-2026');
  await page.fill('#id-pw2', 'anwendung-als-datei-2026');
  await page.click('#m-ok');
  await page.waitForSelector('#tb-pw-hinweis', { state: 'hidden' });

  // Gehostet folgen auf das Anlegen Einmal-Angebote (Wiederherstellungs-Code, Notfall-Blatt); die Probe lehnt sie ab.
  await einmalDialogeSchliessen(page);

  await page.click('#tb-einstellungen', { timeout: 15_000 });
  await einstellungenAbschnittOeffnen(page, '#einst-anwendung-als-datei');
  await page.waitForSelector('#einst-anwendung-als-datei', { state: 'visible' });
}

async function eintragWaehlen(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 20_000 }),
    page.click('#einst-anwendung-als-datei'),
  ]);
  const pfad = await download.path();
  const inhalt = fs.readFileSync(pfad, 'utf8');
  const m = inhalt.match(/^<!-- dienst-stand:(\d+) -->/);
  return { name: download.suggestedFilename(), standInDatei: m ? Number(m[1]) : null };
}

test.use({ serviceWorkers: 'allow' });

/** Dieselbe Adresse als Navigation in einem zweiten Tab: sie läuft durch den Service Worker (die Seite selbst darf nichts
    abrufen, ihre CSP sagt `connect-src 'none'`). Liefert { stand, name } der entstandenen Datei oder null, wenn keine entsteht. */
async function abrufAlsNavigation(context, adresse, fristMs = 20_000) {
  const tab = await context.newPage();
  try {
    const [download] = await Promise.all([
      tab.waitForEvent('download', { timeout: fristMs }).catch(() => null),
      tab.goto(adresse).catch(() => null),   // eine Antwort als Anhang beendet die Navigation; der Fehler gehört dazu
    ]);
    if (!download || await download.failure()) return null;
    const m = fs.readFileSync(await download.path(), 'utf8').match(/^<!-- dienst-stand:(\d+) -->/);
    return { stand: m ? Number(m[1]) : null, name: download.suggestedFilename() };
  } finally { await tab.close(); }
}
const schalterAdresse = (page) => page.evaluate(() => location.origin + location.pathname + '?datei=1');

test('installiert und vom Service Worker bedient: jeder Abruf liefert die Fassung des Dienstes, in Datei und Name', async ({ page, context }) => {
  test.setTimeout(120_000);
  const { srv, zustand } = await starteDienst();
  try {
    await bisZumEintrag(page, srv.address().port);
    expect(await page.getAttribute('#einst-anwendung-als-datei', 'href')).toBe('?datei=1');

    const erste = await eintragWaehlen(page);
    expect(erste.name).toBe('vivodepot-' + KENNUNG + '-v' + ERSTER_STAND + '.html');
    expect(erste.standInDatei).toBe(ERSTER_STAND);

    const zweite = await eintragWaehlen(page);
    expect(zweite.name, 'der zweite Klick trägt den Namen des Dienstes').toBe('vivodepot-' + KENNUNG + '-v' + (ERSTER_STAND + 1) + '.html');
    expect(zweite.standInDatei, 'und die Fassung des Dienstes').toBe(ERSTER_STAND + 1);
    // Die Anwendung ist nach beiden Klicks noch dieselbe Seite (ein Link mit download verlässt sie nicht).
    await expect(page.locator('#einst-anwendung-als-datei')).toBeVisible();

    // Dieselbe Adresse als Navigation, durch den Service Worker: jedes Mal der Dienst, nichts wird abgelegt.
    const adresse = await schalterAdresse(page);
    expect((await abrufAlsNavigation(context, adresse)).stand).toBe(ERSTER_STAND + 2);
    const vierte = await abrufAlsNavigation(context, adresse);
    expect(vierte.stand, 'auch die wiederholte Navigation kommt vom Dienst').toBe(ERSTER_STAND + 3);
    expect(vierte.name).toBe('vivodepot-' + KENNUNG + '-v' + (ERSTER_STAND + 3) + '.html');
    expect(zustand.dateiAbrufe, 'alle vier Abrufe haben den Dienst erreicht').toBe(4);
    const abgelegt = await page.evaluate(async () => {
      for (const n of await caches.keys()) { for (const r of await (await caches.open(n)).keys()) { if (new URL(r.url).searchParams.get('datei') === '1') return r.url; } }
      return null;
    });
    expect(abgelegt, 'im Offline-Speicher liegt keine Antwort auf den Schalter').toBeNull();

    // Ohne Netz: der Service Worker setzt nichts an die Stelle des Dienstes, es entsteht keine Datei.
    await context.setOffline(true);
    const ohneNetz = await abrufAlsNavigation(context, adresse, 4_000);
    await context.setOffline(false);
    expect(ohneNetz, 'ohne Netz entsteht keine Datei: nicht die gespeicherte Schale unter dem Namen des Dienstes').toBeNull();
    expect(zustand.dateiAbrufe, 'ohne Netz wurde der Dienst nicht erreicht').toBe(4);
  } finally { srv.close(); }
});

/* Seit v931 schlägt der Service Worker Navigationen ohne Abfrageteil nach (ignoreSearch, Befund
   SW-NAVIGATION-MIT-ANHANG-VERFEHLT-SPEICHER). Ohne die Ausnahme fände er für `?datei=1` darum die gespeicherte Schale:
   der Abruf erreicht den Dienst nie, und statt der geltenden Fassung als Datei käme die Anwendung als Seite. */
test('[Rot-Beweis] ohne die Ausnahme im Service Worker erreicht der Abruf den Dienst nicht', async ({ page, context }) => {
  test.setTimeout(120_000);
  const { srv, zustand } = await starteDienst({ swOhneAusnahme: true });
  try {
    await bisZumEintrag(page, srv.address().port);
    const adresse = await schalterAdresse(page);
    const erste = await abrufAlsNavigation(context, adresse, 4_000);
    expect(zustand.dateiAbrufe, 'ohne die Ausnahme beantwortet der Service Worker den Schalter selbst').toBe(0);
    expect(erste, 'es entsteht keine Datei des Dienstes').toBeNull();
  } finally { srv.close(); }
});
