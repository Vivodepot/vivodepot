'use strict';
/* ═════════════════════════════════════════════════════════════════
   ANFRAGE-KAMERA (22.11.2026, U2-ADR-460 Nachtrag) — die Hauptanwendung liest den QR einer Anfrage mit der Kamera
   ─────────────────────────────────────────────────────────────────
   Die Anfrage entsteht mit den Funktionen des Studios (baueAnfrageSigniert, anfrageKompakt, der QR-Block des Studios), der
   QR wird als Bild in die Fake-Kamera von Chromium gelegt (--use-file-for-fake-video-capture), und die Anwendung öffnet die
   Anfrage über „Mit Kamera lesen“.

   Was die Probe ersetzt, gehört gesagt: Chromium ohne Oberfläche hat keinen eingebauten QR-Leser (BarcodeDetector). Die
   Probe setzt an seine Stelle denselben Vertrag (detect(video) → [{ rawValue }]) mit jsQR (devDependency, nur Tests), der
   das Kamerabild wirklich liest. Kamera, Bildstrom, Dialog und Lesen der Anwendung sind echt; ersetzt ist nur der Decoder.
   ═════════════════════════════════════════════════════════════════ */
const { test, expect, chromium } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { mitSperre } = require('../../tools/lib/netz-sperre.js');
const { oeffneApp, depotAnlegen, inLeisteKlicken } = require('./helpers');
const { ladeGenerator, GEN_PATH } = require('../load-generator.js');

/* Eine Anfrage, wie das Studio sie baut: signiert, kompakt, als Link mit #anfrage=. */
async function anfrageAusDemStudio() {
  const g = ladeGenerator();
  const html = fs.readFileSync(GEN_PATH, 'utf8');
  const a = html.indexOf('<script id="qrcode_VivodepotInline">');
  if (a < 0) throw new Error('QR-Skript im Studio nicht gefunden');
  const anfang = html.indexOf('>', a) + 1;
  if (anfang <= 0) throw new Error('Kopf des QR-Skripts im Studio nicht gefunden');
  const ende = html.indexOf('</script>', a);
  if (ende < 0) throw new Error('Ende des QR-Skripts im Studio nicht gefunden');
  vm.runInContext(html.slice(anfang, ende), g.sandbox);
  const kp = await webcrypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  const priv = await webcrypto.subtle.exportKey('jwk', kp.privateKey);
  const st = {
    anbieter: { anbieterId: 'heim/beispielpark', anbieterName: 'Pflegeheim am Beispielpark' },
    publicKeyJwk: pub,
    anfrage: {
      zweck: 'Aufnahme in die vollstationäre Pflege', grundlage: 'Heimvertrag und Pflegeplanung', vorgang: 'BSP-2026-0003',
      gueltigBis: '2099-12-31', antwortArt: 'einmalpasswort', antwortAn: 'aufnahme@example.de',
      felder: [
        { kennung: 'identity.givenName', zweck: 'Anrede im Aufnahmebogen', pflicht: true },
        { kennung: 'identity.familyName', zweck: 'Anrede im Aufnahmebogen', pflicht: true },
      ],
    },
  };
  const umschlag = await g.V.baueAnfrageSigniert(st, priv);
  const kompakt = await g.V.anfrageKompakt(umschlag);
  if (!kompakt) throw new Error('das Studio lieferte keine kompakte Form');
  const link = 'https://privat-de.vivodepot.org/#anfrage=' + kompakt;
  const q = g.sandbox.qrcode(0, 'M');
  q.addData(link);
  q.make();
  return { link, q };
}

/* Der QR als Y4M-Bild (Graustufe in Y, U/V neutral), wie Chromiums Fake-Kamera es abspielt. */
function y4mSchreiben(q, datei) {
  const W = 640, H = 480, rand = 4;
  const n = q.getModuleCount();
  const px = Math.floor(Math.min(W, H) / (n + 2 * rand));
  const x0 = Math.floor((W - n * px) / 2), y0 = Math.floor((H - n * px) / 2);
  const y = Buffer.alloc(W * H, 235);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!q.isDark(r, c)) continue;
    for (let dy = 0; dy < px; dy++) y.fill(16, (y0 + r * px + dy) * W + x0 + c * px, (y0 + r * px + dy) * W + x0 + (c + 1) * px);
  }
  const uv = Buffer.alloc((W / 2) * (H / 2) * 2, 128);
  const rahmen = Buffer.concat([Buffer.from('FRAME\n'), y, uv]);
  fs.writeFileSync(datei, Buffer.concat([Buffer.from('YUV4MPEG2 W' + W + ' H' + H + ' F10:1 Ip A1:1 C420jpeg\n'), rahmen, rahmen]));
}

/* Derselbe Vertrag wie BarcodeDetector, gelesen mit jsQR; dazu eine Liste der geöffneten Kamera-Spuren für die Probe „zu“. */
const LESER = fs.readFileSync(require.resolve('jsqr/dist/jsQR.js'), 'utf8') + `
;(function () {
  window.__kameraSpuren = [];
  const roh = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (c) => { const s = await roh(c); window.__kameraSpuren.push(...s.getTracks()); return s; };
  window.BarcodeDetector = class {
    static async getSupportedFormats() { return ['qr_code']; }
    async detect(quelle) {
      const w = quelle.videoWidth, h = quelle.videoHeight;
      if (!w || !h) return [];
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d'); x.drawImage(quelle, 0, 0);
      const r = jsQR(x.getImageData(0, 0, w, h).data, w, h);
      return r ? [{ rawValue: r.data, format: 'qr_code' }] : [];
    }
  };
})();`;

test('[Anfrage·Kamera] die Fake-Kamera liest den QR einer Anfrage, die Anfrage öffnet', async () => {
  test.setTimeout(120000);
  const { q } = await anfrageAusDemStudio();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anfrage-kamera-'));
  const bild = path.join(tmp, 'anfrage-qr.y4m');
  y4mSchreiben(q, bild);
  const browser = await chromium.launch(mitSperre({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=' + bild] }));
  try {
    const kontext = await browser.newContext();
    await kontext.addInitScript(LESER);
    const page = await kontext.newPage();
    await oeffneApp(page);
    await depotAnlegen(page);
    await inLeisteKlicken(page, '[data-uebergabe-protokoll]');
    await page.click('#anfrage-empfangen');
    await expect(page.locator('#anfrage-kamera-start')).toBeVisible();
    expect(await page.evaluate(() => window.__kameraSpuren.length), 'die Kamera öffnet nicht schon mit dem Dialog').toBe(0);
    await page.click('#anfrage-kamera-start');
    await page.waitForSelector('#anfrage-kopf', { state: 'visible', timeout: 30000 });
    await expect(page.locator('#anfrage-kopf')).toContainText('Pflegeheim am Beispielpark');
    const spuren = await page.evaluate(() => window.__kameraSpuren.map((t) => t.readyState));
    expect(spuren.length, 'die Kamera war offen').toBeGreaterThan(0);
    expect(spuren.every((s) => s === 'ended'), 'und ist nach dem Fund zu: ' + spuren.join(',')).toBe(true);
  } finally {
    await browser.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('[Anfrage·Kamera] ohne Browser-Leser kein Knopf, der Satz nennt den Einfüge-Weg', async ({ page }) => {
  // Wie Safari oder Firefox: kein BarcodeDetector (ein Chromium mit eingebautem Leser würde sonst den Knopf zeigen).
  await page.addInitScript(() => { try { delete window.BarcodeDetector; } catch (e) { /* nichts */ } window.BarcodeDetector = undefined; });
  await oeffneApp(page);
  await depotAnlegen(page);
  await inLeisteKlicken(page, '[data-uebergabe-protokoll]');
  await page.click('#anfrage-empfangen');
  await expect(page.locator('#anfrage-text')).toBeVisible();
  await expect(page.locator('#anfrage-kamera-start')).toHaveCount(0);
  await expect(page.locator('#anfrage-kamera-meldung')).toBeVisible();
});
