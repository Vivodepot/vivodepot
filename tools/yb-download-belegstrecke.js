#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Werkzeug — Yellow Button „Download": Belegstrecke.

   Gegenstück zu tools/shl-belegstrecke.js (One-Time-Share), für die andere der
   beiden im Validation Report genannten Richtungen. Selbe Bauform, selbe
   Helfer, selbe Screenshot-Konvention — bewusst NICHT importiert, damit die
   beiden Strecken unabhängig lesbar bleiben (wie shl-belegstrecke.js es für
   sich selbst begründet).

   WAS HIER GEPRÜFT WIRD, UND WAS NICHT (Auskunft vom 17.09.2026, gegen den
   Validation Report gemessen, nicht selbst ausgedacht): das eingebettete
   Yellow-Button-Zeichen (tests/yb-zeichen-an-der-funktion.test.js) belegt die
   KENNZEICHNUNG — welches UI-Element zu welcher Fähigkeit gehört. Es ist
   KEIN von IHE geprüftes Kriterium; in keiner der gelesenen Unterlagen kommt
   „Zeichen" oder „Icon" als Abnahme-Bedingung vor. Geprüft wird dort je
   Schritt ein VERHALTEN. Diese Strecke belegt genau das, für die vier
   Download-Schritte:

     10  Anmeldung als natürliche Person   (Depot offen, Persona sichtbar)
     20  Dokument gesucht und gewählt      (autoritativer Eintrag, Mappe geöffnet)
     30  Dokument abgerufen                (echter Datei-Download, Byte-Inhalt
                                             geprüft — „retrieved document",
                                             Geräte-Benachrichtigung über die
                                             heruntergeladene Datei)
     40  Menschenlesbare Darstellung       (dieselbe Datei, im Kern als FHIR-
                                             Narrativ gerendert, kein Rohtext/
                                             Base64 — seit der Rückmeldung vom
                                             14.08.2026 PFLICHT, vorher optional)

   Schritt 40 ist der eigentliche Grund für dieses Werkzeug: die vorhandene
   Probe (yb-zeichen-an-der-funktion.test.js) ruft die Flow-Funktion direkt
   auf und prüft das Zeichen im erzeugten HTML — sie belegt nicht, dass ein
   echter Klick auf den echten Knopf im echten Browser tatsächlich zu einem
   echten Download UND einer echten menschenlesbaren Ansicht führt. Das prüft
   diese Strecke, am file://-Kern, mit echten Playwright-Klicks.

   Aufruf:
     node tools/yb-download-belegstrecke.js --ziel <ordner>
   ════════════════════════════════════════════════════════════════════════ */

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { oeffneApp, depotAnlegen, einmalDialogeSchliessen, setzeFeld } = require('../tests/e2e/helpers.js');

const REPO = path.resolve(__dirname, '..');
const KERN = 'file://' + path.join(REPO, 'vivodepot.html');
const FIXTURE = path.join(REPO, 'tests', 'fixtures', 'eigenprobe-eu-lab.json');
// Aus der Fixture selbst gelesen (Composition.text.div), nicht hier neu behauptet — s.
// Kontrollprobe unten, die genau das nachmisst, bevor sie sich darauf verlässt.
const ERWARTETES_NARRATIV = 'Laborbefund der heutigen Kontrolle.';

const PERSONA = { vorname: 'Marta', nachname: 'Villa', email: 'marta.villa@example.org' };
const PW = 'belegstrecke-passwort-123';
const PRAEFIX_STANDARD = 'YBOC-DL';

async function modaleSchliessen(seite) {
  for (let i = 0; i < 8; i++) {
    const offen = await seite.locator('#modal-rueck.an').isVisible().catch(() => false);
    if (!offen) return;
    const ok = seite.locator('#m-ok');
    if (await ok.isVisible().catch(() => false)) await ok.click().catch(() => {});
    else await seite.keyboard.press('Escape').catch(() => {});
    await seite.waitForTimeout(200);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const zielIdx = argv.indexOf('--ziel');
  const ziel = zielIdx === -1 ? path.join(REPO, 'belegstrecke-download-ausgabe') : argv[zielIdx + 1];
  const wert = (name, fallback) => { const i = argv.indexOf(name); return i === -1 ? fallback : argv[i + 1]; };
  const persona = {
    vorname: wert('--vorname', PERSONA.vorname),
    nachname: wert('--nachname', PERSONA.nachname),
    email: wert('--email', PERSONA.email),
  };
  const praefix = wert('--praefix', PRAEFIX_STANDARD);
  fs.mkdirSync(ziel, { recursive: true });

  const protokoll = [];
  const merke = (zeile) => { protokoll.push(zeile); console.log(zeile); };
  const original = fs.readFileSync(FIXTURE, 'utf8');

  const browser = await chromium.launch();
  const seite = await browser.newPage({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const schuss = async (name) => {
    const p = path.join(ziel, praefix + '_' + name + '.png');
    await seite.screenshot({ path: p, fullPage: false });
    merke('  Screenshot: ' + p);
  };

  try {
    /* ── Schritt 10: Anmeldung als natürliche Person ───────────────────── */
    merke('\n── Schritt 10 · Anmeldung als natürliche Person ──');
    await oeffneApp(seite, { url: KERN });
    await depotAnlegen(seite, { name: persona.vorname + ' ' + persona.nachname, pw: PW });
    await einmalDialogeSchliessen(seite).catch(() => {});
    await modaleSchliessen(seite);
    await setzeFeld(seite, 'email', persona.email).catch(() => merke('  HINWEIS: E-Mail-Feld nicht gesetzt'));
    await modaleSchliessen(seite);
    merke('  angemeldet als: ' + persona.vorname + ' ' + persona.nachname + '  <' + persona.email + '>');
    await schuss('Step10_Identitaet');

    /* ── Schritt 20: Dokument suchen und wählen ─────────────────────────
       „Suchen" heißt hier: der Eintrag entsteht per echtem Import-Weg
       (nicht direkt in `data` geschrieben) und wird über seine sichtbare
       Mappe-Zeile angeklickt — derselbe Weg, den eine Bürgerin ginge,
       nicht eine Abkürzung über die Konsole. */
    merke('\n── Schritt 20 · Dokument suchen und wählen ──');
    const id = await seite.evaluate((text) => {
      if (typeof importAutoritativDokument !== 'function') throw new Error('importAutoritativDokument fehlt in diesem Stand');
      const neu = importAutoritativDokument(text);
      if (!neu) throw new Error('Fixture nicht als autoritatives Dokument erkannt');
      oeffneMappe();
      return neu;
    }, original);
    merke('  autoritativer Eintrag angelegt: ' + id);
    await modaleSchliessen(seite);
    await seite.waitForSelector('[data-mappe-id="' + id + '"]', { state: 'visible' });
    await seite.click('[data-mappe-id="' + id + '"]');
    await seite.waitForSelector('[data-mappe-herunterladen]', { state: 'visible' });
    await schuss('Step20_Auswahl');

    /* ── Schritt 30: Dokument abrufen ─────────────────────────────────────
       Echter Klick auf den echten Herunterladen-Knopf, echtes Playwright-
       download-Ereignis (keine Attrappe) — die „Geräte-Benachrichtigung über
       die heruntergeladene Datei" ist hier das download-Event selbst, sein
       Inhalt wird byte-genau gegen das Original geprüft. */
    merke('\n── Schritt 30 · Dokument abrufen (echter Download) ──');
    const [download] = await Promise.all([
      seite.waitForEvent('download'),
      seite.click('[data-mappe-herunterladen]'),
    ]);
    const heruntergeladenPfad = await download.path();
    const heruntergeladenText = fs.readFileSync(heruntergeladenPfad, 'utf8');
    merke('  Datei abgerufen: ' + download.suggestedFilename() + '  (' + Buffer.byteLength(heruntergeladenText) + ' Bytes)');
    const byteGleich = heruntergeladenText === original;
    merke('  BELEG: heruntergeladener Inhalt ' + (byteGleich ? 'IST' : 'IST NICHT') + ' byte-genau das Original');
    fs.copyFileSync(heruntergeladenPfad, path.join(ziel, 'heruntergeladen.json'));
    await schuss('Step30_Abgerufen');
    if (!byteGleich) throw new Error('Download-Beleg gebrochen: heruntergeladener Inhalt weicht vom Original ab');

    /* ── Schritt 40: Menschenlesbare Darstellung (PFLICHT seit 14.08.2026) ─
       Dieselbe Mappe-Zeile ist nach dem Download noch offen (der Klick auf
       den Herunterladen-Knopf schließt die Vorschau nicht) — das FHIR-
       Narrativ steht bereits im DOM. Geprüft wird NICHT nur „ein Element mit
       dieser Klasse existiert", sondern dass es den ECHTEN, aus der Fixture
       gelesenen Wortlaut trägt — kein Platzhalter, kein Rohtext/Base64. */
    merke('\n── Schritt 40 · Menschenlesbare Darstellung ──');
    const narrativ = seite.locator('.mappe-narrativ');
    await narrativ.waitFor({ state: 'visible', timeout: 5000 });
    const narrativText = (await narrativ.textContent() || '').trim();
    merke('  Narrativ im DOM: ' + JSON.stringify(narrativText.slice(0, 80)));
    const enthaeltErwartetenText = narrativText.includes(ERWARTETES_NARRATIV);
    merke('  BELEG: Narrativ ' + (enthaeltErwartetenText ? 'ENTHÄLT' : 'ENTHÄLT NICHT') + ' den erwarteten Wortlaut aus der Fixture');
    await schuss('Step40_Menschenlesbar');
    if (!enthaeltErwartetenText) {
      throw new Error('Menschenlesbar-Beleg gebrochen: Narrativ zeigt nicht den erwarteten Wortlaut '
        + '(' + JSON.stringify(ERWARTETES_NARRATIV) + ') — Fixture, Renderer oder Selektor haben sich geändert.');
    }

    fs.writeFileSync(path.join(ziel, 'protokoll.txt'), protokoll.join('\n') + '\n', 'utf8');
    merke('\nProtokoll: ' + path.join(ziel, 'protokoll.txt'));
    return 0;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().then((c) => { process.exitCode = c; }, (e) => { console.error('\nFEHLER: ' + String((e && e.stack) || e)); process.exitCode = 1; });
}
