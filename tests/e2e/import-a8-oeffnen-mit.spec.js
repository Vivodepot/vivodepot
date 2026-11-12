'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   IMPORT A8 · eine Datei, die „Öffnen mit“ oder Ziehen bringt, wird genannt, nicht still übergangen (07.11.2026)
   ─────────────────────────────────────────────────────────────────────────────
   Befund IMPORT-VERWIRFT-OHNE-ANZEIGE, Teil A8. Zwei Wege belegen den Öffnen-Schirm mit einer Datei vor: das Ziehen auf den
   Schirm (drop-Listener in booteEingang) und „Öffnen mit“ der installierten Anwendung (launchQueue-Verbraucher). Der
   Drop-Weg prüfte die Endung und tat bei jeder anderen Endung nichts; der launchQueue-Weg endete bei einer Datei, die sich
   nicht lesen ließ, in einem leeren catch. In beiden Fällen sah die Person nichts.
   Gehalten wird an der echten Seite:
     - Ziehen einer Datei mit anderer Endung: eine Meldung nennt die Datei und den Grund; der Schirm bleibt, wie er war.
     - „Öffnen mit“ einer Datei, die sich nicht lesen lässt, und einer mit anderer Endung: dieselbe Meldung mit Grund.
     - Gegenprobe: eine .vivodepot-Datei belegt den Schirm vor, ohne Meldung.
     - Rot-Beweis: derselbe Ablauf gegen die Seite mit dem alten Weg zeigt keine Meldung.
   Das Ergebnis mit Grund selbst hält tests/import-anzeige-modell-klasse.test.js (echte Zeilen für datei-oeffnen-mit). */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { oeffneApp } = require('./helpers');
const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup.js');

const MELDUNG = '#toast-host .toast';

async function ziehen(page, name) {
  await page.evaluate((n) => {
    const dt = new DataTransfer();
    dt.items.add(new File(['zz-probe'], n, { type: 'application/octet-stream' }));
    document.getElementById('overlay').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  }, name);
}

async function launchAttrappe(page) {
  await page.addInitScript(() => {
    const fang = (fn) => { window.__launchConsumer = fn; };
    if (window.LaunchQueue && window.LaunchQueue.prototype) window.LaunchQueue.prototype.setConsumer = fang;
    else Object.defineProperty(window, 'launchQueue', { value: { setConsumer: fang }, configurable: true });
  });
}
async function uebergeben(page, { name, lesbar }) {
  await page.waitForFunction(() => typeof window.__launchConsumer === 'function');
  await page.evaluate(({ n, l }) => window.__launchConsumer({
    files: [{ name: n, getFile: async () => { if (!l) throw new DOMException('zz-probe nicht lesbar', 'NotReadableError'); return new File(['{}'], n); } }],
  }), { n: name, l: lesbar });
}

test('[A8·Ziehen] eine Datei mit anderer Endung wird mit Namen und Grund genannt, der Schirm bleibt', async ({ page }) => {
  await oeffneApp(page);
  await ziehen(page, 'zz-probe-foto.jpg');
  const m = page.locator(MELDUNG, { hasText: 'zz-probe-foto.jpg' });
  await expect(m).toBeVisible({ timeout: 5000 });
  await expect(m).toContainText('keine Depot-Datei');
  await expect(page.locator('#co-pw')).toHaveCount(0);
});

test('[A8·Ziehen·Gegenprobe] eine .vivodepot-Datei belegt den Öffnen-Schirm vor, ohne Meldung', async ({ page }) => {
  await oeffneApp(page);
  await ziehen(page, 'zz-probe-depot.vivodepot');
  await expect(page.locator('.crypto-datei-name')).toContainText('zz-probe-depot.vivodepot');
  await expect(page.locator(MELDUNG, { hasText: 'zz-probe-depot.vivodepot' })).toHaveCount(0);
});

test('[A8·Öffnen mit] eine Datei, die sich nicht lesen lässt, wird mit Namen und Grund genannt', async ({ page }) => {
  await launchAttrappe(page);
  await oeffneApp(page);
  await uebergeben(page, { name: 'zz-probe-gesperrt.vivodepot', lesbar: false });
  const m = page.locator(MELDUNG, { hasText: 'zz-probe-gesperrt.vivodepot' });
  await expect(m).toBeVisible({ timeout: 5000 });
  await expect(m).toContainText('ließ sich nicht lesen');
  await expect(page.locator('#co-pw')).toHaveCount(0);
});

test('[A8·Öffnen mit] eine Datei mit anderer Endung wird genannt, statt den Schirm vorzubelegen', async ({ page }) => {
  await launchAttrappe(page);
  await oeffneApp(page);
  await uebergeben(page, { name: 'zz-probe-brief.pdf', lesbar: true });
  await expect(page.locator(MELDUNG, { hasText: 'zz-probe-brief.pdf' })).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#co-pw')).toHaveCount(0);
});

/* Rot-Beweis: die Seite mit dem alten Weg. Die Ersetzung ändert ein Inline-Skript; bypassCSP lässt es laufen. */
test.describe('[A8·Rot-Beweis]', () => {
  test.use({ bypassCSP: true });
  const ALT_DROP = [
    "          if (!f) return;\n"
    + "          const zeigen = () => renderCryptoOverlay(f);\n"
    + "          // A8: eine Datei mit anderer Endung wird genannt, nicht still übergangen.\n"
    + "          dateiOeffnenMitUebergeben(dateiOeffnenMitPruefen(f), zeigen);",
    "          if (f && /\\.(vivodepot|json)$/i.test(f.name || '')) renderCryptoOverlay(f);",
  ];
  const ALT_LESEN = [
    "        try { file = await handle.getFile(); } catch (e) {\n"
    + "          try { dateiOeffnenMitUebergeben(dateiOeffnenMitPruefen(handle, e || true), () => {}); } catch (_) {}\n"
    + "          return;\n"
    + "        }",
    "        try { file = await handle.getFile(); } catch (_) { return; }",
  ];
  function alteSeite() {
    const produkt = fs.readFileSync(GEBACKENE_PRODUKT_PFADE['privat-de'], 'utf8');
    for (const [neu] of [ALT_DROP, ALT_LESEN]) expect(produkt.split(neu).length, 'Anker trifft genau einmal').toBe(2);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'import-a8-rot-'));
    const ziel = path.join(tmp, 'vivodepot.html');
    fs.writeFileSync(ziel, produkt.replace(ALT_DROP[0], ALT_DROP[1]).replace(ALT_LESEN[0], ALT_LESEN[1]));
    return { url: 'file://' + ziel, tmp };
  }

  test('mit dem alten Drop-Weg bleibt eine Datei mit anderer Endung ohne Meldung', async ({ page }) => {
    const { url, tmp } = alteSeite();
    try {
      await oeffneApp(page, { url });
      await ziehen(page, 'zz-probe-foto.jpg');
      await page.waitForTimeout(1500);
      await expect(page.locator(MELDUNG, { hasText: 'zz-probe-foto.jpg' })).toHaveCount(0);
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  });

  test('mit dem alten launchQueue-Weg bleibt eine unlesbare Datei ohne Meldung', async ({ page }) => {
    const { url, tmp } = alteSeite();
    try {
      await launchAttrappe(page);
      await oeffneApp(page, { url });
      await uebergeben(page, { name: 'zz-probe-gesperrt.vivodepot', lesbar: false });
      await page.waitForTimeout(1500);
      await expect(page.locator(MELDUNG, { hasText: 'zz-probe-gesperrt.vivodepot' })).toHaveCount(0);
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  });
});
