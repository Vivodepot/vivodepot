'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   rahmen-schutz-ohne-header.test.js — der Rahmen-Schutz wirkt WIRKLICH, nicht
   nur im Konsolenbild („frame-ancestors wirkt nicht",
   18.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   ANLASS: `frame-ancestors 'none'` in der Meta-CSP von vivodepot.html/
   vivodepot-lesen.html wirkt laut Spezifikation NUR als echter HTTP-Header —
   ein <meta>-CSP liefert ihn nicht, kein heutiger Ausliefer-Weg (file://,
   GitHub-Pages-Hosting ohne eigene Response-Header) könnte ihn je durchsetzen
   (s. Kommentar an der CSP-Zeile in beiden Dateien, tests/d43-etappe6-csp.test.js).
   Der Schutz, den die Direktive verspricht, existierte darum bisher nur auf dem
   Papier — ~20 E2E-Spezifikationen filterten die zugehörige Konsolen-Meldung
   sogar schon als „bekannt, folgenlos" heraus, was zeigt, dass das Team die
   Lücke kannte, ohne sie zu schließen.

   DIESE PROBE MISST DEN ECHTEN SCHUTZ, DER DIE LÜCKE SCHLIESST, AN BEIDEN
   TRÄGERN (Kern + Lese-App): ein `body{display:none}` + `self===top`-Skript
   direkt im <head>, ohne jeden HTTP-Header. Drei echte Rahmen-Szenarien, ein
   echter Browser, je Träger:

     1. UNGERAHMT (der Regelfall — file:// wie die gehostete Fassung laufen
        immer als eigenes, oberstes Fenster): der Inhalt wird sichtbar.
     2. GERAHMT, OHNE SANDBOX-BESCHRÄNKUNG: das Herausbrechen gelingt — das
        umgebende (Rahmen-)Fenster navigiert auf die Datei, verlässt also den
        Rahmen. Rot-Beweis in derselben Bewegung: bliebe die Navigation aus,
        sähe man es hier, nicht erst am echten Angriff.
     3. GERAHMT, UND DER RAHMEN VERHINDERT DIE UMLEITUNG (`sandbox="allow-
        scripts"` ohne `allow-top-navigation` — genau das Werkzeug eines
        Angreifers, der das Herausbrechen selbst blockieren will): die
        Umleitung scheitert am Sandbox, der `try/catch` fängt es auf, und der
        Inhalt bleibt über die CSS-Regel verborgen — DAS ist der Fall, an dem
        sich zeigt, ob der Schutz mehr ist als eine Höflichkeitsanfrage. Real
        gegengeprüft (Bericht, nicht hier wiederholt): die CSS-Zeile probehalber
        entfernt, genau diese Probe schlug an, `block` statt `none`.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');

const REPO = path.join(__dirname, '..', '..');
const TRAEGER = [
  { name: 'Kern (vivodepot.html)', pfad: path.join(REPO, 'vivodepot.html') },
  { name: 'Lese-App (vivodepot-lesen.html)', pfad: path.join(REPO, 'vivodepot-lesen.html') },
];

/* Baut eine Wegwerf-Wrapper-Datei, die den Träger in einem <iframe> einbettet — der
   Rahmen, den ein Angreifer bauen würde. `sandboxAttr` leer = kein Sandbox (die
   Umleitung darf gelingen); gesetzt = genau die Beschränkung, die die Umleitung
   verhindert, ohne die Skript-Ausführung selbst zu verhindern. */
function wrapperSchreiben(traegerUrl, sandboxAttr) {
  const ziel = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rahmen-schutz-')), 'rahmen.html');
  const sandbox = sandboxAttr ? ` sandbox="${sandboxAttr}"` : '';
  fs.writeFileSync(ziel, `<!DOCTYPE html><html><body>
    <iframe id="opfer" src="${traegerUrl}"${sandbox}></iframe>
  </body></html>`, 'utf8');
  return ziel;
}

for (const { name, pfad } of TRAEGER) {
  const traegerUrl = pathToFileURL(pfad).href;

  describe(`[Rahmen-Schutz] ${name}`, () => {
    test('ungerahmt (Regelfall): der Inhalt wird sichtbar', async () => {
      const browser = await chromium.launch();
      try {
        const page = await browser.newPage();
        await page.goto(traegerUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });
        await page.waitForFunction(
          () => getComputedStyle(document.body).display !== 'none',
          null, { timeout: 5_000 });
        const display = await page.evaluate(() => getComputedStyle(document.body).display);
        assert.notEqual(display, 'none', 'ungerahmt geladen, der Inhalt muss sichtbar werden');
      } finally { await browser.close(); }
    });

    test('Rot-Beweis: gerahmt, Umleitung gelingt — das Rahmen-Fenster verlässt den Rahmen', async () => {
      const browser = await chromium.launch();
      try {
        const wrapperPfad = wrapperSchreiben(traegerUrl, null);
        const page = await browser.newPage();
        await page.goto(pathToFileURL(wrapperPfad).href, { waitUntil: 'domcontentloaded', timeout: 15_000 });
        // Die Umleitung setzt `top.location` — das TOP-Fenster (dieselbe `page`) navigiert weg
        // vom Wrapper, direkt auf den Träger. Kein Sandbox verhindert es hier.
        await page.waitForURL(traegerUrl, { timeout: 10_000 });
        assert.equal(page.url(), traegerUrl, 'das Rahmen-Fenster muss den Träger direkt geladen haben, nicht mehr im Rahmen');
      } finally { await browser.close(); }
    });

    test('schärfste Probe: gerahmt, Sandbox verhindert die Umleitung — der Inhalt bleibt verborgen', async () => {
      const browser = await chromium.launch();
      try {
        // allow-scripts OHNE allow-top-navigation: das Skript im Rahmen-Inhalt läuft,
        // `top.location` SETZEN wird vom Browser verweigert — genau das Werkzeug eines
        // Angreifers, der das Herausbrechen selbst unterbinden will, ohne die Sichtbarkeits-
        // Logik zu kennen.
        const wrapperPfad = wrapperSchreiben(traegerUrl, 'allow-scripts');
        const page = await browser.newPage();
        await page.goto(pathToFileURL(wrapperPfad).href, { waitUntil: 'domcontentloaded', timeout: 15_000 });
        const frame = page.frameLocator('#opfer');
        // Kurz warten, ob sich doch etwas zeigt — ein Fehlschlag hier wäre der eigentliche Fund.
        await page.waitForTimeout(1_500);
        const display = await frame.locator('body').evaluate(() => getComputedStyle(document.body).display);
        assert.equal(display, 'none',
          'der Inhalt darf sichtbar NIE werden, solange die Seite in einem Rahmen sitzt, aus dem sie nicht herauskommt');
        assert.equal(page.url(), pathToFileURL(wrapperPfad).href,
          'das Rahmen-Fenster selbst darf nicht navigiert sein — die Sandbox muss die Umleitung wirklich verhindert haben');
      } finally { await browser.close(); }
    });
  });
}
