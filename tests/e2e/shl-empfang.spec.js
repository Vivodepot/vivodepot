'use strict';
/* SHL-Empfang im Kern, im Browser (02.11.2026, Nachtrag zu U2-ADR-183)
   ────────────────────────────────────────────────────────────────────────────
   Der Kern liegt wie ausgeliefert unter file://. Die Abhol-Seite (share/) und der Abruf-Endpunkt der Ablage werden über
   route() unter https://share.vivodepot.de aus dem Arbeitsbaum ausgeliefert; nichts geht ins Netz.
   Gehalten wird:
   - Link einfügen, prüfen, abholen: die Abhol-Seite öffnet sich, zeigt den Host und holt erst nach dem Klick;
   - die verschlüsselte Datei geht an den Kern zurück, der Kern entschlüsselt und legt das Original in der Mappe ab;
   - (Host und Tag am Eintrag, kein Schlüssel und keine Adresse im Depot: tests/shl-empfang-kern.test.js [SHL-Empfang·Depot]);
   - der Kern selbst stellt keine einzige Anfrage ins Netz, und keine Anfrage der Abhol-Seite trägt den Schlüssel.
   Konfiguration: playwright.config.js (Chromium), damit die Spec auch auf dem eigenen Runner läuft. */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto } = require('node:crypto');
const { oeffneApp, depotAnlegen, einmalDialogeSchliessen, inLeisteKlicken } = require('./helpers');

const WURZEL = path.join(__dirname, '..', '..');
const HOST = 'https://share.vivodepot.de';
const ABLAGE = HOST + '/holen.php?t=' + 'b'.repeat(48);
const FIXTURE = path.join(WURZEL, 'tests', 'fixtures', 'eigenprobe-eu-lab.json');
const TYPEN = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

async function jweBauen(text, key) {
  const h = Buffer.from(JSON.stringify({ alg: 'dir', enc: 'A256GCM', cty: 'application/fhir+json' })).toString('base64url');
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const k = await webcrypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['encrypt']);
  const roh = new Uint8Array(await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(h), tagLength: 128 }, k, new TextEncoder().encode(text)));
  const b = (u) => Buffer.from(u).toString('base64url');
  return [h, '', b(iv), b(roh.slice(0, -16)), b(roh.slice(-16))].join('.');
}

test('[SHL-Empfang·Browser] Link im Kern einlesen: die Abhol-Seite holt nur das Chiffrat, der Kern legt das Original ab', async ({ page, context }) => {
  const key = webcrypto.getRandomValues(new Uint8Array(32));
  const keyB64u = Buffer.from(key).toString('base64url');
  const jwe = await jweBauen(fs.readFileSync(FIXTURE, 'utf8'), key);
  const anfragen = [];
  let abrufe = 0;
  await context.route(HOST + '/**', async (route) => {
    const r = route.request();
    anfragen.push({ url: r.url(), daten: r.postData() || '' });
    const u = new URL(r.url());
    if (u.pathname === '/holen.php') { abrufe += 1; return route.fulfill({ status: 200, contentType: 'application/jose', body: jwe }); }
    const datei = path.join(WURZEL, 'share', path.basename(u.pathname));
    if (!fs.existsSync(datei)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: TYPEN[path.extname(datei)] || 'application/octet-stream', body: fs.readFileSync(datei) });
  });
  const kernNetz = [];
  page.on('request', (r) => { if (!/^(file|data|blob|about):/.test(r.url())) kernNetz.push(r.url()); });

  await oeffneApp(page);
  await depotAnlegen(page);
  await einmalDialogeSchliessen(page);
  const link = 'shlink:/' + Buffer.from(JSON.stringify({ url: ABLAGE, key: keyB64u, flag: 'U', label: 'Laborbefund' })).toString('base64url');
  await inLeisteKlicken(page, '[data-einlesen-zentral]');
  await page.click('[data-iz-shl-empfangen]');
  await page.fill('#shl-empfang-link', link);
  await page.click('#m-ok');
  await expect(page.locator('#shl-empfang-befund')).toContainText('share.vivodepot.de');
  const [abholen] = await Promise.all([page.waitForEvent('popup'), page.click('#m-ok')]);
  await expect(abholen.locator('#auftrag')).toBeVisible();
  await expect(abholen.locator('#auftrag-liste')).toContainText('share.vivodepot.de');
  expect(abrufe, 'vor dem Klick holt die Abhol-Seite nichts').toBe(0);
  await abholen.click('#auftrag-knopf');
  // Abgelegt: der Kern öffnet die Mappe, das Original steht darin (Beschriftung des erkannten Typs).
  await expect(page.locator('[data-mappe-id]').first()).toBeVisible({ timeout: 20000 });
  expect(abrufe).toBe(1);
  // Schlüssel und Adresse im Depot hält tests/shl-empfang-kern.test.js [SHL-Empfang·Depot]; hier zählt der Weg im Browser.
  expect(kernNetz, 'der Kern stellt keine Anfrage ins Netz').toEqual([]);
  for (const a of anfragen) expect(a.url + a.daten, 'keine Anfrage trägt den Schlüssel').not.toContain(keyB64u);
});
