#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   anwendung-als-datei-geraet-messen.js — „Anwendung als Datei erhalten“ am Gerät messen (Teil C Nr. 28, 07.11.2026)
   ────────────────────────────────────────────────────────────────────────────
   node tools/anwendung-als-datei-geraet-messen.js [--adresse <https://…/>] [--browser chromium|webkit|alle] [--ausgabe <ordner>]

   Ohne --adresse läuft es gegen einen kleinen lokalen Dienst aus diesem Repo (vivodepot.html und sw.js; `?datei=1` als
   Anhang), damit die Suite das Werkzeug selbst prüft. Je Browser:
     1. Die Seite online laden und warten, bis der Service Worker den Tab bedient (sonst: Zeile „ohne Service Worker“).
     2. Ein Probe-Depot im Wegwerf-Kontext anlegen, die Einstellungen öffnen und den Link klicken (Weg wie die E2E-Probe).
        Erwartet: genau ein Download, Name vivodepot-<kennung>-v<stand>.html, <stand> gleich SCHALEN_STAND der Datei.
     3. Netz aus: der Link ist verborgen, der deaktivierte Knopf sichtbar; ein Klick darauf ergibt KEINEN Download.
     4. Den Online-Download über file:// öffnen, jede Anfrage außer file: abbrechen und zählen. „Heil“ heißt: genau ein #app,
        kein sichtbarer #vd-gesicherte-kopie, mindestens ein sichtbarer Knopf, 0 Seitenfehler, 0 Netzanfragen.
     5. Rot-Beweis: eine halbierte Kopie derselben Datei ist nicht heil.
   Letzte Zeile: „heil online: ja · offline: kein falscher Download · rot-beweis: ja“ (Ausgang 0), sonst Ausgang 1.

   Der iOS-Simulator (Safari unter iOS) läuft von Hand nach derselben Abfolge; das Protokoll gehört in den Messbericht.
   Ohne --ausgabe landen die Dateien in einem Wegwerf-Verzeichnis, das am Ende wieder entfernt wird.
   Probe: tests/anwendung-als-datei-geraet-messen.test.js (der reine Teil in tools/lib/anwendung-als-datei-urteil.js).
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const REPO = path.join(__dirname, '..');
const { argumente, nameUrteil, heil, schluss, NAME_MUSTER } = require('./lib/anwendung-als-datei-urteil.js');

/* Das Fixture-Produkt wie in der E2E-Probe: privat-de aus diesem Repo gebacken, mit Service Worker (Dienst-Zustand). */
function fixtureProdukt() {
  const { testProduktText } = require('../tests/produkt-test-backen.js');
  const { _serviceWorkerVorhandenAufText } = require('./lib/produkt-text-erzeugen.js');
  const roh = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  return Buffer.from(_serviceWorkerVorhandenAufText(testProduktText(roh, { slug: 'privat-de' }), true, 'dem Fixture-Produkt'), 'utf8');
}

function fixtureDienst() {
  const produkt = fixtureProdukt();
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.webmanifest': 'application/manifest+json' };
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      const seite = u.pathname === '/' || u.pathname === '/vivodepot.html';
      const pfad = seite ? 'vivodepot.html' : u.pathname.replace(/^\/+/, '');
      if (!['vivodepot.html', 'sw.js', 'manifest.webmanifest'].includes(pfad)) { res.writeHead(404); res.end(); return; }
      const lesen = seite ? (cb) => cb(null, produkt) : (cb) => fs.readFile(path.join(REPO, pfad), cb);
      lesen((err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        const kopf = { 'Content-Type': MIME[path.extname(pfad)] || 'application/octet-stream' };
        if (seite && u.searchParams.get('datei') === '1') {
          const s = /const SCHALEN_STAND = 'v(\d+)'/.exec(String(data));
          kopf['Content-Disposition'] = 'attachment; filename="vivodepot-fixture-v' + (s ? s[1] : '0') + '.html"';
        }
        res.writeHead(200, kopf);
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

async function dateiPruefen(typ, datei) {
  const b = await typ.launch(require('./lib/netz-sperre.js').mitSperre());
  try {
    const ctx = await b.newContext({ serviceWorkers: 'block' });
    const netz = [];
    await ctx.route('**/*', (r) => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue(); netz.push(u); return r.abort(); });
    const p = await ctx.newPage();
    const fehler = [];
    p.on('pageerror', (e) => fehler.push(String(e.message).slice(0, 120)));
    await p.goto(pathToFileURL(datei).href, { waitUntil: 'load' });
    await p.waitForTimeout(3000);
    const m = await p.evaluate(() => ({
      app: document.querySelectorAll('#app').length,
      hinweisKopie: [...document.querySelectorAll('#vd-gesicherte-kopie')].filter((x) => !x.hidden && x.offsetParent !== null).length,
      knoepfeSichtbar: [...document.querySelectorAll('button')].filter((x) => x.offsetParent !== null).length,
    }));
    return { ...m, seitenfehler: fehler, netzVersuche: netz.length };
  } finally { await b.close(); }
}

async function messen(name, adresse, ausgabe, pw) {
  const typ = pw[name];
  const aus = { browser: name };
  const b = await typ.launch(require('./lib/netz-sperre.js').mitSperre());
  try {
    const ctx = await b.newContext({ acceptDownloads: true });
    const page = await ctx.newPage();
    // Wie die E2E-Probe: der Speicherdialog beim Anlegen wird durch einen stummen Ersatz beantwortet.
    await page.addInitScript(() => {
      Object.defineProperty(window, 'showSaveFilePicker', { configurable: true,
        value: async () => ({ name: 'probe.vivodepot', createWritable: async () => ({ write: async () => {}, close: async () => {} }) }) });
    });
    await page.goto(adresse, { waitUntil: 'load' });
    aus.serviceWorker = await page.evaluate(() => Promise.race([
      navigator.serviceWorker ? navigator.serviceWorker.ready.then(() => true) : Promise.resolve(false),
      new Promise((r) => setTimeout(() => r(false), 20000))])).catch(() => false);
    if (aus.serviceWorker) { await page.reload({ waitUntil: 'load' }); aus.bedient = await page.evaluate(() => !!navigator.serviceWorker.controller); }
    // Der echte Weg wie in tests/e2e/anwendung-als-datei-immer-vom-dienst.spec.js: ein Probe-Depot im Browser dieses
    // Laufs anlegen (es bleibt im Wegwerf-Kontext), Einmal-Angebote ablehnen, Einstellungen öffnen.
    const h = require('../tests/e2e/helpers.js');
    await page.click('#w-anfangen');
    await page.waitForSelector('#app.an', { state: 'attached' });
    await page.waitForSelector(h.ANLEGE_WEG_KANON + ':visible', { state: 'attached' });
    await page.click(h.ANLEGE_WEG_KANON + ':visible');
    await page.waitForSelector('#id-pw', { state: 'visible' });
    await page.fill('#id-vorname', 'Marlies');
    await page.fill('#id-nachname', 'Sonnenschein');
    await page.fill('#id-pw', 'geraet-messung-2026');
    await page.fill('#id-pw2', 'geraet-messung-2026');
    await page.click('#m-ok');
    await page.waitForSelector('#tb-pw-hinweis', { state: 'hidden' });
    await h.einmalDialogeSchliessen(page);
    await page.click('#tb-einstellungen', { timeout: 15000 });
    await h.einstellungenAbschnittOeffnen(page, '#einst-anwendung-als-datei');
    const sichtbar = await page.waitForSelector('#einst-anwendung-als-datei', { state: 'visible', timeout: 15000 }).then(() => true, () => false);
    if (!sichtbar) { aus.online = { ok: false, grund: 'Eintrag „Anwendung als Datei“ in den Einstellungen nicht sichtbar' }; return aus; }
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('#einst-anwendung-als-datei')]);
    const ziel = path.join(ausgabe, name + '-' + dl.suggestedFilename());
    await dl.saveAs(ziel);
    const inhalt = fs.readFileSync(ziel);
    aus.online = { datei: ziel, name: dl.suggestedFilename(), bytes: inhalt.length, sha256: crypto.createHash('sha256').update(inhalt).digest('hex'), ...nameUrteil(dl.suggestedFilename(), inhalt) };
    await ctx.setOffline(true);
    await page.waitForTimeout(500);
    const lage = await page.evaluate(() => ({
      linkVerborgen: document.getElementById('einst-anwendung-als-datei').hidden,
      knopfSichtbar: !document.getElementById('einst-anwendung-als-datei-aus').hidden,
      knopfAus: document.getElementById('einst-anwendung-als-datei-aus').disabled,
    }));
    const falsch = await Promise.all([
      page.waitForEvent('download', { timeout: 4000 }).catch(() => null),
      page.click('#einst-anwendung-als-datei-aus', { force: true, timeout: 3000 }).catch(() => null),
    ]).then(([d]) => d);
    aus.offline = { ...lage, download: !!falsch, ok: lage.linkVerborgen && lage.knopfSichtbar && lage.knopfAus && !falsch };
    await ctx.setOffline(false);
  } catch (e) {
    aus.fehler = String(e && e.message || e).split('\n')[0];
  } finally { await b.close(); }
  if (aus.online && aus.online.datei) {
    const m = await dateiPruefen(typ, aus.online.datei);
    aus.dateiMessung = m;
    aus.dateiHeil = heil(m);
    const halb = aus.online.datei + '.halb.html';
    const buf = fs.readFileSync(aus.online.datei);
    fs.writeFileSync(halb, buf.subarray(0, buf.length >> 1));
    aus.rotBeweis = !heil(await dateiPruefen(typ, halb));
  }
  return aus;
}

async function main(argv = process.argv.slice(2)) {
  const a = argumente(argv);
  const pw = require('@playwright/test');
  const ausgabe = a.ausgabe || fs.mkdtempSync(path.join(os.tmpdir(), 'anwendung-als-datei-geraet-'));
  const wegwerfen = !a.ausgabe;
  fs.mkdirSync(ausgabe, { recursive: true });
  let srv = null;
  let adresse = a.adresse;
  if (!adresse) { srv = await fixtureDienst(); adresse = 'http://127.0.0.1:' + srv.address().port + '/vivodepot.html'; }
  try {
    const ergebnisse = [];
    for (const name of a.browser) {
      const e = await messen(name, adresse, ausgabe, pw);
      console.log(JSON.stringify(e));
      ergebnisse.push(e);
    }
    const s = schluss(ergebnisse);
    console.log('Adresse ' + adresse + (srv ? ' (Fixture aus dem Repo)' : '') + ' · Ausgabe ' + (wegwerfen ? 'verworfen (ohne --ausgabe)' : ausgabe));
    console.log(s.zeile);
    return s.ok ? 0 : 1;
  } finally {
    if (srv) srv.close();
    if (wegwerfen) fs.rmSync(ausgabe, { recursive: true, force: true });
  }
}

if (require.main === module) main().then((rc) => { process.exitCode = rc; }, (e) => { console.error(e); process.exitCode = 1; });

module.exports = { argumente, nameUrteil, heil, schluss, NAME_MUSTER };
