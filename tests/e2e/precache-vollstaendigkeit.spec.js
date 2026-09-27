'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Precache-Vollständigkeit — U2-ADR-194, Auftrag (01.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   DER BEFUND (01.09.2026): `sw.js`s SCHALE cached jeden Eintrag EINZELN
   und schluckt Fehlschläge (`.catch(() => undefined)`) — eine Antwort, die
   der HTTP-Ebene folgt, keine Aussage über den CACHE-INHALT. maß, dass
   der Server-404 gegen die Wurzel-Adresse verschwindet, sobald es dort eine
   Datei gibt. Diese Probe misst die NÄCHSTE Ebene, wie von verlangt:
   nicht ob die Adresse antwortet, sondern ob der Eintrag WIRKLICH im Cache
   landet — die einzige Stelle, an der `.catch(() => undefined)` sonst
   lautlos weiterschlucken könnte, auch wenn der Server längst 200 liefert
   (z. B. bei einem künftigen Umbau der Fetch-Logik, den diese Probe fängt,
   nicht nur den heutigen Fund).

   KEIN `file://` möglich: Service Worker registrieren sich dort grundsätzlich
   nicht (dasselbe Gate, das `S10-SW-Gate` in tests/konformitaet/offline-
   garantie.mjs am Quelltext prüft). Ein lokaler Server ist in `tests/e2e/`
   nicht neu — `zug5-persistenz-rauchtest.spec.js` hat bereits einen, dort
   aber aus einem ANDEREN Grund (`internerSpeicherModus()`/IndexedDB
   unterscheidet sich zwischen `file://` und `http://`, nichts mit Service
   Workern zu tun). **PRÄZEDENZFALL, nicht nur ein Detail:** diese Probe ist die
   ERSTE, die einen Server WEGEN Service-Worker-Registrierung braucht — der
   Server-Aufbau selbst ist derselbe `http.createServer`-Zuschnitt wie bei
   zug5 (Port 0, minimales MIME-Mapping), hier auf ein eigens gebautes
   STAGING-Verzeichnis gerichtet (echter Kern-Dateisatz + generierte
   index.html), nicht auf das Repo direkt — der Repo-Wurzel selbst fehlt
   (bewusst) eine index.html; das ist ein Ausliefer-Artefakt, kein
   Quelltext-Bestandteil. Wer als nächstes einen echten SW-Install/Cache-Test
   braucht: hier ansetzen, nicht neu erfinden.

   MUSS VON HAND GEFAHREN WERDEN — KEIN TOR PRÜFT SIE (geprüft an den Hook-
   Quelltexten selbst, nicht nur am eigenen Lauf beobachtet): weder
   `hooks/pre-commit` noch `hooks/pre-push` rufen `playwright`/`test:e2e` auf
   — diese Probe (und der ganze restliche `tests/e2e/`-Bestand) läuft
   ausschließlich über den separaten `npm run test:e2e`-Schritt, NIE über
   `git commit`/`git push`. Ein Wächter gegen stilles Versagen, der selbst
   still nicht läuft — hat das als eigenen Posten
   gemeldet (01.09.2026), nicht Teil dieses Auftrags. Wer sich auf einen
   grünen Push verlässt, hat diese Probe NICHT laufen sehen.

   STABILITÄT (01.09.2026): 10 Läufe insgesamt — 7 isoliert gegen diese
   Datei (alle grün, ~1.2–2.1 s für beide Proben zusammen), plus 3× im
   Rahmen von `npm run test:e2e` gegen die volle E2E-Suite (231 · 231 · 231,
   beide Proben dieser Datei jedes Mal grün). Kein Beweis für Nullfehlerrate
   über beliebig viele Läufe — nur der ehrliche Stand der tatsächlich
   gefahrenen Stichprobe, nicht mehr behauptet als gemessen.

   GERÜST-TEST (Klasse-B-Wächter, tools/klasse-b-rohes-geruest-pruefen.js, 19.09.2026): diese
   Spec kopiert ABSICHTLICH die rohe vivodepot.html in ein Staging-Verzeichnis. Gegenstand ist der
   Service-Worker-PRECACHE des ausgelieferten Dateisatzes (welche Pfade landen im Cache), nicht das
   Produktverhalten — sie liest nie eine Bereichs-/Feldsicht der geladenen Seite, `page.goto()`
   dient allein dazu, die SW-Installation anzustoßen. Die rohe Datei IST hier der Prüfgegenstand;
   ein gebackenes Produkt änderte an der Aussage nichts, verwässerte aber die Trennung „SW-Dateisatz
   des Repos" gegen „konfektioniertes Produkt". */
const { test, expect } = require('@playwright/test');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { dateisatzUndIndexAblegen } = require('../../tools/testfassung-legen.js');

const REPO = path.join(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.webmanifest': 'application/manifest+json' };

function starteStatischenServer(wurzel) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const url = req.url.split('?')[0];
      const fp = url === '/' ? path.join(wurzel, 'index.html') : path.join(wurzel, decodeURIComponent(url));
      fs.readFile(fp, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

// Baut ein STAGING-Verzeichnis mit nur den drei SW-relevanten Kern-Dateien (kein
// vivodepot-lesen.html — die Schale kennt es ohnehin nicht) + optional der
// generierten index.html. `mitIndex: false` bildet den Zustand VOR dem Fix nach —
// derselbe Dateisatz, nur ohne die neue Datei.
function staging({ mitIndex }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-precache-'));
  for (const datei of ['vivodepot.html', 'sw.js', 'manifest.webmanifest']) {
    fs.copyFileSync(path.join(REPO, datei), path.join(dir, datei));
  }
  if (mitIndex) {
    // Echter Code-Pfad, nicht nachgebaut: derselbe Schritt, den testfassung-legen.js
    // beim echten Ausliefern tatsächlich ausführt (kopiert zusätzlich vivodepot-lesen.html
    // — harmlos, wird von SCHALE nicht referenziert und stört die Cache-Prüfung nicht).
    dateisatzUndIndexAblegen(dir);
  }
  return dir;
}

function cacheNameAusSwJs(dir) {
  const sw = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8');
  const m = sw.match(/const CACHE = '([^']+)'/);
  if (!m) throw new Error('CACHE-Konstante nicht in sw.js gefunden — Vorbedingung der Probe verletzt');
  return m[1];
}

// Registriert den SW und wartet auf 'installed' (oder bereits 'activated', falls der
// Zustandswechsel schneller lief als dieser Handler). Die Spezifikation garantiert:
// der install-Handler erreicht 'installed' ERST, wenn sein waitUntil()-Versprechen
// aufgelöst ist — und genau das ist in sw.js `caches.open(CACHE).then(cache => …)`.
// 'installed' ist damit selbst schon der verlässliche Nachweis, dass jeder
// SCHALE-Eintrag versucht wurde; eine weitere Wartestufe bis 'activated' würde nur
// Zeit kosten, ohne die gemessene Aussage zu ändern.
async function installAbwarten(page) {
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.register('sw.js');
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout beim Warten auf den Install-Abschluss')), 10000);
      const fertig = (s) => s === 'installed' || s === 'activating' || s === 'activated';
      const w = reg.installing || reg.waiting || reg.active;
      if (w && fertig(w.state)) { clearTimeout(timeout); resolve(); return; }
      if (!w) { clearTimeout(timeout); reject(new Error('Keine Service-Worker-Instanz nach register()')); return; }
      w.addEventListener('statechange', () => { if (fertig(w.state)) { clearTimeout(timeout); resolve(); } });
    });
  });
}

async function cacheInhaltAlsPfade(page, cacheName) {
  return page.evaluate(async (cache) => {
    const c = await caches.open(cache);
    const keys = await c.keys();
    return keys.map((r) => new URL(r.url).pathname);
  }, cacheName);
}

test('[Precache-Vollständigkeit] mit index.html: ALLE drei SCHALE-Einträge landen wirklich im Cache — nicht nur die Adresse antwortet', async ({ page }) => {
  const dir = staging({ mitIndex: true });
  if (!fs.existsSync(path.join(dir, 'index.html'))) throw new Error('Vorbedingung: index.html muss im Staging liegen');
  const srv = await starteStatischenServer(dir);
  try {
    const { port } = srv.address();
    const cacheName = cacheNameAusSwJs(dir);
    await page.goto(`http://localhost:${port}/vivodepot.html`);
    await installAbwarten(page);

    const pfade = await cacheInhaltAlsPfade(page, cacheName);
    expect(pfade, 'Cache-Inhalt: ' + JSON.stringify(pfade)).toContain('/');
    expect(pfade).toContain('/vivodepot.html');
    expect(pfade).toContain('/manifest.webmanifest');
    expect(pfade.length, 'genau drei Einträge, kein vierter/fehlender: ' + JSON.stringify(pfade)).toBe(3);
  } finally {
    srv.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('[Precache-Vollständigkeit·Rot-Beweis] ohne index.html: die Wurzel-Adresse fehlt im Cache — der Fund, den der Fix behebt', async ({ page }) => {
  const dir = staging({ mitIndex: false });
  if (fs.existsSync(path.join(dir, 'index.html'))) throw new Error('Vorbedingung verletzt: kein index.html erwartet');
  const srv = await starteStatischenServer(dir);
  try {
    const { port } = srv.address();
    const cacheName = cacheNameAusSwJs(dir);
    await page.goto(`http://localhost:${port}/vivodepot.html`);
    await installAbwarten(page);

    const pfade = await cacheInhaltAlsPfade(page, cacheName);
    expect(pfade, 'Vorbedingung des Rot-Beweises: OHNE index.html darf "/" NICHT im Cache landen — '
      + 'liefe sie mit, prüfte diese Probe nichts. Gefunden: ' + JSON.stringify(pfade)).not.toContain('/');
    // Die anderen beiden landen weiterhin — nur der EINE Eintrag ohne Server-Antwort fehlt.
    expect(pfade).toContain('/vivodepot.html');
    expect(pfade).toContain('/manifest.webmanifest');
  } finally {
    srv.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
