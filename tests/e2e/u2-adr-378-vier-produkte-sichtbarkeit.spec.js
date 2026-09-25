'use strict';
/* ════════════════════════════════════════════════════════════════════════
   U2-ADR-378 (08.09.2026, nach Fund von e2/)
   ────────────────────────────────────────────────────────────────────────
   "Gebaut ist nicht erreichbar; ein Wächter prüft Gültigkeit, nicht Wirkung."
   tests/produkt-konfektionieren.test.js beweist: byte-gleiches Gerüst, ein
   echtes signiertes Zusatzmodul nur bei Pro — das prüft die DATEIEN NEBENAN,
   nicht was ein Mensch SIEHT, wenn er eine der vier Dateien per Doppelklick
   öffnet. Diese Probe tut genau das: erzeugt die vier Produkte über den
   ECHTEN Weg (tools/produkt-konfektionieren.js + tools/lib/vier-produkte.js,
   nicht nachgebaut), öffnet jede vivodepot.html über file:// (kein Server,
   kein Anmelde-Testhaken, keine direkte Funktions-Anrufung, die im echten
   Öffnen nicht existiert) und behauptet, was ein Mensch SÄHE.

   DER WÄCHTER STAND URSPRÜNGLICH ABSICHTLICH UMGEDREHT — er behauptete die
   damalige, gemessene Wahrheit (die vier Produkte visuell UNUNTERSCHEIDBAR).
   BEIDE GRÜNDE SIND SEITHER GELANDET (08.09.2026, gemessen beim Umdrehen,
   nicht angenommen): das Bereichs-Modul ist ausgeliefertes Artefakt
   (U2-ADR-379/U2-ADR-387-Nachtrag: "das Bereichs-Modul IST im Kanon") UND das
   Backen selbst ("das Einbacken — Sprache/Bereich/Logikmodul werden Nutzlast
   im Gerüst, nicht Begleitdatei", U2-ADR-387-Nachtrag) — beim Nachlauf auf
   dieser Basis stand die Probe bereits 3 von 4 ROT, exakt wie der
   ursprüngliche Kopf-Kommentar es für diesen Fall angekündigt hatte. Diese
   Fassung dreht die betroffenen Zeilen um, wie angekündigt: `toContainText`/
   `toHaveCount(1)` statt der `not`-Form, "zeigt jetzt" statt "zeigt NOCH".

   PRO-ACHSE ENGLISCH (08.09.2026): pro-en zeigte trotz beider
   gelandeter Gründe zunächst noch die DEUTSCHE Logikmodul-Prosa (derselbe
   PRO_MODUL_PFAD wie pro-de, kein EN-Zwilling) UND die deutschen Bereichs-
   Rubriken-Labels (kein additiver EN-Textsatz für die sechs `<bereichId>.
   label`-Kennungen) — zwei eigene, engere Lücken innerhalb der bereits
   geschlossenen großen. Diese Fassung schließt beide: `tools/lib/
   vier-produkte.js` referenziert für pro-en einen eigenen EN-Logikmodul-Pfad,
   und das EN-Sprachmodul trägt die sechs Bereichs-Label-Kennungen (aus
   `betriebssatz-inhalte.js`, s. `tools/textsatz-en-pro-bereich-daten.js`).
   Die beiden Proben am Ende dieser Datei halten BEIDE Richtungen fest: die
   englische Rubrik erscheint, UND die deutsche erscheint NICHT mehr — ein
   Revert der Verdrahtung ließe genau diese Proben rot werden. */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../../tools/lib/vier-produkte.js');
const { ladeIssuer } = require('../load-issuer.js');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

const WELCOME_DE = 'Was möchten Sie erledigen?';
const WELCOME_EN = 'What would you like to do?';
const PRO_KARTE_SELEKTOR = '[data-modul-karte="pro-geschaeftsfuehrerin-notfallmappe"]';
const PRO_BEREICH_ID = 'pro-vertretung-vollmachten';
const PRO_BEREICH_LABEL_DE = 'Vertretung und Vollmachten';
const PRO_BEREICH_LABEL_EN = 'Authority and powers of attorney';

let ziel;
const ordner = {};

test.beforeAll(() => {
  ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'u2-adr-378-vier-produkte-'));
  const { V: issuer } = ladeIssuer();
  for (const p of PRODUKTE) {
    const unsignierteModulDateien = modulDateienFuer(p);
    const r = konfektionieren({
      ziel, slug: p.slug, modulauswahl: [],
      vorDepotKonfigurationInhaltFn: issuer.vorDepotKonfigurationDateiInhalt,
      unsignierteModulDateien,
    });
    ordner[p.slug] = r.ordner;
  }
});

test.afterAll(() => {
  if (ziel) fs.rmSync(ziel, { recursive: true, force: true });
});

function produktUrl(slug) {
  return 'file://' + path.join(ordner[slug], 'vivodepot.html');
}

test('[U2-ADR-378] privat-de: Willkommen Deutsch, kein Pro-Merkmal (Gegenprobe — bleibt grün auch nach 369/379)', async ({ page }) => {
  await oeffneApp(page, { url: produktUrl('privat-de') });
  await expect(page.locator('#w-anlass')).toContainText(WELCOME_DE);

  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');
  await expect(page.locator(PRO_KARTE_SELEKTOR)).toHaveCount(0,
    'das Privat-Produkt darf nie ein Pro-Merkmal zeigen — würde es das, wäre die Trennung selbst kaputt');
});

test('[U2-ADR-378] privat-en zeigt jetzt Englisch (U2-ADR-369, Ab-Werk-Backen der Sprache, gelandet)', async ({ page }) => {
  await oeffneApp(page, { url: produktUrl('privat-en') });
  await expect(page.locator('#w-anlass')).toContainText(WELCOME_EN);
});

test('[U2-ADR-378] pro-de trägt jetzt das Pro-Merkmal (U2-ADR-379 + U2-ADR-369, beide gelandet)', async ({ page }) => {
  await oeffneApp(page, { url: produktUrl('pro-de') });
  await expect(page.locator('#w-anlass')).toContainText(WELCOME_DE);

  await depotAnlegen(page);
  // U2-ADR-421-Rebase-Zusammenführung (08.09.2026): bereichsErsatz ERSETZT die 13 nativen
  // Sektoren für Pro — 'advanceCare' existiert für pro-de/pro-en nicht mehr. Das vorsorgeRegal-
  // Merkmal (und mit ihm die Pro-Modul-Karte) sitzt seither an PRO_BEREICH_ID selbst
  // (pro-vertretung-vollmachten, s. Fixture-Merkmal), nicht mehr am nativen vorsorge-Sektor.
  await oeffneSektor(page, PRO_BEREICH_ID);
  await expect(page.locator(PRO_KARTE_SELEKTOR)).toHaveCount(1);
  await expect(page.locator('#content .bereich-kopf h1')).toContainText(PRO_BEREICH_LABEL_DE);
});

test('[U2-ADR-378] pro-en trägt jetzt Englisch UND das Pro-Merkmal (beide große Lücken gelandet)', async ({ page }) => {
  await oeffneApp(page, { url: produktUrl('pro-en') });
  await expect(page.locator('#w-anlass')).toContainText(WELCOME_EN);

  await depotAnlegen(page);
  // Dieselbe Verschiebung wie bei pro-de oben (s. Kommentar dort).
  await oeffneSektor(page, PRO_BEREICH_ID);
  await expect(page.locator(PRO_KARTE_SELEKTOR)).toHaveCount(1);
});

/* "Pro-Achse englisch" (08.09.2026): die ENGERE Lücke innerhalb der bereits
   geschlossenen großen — pro-en zeigte den Sektor-Titel weiterhin auf Deutsch, weil Bereichs-
   und Logikmodul für pro-de/pro-en identisch waren. Beide Richtungen bewusst in EINER Probe:
   ein Revert, der nur die eine Zeile zurückdreht, ließe die andere unbemerkt stehen. */
test('[U2-ADR-378·Pro-Achse-EN] pro-en zeigt die englische Bereichs-Rubrik, NICHT mehr die deutsche', async ({ page }) => {
  await oeffneApp(page, { url: produktUrl('pro-en') });
  await depotAnlegen(page);
  await oeffneSektor(page, PRO_BEREICH_ID);
  const h1 = page.locator('#content .bereich-kopf h1');
  await expect(h1, 'die sechs `<bereichId>.label`-Kennungen fehlen im EN-Sprachmodul, oder '
    + 'tools/lib/vier-produkte.js dockt für pro-en ein anderes Bereichs-Modul als erwartet.')
    .toContainText(PRO_BEREICH_LABEL_EN);
  await expect(h1, 'die deutsche Rubrik darf für pro-en nicht mehr erscheinen — sonst zeigt der '
    + 'additive EN-Textsatz nicht, oder das DE-Bereichs-Modul liefert seinen Rückfall trotzdem.')
    .not.toContainText(PRO_BEREICH_LABEL_DE);
});
