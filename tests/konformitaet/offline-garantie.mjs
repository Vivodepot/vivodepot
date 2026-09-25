/**
 * offline-garantie.mjs — Offline-Garantie V1 (Playwright, echter Browser)
 * ======================================================================
 * Re-Target des B16-Offline-Invariante-Tests (test_behavior.js „Schicht 2a")
 * auf den V1-Kern. V1 ist eine Single-File-Offline-App — Maßstab strenger als
 * B16: NULL externe HTTP/S-/WS-Requests (keine erlaubten Hosts), nicht nur
 * „keine unerlaubten". Lädt + nutzt die App im echten Chromium und prüft, dass
 * KEINE externe Netzwerkanfrage gestellt wird.
 *
 * ── Erweiterung 23.07.2026 (Anforderung „Offline-Nachweis Stufe 2") ────────────
 * Anlass: die öffentliche Aussage lautet „0 externe Netzwerk-Requests zur
 * Laufzeit". Belegt war bis hierhin nur ein schmaler Pfad (Laden, Anlegen, zwei
 * Felder, Navigation). Speichern, Schließen, Wiederöffnen, Export und die
 * PDF-Erzeugung liefen NICHT mit — ausgerechnet im PDF-Pfad sitzt der einzige
 * latente XMLHttpRequest der ausgelieferten Datei (jsPDF `loadFile`).
 * Der Nachweis wird deshalb auf die Aussage gebracht, nicht die Aussage gekürzt:
 *
 *   B (Laufzeit) — der blockierte Lauf fährt Gesamt-PDF, Bereichs-PDF,
 *      Notfallkarte (jsPDF + QR-Erzeuger) und FHIR-IPS-Export mit. (Nachtrag
 *      19.09.2026: der offene Voll-JSON-Export war hier ebenfalls vorgesehen —
 *      per U2-ADR-NNN, 18.09.2026, ist er absichtlich entfernt, „Wiederherstellen
 *      ≠ Weitergeben"; s. Kommentar an Schritt 5 unten.)
 *   B (statisch) — der jsPDF-XHR-Pfad ist aus dem EIGENEN Code gar nicht
 *      erreichbar: kein addFont/addFileToVFS/loadFile, genau EIN addImage, und
 *      das mit einer data:-URL. Statischer Beleg schlägt Laufzeit-Beobachtung.
 *   C — Rückweg in dieselbe Komponente: speichern → schließen → eigene Datei
 *      wieder öffnen → entschlüsseln. Bisher nur über die Grenze zur Lese-App.
 *   D — die aus dem BROWSER geschriebene .vivodepot trägt kein Klartext-
 *      Personendatum (Muster aus tests/notfall-cache.test.js, auf die Datei
 *      angewandt statt auf den Umschlag im Speicher).
 *   E — Nachweis-Artefakt: maschinenlesbares Protokoll je Lauf.
 *
 * Wiederverwendet statt neu gebaut: die Reise-Bausteine der Cross-Suite
 * (tests/e2e-cross/support/helpers.js) — dieselben Selektoren, dieselbe
 * Datei-Schreib-Mechanik wie T-CROSS-01. Die HTML wird NICHT verändert.
 *
 * Ausführen: node --test tests/konformitaet/offline-garantie.mjs
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import fs from 'node:fs';

const require_ = createRequire(import.meta.url);
const HIER      = dirname(fileURLToPath(import.meta.url));
const REPO      = join(HIER, '..', '..');
/* A6/G1 (29.07.2026): der gemessene Gegenstand ist UMLENKBAR — dieselbe
   Umgebungsvariable, die `tests/load-kern.js` schon kennt. Vorher stand hier ein
   fester Pfad, und der Selbsttest wies den Waechter als „nicht ansetzbar" aus:
   ein Beispiel liess sich ihm nur unterschieben, indem man die AUSGELIEFERTE
   Datei veraendert — das ist kein Beispiel, das ist ein Eingriff.
   Vier Waechter teilten diese eine Ursache. */
const HTML_PFAD = process.env.KERN_HTML_PATH
  ? resolve(process.env.KERN_HTML_PATH)
  : join(REPO, 'vivodepot.html');
const istExtern = (u) => /^https?:\/\//i.test(u) || /^wss?:\/\//i.test(u);

/* Fund (19.09.2026): seit dem Schnitt-Nachtrag (18.09.2026, BUERGERMODUL_BUENDEL
   entfernt) trägt die rohe HTML_PFAD-Datei KEINE Bereichs-Bestand mehr — „nacktes Gerüst",
   AB_WERK_BEREICH_QUELLEN leer, gewollt (s. tools/lib/kern-lesen.js Kopf-Kommentar). Ein
   Playwright-Lauf, der HTML_PFAD ungebacken öffnet, sieht darum eine App ohne einen einzigen
   Bereich — genau das ließ `details.bereiche-umschalter [data-sektor="identity"]` (Schritt B,
   erster geöffneter Sektor) mit Timeout scheitern. KEIN veralteter Selektor, KEINE Oberflächen-
   Regression: derselbe „blinde Standard", den `tools/lib/kern-lesen.js` und
   `tests/e2e/global-setup.js` an diesem Tag bereits an drei anderen Stellen fanden und behoben
   haben (E2E-Strecke, Wächter-Register, zwei Werkzeuge) — hier die vierte, bisher übersehene
   Stelle, weil diese Datei `node --test` direkt fährt (chromium-API, kein `@playwright/test`)
   und darum NIE durch `tests/e2e/global-setup.js`s Backen läuft.
   DERSELBE WEG WIE DER NODE-TESTHARNESS (tests/load-kern.js `_standardProduktBaken`, hier über
   dessen empfohlenen Wrapper `kernGebackenLesen` — bäckt nur, wenn der Marker wirklich da ist,
   ein historischer KERN_HTML_PATH-Stand vor dem Schnitt kommt unverändert roh zurück, s. dort).
   Playwright braucht dafür eine ECHTE Datei (`page.goto('file://…')` kann keinen In-Memory-
   String öffnen) — einmal gebacken, in einen Temp-Pfad geschrieben, FILE_URL zeigt dorthin. */
const KL = require_('../../tools/lib/kern-lesen.js');
const HTML_INHALT = KL.kernGebackenLesen(HTML_PFAD);
const HTML_GEBACKEN_PFAD = join(fs.mkdtempSync(join(tmpdir(), 'vivodepot-offline-garantie-')), 'vivodepot.html');
fs.writeFileSync(HTML_GEBACKEN_PFAD, HTML_INHALT, 'utf8');
const FILE_URL = pathToFileURL(HTML_GEBACKEN_PFAD).href;

/* ── Negativprobe zur Diskriminante `istExtern` (B-1, 26.07.) ────────────────────────────
   `istExtern` entscheidet, ob ein Request als extern zählt — sie ist die Diskriminante beider
   Runtime-Gates unten (context.on('request')). Der Sweep 26.07. hatte diesen Wächter als „andere
   Prüfklasse, Mutation strukturell anders" AUSGEWIESEN; die Ausweisung war falsch: die Mutation ist
   eine URL. Rot-und-Grün-Paar, damit nicht ungemessen bleibt, ob die Diskriminante feuert. */
test('[Negativprobe] istExtern feuert auf die Mutation — und nur auf sie (rot ⇄ grün)', () => {
  for (const u of ['https://example.invalid/x', 'http://tracker.invalid/p', 'wss://tracker.invalid', 'ws://x.invalid'])
    assert.equal(istExtern(u), true, 'blind: externer Request „' + u + '" wurde NICHT als extern erkannt');
  for (const u of ['file:///home/x/vivodepot.html', 'data:font/woff2;base64,AAAA', 'blob:null/abc', 'about:blank'])
    assert.equal(istExtern(u), false, 'lokale/eingebettete Quelle „' + u + '" fälschlich als extern gewertet');
});

const H        = require_('../e2e-cross/support/helpers.js');   // Reise-Bausteine der Cross-Suite
const LK       = require_('../load-kern.js');                   // extrahiereScripts: eigener Code ≠ Bibliothek

/* ── Test-Sentinel-Daten. Ausschließlich Testmaterial, nie Produktivwerte. ────
   Die Marker-Werte sind zugleich die Klartext-Probe aus Schritt D: genau diese
   Zeichenketten dürfen in der geschriebenen Datei NIRGENDS auftauchen. */
const SENTINEL = Object.freeze({
  pw:            'offline-nachweis-pw-2026',
  vorname:       'Marlies',
  nachname:      'Sonnenschein',
  geburtsdatum:  '1949-03-17',
  allergien:     'Penicillin',
  medikamente:   'Ramipril 5 mg',
  krankheiten:   'Diabetes mellitus Typ 2',
  kontaktName:   'Anja Sonnenschein',
  kontaktTel:    '+49 89 1234567',
});
/* Was in der gespeicherten Datei NICHT im Klartext stehen darf (D). Der Name steht
   bewusst mit drin: auch er ist ein Personendatum. Blutgruppe ('A+') ist als Probe
   zu kurz — zwei Zeichen treffen zufällig in jedem Base64-Block — und bleibt ganz draußen.
   WICHTIG: Ein Wert, der gar nicht im Depot steht, kann in der Datei trivial nicht
   auftauchen; die Probe wäre dann grün, ohne etwas zu belegen. Darum prüft der Ablauf
   VOR dem Speichern, dass jeder dieser Werte wirklich im Klartext-`data` liegt
   (`probeImDepot`), und erst danach, dass er in der Datei fehlt. */
const KLARTEXT_PROBE = Object.freeze([
  SENTINEL.vorname, SENTINEL.nachname, SENTINEL.geburtsdatum,
  SENTINEL.allergien, SENTINEL.medikamente, SENTINEL.krankheiten,
]);

/* ════════════════════════════════════════════════════════════════════════
   Teil 1 — der bestehende schmale Gate (unverändert)
   ════════════════════════════════════════════════════════════════════════ */
describe('Offline-Garantie V1 — 0 externe Requests (Playwright)', () => {

  test('App lädt + rendert ohne Netzwerk, kein Crash', async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext();
      await context.route(/^https?:\/\//, route => route.abort('failed'));   // Netz hart blocken
      const page = await context.newPage();
      await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      const htmlLaenge = await page.evaluate(() => document.body.innerHTML.length);
      assert.ok(htmlLaenge > 5_000, `App-Body nach Offline-Ladevorgang zu kurz: ${htmlLaenge}`);
      const fehlerDialog = await page.locator('dialog[open], .error-fatal, #js-crash').count();
      assert.equal(fehlerDialog, 0, 'Fataler Fehler-Dialog nach Offline-Start sichtbar');
    } finally { await browser.close(); }
  });

  test('NULL externe HTTP/S-Requests bei Laden + Nutzung', async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext();
      const externeRequests = [];
      context.on('request', req => { if (istExtern(req.url())) externeRequests.push(req.method() + ' ' + req.url()); });
      const page = await context.newPage();
      await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      // Nutzung: Depot anlegen + Daten eintragen + Navigation (mehr Code-Pfade als reines Laden).
      await page.evaluate(async () => {
        const V = window.__vdOeffentlich;
        await V.depotAnlegen('pw'); V.akteurSelbstErklaeren('Maria');
        if (typeof V.betreteApp === 'function') V.betreteApp();
        V.sektorFeldSetzen('identity', 'givenName', 'Maria');
        V.sektorFeldSetzen('health', 'allergiesMedicationFoodOther', [{ text: 'Penicillin' }]);
        V.oeffneSektor('identity'); V.oeffneSektor('health'); V.geheZuZuhause && V.geheZuZuhause();
      });
      await page.waitForTimeout(2_000);   // async Startup-/Update-Check-Anfragen abwarten
      assert.deepEqual(externeRequests, [],
        `V1 stellte externe Netzwerkanfragen (Offline-Garantie verletzt):\n  ${externeRequests.join('\n  ')}`);
    } finally { await browser.close(); }
  });

  test('Keine WebSocket-Verbindungen', async () => {
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      const webSockets = [];
      page.on('websocket', ws => webSockets.push(ws.url()));
      await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      await page.waitForTimeout(1_500);
      assert.deepEqual(webSockets, [], `WebSocket-Verbindungen geöffnet: ${webSockets.join(', ')}`);
    } finally { await browser.close(); }
  });
});

/* ════════════════════════════════════════════════════════════════════════
   G11 (05.08.2026) — zwei getrennte Proben statt einer
   ────────────────────────────────────────────────────────────────────────
   Befund (G6-Nachtrag): die Klausel „NULL externe HTTP/S-Requests" hielt bisher
   über ZWEI unabhängige Ursachen gemeinsam — die CSP-Direktive `connect-src
   'none'` UND die Abwesenheit von Netz-Code im Kern. Lockert man `connect-src`
   allein, bleibt Teil 1 oben grün, weil kein Aufrufer die geöffnete Tür nutzt —
   die Mutationsprobe war STUMPF. Ab hier zwei Proben, jede für ihre eigene
   Ursache, mit wechselseitiger Rotmachbarkeit weiter unten im Datei-eigenen
   Selbsttest (`tests/g11-offline-garantie-proben-unabhaengig.test.js`).

   Beide Proben sind STATISCH (Text/Regex, kein Browser) — dieselbe Textgrundlage
   wie Teil 2 unten (`LK.extrahiereScripts`), damit ein Treffer in einem
   JS-Kommentar oder einem String-Literal NICHT zählt, ein Treffer in wirklich
   ausgeführtem Code IMMER zählt (Auftragsauflage). Der Stripper dafür lebt in
   `tools/g11-js-code-ohne-kommentare-strings.js` — eigene Datei, weil sowohl
   diese Probe als auch ihr Selbsttest ihn brauchen (kein Duplikat, dieselbe
   Lehre wie bei `zusicherungen-kern.js`, s. dort Kopf-Kommentar). ANDERS als
   `zusicherungen-kern.js`s `kommentarZeilen()` (die bewusst NUR Kommentare
   ausschließt, String-Treffer aber sichtbar lässt) entfernt dieser Stripper
   AUCH String- und Template-Literale — das verlangt dieser Auftrag ausdrücklich,
   weil eine Fehlermeldung wie "kein fetch erlaubt" sonst fälschlich rot machte.
   ════════════════════════════════════════════════════════════════════════ */
import { ohneKommentareUndStrings } from '../../tools/g11-js-code-ohne-kommentare-strings.js';
import { funktionsKoerper } from '../../tools/funktion-koerper.js';

describe('G11 — Probe 1: die CSP-Direktive `connect-src` bleibt auf \'none\' gesperrt', () => {
  const htmlRoh = fs.readFileSync(HTML_PFAD, 'utf8');
  const cspMetas = [...htmlRoh.matchAll(/<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi)];

  test('[G11-CSP] genau EIN CSP-Meta-Tag — eine zweite Policy könnte die erste im Effekt aufweiten', () => {
    assert.equal(cspMetas.length, 1,
      `Erwartet genau 1 CSP-Meta-Tag, gefunden ${cspMetas.length} — mehrere Content-Security-Policy-Header ` +
      `werden vom Browser als eine EINGESCHRÄNKTE Schnittmenge angewandt, aber eine zweite, lockerere Policy ` +
      `an anderer Stelle (z. B. per HTTP-Header beim Hosting) wäre von dieser Probe nicht sichtbar — daher zählt hier nur, was im Kern selbst steht.`);
  });

  test('[G11-CSP] `connect-src \'none\'` steht wortgleich im einzigen CSP-Meta-Tag', () => {
    assert.equal(cspMetas.length, 1, 'Vorbedingung (s. Test oben) verletzt — diese Probe braucht genau ein Tag.');
    assert.match(cspMetas[0][0], /connect-src\s+'none'(?:;|")/,
      'Die Direktive `connect-src \'none\'` fehlt, ist entfernt oder aufgeweitet (z. B. `connect-src *` oder eine Allowlist).');
  });
});

describe('G11 — Probe 2: kein Netz-Code im eigenen Kern (unabhängig von der CSP)', () => {
  const htmlRoh = fs.readFileSync(HTML_PFAD, 'utf8');
  const { script1, script2 } = LK.extrahiereScripts(htmlRoh);
  const eigenerCodeRoh = script1 + '\n' + script2;
  const eigenerCode = ohneKommentareUndStrings(eigenerCodeRoh);

  // Sechs API-Türen aus dem Auftrag, je ein eigener Fund statt einer Sammel-Assertion —
  // eine einzelne rote Zeile soll sofort sagen, WELCHE Tür offen ist.
  const TUEREN = [
    { name: 'fetch(…)',                muster: /\bfetch\s*\(/ },
    { name: 'XMLHttpRequest',          muster: /\bXMLHttpRequest\b/ },
    { name: 'WebSocket',               muster: /\bWebSocket\b/ },
    { name: 'navigator.sendBeacon',    muster: /navigator\s*\.\s*sendBeacon\b/ },
    { name: 'EventSource',             muster: /\bEventSource\b/ },
    { name: 'navigator.connection',    muster: /navigator\s*\.\s*connection\b/ },
  ];
  for (const t of TUEREN) {
    test(`[G11-Netzcode] kein ${t.name} im eigenen Code (Kommentare/Strings ausgeschlossen)`, () => {
      assert.doesNotMatch(eigenerCode, t.muster, `${t.name} im eigenen, wirklich ausgeführten Code gefunden.`);
    });
  }

  test('[G11-Netzcode] kein `import()` auf eine entfernte Quelle', () => {
    assert.doesNotMatch(eigenerCode, /\bimport\s*\(\s*['"`](?:https?:)?\/\//,
      'Ein dynamisches import() mit einer URL-artigen (absoluten oder protokoll-relativen) Quelle wurde gefunden.');
  });

  test('[G11-Netzcode] kein `<link rel="preconnect">`/`dns-prefetch` außerhalb von HTML-Kommentaren', () => {
    const ohneHtmlKommentare = htmlRoh.replace(/<!--[\s\S]*?-->/g, '');
    assert.doesNotMatch(ohneHtmlKommentare, /<link\b[^>]*\brel\s*=\s*["']?(?:preconnect|dns-prefetch)/i,
      'Ein <link rel="preconnect"/"dns-prefetch"> wurde außerhalb eines HTML-Kommentars gefunden.');
  });
});

/* ════════════════════════════════════════════════════════════════════════
   B-Zug 1 (06.08.2026) — U2-ADR-097 §10: kein App-Store-Zwang
   ────────────────────────────────────────────────────────────────────────
   Auftrag Drei_Fehlende_Waechter_2026-08-06.md, Teil B. Vier Zusicherungen
   (index.html „Kein Store, keine Installation" ×2, org.html „vom USB-Stick,
   vom Laptop, vom lokalen Laufwerk" + „nicht von einem App-Store abhängig"),
   bisher ohne Wächter (Arbeitsliste G14). Regel 10 (Erweiterung statt
   zweitem Wächter, geprüft in B-Zug 0): der file://-Lauf steht hier bereits
   (FILE_URL), und Teil 3 unten (B/C/D/E) beweist schon, dass Erfassen/
   Speichern/Öffnen über file:// vollständig funktioniert — das ist die
   harte Aussage hinter allen vier Sätzen. Neu sind zwei Proben für das, was
   dort noch fehlte: kein Installationszwang, kein Store-Aufruf.
   ════════════════════════════════════════════════════════════════════════ */
describe('Offline-Garantie V1 — U2-ADR-097 §10: kein App-Store-Zwang', () => {
  const htmlRoh = fs.readFileSync(HTML_PFAD, 'utf8');
  const { script1, script2 } = LK.extrahiereScripts(htmlRoh);
  const eigenerCodeRoh = script1 + '\n' + script2;
  const eigenerCode = ohneKommentareUndStrings(eigenerCodeRoh);

  test('[S10-Store] kein Store-Link/-Verweis im ausgelieferten Kern', () => {
    const STORE_MUSTER = [
      { name: 'play.google.com',     muster: /play\.google\.com/i },
      { name: 'apps.apple.com',      muster: /apps\.apple\.com/i },
      { name: 'microsoft.com/store', muster: /microsoft\.com\/store/i },
      { name: 'apps.microsoft.com',  muster: /apps\.microsoft\.com/i },
      { name: '„App Store"',         muster: /\bapp\s*store\b/i },
    ];
    for (const t of STORE_MUSTER) {
      assert.doesNotMatch(htmlRoh, t.muster,
        `Store-Verweis (${t.name}) im ausgelieferten Kern gefunden — §10 verspricht „kein Store, keine Installation".`);
    }
  });

  test('[S10-SW-Gate] die Service-Worker-Registrierung schließt file:// im eigenen Code aus', () => {
    const koerper = funktionsKoerper(eigenerCodeRoh, '_swRegistrierenErlaubt');
    assert.ok(koerper, '_swRegistrierenErlaubt() nicht gefunden — die Analyse ist veraltet (Funktion umbenannt?).');
    assert.match(koerper, /_istDateiHerkunft\s*\(\s*\)/,
      '_swRegistrierenErlaubt() prüft file:// nicht mehr — ein Installationszwang über die Datei-Variante wäre danach nicht mehr ausgeschlossen.');
  });

  /* Verworfener erster Entwurf, dokumentiert statt stillschweigend ersetzt: eine Laufzeit-Probe,
     die auf file:// eine sw.js-Netzanfrage erwartet und deren Ausbleiben prüft. Gemessen (direkter
     Aufruf gegen einen echten Chromium-Kontext): `navigator.serviceWorker.register()` wirft auf
     file:// SYNCHRON eine TypeError ("The URL protocol of the current origin ('null') is not
     supported.") — Chromium verweigert die Registrierung über das Origin selbst, VOR jeder
     Netzanfrage. Eine Probe, die auf eine sw.js-Anfrage wartet, kann diese Mutation darum NIE
     fangen — stumpf gegen genau die Verletzung, die sie prüfen soll (dieselbe Fehlerklasse wie der
     G6-Befund bei der alten Offline-Probe). Ersetzt durch die statische Probe unten: sie prüft die
     Eigenschaft, die tatsächlich verletzbar ist — ob SW-/Install-Zustand irgendwo AUSSERHALB der
     bekannten Registrierungs-/Anzeige-Funktionen eine Verzweigung steuert. */
  test('[S10-Isolation] Service-Worker-/Install-Zustand steuert keine Funktion außerhalb der bekannten Anzeige-Funktionen', () => {
    // Jede Funktion, die legitim `navigator.serviceWorker`/`_deferredInstallPrompt` liest — reine
    // Registrierung, Update-Anstoß oder Anzeige, nie eine Kernfunktion (Erfassen/Speichern/Öffnen).
    const BEKANNTE_FUNKTIONEN = [
      '_swRegistrierenErlaubt', 'serviceWorkerRegistrieren', '_staleCacheWarnungPruefen',
      '_installBlockHTML', '_installKnopfVerdrahten', '_installBlockAktualisieren',
      '_installPromptAusloesen', '_installEreignisseBinden', '_swSofortPruefen',
      // U2-ADR-190 (01.09.2026): ruft nach jedem erfolgreichen Sichern denselben Aktivierungs-
      // Check erneut an — reine Anstoß-Funktion, keine Kernfunktion (Erfassen/Speichern/Öffnen).
      '_swNeuPruefenNachSpeichern',
    ];
    let rest = eigenerCodeRoh;
    for (const name of BEKANNTE_FUNKTIONEN) {
      const koerper = funktionsKoerper(eigenerCodeRoh, name);
      assert.ok(koerper, `${name}() nicht gefunden — die Analyse ist veraltet (Funktion umbenannt/entfernt?).`);
      rest = rest.replace(koerper, '');
    }
    // Modul-weite Deklaration, außerhalb jeder Funktion, legitim (wie `sessionKey`/`sessionHkdfKey`).
    rest = rest.replace('var _deferredInstallPrompt = null;', '');
    const restOhneKommentareUndStrings = ohneKommentareUndStrings(rest);
    assert.doesNotMatch(restOhneKommentareUndStrings, /navigator\s*\.\s*serviceWorker\b/,
      'navigator.serviceWorker wird außerhalb der bekannten Anzeige-Funktionen gelesen — eine Kernfunktion könnte vom Service-Worker-Zustand abhängen.');
    assert.doesNotMatch(restOhneKommentareUndStrings, /_deferredInstallPrompt\b/,
      '_deferredInstallPrompt wird außerhalb der bekannten Install-Anzeige-Funktionen gelesen — eine Kernfunktion könnte vom Install-Prompt-Zustand abhängen.');
  });

  test('[S10-Install] der PWA-Install-Hinweis sperrt keine Kernfunktion (rein additiv)', () => {
    // Statisch: _installBlockHTML() liefert im ungünstigsten Fall einen passiven Hinweis oder
    // leeren String zurück, nie ein Element, das eine Funktion einsperrt — kein disabled-Attribut,
    // kein Overlay/Modal. Reicht als Beleg: der Block hat keine Seiteneffekte auf `data`/Session,
    // reines Markup.
    const koerper = funktionsKoerper(eigenerCodeRoh, '_installBlockHTML');
    assert.ok(koerper, '_installBlockHTML() nicht gefunden — die Analyse ist veraltet (Funktion umbenannt?).');
    assert.doesNotMatch(koerper, /\bdisabled\b|overlay|modal/i,
      '_installBlockHTML() referenziert disabled/overlay/modal — der Install-Hinweis könnte eine Funktion blockieren, nicht mehr rein additiv.');
  });
});

/* ════════════════════════════════════════════════════════════════════════
   Teil 2 (B, statisch) — der jsPDF-XHR-Pfad ist aus dem EIGENEN Code unerreichbar
   ────────────────────────────────────────────────────────────────────────
   Der einzige XMLHttpRequest der ausgelieferten Datei liegt in der gebündelten
   jsPDF-Bibliothek, in deren `loadFile`. Erreichbar wäre er über GENAU ZWEI Türen:
     (a) addImage(<String, der keine data:-URL ist>)          → loadFile(url)
     (b) addFont(...) / Schrift, die nicht im VFS liegt       → loadFile(postScriptName)
   Beide Türen prüfen wir am eigenen Quelltext, nicht am Laufzeit-Verhalten: eine
   statisch unerreichbare Tür ist ein stärkerer Beleg als die Beobachtung, dass sie
   in DIESEM Lauf zu blieb.
   Abgrenzung „eigener Code" ≠ „Bibliothek": die ersten beiden <script>-Blöcke sind
   der Kern (Krypto-Block + App). Dieselbe Grenze zieht tests/load-kern.js seit jeher;
   jsPDF und der QR-Erzeuger liegen in eigenen, späteren Blöcken.

   NACHTRAG 14.09.2026 (U2-ADR-097-Nachtrag, PDF-CI/Inter) — eine DRITTE Bibliothek zieht in
   dieselbe späte Zone: ein vendorter Font-Modul-Block (`@vd-lib name="inter-pdf-font"`, nach
   jsPDF, vor qrcode-generator), der sich über jsPDFs eigenes Font-Registrierungs-Ereignis bei
   jeder neuen jsPDF()-Instanz selbst registriert — Tür (b) bleibt damit für 'inter' STRUKTURELL
   zu: die Schrift liegt schon im VFS, bevor eigener Code sie je anfragt (Reihenfolge geprüft,
   s. Test unten). Byte-Ebene zusätzlich gemessen (nicht angenommen), dieselbe Methodik wie
   U2-ADR-263: doc.text() mit denselben Sprachbeispielen (żółć/őz/tűz/dağ) durchgeschickt, der
   rohe Tj-Byte-Output der erzeugten PDF verglichen — Inter kodiert als Identity-H/CID, exakt
   2 Bytes je Zeichen für alle 15 Testzeichen, kein WinAnsi-Fallback-Pfad; Helvetica (Gegenprobe,
   derselbe Text) zeigt am selben Messpunkt das im ADR dokumentierte Mojibake-Muster byte-genau
   wieder. Inter ist damit auch von der ADR-263-Fehlerklasse frei, unabhängig von der Netzfrage
   hier.

   NACHTRAG 14.09.2026 (Marke-Achse-Plan §3) — die Ausnahme wurde STRUKTURELL, nicht mehr an
   'inter' als Namen gebunden: jede Nicht-Standard-PDF-Schrift ist unten zulässig, WENN ihr
   eigener, namentlich passender `@vd-lib name="<name>-pdf-font"`-Block nachweislich vorhanden
   ist und sich über jsPDFs Font-Registrierungs-Ereignis selbst einträgt — kein Testdatei-Eintrag
   je künftigem Partner-Font, das Muster selbst trägt beliebig viele Instanzen (U2-ADR-400).
   ════════════════════════════════════════════════════════════════════════ */
describe('Offline-Garantie V1 — jsPDF-Netzpfad statisch unerreichbar (B)', () => {
  const html = fs.readFileSync(HTML_PFAD, 'utf8');
  const { script1, script2 } = LK.extrahiereScripts(html);
  const eigenerCode = script1 + '\n' + script2;

  test('[B-stat] Eigener Code ruft NIE addFont / addFileToVFS / loadFile', () => {
    for (const tuer of ['addFont', 'addFileToVFS', 'loadFile', 'loadImageFile']) {
      const treffer = eigenerCode.split(tuer).length - 1;
      assert.equal(treffer, 0,
        `Eigener Code nennt ${tuer} (${treffer}×) — das ist die jsPDF-Tür zum synchronen XMLHttpRequest.`);
    }
  });

  test('[B-stat] JEDER addImage-Aufruf übergibt eine data:-URL, keinen abrufbaren Verweis', () => {
    // U2-ADR-120 Zug 7 (Widerruf-PDF): ZWEITER addImage-Aufruf, gleiches Muster wie die
    // Notfallkarte — dieselbe Variable qrDataUrl, gespeist ausschließlich aus createDataURL()/null
    // (unten geprüft). Die Zahl wächst bewusst mit; die Garantie bleibt: KEIN abrufbarer Verweis.
    const stellen = [...eigenerCode.matchAll(/addImage\(\s*([^,)]+)/g)].map(m => m[1].trim());
    assert.equal(stellen.length, 2,
      `Erwartet genau ZWEI addImage im eigenen Code (Notfallkarte + Übergabe-Widerruf), gefunden ${stellen.length}: ${stellen.join(' | ')}`);
    for (const s of stellen) assert.equal(s, 'qrDataUrl', `addImage-Argument unerwartet: ${s}`);
    // …und `qrDataUrl` stammt ausschließlich aus dem QR-Erzeuger (data:image/…;base64) oder ist null.
    const zuweisungen = [...eigenerCode.matchAll(/\bqrDataUrl\s*=\s*([^;\n]+)/g)].map(m => m[1].trim());
    assert.ok(zuweisungen.length > 0, 'keine qrDataUrl-Zuweisung gefunden — die Analyse ist veraltet');
    for (const z of zuweisungen) {
      assert.ok(/^null\b/.test(z) || /createDataURL\(/.test(z),
        `qrDataUrl wird aus etwas anderem als createDataURL()/null gespeist: ${z}`);
    }
  });

  test('[B-stat] PDF-Schriften sind ausschließlich jsPDF-Standardschriften ODER die eine geprüfte Vendor-Ausnahme (kein VFS, kein Nachladen)', () => {
    // Die Standard-14 sind in jsPDF fest eingebaut; nur eine NICHT eingebaute Schrift
    // schickt loadFile(postScriptName) los.
    const STANDARD = new Set(['helvetica', 'times', 'courier', 'symbol', 'zapfdingbats']);
    // 'inter' läuft NICHT über ein Literal, sondern über die Gerüst-Konstante _PDF_MARKE_SCHRIFT
    // (U2-ADR-400) — beide Aufrufformen werden erkannt, die Konstante wird auf ihren tatsächlichen
    // Wert aufgelöst statt geraten.
    // NACHTRAG 14.09.2026 (Marke-Achse-Plan §6 Schritt 4): die Zuweisung ist seit
    // `_markeSchriftPdf()` kein reines Literal mehr, sondern `_markeSchriftPdf() || 'Inter'` — das
    // Muster unten erkennt BEIDE Formen. Der dynamische Zweig (`_markeSchriftPdf()`) braucht hier
    // keine eigene Prüfung: die Funktion selbst gibt nur Namen zurück, die in
    // `_PDF_SCHRIFTEN_VENDORT_ZUSAETZLICH` stehen — und JEDER Name dort ist per Konstruktion ein
    // vendorter Block (Schritt 5, produkt-konfektionieren.js vendort Block UND setzt den Namen in
    // einem Zug). Das statische Fallback-Literal bleibt darum der einzige Wert, den diese Probe
    // gegen STANDARD/die Vendor-Ausnahme prüfen muss.
    const konstDef = eigenerCode.match(/const\s+_PDF_MARKE_SCHRIFT\s*=\s*(?:_markeSchriftPdf\(\)\s*\|\|\s*)?'([^']+)'/);
    const literale = [...eigenerCode.matchAll(/setFont\(\s*'([^']+)'/g)].map(m => m[1].toLowerCase());
    const konstAufrufe = [...eigenerCode.matchAll(/setFont\(\s*_PDF_MARKE_SCHRIFT\b/g)];
    const familien = literale.slice();
    if (konstAufrufe.length > 0) {
      assert.ok(konstDef, '_PDF_MARKE_SCHRIFT wird für setFont benutzt, ist aber nirgends definiert — die Analyse ist veraltet');
      familien.push(konstDef[1].toLowerCase());
    }
    assert.ok(familien.length > 0, 'keine setFont-Aufrufe gefunden — die Analyse ist veraltet');
    const fremde = [...new Set(familien)].filter(f => !STANDARD.has(f));
    // STRUKTURELLE Ausnahme (Marke-Achse-Plan §3, 14.09.2026 — ersetzt die vormals auf 'inter'
    // eng gebundene Fassung): eine Nicht-Standard-Schrift ist NUR zulässig, wenn ihr EIGENER,
    // namentlich passender vendorter Font-Modul-Block nachweislich vorhanden ist UND sich über
    // jsPDFs Font-Registrierungs-Ereignis einträgt — kein offener Listeneintrag, der unabhängig
    // vom tatsächlichen Vendoring gälte, und keine Wächter-Pflege je neuem Partner-Font: der
    // Test prüft strukturell (Block vorhanden + registriert sich selbst), nicht namentlich.
    const ungedeckt = [];
    for (const f of fremde) {
      const muster = new RegExp(
        '<!--\\s*@vd-lib name="' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-pdf-font"[\\s\\S]*?<script[^>]*>([\\s\\S]*?)<\\/script>',
      );
      const vendorBlock = html.match(muster);
      if (!vendorBlock) { ungedeckt.push(`${f} (kein @vd-lib-Block "${f}-pdf-font" gefunden)`); continue; }
      if (!/jsPDFAPI\.events\.push\(\s*\[\s*'addFonts'/.test(vendorBlock[1])) {
        ungedeckt.push(`${f} (Block vorhanden, registriert sich aber nicht über jsPDFs Font-Registrierungs-Ereignis)`);
      }
    }
    assert.deepEqual(ungedeckt, [], `Nicht-Standard-PDF-Schrift(en) im eigenen Code ohne gedeckten Vendor-Block: ${ungedeckt.join(' | ')}`);
  });
});

/* ════════════════════════════════════════════════════════════════════════
   Teil 3 (B/C/D/E) — die Kernabläufe im hart blockierten Lauf
   ────────────────────────────────────────────────────────────────────────
   EIN Durchgang, EIN Browser-Kontext, EIN Recorder. Jeder Schritt wird protokolliert;
   die Tests darunter lesen nur noch das Protokoll. Ein Schritt, der still ausfällt
   (ein Export, der ohne Datei zurückkehrt), fliegt hier auf: jeder Ausgabe-Schritt
   wartet auf das echte Download-Ereignis, statt den Aufruf bloß abzusetzen.
   ════════════════════════════════════════════════════════════════════════ */

/* Einen Ausgabe-Schritt fahren und auf die tatsächlich entstandene Datei warten.
   Ohne Datei gibt es keinen Nachweis — der Schritt gilt dann als nicht gelaufen. */
async function mitDatei(page, aufruf, frist = 30_000) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: frist }),
    page.evaluate(aufruf),
  ]);
  return download.suggestedFilename();
}

/* CC-Fund (30.07.2026): U2-ADR-120 Zug 2 fügt nach jedem geglückten Export eine freiwillige
   Erfassungs-Abfrage ein ("Wem haben Sie das gegeben?", mit "Später"-Ausweg). Dieser Test ist
   älter als der ADR und wusste davon nichts — das offen bleibende Modal blockierte per echtem
   Klick den nächsten Schritt (`depot-speichern`, `#tb-save-knopf`), direkt am DOM bewiesen
   (`#modal-rueck` trug `.an`, Inhalt die Erfassungs-Frage). Testinfrastruktur-Korrektur, kein
   Eingriff in ADR-120-Verhalten: eine echte Nutzerin, die gerade nicht antworten will, klickt
   "Später" — genau das simuliert dieser Helfer. Kein Fehler, wenn kein Modal erscheint (andere
   Exportwege fragen nicht immer gleich schnell nach). */
async function uebergabeModalWegklicken(page) {
  try {
    await page.waitForSelector('#modal-rueck.an', { timeout: 3_000 });
  } catch (_) { return; }
  const zweit = await page.$('#m-zweit');
  if (zweit) await zweit.click();
}

async function vollerAblauf() {
  const start = Date.now();
  const protokoll = {
    schritte: [], externeRequests: [], blockierteRequests: [], webSockets: [],
    dateien: [], depotDatei: null, entschluesselt: null, qrGelaufen: null,
    probeImDepot: null, klartextProbe: null,
  };
  const schritt = async (name, fn) => {
    const t0 = Date.now();
    try {
      const ergebnis = await fn();
      protokoll.schritte.push({ schritt: name, ok: true, dauer_ms: Date.now() - t0 });
      return ergebnis;
    } catch (e) {
      protokoll.schritte.push({ schritt: name, ok: false, dauer_ms: Date.now() - t0, fehler: String((e && e.message) || e) });
      throw e;
    }
  };

  const tmp = H.frischerTmp('offline-nachweis');
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ acceptDownloads: true });

    // Netz HART blocken — und mitschreiben, was überhaupt anklopft.
    await context.route(/^https?:\/\//, (route, request) => {
      protokoll.blockierteRequests.push(request.method() + ' ' + request.url());
      return route.abort('failed');
    });
    context.on('request', req => { if (istExtern(req.url())) protokoll.externeRequests.push(req.method() + ' ' + req.url()); });
    // WebSockets + Downloads auf JEDER Seite des Kontexts — auch auf der, die nach dem
    // Schließen neu geöffnet wird (Schritt 7).
    context.on('page', p => {
      p.on('websocket', ws => protokoll.webSockets.push(ws.url()));
      p.on('download', d => protokoll.dateien.push(d.suggestedFilename()));
    });

    let page = await context.newPage();

    /* ── 1. Laden + Depot anlegen (echte Bedienoberfläche) ──────────────────── */
    await schritt('laden', () => H.kern.oeffnen(page, FILE_URL));
    await schritt('depot-anlegen', () => H.kern.depotAnlegen(page, {
      name: SENTINEL.vorname + ' ' + SENTINEL.nachname, pw: SENTINEL.pw,
    }));

    /* ── 2. Daten erfassen — über die Oberfläche ────────────────────────────────
       Bewusst der echte Eingabeweg, nicht der programmatische. Erster Anlauf setzte
       die Gesundheitsfelder über `sektorFeldSetzen` — sie verschwanden beim nächsten
       Bereichswechsel wieder. Kein App-Fehler: `allergien`/`krankheiten`/`medikamente`
       sind Chip-Widgets (SNOMED/ICD-10-Code-Slots), deren Wert als Satz
       {text, code} liegt; ein roher String hat diese Form nicht und wird beim
       nächsten Falten der Bereichseingaben verworfen. Der Reise-Helfer der
       Cross-Suite kennt die Chip-Konvention (Eingabe + Enter) und erzeugt die
       richtige Form — deshalb er, nicht der Direktaufruf.
       Die Identität zuerst: sie setzt zugleich den „ungesichert"-Zustand, ohne den
       der Sichern-Knopf gar nicht erscheint. */
    await schritt('daten-erfassen-identitaet', async () => {
      await H.kern.oeffneSektor(page, 'identity');
      await H.kern.setzeFeld(page, 'givenName', SENTINEL.vorname);
      await H.kern.setzeFeld(page, 'familyName', SENTINEL.nachname);
    });
    await schritt('daten-erfassen-gesundheit', async () => {
      await H.kern.oeffneSektor(page, 'health');
      await H.kern.setzeFeld(page, 'allergiesMedicationFoodOther',   SENTINEL.allergien);
      await H.kern.setzeFeld(page, 'chronicConditionsDiagnoses', SENTINEL.krankheiten);
      await H.kern.setzeFeld(page, 'medicationOngoing', SENTINEL.medikamente);
      // Geburtsdatum ist ein einfacher Skalar ohne Code-Slot — Direktaufruf genügt
      // und überlebt das Falten (belegt: blutgruppe/geburtsdatum blieben stehen).
      await page.evaluate((S) => window.__vdOeffentlich.sektorFeldSetzen('identity', 'birthDate', S.geburtsdatum), SENTINEL);
    });

    /* ── 3. Navigation (mehr Render-Pfade) ─────────────────────────────────── */
    await schritt('navigation', async () => {
      await H.kern.oeffneSektor(page, 'advanceCare');
      await H.kern.oeffneSektor(page, 'identity');
    });

    /* ── 4. Notfallkontakt — unmittelbar VOR der Notfallkarte ───────────────────
       `hauptpflegeperson` ist ein Listen-Record-Feld ohne eigenes Eingabe-Widget im
       Bereich; programmatisch gesetzt überlebt es den nächsten Bereichswechsel nicht.
       Es wird deshalb hier gesetzt — nach der letzten Navigation, vor der Karte —
       und der QR-Stand wird an genau dieser Stelle gemessen, nicht beim Setzen.
       Ohne diesen Kontakt trägt die Notfallkarte keinen QR und der QR-Erzeuger,
       die zweite gebündelte Fremd-Bibliothek, liefe im Nachweis nie mit. */
    await schritt('notfallkontakt', async () => {
      await page.evaluate((S) => {
        const id = window.__vdOeffentlich.personHinzufuegen({ name: S.kontaktName, tel: S.kontaktTel });
        window.__vdOeffentlich.sektorFeldSetzen('health', 'emergencyContacts', [{ ref: id }]);
      }, SENTINEL);
      protokoll.qrGelaufen = await page.evaluate(() => window.__vdOeffentlich.notfallKontakteVcard().length > 0);
    });

    /* ── 5. PDF-Erzeugung + Export im blockierten Lauf (Kern von B) ───────────
       Fund (19.09.2026): der Schritt „export-json" (flowFormatExport('json', …))
       stand hier seit dem 23.07.2026er Ausbau. Gemessen: `exportFormatFuerId('json')`
       liefert seither `undefined` — die Kennung 'json' trägt in EXPORT_FORMATE seit
       U2-ADR-NNN (18.09.2026, IMPORT_FORMATE-Kommentar an derselben Kennung) KEINEN
       Export-Eintrag mehr, nur noch einen Import-Eintrag (`nurImport: true`): „der offene
       JSON-VOLLEXPORT ist entfernt — Erzeugen neuer offener Dateien entfällt, das
       Zurücklesen einer bereits vorhandenen bleibt bewusst bestehen (Wiederherstellen ≠
       Weitergeben). Kein Export-Gegenstück mehr, absichtlich." `flowFormatExport` griff
       darum still den `if (!def) { …; return; }`-Zweig — kein Wurf, keine Datei, der
       Ablauf wartete bis zum Timeout auf ein Download-Ereignis, das nie kommt. KEIN
       veralteter Selektor und KEINE Regression: eine bereits getroffene, begründete
       Produktentscheidung, der diese Probe nie gefolgt ist. Entfernt statt umgeschrieben
       (kein Ersatz-Format an dieser Stelle einzusetzen wäre eine neue Behauptung ohne
       Auftrag) — Zähler und Kopf-Kommentar unten entsprechend nachgezogen. */
    await schritt('pdf-gesamt',       () => mitDatei(page, () => window.__vdOeffentlich.flowVollDepotPdf({})));
    await schritt('pdf-bereich',      () => mitDatei(page, () => window.__vdOeffentlich.flowBereichPdf('health', {})));
    await schritt('pdf-notfallkarte', () => mitDatei(page, () => window.__vdOeffentlich.flowNotfallkartePdf()));
    await schritt('export-fhir-ips',  () => mitDatei(page, () => window.__vdOeffentlich.flowFormatExport('fhir-ips', {})));
    await uebergabeModalWegklicken(page);   // U2-ADR-120 Zug 2 — s. Kommentar an der Funktion

    /* ── 6. Speichern: echte .vivodepot-Datei aus dem Browser (Muster T-CROSS-01) ──
       Vorher festhalten, welche Proben-Werte WIRKLICH im Klartext-Depot liegen. Ohne
       diesen Schritt wäre die Klartext-Probe in Schritt 9 wertlos: was nie im Depot
       war, fehlt auch in der Datei — und die Probe wäre grün, ohne etwas zu zeigen. */
    protokoll.probeImDepot = await schritt('probe-verankern', async () => {
      const klartext = await page.evaluate(() => JSON.stringify(window.__vdOeffentlich.ankerDaten()));
      return KLARTEXT_PROBE.filter(w => klartext.includes(w));
    });
    protokoll.depotDatei = await schritt('depot-speichern', () => H.kern.speichernNachTmp(page, tmp));

    /* ── 7. Schließen (C) ──────────────────────────────────────────────────────
       Vor dem Knopf liegt der EINMAL-Hinweis „So kommen Sie später wieder hinein",
       den die erste Datei-Sicherung auslöst; er deckt die Topbar ab. Bewusst am
       festen Griff (#wiedereinstieg-hinweis) abgeräumt, nie „irgendein offener
       Dialog" — dieselbe Regel wie in den Reise-Helfern.
       Liegt danach ein Schutz-Modal an (D40, Variante B: Inhalt da, aber keine
       aktuelle Datei-Sicherung erkannt), geht der Lauf den bewussten Verwerfen-Weg —
       die Datei liegt zu diesem Zeitpunkt bereits geschrieben vor.
       Zug 2 (Auftrag „Depot ist Datei", 08.08.2026): „Trotzdem schließen" saß bis dahin im
       zweitAktion-Slot (#m-zweit) — GLEICH in beiden Zweigen des Dialogs. Zug 2 gab dem
       DIRTY-Zweig einen dritten Weg („Nur auf diesem Gerät merken") und schob „Trotzdem
       schließen" dafür in einen eigenen, unbedingten drittAktion-Slot (#m-dritt) — in BEIDEN
       Zweigen, damit ein Aufrufer nicht wissen muss, welcher Zweig gerade offen ist. */
    await schritt('einmal-hinweis-wiedereinstieg', async () => {
      if (await page.locator('#wiedereinstieg-hinweis').isVisible().catch(() => false)) {
        await page.click('#m-ok');
        await page.waitForSelector('#modal-rueck.an', { state: 'detached', timeout: 10_000 }).catch(() => {});
      }
      await page.waitForFunction(() => !document.querySelector('#modal-rueck.an'), null, { timeout: 10_000 });
    });
    await schritt('depot-schliessen', async () => {
      await page.click('#tb-schliessen');
      if (await page.locator('#m-dritt').isVisible().catch(() => false)) await page.click('#m-dritt');
      await page.waitForTimeout(500);
      if (page.isClosed()) return 'fenster-geschlossen';
      await page.waitForSelector('.schluss-text', { state: 'visible', timeout: 10_000 });
      const dataWeg = await page.evaluate(() => window.__vdOeffentlich.ankerDaten() === null);
      assert.equal(dataWeg, true, 'Nach dem Schließen liegt noch ein Depot im Speicher');
      return 'schluss-sicht';
    });

    /* ── 8. Wiederöffnen der EIGENEN Datei + entschlüsseln (C) ────────────────
       GEÄNDERT (Auftrag „dritte Stelle, dieselbe Ursache", 12.09.2026):
       Dieser Schritt navigiert im SELBEN Kontext neu (Rückweg in dieselbe
       Komponente, s. Kopfkommentar) — anders als die Cross-Suite, die für jede
       Seite einen frischen `browser.newContext()` nimmt. Seit `internerSpeicherModus()`
       unter `file://` echt greift (Auftrag „die pauschale file://-Flagge weicht der
       echten Probe", 12.09.2026), bleibt der zuvor still gesicherte Stand (ADR-237,
       schon das Feld-Ausfüllen sichert, nicht erst `speichernNachTmp`) in der
       IndexedDB dieses Kontexts liegen — GEMESSEN: derselbe Abbruch tritt auch OHNE
       jeden expliziten Speichern-Aufruf auf, spätestens 4s nach dem Feld-Edit. Die
       erneute Navigation zeigt darum den Wiedereinstieg-Bildschirm („Ihr Vivodepot
       ist auf diesem Gerät gespeichert…") statt der leeren Landung `#w-anlass`, auf
       die `H.kern.oeffnen()` fest wartet.
       Das ist NICHT der Bug — Schritt C will ausdrücklich die GESCHRIEBENE DATEI
       prüfen (nicht die fortgesetzte interne Sitzung), darum wird für GENAU diese
       Navigation der interne Speicher deaktiviert (derselbe Griff wie in
       `tools/reisen-registry.js` für Läufe, die den Datei-Modus selbst brauchen —
       „Probe explizit scheitern lassen", nicht `H.kern.oeffnen()` selbst ändern,
       das für die Cross-Suite unverändert richtig bleibt). */
    await schritt('depot-wiedereroeffnen', async () => {
      if (page.isClosed()) page = await context.newPage();
      await page.addInitScript(() => {
        try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {}
      });
      await H.kern.oeffnen(page, FILE_URL);                         // App neu starten, echter Datei-Modus
      await page.click('#w-datei');                                 // Lage A → crypto-overlay
      await page.waitForSelector('#co-datei', { state: 'visible', timeout: 10_000 });
      await page.setInputFiles('#co-datei', protokoll.depotDatei);
      await page.fill('#co-pw', SENTINEL.pw);
      await page.click('#w-oeffnen');
      await page.waitForSelector('#app.an', { state: 'attached', timeout: 30_000 });
    });
    // Die Chip-Felder liegen als Satz {text, code}; verglichen wird der Anzeigetext,
    // nicht die interne Form — sonst pinnt der Nachweis nebenbei das Datenmodell fest.
    protokoll.entschluesselt = await page.evaluate(() => {
      const data = window.__vdOeffentlich.ankerDaten();
      const id = (data && data.sektoren && data.sektoren.identity) || {};
      const ge = (data && data.sektoren && data.sektoren.health) || {};
      const text = (v) => Array.isArray(v) ? v.map(e => (e && e.text) || '').join(' | ') : (v == null ? null : String(v));
      return {
        vorname: id.givenName || null, nachname: id.familyName || null,
        geburtsdatum: id.birthDate || null,
        allergien: text(ge.allergiesMedicationFoodOther), krankheiten: text(ge.chronicConditionsDiagnoses), medikamente: text(ge.medicationOngoing),
      };
    });

    await page.waitForTimeout(2_000);   // späte/asynchrone Anfragen abwarten, bevor gezählt wird

    /* ── 9. Klartext-Probe auf der geschriebenen Datei (D) ──────────────────── */
    const roh = fs.readFileSync(protokoll.depotDatei, 'utf8');
    const umschlag = JSON.parse(roh.slice(roh.indexOf('{')));        // Magic-Präfix abstreifen
    const ohneCt = JSON.stringify({ ...umschlag, ct: '' });          // alles AUSSER dem Ciphertext
    protokoll.klartextProbe = {
      dateigroesse_byte: Buffer.byteLength(roh),
      geprueft: [...KLARTEXT_PROBE],
      im_depot_verankert: protokoll.probeImDepot,        // nur diese Werte belegen überhaupt etwas
      gefunden_in_datei: KLARTEXT_PROBE.filter(w => roh.includes(w)),
      gefunden_neben_ct: KLARTEXT_PROBE.filter(w => ohneCt.includes(w)),
      passwort_in_datei: roh.includes(SENTINEL.pw),
    };
  } finally {
    await browser.close();
    // Die .vivodepot ist zu diesem Zeitpunkt eingelesen; das tmp-Verzeichnis bleibt nicht stehen.
    H.tmpAufraeumen(tmp);
  }
  protokoll.dauer_ms = Date.now() - start;
  return protokoll;
}

/* ── E — Nachweis-Artefakt ──────────────────────────────────────────────────
   Maschinenlesbar, ein Objekt je Lauf. Es BEHAUPTET nichts, es protokolliert;
   die Zusicherungen darunter sind das Tor. `ergebnis` wird aus denselben
   Beobachtungen abgeleitet, die die Tests prüfen — nicht aus dem Testergebnis,
   damit ein grünes Artefakt nie aus einer grünen Erwartung entstehen kann. */
const ARTEFAKT_DIR  = join(HIER, '.artifacts');
const ARTEFAKT_PFAD = join(ARTEFAKT_DIR, 'offline-nachweis.json');

function git(...args) {
  try { return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim(); }
  catch { return null; }
}

function nachweisSchreiben(p) {
  const bestanden =
    p.externeRequests.length === 0 &&
    p.blockierteRequests.length === 0 &&
    p.webSockets.length === 0 &&
    p.schritte.every(s => s.ok) &&
    !!p.klartextProbe &&
    p.klartextProbe.gefunden_in_datei.length === 0 &&
    p.klartextProbe.gefunden_neben_ct.length === 0 &&
    p.klartextProbe.passwort_in_datei === false &&
    p.klartextProbe.im_depot_verankert.length === KLARTEXT_PROBE.length &&
    !!p.entschluesselt && p.entschluesselt.vorname === SENTINEL.vorname;

  const nachweis = {
    nachweis: 'vivodepot-offline-garantie',
    schema: 1,
    erzeugt_utc: new Date().toISOString(),
    massstab: 'NULL externe HTTP/S-Requests, keine WebSockets — keine erlaubten Hosts',
    herkunft: {
      /* DER GEMESSENE STAND, und woher die Angabe kommt (28.07.2026).
         Läuft der Nachweis auf einem über `git archive` ausgepackten Stand
         (tools/ausgehenden-stand-messen.js), gibt es kein Repo zu fragen — der
         Hash blieb null und das Artefakt unvollständig. Der Auspacker kennt den
         Commit und reicht ihn in VD_AUSGEPACKTER_STAND herein.

         Die Variable ÜBERSCHREIBT git NICHT, sie springt nur ein, wo git
         schweigt: ein Nachweis, dessen Herkunft von Hand setzbar wäre, ist
         keiner. `commit_quelle` schreibt in das Artefakt, welcher der beiden
         Wege es war — es ist ein Datum im Protokoll, keine Bedingung eines
         Gates.

         `arbeitsbaum_sauber` bleibt beim ausgepackten Stand `null` und nicht
         `true`: dass ein Archiv per Bau seinem Commit entspricht, ist wahr, aber
         es ist nicht GEMESSEN, und ein Nachweis unterscheidet das. */
      commit: git('rev-parse', 'HEAD') || process.env.VD_AUSGEPACKTER_STAND || null,
      commit_quelle: git('rev-parse', 'HEAD') ? 'git'
        : (process.env.VD_AUSGEPACKTER_STAND ? 'ausgepackter-stand' : null),
      branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
      arbeitsbaum_sauber: git('rev-parse', 'HEAD') ? git('status', '--porcelain') === '' : null,
      ci: process.env.GITHUB_RUN_ID
        ? { lauf: process.env.GITHUB_RUN_ID, workflow: process.env.GITHUB_WORKFLOW || null }
        : null,
    },
    pruefling: {
      // Der Hash gehört zu dem, was der Browser wirklich geladen hat (der gebackene
      // Stand, HTML_GEBACKEN_PFAD) — nicht zum rohen Gerüst (HTML_PFAD), das seit dem
      // Schnitt-Nachtrag (18.09.2026) keinen einzigen Bereich mehr trägt. Ein Nachweis,
      // dessen Prüfsumme eine andere Datei benennt als die getestete, behauptet nur.
      datei: 'vivodepot.html (gebacken, s. tools/lib/kern-lesen.js#kernGebackenLesen)',
      sha256: createHash('sha256').update(HTML_INHALT).digest('hex'),
      groesse_byte: Buffer.byteLength(HTML_INHALT),
    },
    umgebung: {
      node: process.version,
      plattform: process.platform + '/' + process.arch,
      playwright: (() => { try { return require_('playwright/package.json').version; } catch { return null; } })(),
      browser: 'chromium (headless)',
    },
    ablaeufe: p.schritte,
    beobachtungen: {
      externe_requests: p.externeRequests,
      blockierte_requests: p.blockierteRequests,
      websockets: p.webSockets,
      erzeugte_dateien: p.dateien,
      qr_erzeuger_gelaufen: p.qrGelaufen,
      entschluesselte_werte_vorhanden: !!(p.entschluesselt && p.entschluesselt.vorname),
    },
    klartext_probe: p.klartextProbe,
    dauer_ms: p.dauer_ms,
    ergebnis: bestanden ? 'bestanden' : 'nicht bestanden',
  };
  fs.mkdirSync(ARTEFAKT_DIR, { recursive: true });
  fs.writeFileSync(ARTEFAKT_PFAD, JSON.stringify(nachweis, null, 2) + '\n', 'utf8');
  return nachweis;
}

describe('Offline-Garantie V1 — Kernabläufe im blockierten Lauf (B/C/D/E)', () => {
  let P = null;
  let ablaufFehler = null;

  before(async () => {
    try { P = await vollerAblauf(); }
    catch (e) { ablaufFehler = e; }
  }, { timeout: 300_000 });

  // Auch ein abgebrochener Lauf hinterlässt sein Protokoll — ein Nachweis, der nur bei
  // Erfolg entsteht, ist als Nachweis wertlos.
  after(() => { if (P) nachweisSchreiben(P); });

  test('[B] Der Ablauf läuft vollständig durch (kein Schritt umgangen)', () => {
    if (ablaufFehler) {
      const gefallen = ((P && P.schritte) || []).filter(s => !s.ok).map(s => s.schritt + ': ' + s.fehler);
      assert.fail('Ablauf abgebrochen — ' + ablaufFehler.message + (gefallen.length ? '\n  ' + gefallen.join('\n  ') : ''));
    }
    assert.deepEqual(P.schritte.filter(s => !s.ok), [], 'Schritte mit Fehler');
  });

  test('[B] NULL externe HTTP/S-Requests über den GESAMTEN Ablauf (inkl. PDF + Export)', () => {
    assert.ok(P, 'kein Protokoll — der Ablauf brach vorher ab');
    assert.deepEqual(P.externeRequests, [],
      `V1 stellte externe Netzwerkanfragen (Offline-Garantie verletzt):\n  ${P.externeRequests.join('\n  ')}`);
    assert.deepEqual(P.blockierteRequests, [],
      `Anfragen klopften an und wurden nur vom Blocker abgefangen — ohne Blocker wäre das ein Abfluss:\n  ${P.blockierteRequests.join('\n  ')}`);
  });

  test('[B] Keine WebSockets über den GESAMTEN Ablauf', () => {
    assert.ok(P, 'kein Protokoll — der Ablauf brach vorher ab');
    assert.deepEqual(P.webSockets, [], `WebSocket-Verbindungen geöffnet: ${P.webSockets.join(', ')}`);
  });

  test('[B] PDF- und Export-Pfade sind wirklich gelaufen (je eine echte Datei)', () => {
    assert.ok(P, 'kein Protokoll — der Ablauf brach vorher ab');
    const pdfs  = P.dateien.filter(n => n.toLowerCase().endsWith('.pdf'));
    const jsons = P.dateien.filter(n => n.toLowerCase().endsWith('.json'));
    assert.equal(pdfs.length, 3, `Erwartet 3 PDFs (Gesamt, Bereich, Notfallkarte), erzeugt: ${P.dateien.join(', ')}`);
    // 1, nicht 2: der offene Voll-JSON-Export ist entfernt (U2-ADR-NNN, 18.09.2026, s.
    // Kommentar an Schritt 5) — nur FHIR-IPS bleibt als JSON-Ausgabe.
    assert.equal(jsons.length, 1, `Erwartet 1 JSON-Export (FHIR-IPS), erzeugt: ${P.dateien.join(', ')}`);
    assert.equal(P.qrGelaufen, true, 'Der QR-Erzeuger lief NICHT mit (kein anrufbarer Notfallkontakt) — Nachweis unvollständig');
  });

  test('[C] Rückweg in dieselbe Komponente: eigene Datei wieder geöffnet und entschlüsselt', () => {
    assert.ok(P, 'kein Protokoll — der Ablauf brach vorher ab');
    assert.ok(P.depotDatei && P.depotDatei.endsWith('.vivodepot'), 'keine .vivodepot geschrieben');
    const e = P.entschluesselt || {};
    assert.equal(e.vorname, SENTINEL.vorname, 'Vorname kam nicht zurück');
    assert.equal(e.nachname, SENTINEL.nachname, 'Nachname kam nicht zurück');
    assert.equal(e.geburtsdatum, SENTINEL.geburtsdatum, 'Geburtsdatum kam nicht zurück');
    // Chip-Felder: der Anzeigetext trägt den Eingabewert (SNOMED-Auflösung macht aus
    // „Penicillin" den Anzeigenamen „Allergie gegen Penicillin" — Teilstring genügt).
    assert.match(String(e.allergien),   new RegExp(SENTINEL.allergien),   'Allergie kam nicht zurück: ' + e.allergien);
    assert.match(String(e.krankheiten), new RegExp(SENTINEL.krankheiten), 'Diagnose kam nicht zurück: ' + e.krankheiten);
    assert.match(String(e.medikamente), new RegExp(SENTINEL.medikamente), 'Medikament kam nicht zurück: ' + e.medikamente);
  });

  test('[D] Die geschriebene .vivodepot trägt KEIN Klartext-Personendatum', () => {
    assert.ok(P && P.klartextProbe, 'keine Klartext-Probe — der Ablauf brach vorher ab');
    const K = P.klartextProbe;
    // Zuerst: die Probe ist überhaupt aussagekräftig — jeder gesuchte Wert lag vor dem
    // Speichern wirklich im Klartext-Depot. Sonst wäre „nicht gefunden" eine Leerformel.
    assert.deepEqual(K.im_depot_verankert, [...KLARTEXT_PROBE],
      'Probe nicht aussagekräftig — diese Werte lagen vor dem Speichern gar nicht im Depot: '
      + KLARTEXT_PROBE.filter(w => !K.im_depot_verankert.includes(w)).join(', '));
    assert.deepEqual(K.gefunden_in_datei, [],
      'Klartext-Personendaten in der gespeicherten Datei: ' + K.gefunden_in_datei.join(', '));
    assert.deepEqual(K.gefunden_neben_ct, [],
      'Klartext-Personendaten NEBEN dem Ciphertext (Geschwister-Feld): ' + K.gefunden_neben_ct.join(', '));
    assert.equal(K.passwort_in_datei, false, 'Das Passwort steht in der Datei');
  });

  test('[E] Nachweis-Artefakt ist geschrieben und vollständig', () => {
    assert.ok(P, 'kein Protokoll — der Ablauf brach vorher ab');
    const n = nachweisSchreiben(P);
    assert.ok(fs.existsSync(ARTEFAKT_PFAD), 'Artefakt nicht geschrieben: ' + ARTEFAKT_PFAD);
    assert.ok(n.herkunft.commit, 'Commit-Hash fehlt im Nachweis');
    assert.ok(n.pruefling.sha256, 'Prüfling-Hash fehlt im Nachweis');
    assert.equal(n.ergebnis, 'bestanden', 'Nachweis-Artefakt meldet „nicht bestanden"');
  });
});
