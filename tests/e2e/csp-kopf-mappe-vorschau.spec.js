'use strict';
/* ════════════════════════════════════════════════════════════════════════
   CSP als HTTP-Kopf auf den gehosteten Produkten — bricht er die Mappen-Vorschau? (10.10.2026, neu gefasst 17.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Anlass: externe Sicherheitsprüfung zu v922. Die gehosteten Produkte (privat-*) sollen die CSP zusätzlich als echten
   HTTP-Kopf bekommen, mit frame-ancestors (im Meta-CSP wirkt die Direktive nicht). Die erste Fassung (10.10.) maß gegen
   den Rahmen der PDF-Vorschau (<iframe class="mappe-vorschau-pdf">, blob:). Den Rahmen gibt es seit 15.10.2026 nicht mehr
   (Befund PDF-VORSCHAU-VON-CSP-BLOCKIERT, tests/e2e/pdf-vorschau-rahmen.spec.js): die Vorschau nennt Name und Größe und
   bietet das Herunterladen an. Seit U2-ADR-470 (17.10.2026) trägt der Kopf außerdem die Hashes und Trusted Types.

   Gemessen wird gegen einen lokalen Server, der das gebackene Produkt mit genau dem Kopf ausliefert, den das Gateway
   setzen soll: der Inhalt der Meta-CSP der Datei, frame-ancestors durch die Variante ersetzt. Je Browser (Chromium,
   WebKit, Firefox) und Variante wird der Zustand der Vorschau mit dem Zustand OHNE Kopf verglichen — derselbe Ablauf,
   dieselbe Datei: ob ein Rahmen entsteht, ob die Vorschau Name und Herunterladen zeigt, und welche Verstöße die Richtlinie
   meldet (securitypolicyviolation). Ein Unterschied zum Stand ohne Kopf ist rot, ebenso jeder Verstoß.

   Rot-Beweis, dass der Kopf überhaupt wirkt: ein FREMDER Ursprung rahmt die App. Ohne Kopf greift der Rahmen-Schutz der
   Seite (er leitet das umgebende Fenster um); mit Kopf lädt der Browser die App im Rahmen gar nicht, das umgebende
   Fenster bleibt stehen.
   ════════════════════════════════════════════════════════════════════════ */
const http = require('node:http');
const fs = require('node:fs');
const { test, expect, chromium, firefox, webkit } = require('@playwright/test');
const { oeffneApp, depotAnlegen, inLeisteKlicken } = require('./helpers');
const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup.js');

const BROWSER = { chromium, webkit, firefox };
const META = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/;

// Der Kopf, wie das Gateway ihn setzen soll: Meta-CSP der Datei, frame-ancestors auf die Variante.
function kopfAus(html, variante) {
  const m = META.exec(html);
  if (!m) throw new Error('gebackenes Produkt ohne Meta-CSP');
  const teile = m[1].split(';').map((t) => t.trim()).filter((t) => t && !/^frame-ancestors(\s|$)/.test(t));
  return [...teile, 'frame-ancestors ' + variante].join('; ');
}

function server(html, kopf) {
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      const pfad = req.url.split('?')[0];
      if (pfad !== '/' && pfad !== '/vivodepot.html') { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...(kopf ? { 'Content-Security-Policy': kopf } : {}) });
      res.end(html);
    });
    srv.listen(0, '127.0.0.1', () => ok(srv));
  });
}

async function vorschauZustand(browserTyp, url) {
  const browser = await browserTyp.launch();
  try {
    const page = await (await browser.newContext({ acceptDownloads: true })).newPage();
    await page.addInitScript(() => {
      window.__verstoesse = [];
      document.addEventListener('securitypolicyviolation', (e) => window.__verstoesse.push(e.violatedDirective + ' ' + e.blockedURI));
    });
    await oeffneApp(page, { url });
    await depotAnlegen(page);
    await inLeisteKlicken(page, '[data-mappe]');
    await page.waitForSelector('#mappe-add', { state: 'visible' });
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#mappe-add')]);
    await chooser.setFiles({ name: 'probe.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 CSP-Kopf-Probe', 'utf8') });
    await page.locator('#mappe-besch').waitFor({ state: 'visible' });
    await page.fill('#mappe-besch', 'Probe');
    await page.click('#m-ok');
    await page.click('[data-mappe-id]');
    await page.waitForTimeout(1000);
    return {
      rahmen: await page.locator('iframe').count(),
      name: (await page.locator('.mappe-vorschau-datei').textContent() || '').includes('probe.pdf'),
      herunterladen: await page.locator('[data-mappe-herunterladen]').isVisible(),
      verstoesse: await page.evaluate(() => window.__verstoesse),
    };
  } finally {
    await browser.close();
  }
}

const html = () => fs.readFileSync(GEBACKENE_PRODUKT_PFADE['privat-de'], 'utf8');

for (const [name, typ] of Object.entries(BROWSER)) {
  for (const variante of ["'none'", "'self'"]) {
    test(`[CSP-Kopf·Mappe] ${name}, frame-ancestors ${variante}: die Vorschau verhält sich wie ohne Kopf, die Richtlinie meldet nichts`, async () => {
      test.setTimeout(180000);
      const datei = html();
      expect(META.exec(datei)[1], 'Vorbedingung: das Produkt trägt die Hashes (U2-ADR-470)').not.toMatch(/script-src[^;]*'unsafe-inline'/);
      const ohne = await server(datei, null);
      const mit = await server(datei, kopfAus(datei, variante));
      try {
        const basis = await vorschauZustand(typ, 'http://127.0.0.1:' + ohne.address().port + '/vivodepot.html');
        const probe = await vorschauZustand(typ, 'http://127.0.0.1:' + mit.address().port + '/vivodepot.html');
        test.info().annotations.push({ type: 'messung', description: name + ' ' + variante + ' basis=' + JSON.stringify(basis) + ' mit=' + JSON.stringify(probe) });
        expect(basis, 'ohne Kopf: kein Rahmen, Name und Herunterladen, kein Verstoß').toEqual({ rahmen: 0, name: true, herunterladen: true, verstoesse: [] });
        expect(probe).toEqual(basis);
      } finally {
        ohne.close(); mit.close();
      }
    });
  }

  test(`[CSP-Kopf·Rot-Beweis] ${name}: ein fremder Ursprung rahmt die App — mit Kopf lädt sie im Rahmen nicht`, async () => {
    test.setTimeout(120000);
    const datei = html();
    const ergebnis = {};
    for (const [fall, kopf] of [['ohne', null], ['mit', kopfAus(datei, "'self'")]]) {
      const app = await server(datei, kopf);
      const appUrl = 'http://127.0.0.1:' + app.address().port + '/vivodepot.html';
      // Fremder Ursprung: localhost statt 127.0.0.1, eigener Port.
      const aussen = http.createServer((_q, r) => { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end('<!doctype html><title>aussen</title><iframe src="' + appUrl + '"></iframe>'); });
      await new Promise((ok) => aussen.listen(0, '127.0.0.1', ok));
      const browser = await typ.launch();
      try {
        const page = await browser.newPage();
        const aussenUrl = 'http://localhost:' + aussen.address().port + '/';
        await page.goto(aussenUrl);
        await page.waitForTimeout(3000);
        /* Gemessen wird der Rahmen, nicht das oberste Fenster: eine Umleitung des umgebenden Fensters aus einem fremden
           Rahmen blocken die Engines ohne Nutzergeste (gemessen 19.10.2026: ohne Kopf blieb es in allen drei stehen). */
        const rahmen = page.frames().find((f) => f !== page.mainFrame());
        // Eigene Frist: in Firefox antwortet ein vom Kopf blockierter Rahmen nie — ohne Antwort gilt die App als nicht geladen.
        const geladen = rahmen ? await Promise.race([
          rahmen.evaluate((u) => location.href === u && document.scripts.length > 0, appUrl).catch(() => false),
          new Promise((ok) => setTimeout(() => ok(false), 5000)),
        ]) : false;
        ergebnis[fall] = geladen ? 'im-rahmen-geladen' : 'nicht-geladen';
      } finally {
        await browser.close(); app.close(); aussen.close();
      }
    }
    test.info().annotations.push({ type: 'messung', description: name + ' ' + JSON.stringify(ergebnis) });
    expect(ergebnis.ohne, 'ohne Kopf lädt die App im fremden Rahmen — die Meta-CSP kann frame-ancestors nicht').toBe('im-rahmen-geladen');
    expect(ergebnis.mit, 'mit Kopf lädt der Browser die App im fremden Rahmen nicht').toBe('nicht-geladen');
  });
}
