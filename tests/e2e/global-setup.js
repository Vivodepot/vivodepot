'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — globalSetup: die vier Produkte einmal backen, vor dem ganzen Lauf
   ────────────────────────────────────────────────────────────────────────
   Schnitt-Nachtrag (18.09.2026): mit BUERGERMODUL_BUENDEL entfernt ist
   AB_WERK_BEREICH_QUELLEN im nativen Gerüst leer (gewollt) — jede Spec, die
   oeffneApp() unbesehen gegen die rohe vivodepot.html fuhr, prüfte in
   Wahrheit ein bereichsloses Gerüst, nicht ein Produkt (gemessen: 200 von
   423 E2E-Tests rot, praktisch alle strukturell an einem fehlenden
   Sektor-Element).

   DERSELBE WEG WIE DER NODE-TESTHARNESS (tests/load-kern.js,
   `_standardProduktBaken`) — keine zweite Fassung des Konfektionierens:
   beide backen über tests/produkt-test-backen.js, also über den
   Auslieferungs-Backschritt produktTextErzeugen, mit der einen benannten
   Test-Option mitEntwicklerleiste (Befund E2E-ARTEFAKT, 23.09.2026; die
   Gleichheit hält tests/e2e-artefakt-gleich-auslieferung.test.js). Gemessen (18.09.2026): alle vier
   Produkte zusammen backen kostet ~110ms — gegen einen zehnminütigen
   E2E-Lauf nicht meßbar, kein Grund, es pro Spec oder pro Worker zu
   wiederholen.

   GLOBALSETUP, NICHT PRO SPEC — DIE KONVENTION, NICHT DIE SONDERLOCKE:
   Playwright sieht genau diesen Ort für "einmal vor allen Specs etwas
   Teures bauen" vor. Die gebackenen Dateien landen in os.tmpdir() —
   derselbe Ort wie ABDECKUNG_PFAD in tests/load-kern.js — und werden von
   tests/e2e/helpers.js über file://-URLs geöffnet.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const REPO = path.join(__dirname, '..', '..');
const HTML_PFAD = path.join(REPO, 'vivodepot.html');

/* TMP1 (Auftrag, 19.09.2026, U2-ADR-225): die vier Pfade unten waren wörtlich feste
   Zeichenketten in os.tmpdir() — bei mehreren parallel laufenden Arbeitsbäumen (Regelfall in
   diesem Repo) kollidieren zwei Playwright-Läufe auf demselben Pfad, genau der Fehler, den
   U2-ADR-225 andernorts schon behoben hat. Weder mkdtempSync noch process.pid passen hier
   unverändert: dieselbe Konstante wird von ZWEI Prozessen gebraucht — dem globalSetup-Prozess,
   der sie SCHREIBT, und jedem Playwright-Worker-Prozess (eigener PID, kein geteilter
   Kindprozess-Speicher), der sie über `require('./global-setup.js')` erneut auswertet, um
   dieselbe Datei zu LESEN. Ein zufälliger (mkdtempSync) oder prozessgebundener (process.pid)
   Anteil wäre im Worker ein anderer als im Setup-Lauf — die Datei fände sich nie wieder.
   Der Arbeitsbaum-Pfad (REPO) ist dagegen in BEIDEN Prozessen identisch (derselbe Checkout)
   UND zwischen verschiedenen Arbeitsbäumen verschieden — genau die Eindeutigkeit, die hier
   gebraucht wird, ohne Datenfluss über eine Prozessgrenze. */
const REPO_KENNUNG = crypto.createHash('sha256').update(REPO).digest('hex').slice(0, 12);

const GEBACKENE_PRODUKT_PFADE = {
  'privat-de': path.join(os.tmpdir(), `vivodepot-e2e-gebacken-${REPO_KENNUNG}-privat-de.html`),
  'privat-en': path.join(os.tmpdir(), `vivodepot-e2e-gebacken-${REPO_KENNUNG}-privat-en.html`),
  'pro-de': path.join(os.tmpdir(), `vivodepot-e2e-gebacken-${REPO_KENNUNG}-pro-de.html`),
  'pro-en': path.join(os.tmpdir(), `vivodepot-e2e-gebacken-${REPO_KENNUNG}-pro-en.html`),
};

// S8 (U2-ADR-428): „OHNE Bündel" heißt seit dem Schnitt Deutsch OHNE Bereichs-Module — das nackte Gerüst trägt keinen Satz mehr und zeigt keinen Eingangsschirm.
// Dieselbe Auswahl wie `_standardProduktBaken(html, { ohneBereiche: true })` im Node-Weg (tests/load-kern.js).
// Der Pfad leitet sich vom Pfad des Produkts ab (gleiche Arbeitsbaum-Kennung, gleiches Verzeichnis) — kein zweiter, eigener Ort in os.tmpdir().
const GEBACKENES_PRIVAT_DE_OHNE_BEREICHE_PFAD = GEBACKENE_PRODUKT_PFADE['privat-de'].replace(/privat-de\.html$/, 'privat-de-ohne-bereiche.html');

function bakeProdukt(html, slug, opts) {
  const { testProduktText } = require(path.join(REPO, 'tests', 'produkt-test-backen.js'));
  return testProduktText(html, { slug, ohneBereiche: !!(opts && opts.ohneBereiche) });
}

const ALLE_GEBACKENEN_PFADE = () => [...Object.values(GEBACKENE_PRODUKT_PFADE), GEBACKENES_PRIVAT_DE_OHNE_BEREICHE_PFAD];

// Schreibt die fünf gebackenen Dateien — synchron und atomar (erst daneben schreiben, dann umbenennen): zwei Prozesse, die zugleich backen, sehen nie eine halbe Datei.
function gebackeneProdukteSchreiben() {
  const html = fs.readFileSync(HTML_PFAD, 'utf8');
  const ziele = Object.entries(GEBACKENE_PRODUKT_PFADE).map(([slug, pfad]) => [pfad, bakeProdukt(html, slug)]);
  ziele.push([GEBACKENES_PRIVAT_DE_OHNE_BEREICHE_PFAD, bakeProdukt(html, 'privat-de', { ohneBereiche: true })]);
  for (const [pfad, text] of ziele) {
    const daneben = pfad + '.' + process.pid + '.tmp';
    fs.writeFileSync(daneben, text, 'utf8');
    fs.renameSync(daneben, pfad);
  }
}

/* Für jedes Gate, das die gebackenen Dateien braucht, OHNE dass der E2E-Lauf vorher gelaufen ist (F3, 21.09.2026): die Konformitäts-Gates des pre-push laufen VOR dem E2E, das
   diese Dateien erst schreibt — in einem frischen Arbeitsbaum fehlten sie (ERR_FILE_NOT_FOUND), und im Baum von jemandem, der zufällig vorher E2E gefahren hatte, lief es grün.
   Fehlt eine Datei oder ist sie älter als der Kern, wird gebacken (~110 ms); sonst bleibt sie. */
function gebackeneProdukteSicherstellen() {
  const kernStand = fs.statSync(HTML_PFAD).mtimeMs;
  const veraltet = ALLE_GEBACKENEN_PFADE().some((pfad) => !fs.existsSync(pfad) || fs.statSync(pfad).mtimeMs < kernStand);
  if (veraltet) gebackeneProdukteSchreiben();
}

module.exports = async function globalSetup() {
  gebackeneProdukteSchreiben();
};

module.exports.gebackeneProdukteSicherstellen = gebackeneProdukteSicherstellen;
module.exports.GEBACKENE_PRODUKT_PFADE = GEBACKENE_PRODUKT_PFADE;
module.exports.GEBACKENES_PRIVAT_DE_OHNE_BEREICHE_PFAD = GEBACKENES_PRIVAT_DE_OHNE_BEREICHE_PFAD;
module.exports.bakeProdukt = bakeProdukt;
