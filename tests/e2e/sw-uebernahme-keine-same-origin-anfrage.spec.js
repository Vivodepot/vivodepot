'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-190/§ clients.claim() — ein bereits geladener Tab hat nichts mehr
   nachzuholen (Nachtlauf, 01.09.2026, Zug zur automatischen Aktivierung)
   ────────────────────────────────────────────────────────────────────────
   ANLASS. `sw.js` trägt seit dem Gründungs-Commit (56192e2, 12.06.2026) ein
   UNBEDINGTES `await self.clients.claim();` im `activate`-Handler. Zweieinhalb
   Monate lang folgenlos — `activate` feuerte nie, solange ein Tab offen war
   (`skipWaiting()` wurde nirgends gerufen). U2-ADR-190 macht die Zeile durch
   `skipWaiting()` erstmals wirksam: nicht die Zeile hat sich geändert,
   sondern ihre ERREICHBARKEIT. `clients.claim()` übernimmt bereits offene
   Tabs — es lädt ihren Code NICHT neu, es ändert nur, welcher Worker künftige
   `fetch`-Ereignisse dieses Tabs bedient. Die Gefahr, vor der U2-ADR-015
   Etappe 8 ursprünglich schützen sollte: alter, laufender Code stellt eine
   Anfrage, die vom NEUEN Worker (neuer Cache-Inhalt) bedient wird — ein Bruch
   mitten in der Sitzung.

   WAS BEREITS GEMESSEN IST UND HIER NICHT NOCHMAL GEPRÜFT WIRD:
   `tests/konformitaet/offline-garantie.mjs` misst NULL EXTERNE Requests —
   eine andere Achse. Same-origin-Requests zählt sie nicht, weil sie file://
   läuft (dort registriert kein Service Worker überhaupt, `_swRegistrierenErlaubt()`
   schließt `_istDateiHerkunft()` aus) — die Frage hier stellt sich dort
   strukturell nicht.

   DIE ZUSICHERUNG, DIE DIESE PROBE TRÄGT: ein Tab, den ein neuer Worker
   übernimmt, hat NICHTS mehr nachzuladen — es kann kein alter Code gegen neue
   Dateien laufen, weil er nach dem Laden keine same-origin-Anfrage mehr
   stellt, an der das etwas ändern könnte.

   GEGENPROBE PFLICHT (ohne sie ist eine gemessene Null keine): der Zähler
   MUSS die sechs echten Anfragen beim Laden selbst sehen. Sieht er die nicht,
   ist er blind, und die Null danach beweist nichts.

   Lokaler HTTP-Server statt file:// — derselbe Grund wie in
   tests/e2e/zug5-persistenz-rauchtest.spec.js: der Service Worker registriert
   nur auf einem echten Origin (http(s)/localhost), nicht auf file://.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { test, expect } = require('@playwright/test');
const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup.js');

const REPO_ROOT = path.join(__dirname, '..', '..');

function starteLokalenServer() {
  const MIME = {
    '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
  };
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      // Klasse-B-Fund 19.09.2026 (e2e-37-rote-klassen-2026-09-19.md): gebackener privat-de statt
      // der rohen Datei, s. Kopf-Kommentar tests/e2e/helpers.js.
      const istNav = req.url === '/' || req.url === '/vivodepot.html';
      const fp = istNav ? GEBACKENE_PRODUKT_PFADE['privat-de'] : path.join(REPO_ROOT, req.url.split('?')[0]);
      fs.readFile(fp, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

async function mitDatei(page, aufruf, frist = 30_000) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: frist }),
    page.evaluate(aufruf),
  ]);
  return download.suggestedFilename();
}

// U2-ADR-120 Zug 2 fügt nach jedem geglückten Export eine freiwillige Erfassungs-Abfrage ein
// ("Wem haben Sie das gegeben?", mit "Später"-Ausweg) — dasselbe Modal blockiert sonst den
// nächsten Klick. Muster aus tests/konformitaet/offline-garantie.mjs (`uebergabeModalWegklicken`).
async function uebergabeModalWegklicken(page) {
  try {
    await page.waitForSelector('#modal-rueck.an', { timeout: 3_000 });
  } catch (_) { return; }
  const zweit = await page.$('#m-zweit');
  if (zweit) await zweit.click();
}

test('ein bereits geladener Tab stellt nach dem Laden keine same-origin-Anfrage mehr — über eine breite Sitzung (PDF, Export, Sub-Depot)', async ({ page, context }) => {
  test.setTimeout(90_000);
  const srv = await starteLokalenServer();
  const port = srv.address().port;
  try {
    const alleRequests = [];
    let ladenAbgeschlossenBei = null;
    context.on('request', (req) => {
      alleRequests.push({ t: Date.now(), method: req.method(), url: req.url(), resourceType: req.resourceType() });
    });

    await page.addInitScript(() => {
      Object.defineProperty(window, 'showSaveFilePicker', {
        configurable: true,
        value: async () => ({ name: 'sw-uebernahme-messung.vivodepot', createWritable: async () => ({ write: async () => {}, close: async () => {} }) }),
      });
    });

    await page.goto(`http://localhost:${port}/vivodepot.html`);
    await page.waitForSelector('#w-anlass', { state: 'visible' });

    // Erst-Erwerb der SW-Kontrolle abwarten — per Spezifikation harmlos (keine offenen Clients
    // vorher). Danach gilt der Tab als „bereits geladen", genau der Zustand aus der Frage.
    await page.waitForFunction(async () => {
      if (!('serviceWorker' in navigator)) return true;
      const reg = await navigator.serviceWorker.getRegistration();
      return !!(reg && reg.active);
    }, null, { timeout: 15_000 }).catch(() => {});

    ladenAbgeschlossenBei = Date.now();
    await page.waitForTimeout(500);   // Nachzügler des Ladens abklingen lassen

    /* ── GEGENPROBE, VOR der eigentlichen Sitzung im Bericht festgehalten ──────
       Sieht der Zähler die Anfragen des Ladens NICHT, ist die spätere Null blind,
       nicht belegt. */
    const vorLaden = alleRequests.filter((r) => r.t < ladenAbgeschlossenBei);
    expect(vorLaden.length, 'Gegenprobe: der Zähler sieht keine einzige Anfrage beim Laden — '
      + 'er ist blind, eine spätere Null würde nichts beweisen').toBeGreaterThan(0);

    /* ── Breite Sitzung: anlegen, navigieren, PDF, Export, Sub-Depot rein+raus ── */
    await page.click('#w-anfangen');
    await page.waitForSelector('#app.an', { state: 'attached' });
    await page.waitForSelector('#tb-pw-hinweis', { state: 'visible' });
    await page.click('#tb-pw-hinweis');
    await page.waitForSelector('#id-pw', { state: 'visible' });
    await page.fill('#id-vorname', 'Marlies');
    await page.fill('#id-nachname', 'Sonnenschein');
    await page.fill('#id-pw', 'sw-uebernahme-messung-2026');
    await page.fill('#id-pw2', 'sw-uebernahme-messung-2026');
    await page.click('#m-ok');
    await page.waitForSelector('#tb-pw-hinweis', { state: 'hidden' });

    for (const sektor of ['identity', 'health', 'advanceCare', 'finance']) {
      await page.evaluate((s) => { if (typeof window.__vdOeffentlich.oeffneSektor === 'function') window.__vdOeffentlich.oeffneSektor(s); }, sektor);
      await page.waitForTimeout(150);
    }
    await page.evaluate(() => {
      if (typeof window.__vdOeffentlich.sektorFeldSetzen === 'function') window.__vdOeffentlich.sektorFeldSetzen('identity', 'givenName', 'Marlies');
    });

    // Dokument erzeugen — der wahrscheinlichste Kandidat für eine späte Anfrage (jsPDF-Pfad).
    await mitDatei(page, () => window.__vdOeffentlich.flowVollDepotPdf({})).catch((e) => { throw new Error('PDF-Erzeugung: ' + e.message); });
    await uebergabeModalWegklicken(page);
    // Export. Testvehikel 'json' -> 'fhir-ips' (U2-ADR-NNN, 17.09.2026: der offene JSON-Vollexport
    // ist entfernt) — dieselbe Zusicherung (kein same-origin-Netzaufruf bei der Erzeugung), ein
    // anderes, weiterhin bestehendes Sektor-Format; 'health' steht bereits offen (s. o.).
    await mitDatei(page, () => window.__vdOeffentlich.flowFormatExport('fhir-ips', {})).catch((e) => { throw new Error('Export: ' + e.message); });
    await uebergabeModalWegklicken(page);

    // Sub-Depot anlegen, entsiegeln, betreten, wieder verlassen — echte UI-Klicks
    // (Muster aus tests/e2e/depot-liste-sub-kontext.spec.js).
    await page.click('#tb-depot-pille');
    await page.waitForSelector('#tb-depot-menue-verwaltung', { state: 'visible' });
    await page.click('#tb-depot-menue-verwaltung');
    await page.waitForSelector('#sub-neu', { state: 'visible' });
    await page.click('#sub-neu');
    await page.waitForSelector('#id-vorname', { state: 'visible' });
    await page.fill('#id-vorname', 'Anja');
    await page.fill('#id-pw', 'sub-messung-pw-2026');
    await page.fill('#id-pw2', 'sub-messung-pw-2026');
    await page.click('#m-ok');
    await page.waitForSelector('#id-vorname', { state: 'detached' });
    await page.waitForSelector('[data-sub]');
    const uuid = await page.getAttribute('[data-sub]', 'data-sub');
    await page.click(`[data-entsiegeln="${uuid}"]`);
    await page.waitForSelector('#sub-auf', { state: 'visible' });
    await page.fill('#sub-auf', 'sub-messung-pw-2026');
    await page.click('#m-ok');
    await page.waitForSelector('#sub-auf', { state: 'detached' });
    await page.click(`[data-betreten="${uuid}"]`);
    await page.waitForSelector('#app.modus-vollmacht', { state: 'attached' });
    await page.waitForTimeout(200);
    const zurueck = await page.$('#vm-zurueck');
    if (zurueck) { await zurueck.click(); await page.waitForTimeout(200); }

    await page.waitForTimeout(1_500);   // späte/asynchrone Anfragen abwarten, bevor gezählt wird

    /* ── DIE ZUSICHERUNG ────────────────────────────────────────────────────── */
    const nachLaden = alleRequests.filter((r) => r.t >= ladenAbgeschlossenBei);
    const liste = nachLaden.map((r) => r.method + ' ' + r.resourceType + ' ' + r.url).join('\n  ');
    expect(nachLaden, 'ein bereits geladener Tab hat nach dem Laden noch same-origin-Anfragen '
      + 'gestellt — ein von clients.claim() übernommener Tab KÖNNTE dann alten Code gegen neue '
      + 'Dateien laufen lassen. clients.claim() muss an dieselbe Bedingung wie skipWaiting() '
      + 'gebunden werden, nicht unbedingt bleiben. Gefunden:\n  ' + liste).toEqual([]);
  } finally {
    srv.close();
  }
});

/* ── [Negativprobe] ──────────────────────────────────────────────────────────
   Rot-Beweis-Pflicht: eine Probe, die nie rot wurde, ist unbelegt (§7.5). Diese
   Probe fährt denselben Zähler, dieselbe Vor/Nach-Grenze — aber stößt NACH der
   Grenze absichtlich eine echte same-origin-Anfrage an, genau der Fall, den die
   Zusicherung oben ausschließt. Bleibt die Hauptprobe grün, obwohl DIESER
   Mechanismus eine Anfrage hätte finden müssen, ist der Zähler blind — dieselbe
   Klasse Fehler wie eine Kollektor-Form ohne Schutz.

   Die Mutation ist ein `<img>`-Ladeversuch, kein `fetch()`: die CSP der Seite
   (`connect-src 'none'`) blockt jeden `fetch()`/XHR aus der Seite heraus
   vollständig, BEVOR eine Netzwerkanfrage überhaupt entsteht — ein
   `fetch()`-Mutant wäre am eigenen Schutzmechanismus der Seite gescheitert,
   nicht am Zähler, und hätte fälschlich "Zähler blind" gemeldet. `img-src
   'self'` erlaubt same-origin-Bildladeversuche, das Bild muss nicht existieren
   (404 reicht — der Request-Event zählt, nicht die Antwort). */
test('[Negativprobe] eine same-origin-Anfrage NACH dem Laden wird gefunden — die Zusicherung oben prüft wirklich etwas', async ({ page, context }) => {
  test.setTimeout(30_000);
  const srv = await starteLokalenServer();
  const port = srv.address().port;
  try {
    const alleRequests = [];
    let ladenAbgeschlossenBei = null;
    context.on('request', (req) => { alleRequests.push({ t: Date.now(), url: req.url() }); });

    await page.goto(`http://localhost:${port}/vivodepot.html`);
    await page.waitForSelector('#w-anlass', { state: 'visible' });
    await page.waitForFunction(async () => {
      if (!('serviceWorker' in navigator)) return true;
      const reg = await navigator.serviceWorker.getRegistration();
      return !!(reg && reg.active);
    }, null, { timeout: 15_000 }).catch(() => {});
    ladenAbgeschlossenBei = Date.now();
    await page.waitForTimeout(500);

    // Die MUTATION: eine echte same-origin-Anfrage, absichtlich NACH der Grenze ausgelöst.
    // `<img>`, nicht `fetch()` — s. Kommentar oben (CSP `connect-src 'none'` blockt fetch/XHR).
    await page.evaluate(() => { const bild = new Image(); bild.src = './rotprobe-mutation.png?x=' + Date.now(); });
    await page.waitForTimeout(500);

    const nachLaden = alleRequests.filter((r) => r.t >= ladenAbgeschlossenBei);
    expect(nachLaden.length, 'die absichtlich ausgelöste same-origin-Anfrage nach dem Laden '
      + 'wurde NICHT gefunden — der Zähler in der Hauptprobe ist blind, ihr Grün beweist nichts')
      .toBeGreaterThan(0);
  } finally {
    srv.close();
  }
});
