/* ════════════════════════════════════════════════════════════════════════
   krypto-browser-sitzung.mjs — die Browser-Sitzung, herausgelöst (G1, 31.07.2026)
   ────────────────────────────────────────────────────────────────────────
   EIN Grund: `krypto-vektoren.mjs` registriert bei `import` seine `describe`/
   `test`-Blöcke sofort zur Ausführung (node:test) — ein Import allein löst
   also den vollen Playwright-Lauf aus. Die Probe für `W-krypto-vektoren`
   (tools/waechter-register.js) braucht aber nur `neueBrowserSitzung`, nicht
   die Testregistrierung. Diese Datei trägt NUR den wiederverwendbaren Teil;
   `krypto-vektoren.mjs` importiert von hier, die Probe auch — eine Quelle,
   kein Duplikat.
   ════════════════════════════════════════════════════════════════════════ */
import { chromium } from 'playwright';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/* A6/G1 (29.07.2026): der gemessene Gegenstand ist UMLENKBAR — dieselbe
   Umgebungsvariable, die `tests/load-kern.js` schon kennt. */
const HTML_PFAD = process.env.KERN_HTML_PATH
  ? resolve(process.env.KERN_HTML_PATH)
  : join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'vivodepot.html');
const FILE_URL = pathToFileURL(HTML_PFAD).href;

/* G1 (31.07.2026): der Ansatzpunkt fuer eine Probe dieses Waechters — sein
   Messgegenstand ist die WebCrypto DES BROWSERS, nicht `vivodepot.html`
   (Register-Befund 29.07., s. `tools/waechter-register.js`). `KERN_HTML_PATH`
   erreicht ihn darum nicht; eine Verletzung muss `crypto.subtle` im
   SEITENKONTEXT selbst verbiegen. `verbogen` tut genau das, additiv:
   OHNE das Argument ist dieser Export byte-fuer-byte dasselbe Verhalten wie
   vorher — jeder bestehende Aufruf in `krypto-vektoren.mjs` bleibt
   unveraendert. */
export async function neueBrowserSitzung({ verbogen } = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  if (verbogen) {
    // Bricht `importKey` fuer JEDEN Vektor-Typ gleichermassen — kein gezielter
    // Bruch nur einer Vektor-Klasse, sondern die Zusage selbst: „die WebCrypto
    // DIESES Browsers erfuellt die Referenzvektoren" gilt nicht mehr.
    await context.addInitScript(() => {
      window.crypto.subtle.importKey = async () => {
        throw new Error('GEPFLANZT: crypto.subtle im Seitenkontext verbogen');
      };
    });
  }
  const page = await context.newPage();
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  /* Fund 18.09.2026, Krypto-Kapselung Weg A: wartete bis heute auf `setupMasterSession` als
     script-globale Funktion — setupMasterSession liegt seit der Kapselung closure-privat in
     VdCrypto (einziger Schreiber des lebenden Sitzungsschlüssels), genau wie sessionHkdfKey
     selbst. Die Bedingung wurde darum NIE mehr wahr, jeder Aufrufer dieser Funktion (u. a.
     tools/iv-laenge-messen.js, tests/konformitaet/krypto-vektoren.mjs) hing bis zum Timeout.
     `VdCrypto.setupSession` ist der vorgesehene, unveraendert erreichbare Ersatz — kein neuer
     Zugriff, nur die vorhandene Huelle statt des eingekapselten Namens. `_deriveHkdfRaw` bleibt
     bewusst global (reine Ableitungsvorschrift, kein Geheimnis, s. Kopf-Kommentar an ihrer
     Definition) und ist von der Kapselung unberuehrt. */
  await page.waitForFunction(
    () => typeof VdCrypto !== 'undefined' && typeof VdCrypto.setupSession === 'function'
      && typeof _deriveHkdfRaw === 'function',
    null, { timeout: 10_000 }
  );
  return { browser, page };
}
