'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E-Helfer (Teil 7) — gemeinsame Reise-Bausteine
   ────────────────────────────────────────────────────────────────────────
   Selektoren stammen 1:1 aus dem clean-rebuild (statisches Shell + Render-IDs):
   Welcome Lage A #w-anlass/#w-anfangen/#w-datei/#w-notfall · Lage B (crypto-overlay)
   #co-pw/#w-oeffnen/#co-angehoerige/#co-notfall · Depot-Anlage seit Strang 2 Commit A
   über Vorschau (#w-anfangen) → Topbar-Passwort-Hinweis (#tb-pw-hinweis → flowPasswortSetzen)
   → name-loser Verankerungs-Dialog (U2-ADR-017; A1/D46: der alte #tb-speichern-Knopf ist entfernt)
   #pw-neu/#pw-neu2/#m-ok · App-Shell #app.an, #content, Sidebar [data-sektor], Topbar
   #tb-modus-select/#tb-einstellungen · Sektor-Edit #b-bearb/[data-edit]/#b-fertig ·
   Wizard #wiz-weiter/#wiz-zurueck/#wiz-abbr · Modal #modal-rueck/#m-ok.
   ════════════════════════════════════════════════════════════════════════ */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { GEBACKENE_PRODUKT_PFADE, GEBACKENES_PRIVAT_DE_OHNE_BEREICHE_PFAD } = require('./global-setup.js');

const REPO_ROOT = path.join(__dirname, '..', '..');

/* Schnitt-Nachtrag (18.09.2026): Standard ist ein PRODUKT, das nackte Gerüst fordert man
   ausdrücklich an — dieselbe Symmetrie wie ladeKern()/ladeKern({blank:true}) im Node-Testweg.
   Vorher lud jede Spec, die oeffneApp() unbesehen rief, die rohe Datei — seit BUERGERMODUL_
   BUENDEL entfernt ist, hat die keine nativen Bereiche mehr (bereicheAlle()===0, gewollt).
   Die vier KERN_URL_*-Konstanten zeigen auf die von globalSetup einmalig gebackenen Dateien
   (tests/e2e/global-setup.js); KERN_URL_NACKT bleibt die rohe Kern-Datei, für eine Spec, die
   das Gerüst selbst prüfen will (z. B. gegen bereicheAlle()===0). */
const KERN_URL_NACKT = 'file://' + path.join(__dirname, '..', '..', 'vivodepot.html');
const KERN_URL_PRIVAT_DE = 'file://' + GEBACKENE_PRODUKT_PFADE['privat-de'];
// Deutsches Produkt OHNE Bereichs-Module (S8): Sprache und Eingangsschirm da, kein Bereich — für „Depot ohne Bündel".
const KERN_URL_PRIVAT_DE_OHNE_BEREICHE = 'file://' + GEBACKENES_PRIVAT_DE_OHNE_BEREICHE_PFAD;
const KERN_URL_PRIVAT_EN = 'file://' + GEBACKENE_PRODUKT_PFADE['privat-en'];
const KERN_URL_PRO_DE = 'file://' + GEBACKENE_PRODUKT_PFADE['pro-de'];
const KERN_URL_PRO_EN = 'file://' + GEBACKENE_PRODUKT_PFADE['pro-en'];

// file://-URL der Single-File-App — Standard ist das Produkt privat-de (s. Kommentar oben),
// nicht mehr die rohe Datei. Rückwärtskompatibler Name: bestehende Stellen, die KERN_URL lesen,
// bekommen jetzt das Produkt statt des nackten Gerüsts.
const KERN_URL = KERN_URL_PRIVAT_DE;

// Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): der Anlege-Weg holt jetzt ein Dateiziel
// (showSaveFilePicker) direkt beim Anlegen, nicht erst beim ersten Speichern — headless
// Chromium zeigt dafür keinen nativen Dialog, der Aufruf bliebe sonst unbeantwortet hängen.
// Default-Attrappe mit dem echten Schreibweg (createWritable/write/close), kein App-Bypass.
// Ein Test, der ein ANDERES Verhalten braucht (z. B. FSA bewusst abgeschaltet, wie
// 10-speicher-fehlschlag-sichtbar.spec.js Fall A), überschreibt sie NACH oeffneApp() per
// page.evaluate() auf der bereits geladenen Seite — addInitScript wirkt nur auf künftige
// Loads und würde sonst in Registrierungsreihenfolge wieder zurückgesetzt.
async function fsaStandardAttrappeEinrichten(page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({
        name: 'e2e-helfer.vivodepot',
        createWritable: async () => ({ write: async () => {}, close: async () => {} }),
      }),
    });
  });
}

// App laden und auf den Welcome-Screen (Lage A) warten.
//
// `url` ist optional und zeigt per Vorgabe auf die Kern-Datei im Arbeitsbaum. Der Parameter
// entstand fuer U2-ADR-321 (Abnahme gegen das AUSGELIEFERTE Nativ): dort ist die A-Seite eine
// EINGEFRORENE vivodepot.html aus der Historie (Commit 37038011, v501), die parallel zum
// heutigen Kanon in einem zweiten Kontext geladen wird — der native Bestand im Arbeitsbaum
// verschwindet mit dem Schnitt, die A-Seite muss darum von aussen kommen. Rueckwaertskompatibel:
// jeder bestehende Aufruf `oeffneApp(page)` bleibt unveraendert.
async function oeffneApp(page, { url = KERN_URL } = {}) {
  await fsaStandardAttrappeEinrichten(page);
  await page.goto(url);
  await page.waitForSelector('#w-anlass', { state: 'visible' });
}

// Neues Depot anlegen. Seit Strang 2 Commit A gibt es keinen „Depot anlegen"-Knopf mehr
// auf dem Erst-Schirm — der Weg führt passwortlos in die Vorschau (#w-anfangen) und von dort
// über den Topbar-Passwort-Hinweis (#tb-pw-hinweis) in den Anker-Dialog. „Setup-first"
// (vivodepot.html:12636): der Klick ruft flowDepotAnlegen() → Identitäts-Dialog mit Vorname +
// Nachname (BEIDE Pflicht im Anker) + Passwort + Bestätigung, also die Felder
// #id-vorname/#id-nachname/#id-pw/#id-pw2, bestätigt über #m-ok.
// (Früher: name-loses flowPasswortSetzen mit #pw-neu/#pw-neu2. Dieser Helfer wurde am 2026-07-02
//  nachgezogen, nachdem die erste CI-Probe die veraltete Selektor-Erwartung als 11 Timeouts
//  sichtbar machte — kein App-Fehler, nur der Test hing dem Umbau hinterher.)
async function depotAnlegen(page, { name = 'Maria Mustermann', pw = 'e2e-passwort-123' } = {}) {
  const teile = String(name).trim().split(/\s+/);
  const vorname = teile[0] || 'Maria';
  const nachname = teile.slice(1).join(' ') || 'Mustermann';        // Anker verlangt Nachname (Pflicht)
  await page.click('#w-anfangen');                                  // Lage A → Vorschau (passwortlos)
  await page.waitForSelector('#app.an', { state: 'attached' });
  await page.waitForSelector('#tb-pw-hinweis', { state: 'visible' });
  await page.click('#tb-pw-hinweis');                               // Vorschau → Anker-Dialog (flowDepotAnlegen)
  await page.waitForSelector('#id-pw', { state: 'visible' });
  await page.fill('#id-vorname', vorname);
  await page.fill('#id-nachname', nachname);
  await page.fill('#id-pw', pw);
  await page.fill('#id-pw2', pw);                                   // Bestätigung (Pflicht, == pw)
  await page.click('#m-ok');
  // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): der Anlege-Weg holt jetzt ein Dateiziel VOR
  // dem Anlegen. Auf FSA (Default-Attrappe aus oeffneApp) läuft das ohne sichtbaren Dialog durch;
  // hat ein Test FSA bewusst abgeschaltet, fragt hier EINMALIG der Nicht-FSA-Namens-Dialog
  // (#datei-name) — kurz warten, ob er erscheint, dann mit dem vorgeschlagenen Namen bestätigen.
  const dateiName = page.locator('#datei-name');
  if (await dateiName.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false)) {
    await page.click('#m-ok');
  }
  await page.waitForSelector('#tb-pw-hinweis', { state: 'hidden' }); // reale Sitzung: Onboarding-Hinweis weg
  await page.waitForSelector('#app.an', { state: 'attached' });
  await einmalDialogeSchliessen(page);                              // U2-ADR-095 + Wiedereinstieg, s. u.
  // Der Anlege-Weg landet OHNE Sidebar-Klick direkt auf `identitaet` (s. Kommentar an
  // `feldgruppenKartenOeffnen`) — ohne diesen Aufruf bliebe eine Reise, die hier direkt ein
  // `identitaet`-Feld füllt (statt erst `oeffneSektor` zu rufen), an der eingeklappten Statuskarte hängen.
  await feldgruppenKartenOeffnen(page);
  return { name, pw, vorname, nachname };
}

/* Nach dem Anlegen können EINMAL-Dialoge anfallen, die keine Reise erwartet: der
   Wiedereinstiegs-Hinweis (beim ersten Datei-Sichern) und seit U2-ADR-095 das
   Notfall-Blatt-Angebot. Sie liegen über der Sitzung und fangen jeden folgenden Klick ab
   (Playwright meldet dann „#modal-inhalt intercepts pointer events" an einer Stelle, die
   damit nichts zu tun hat).

   Bewusst NICHT auf einen bestimmten Dialog verdrahtet: welche anfallen und in welcher
   Reihenfolge, hängt am Speicher-Modus der Umgebung (Datei vs. intern). Der Helfer räumt
   ab, was da ist — „Später" beim Angebot, sonst der Bestätigungs-Knopf — bis der Modal-Host
   frei ist. So bricht die Reise nicht, wenn morgen ein weiterer Einmal-Hinweis dazukommt. */
async function einmalDialogeSchliessen(page, fristMs = 10000) {
  const ende = Date.now() + fristMs;
  let angebotWeg = false;
  while (Date.now() < ende) {
    // NUR an den festen Griffen entscheiden, nie „irgendeinen offenen Dialog wegklicken":
    // ein blinder Klick auf #m-ok traf schon den Anlege-Dialog (Doppel-Absenden) bzw. das
    // Angebot selbst (dann ging das Druck-Blatt auf und blockierte die Reise erst recht).
    if (await page.locator('#nfb-angebot').isVisible().catch(() => false)) {
      await page.click('#m-zweit');                 // „Später" — der Weg der Bürgerin, die jetzt nicht druckt
      angebotWeg = true;
    } else if (await page.locator('#wiedereinstieg-hinweis').isVisible().catch(() => false)) {
      await page.click('#m-ok');                    // Einmal-Hinweis bestätigen
    } else if (angebotWeg && !(await page.locator('#modal-rueck.an').count())) {
      return;                                       // Angebot war da, ist weg, Host frei
    }
    await page.waitForTimeout(100);
  }
  throw new Error('Einmal-Dialoge nach dem Anlegen nicht abgeräumt (Frist ' + fristMs + ' ms) — '
    + 'erschien das Notfall-Blatt-Angebot (#nfb-angebot) nicht?');
}

// Statuskarten (Task B.1, 26.08.2026, SEKTION_STATUSKARTEN_CLUSTER): überladene Sektionen
// (bisher nur `identitaet`/`person`) rendern ihre Felder jetzt in eingeklappten
// `<details class="feldgruppen-karte">`-Karten statt flach — dieselbe Öffnen-vor-Zugriff-Falle
// wie bei `details.nav-gruppe` (s. `oeffneSektor` unten), nur eine Ebene tiefer. EIGENE Funktion
// (T11-Muster), aufgerufen sowohl von `oeffneSektor` (Sektor-Wechsel über die Sidebar) als auch
// von `depotAnlegen` (der Anlege-Weg landet OHNE Sidebar-Klick direkt auf `identitaet` — ohne
// diesen zweiten Aufruf bliebe genau dieser Landeweg unentdeckt zu).
//
// `.nth(0)` in einer while-Schleife, NICHT `nth(i)` über einen vorab gezählten Bereich: der
// Selektor ist `:not([open])` und schrumpft mit jedem Klick — `nth(i)` mit wachsendem i überspringt
// dann jedes zweite Element (nth(1) der NEUEN, bereits um eins kürzeren Liste ist nicht mehr das,
// was vor dem ersten Klick an Position 1 stand). Bei `person` (fünf Karten) hängt das sichtbar.
// D.2 (Rest-Sichten, 26.08.2026): `.situation-block` (renderSituation, Situationsblatt `erbfall`)
// ist optisch/mechanisch dieselbe Klapp-Karte wie `.feldgruppen-karte`, trägt aber bewusst NICHT
// dieselbe HTML-Klasse (s. Kommentar bei der CSS-Selektorliste in vivodepot.html) — der Selektor
// hier deckt beide ab, damit dieselbe Öffnen-vor-Zugriff-Falle nicht zweimal gelöst werden muss.
async function feldgruppenKartenOeffnen(page) {
  const karten = page.locator('#content .feldgruppen-karte:not([open]) > summary, #content .situation-block:not([open]) > summary');
  const irgendeineGeschlossen = await karten.count();
  while (await karten.count()) await karten.first().click();
  // Jeder .click() oben scrollt sein Ziel erst in den sichtbaren Bereich (Playwright-
  // Aktionsfähigkeitsprüfung) — bei mehreren Karten bleibt #content danach irgendwo bei der
  // zuletzt geöffneten Karte stehen, nicht oben. Ein echter Klick auf EINE Karte träfe das
  // nicht (kein Grund zu scrollen, wenn eh nur eine offen ist); erst das Aufklappen ALLER
  // Karten hier (ein Test-Artefakt, keine reale Bedienung) verschiebt die Position sichtbar.
  // Reset nur, wenn wirklich etwas geöffnet wurde — sonst kein unnötiger Eingriff in Tests,
  // die bewusst eine bestimmte Scroll-Position prüfen, bevor überhaupt eine Karte zu ist.
  if (irgendeineGeschlossen) await page.evaluate(() => { const c = document.getElementById('content'); if (c) c.scrollTop = 0; });
}

// D.4 (Rest-Sichten, 26.08.2026): fast jeder Einstellungen-Abschnitt liegt jetzt hinter
// <details class="einst-abschnitt"> (kollabiert per Default, Kurzstatus statt vollem Erklärsatz
// in der <summary>) — Barrierefreiheit bleibt als einziges schlichtes <section> ausgenommen.
// Ein Ziel-Element innerhalb eines kollabierten Abschnitts (z. B. `#einst-export-json`,
// `#einst-modul-einlassen`, `#einst-install-block`) ist erst sichtbar, nachdem die zugehörige
// <summary> geklickt wurde — derselbe Öffnen-vor-Zugriff-Griff wie feldgruppenKartenOeffnen()
// oben, nur für die Einstellungen statt für Statuskarten. Nach dem Klick auf `#tb-einstellungen`
// aufrufen, mit dem Selektor des Elements, das gleich gebraucht wird.
async function einstellungenAbschnittOeffnen(page, zielSelektor) {
  const summary = page.locator('#modal-inhalt details.einst-abschnitt:has(' + zielSelektor + '):not([open]) > summary');
  if (await summary.count()) await summary.click();
}

// Einen Bereich (Sektor) über die Sidebar öffnen.
// U2-ADR-171 (25.08.2026): die EINTRAGEN-Liste steckt seither in fünf Themen-Clustern +
// Auffangbecken „Module" unter `<details class="nav-gruppe">` — derselbe Befund wie bei
// `wizardStarten()` (s. u.): der native `<summary>` muss erst geklickt werden, sonst ist
// `[data-sektor]` unsichtbar/nicht interaktionsfähig. EIN Fix hier statt an den ca. 80
// Aufrufstellen dieser Funktion einzeln (T11-Muster).
//
// Fortsetzen-Fokus (26.08.2026): eine weitere Verschachtelungsebene kam hinzu —
// `<details class="bereiche-umschalter">` ("Alle Bereiche zeigen") umschließt jetzt den
// gesamten Zwölf-Bereiche-Baum, Standard-Zustand ZU. Dasselbe Öffnen-vor-Zugriff-Muster: erst
// den Umschalter aufklappen, dann wie gehabt die Cluster-Gruppe.
//
// Zwei Playwright-Fallen dabei entdeckt (mit einem Wegwerf-Debug-Spec nachgemessen, nicht nur
// vermutet):
// 1) Der `has:`-Filter-Locator wird RELATIV zum Kandidaten ausgewertet (wie `:scope` darunter) —
//    ein Selektor MIT Vorfahren-Präfix (`details.bereiche-umschalter [data-sektor="…"]`) sucht
//    dann nach einem VERSCHACHTELTEN `.bereiche-umschalter` INNERHALB der Kandidaten-`nav-gruppe`
//    (den es nicht gibt, `.bereiche-umschalter` ist ja deren Vorfahre) — `gruppe.count()` war 0,
//    obwohl das Markup korrekt war. Der `has:`-Locator bleibt darum UNVERENGT
//    (`[data-sektor="…"]` ohne Präfix) — die Verengung ist hier unnötig: `has:` prüft ohnehin nur
//    Nachfahren DES jeweiligen Kandidaten, der flache „Weitermachen"-Knopf (außerhalb jeder
//    `nav-gruppe`) kann also nie fälschlich matchen.
// 2) Der eigentliche Klick-Locator (`knopf`, unten) MUSS dagegen verengt bleiben: ein bereits
//    besuchter Bereich erscheint nach diesem Umbau ZWEIMAL im Markup (einmal flach unter
//    „Weitermachen", einmal weiterhin an seinem Platz im Zwölf-Bereiche-Baum) — ohne die
//    Verengung auf `details.bereiche-umschalter [data-sektor="…"]` würde `.click()` im Strict
//    Mode an zwei Treffern scheitern, sobald derselbe Bereich ein zweites Mal geöffnet wird.
async function oeffneSektor(page, sektorId) {
  const umschalter = page.locator('details.bereiche-umschalter');
  if (await umschalter.count()) {
    const umschalterOffen = await umschalter.evaluate((el) => el.open);
    if (!umschalterOffen) await umschalter.locator('summary').first().click();
  }
  const gruppe = page.locator('details.nav-gruppe', { has: page.locator(`[data-sektor="${sektorId}"]`) });
  if (await gruppe.count()) {
    const offen = await gruppe.evaluate((el) => el.open);
    if (!offen) await gruppe.locator('summary').click();
  }
  const knopf = page.locator(`details.bereiche-umschalter [data-sektor="${sektorId}"]`);
  await knopf.click();
  await page.waitForSelector('#content .bereich-kopf');
  await feldgruppenKartenOeffnen(page);
}

// Im offenen Bereich ein Feld setzen — typ-bewusst (U2-Inline-Edit, kein #b-bearb/#b-fertig):
//   • skalares  [data-edit]        → tippen
//   • Code-Liste [data-edit-code]   → Anzeige-Name tippen (codeWertAus löst den Code auf)
//   • Ref        [data-edit-ref]/[data-edit-override] → Freitext-Override (legitimer Eingabeweg)
// Commit via bearbeitungSpeichern()+renderContent() — sektorweit speichern + Stempel mit aktuellem Akteur.
async function setzeFeld(page, feldId, wert) {
  if (await page.locator(`[data-edit-code="${feldId}"]`).count()) {
    await page.fill(`[data-edit-code="${feldId}"]`, wert);
  } else if (await page.locator(`[data-edit-ref="${feldId}"]`).count()) {
    await page.fill(`[data-edit-override="${feldId}"]`, wert);
  } else {
    await page.fill(`[data-edit="${feldId}"]`, wert);
  }
  await page.evaluate(() => { window.__vdOeffentlich.bearbeitungSpeichern(); window.__vdOeffentlich.renderContent(); });
  // `renderContent()` baut die Sektion NEU aus dem Katalog auf (anders als die echte, gezielt
  // fokus-schonende Autosave, die bewusst NICHT neu rendert — s. Kommentar an `_autoSaveWennFeld`)
  // — jede zuvor per Klick geöffnete `.feldgruppen-karte` kommt darum wieder EINGEKLAPPT zurück.
  // Ein Aufrufer, der mehrere Felder derselben Karte hintereinander über `setzeFeld` setzt (z. B.
  // strasse → plz_ort → telefon, alle in „Kontakt & Anschrift"), fände das zweite Feld sonst
  // wieder unsichtbar. Erneut öffnen ist günstig: bei nicht-geclusterten Sektionen ist die Liste
  // leer, die while-Schleife in `feldgruppenKartenOeffnen` kostet dann nur eine leere Zählung.
  await feldgruppenKartenOeffnen(page);
}

// Einen Assistenten (Wizard-Start) im offenen Bereich anklicken.
// „Startseite und Oberfläche" (12.08.2026, Zug 5) — der wiederkehrende Befund aus drei
// vorigen Berichten: Assistenten-Einstiege sitzen unter `<details class="wizard-gruppe">`, der
// native `<summary>` muss erst geklickt werden, sonst ist der `[data-wizard-start]`-Knopf
// unsichtbar/nicht interaktionsfähig (Playwright wartet sonst grundlos oder bricht ab). Steht
// die Gruppe schon offen (nur EIN Assistent im Bereich rendert ohne umschliessende `<details>`,
// s. `assistentenHTML` in `renderContent`), ist der Summary-Klick einfach ein No-op-Fall, den
// diese Funktion selbst prüft statt ihn dem Aufrufer zu überlassen.
async function wizardStarten(page, wizardId) {
  const knopf = page.locator(`[data-wizard-start="${wizardId}"]`);
  const gruppe = page.locator('details.wizard-gruppe', { has: knopf });
  if (await gruppe.count()) {
    const offen = await gruppe.evaluate((el) => el.open);
    if (!offen) await gruppe.locator('summary').click();
  }
  await knopf.click();
}

// Modus über den Demo-Umschalter der Topbar wechseln (anker | vollmacht | notfall).
// Der Umschalter (<select id="tb-modus-select"> in .dev-leiste) ist im Normalbetrieb ausgeblendet
// (CSS display:none; nur mit ?dev=1 sichtbar). Für den Test blenden wir die Dev-Leiste ein und
// nutzen dann den ECHTEN onchange-Pfad des Selects (bearbeitungSpeichern → Modus._setzeIntern) —
// kein Bypass, sondern genau der Weg, den ?dev=1 auch einem Menschen gäbe.
async function setzeModus(page, modus) {
  await page.evaluate(() => { const dl = document.querySelector('.dev-leiste'); if (dl) dl.style.display = 'inline-flex'; });
  await page.selectOption('#tb-modus-select', modus);
}

// Lokaler HTTP-Server für Specs, die echtes http:// brauchen (interner Speicher-Modus,
// IndexedDB — file:// zählt dafür als anderer Modus). Schnitt-Nachtrag (19.09.2026): war
// 6× wortgleich dupliziert (u2-adr-212/222/237, 10-speicher-fehlschlag, s11-zielwechsel,
// zug5-persistenz), jede Kopie lieferte `/vivodepot.html` roh von der Platte aus — seit
// BUERGERMODUL_BUENDEL entfernt ist, hat das keine nativen Bereiche mehr, genau derselbe
// Fund wie bei KERN_URL oben. Konsolidiert UND korrigiert: `/vivodepot.html` (und `/`)
// liefert jetzt das gebackene privat-de aus, wie KERN_URL es für file:// bereits tut. Jeder
// andere Pfad (Assets, falls je gebraucht) kommt weiterhin unverändert von der Platte.
function starteLokalenServer() {
  const MIME = { '.html': 'text/html', '.js': 'application/javascript' };
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const angefragt = req.url === '/' ? '/vivodepot.html' : req.url.split('?')[0];
      const fp = angefragt === '/vivodepot.html'
        ? GEBACKENE_PRODUKT_PFADE['privat-de']
        : path.join(REPO_ROOT, angefragt);
      fs.readFile(fp, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    srv.listen(0, () => resolve(srv));
  });
}

/* ── Browser-seitige JWS-Erzeugung, OHNE Kern-Internas (19.09.2026) ──────────────────────────
   Der Kern-Verschluss (Kommentar an window.__vdOeffentlich in vivodepot.html) legt
   `_jwsImportSignKey`/`_signJWS` BEWUSST NICHT auf die öffentliche Fläche — Krypto-Primitive,
   die ein Prüfer dort finden würde, wären selbst ein Befund. E2E-Specs, die ein SIGNIERTES
   Test-Bündel bauen (Fremdmarke, fremde Vorlage, Piloten-Andockketten), brauchen darum ihre
   EIGENE, vom Kern unabhängige JWS-Erzeugung — dieselbe Schnittstelle, die ein echter externer
   Aussteller nutzen würde (RFC 7515 Compact Serialization, Ed25519/EdDSA), nicht einen Zugriff
   auf das Innenleben. Beide Funktionen laufen ABSICHTLICH im Browser (page.evaluate), nicht in
   Node: der Mehrwert dieser Specs ist echte Browser-WebCrypto statt Nodes Polyfill (s. Kopf-
   Kommentar marke-e2e-abnahme.spec.js) — das bleibt unverändert, nur der Signaturweg führt jetzt
   an den Kern-Internas vorbei statt durch sie hindurch.

   Playwright serialisiert eine übergebene Funktion mit `.toString()` und führt sie im Browser
   aus — beide Funktionen sind darum bewusst in sich geschlossen (keine Closure über
   Node-Variablen), nur Browser-Globale (`crypto`, `btoa`, `TextEncoder`). */
async function browserEd25519SchluesselpaarErzeugen() {
  const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  return {
    privJwk: await crypto.subtle.exportKey('jwk', kp.privateKey),
    pubJwk: await crypto.subtle.exportKey('jwk', kp.publicKey),
  };
}
async function browserJwsSignieren({ payload, privJwk }) {
  const b64uBytes = (bytes) => {
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let bin = '';
    for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const b64uString = (s) => b64uBytes(new TextEncoder().encode(s));
  const signKey = await crypto.subtle.importKey('jwk', privJwk, { name: 'Ed25519' }, false, ['sign']);
  const header = { alg: 'EdDSA', typ: 'vc+jwt' };
  const h = b64uString(JSON.stringify(header));
  const p = b64uString(typeof payload === 'string' ? payload : JSON.stringify(payload));
  const signingInput = h + '.' + p;
  const sig = await crypto.subtle.sign({ name: 'Ed25519' }, signKey, new TextEncoder().encode(signingInput));
  return signingInput + '.' + b64uBytes(new Uint8Array(sig));
}

module.exports = {
  KERN_URL, KERN_URL_NACKT, KERN_URL_PRIVAT_DE, KERN_URL_PRIVAT_EN, KERN_URL_PRO_DE, KERN_URL_PRO_EN, KERN_URL_PRIVAT_DE_OHNE_BEREICHE,
  oeffneApp, depotAnlegen, einmalDialogeSchliessen, oeffneSektor, setzeFeld, setzeModus,
  fsaStandardAttrappeEinrichten, wizardStarten, feldgruppenKartenOeffnen, einstellungenAbschnittOeffnen,
  starteLokalenServer,
  browserEd25519SchluesselpaarErzeugen, browserJwsSignieren,
};
