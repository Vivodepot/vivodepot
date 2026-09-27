'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Übergang 2/6 — Sprache umschalten bei OFFENEM Depot („Sechs Übergangs-Proben", 09.09.2026 — testkonzept-nach-den-funden-
   2026-09-09.md #2)
   ────────────────────────────────────────────────────────────────────────
   Es gibt keinen Sprach-Umschalter in der Oberfläche — die Sprache wechselt,
   wenn ein Sprachmodul (`modulTyp:'textsatz'`) in ein BEREITS offenes Depot
   eingelassen wird (Einstellungen → „Language / Sprache" → `#einst-modul-
   datei`). Genau dieser Weg ruft `_moduleEinlassWirken()` (vivodepot.html),
   und die trägt am 29.08.2026 bereits EINEN belegten Fund derselben Klasse:
   Kopfzeile/Fußzeile blieben deutsch, weil `renderTopbar()`/`renderFooter()`
   fehlten — der Fix steht, aber KEIN e2e-Spec fährt diesen Weg seither nach.

   Der Aufruf endet in `textsatzNeuAnwenden()` — derselben Funktion, die bei
   Fund 9 (Depot-Übergang) auf einer gefrorenen Sektion warf. Hier ist der
   Übergang nicht Datei-zu-Datei, sondern Sprachmodul-Einlass in EIN
   offenes Depot; dieselbe Zurück-dann-Füllen-Mechanik, ein anderer Auslöser.

   Positivkontrolle (Beleg im Commit-Text): mit einer absichtlich VERGESSENEN
   `data.textsprache = r.kennung`-Zeile (der Fund vom 29.08.) bleibt
   `textLesen()` auf Deutsch — der Assert auf die Sidebar-Zeile
   unten wird dann rot (Stand ursprünglich für den Bereichs-Titel geschrieben, jetzt Sidebar, s. u.). Manuell geprüft, nicht dauerhaft im Baum.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

// Bekannt-folgenloser Browser-Hinweis (wie 00-smoke.spec.js): CSP 'frame-ancestors' via <meta>
const KONSOLE_HARMLOS = [
  /Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored when delivered via/i,
];
const istHarmloseKonsole = (t) => KONSOLE_HARMLOS.some((re) => re.test(String(t)));
const { oeffneApp, depotAnlegen, oeffneSektor, einstellungenAbschnittOeffnen } = require('./helpers');

const PW = 'sprache-uebergang-pw-963';

// Minimales, gültiges Sprachmodul (EINLASS_REGISTER Eintrag 'textsatz', vivodepot.html:24531ff,
// Prüfung in textsatzModulPruefen). `sprache` != 'de' (TEXTSATZ_SPRACHE_EINGEBAUT), `texte`
// trägt EINE Kennung, die sichtbar in der Oberfläche landet:
// (die Sidebar-Zeile „Meine Dokumente", textLesen-Kennung `strings:navMappe.text`).
// Korrektur 19.09.2026 (Klasse-E-Fund e2e-37-rote-klassen-2026-09-19.md), zwei Funde, beide am
// lebenden Produkt gemessen:
// (1) Der Bereichs-Titel (`identity.label`) ist für ein UNSIGNIERTES Modul gesperrt:
// `_eingebauteBereichsBeschriftungVerwerfen` (vivodepot.html, Prüfstufe-Nachtrag 18.09.2026)
// verwirft die Beschriftung eines eingebauten Bereichs, wenn die Signaturkette nicht verifiziert
// ist (`ungeprueft !== false`) — gewollt, Schutz gegen ein „Angriffsmodul". Darum eine Zeile
// aus dem Chrom, die ein unsigniertes Modul setzen darf.
// (2) `sprache:'en'` ist wirkungslos, seit die Produkte ein volles EN-Modul ab Werk mitbringen
// (`_textsatzKnotenFuellenOhnePflicht` füllt nur Leeres). 'fr' hat kein eingebautes Gegenstück.
const SPRACHMODUL = {
  modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1,
  texte: { 'strings:navMappe.text': 'Documents E2E-FR' },
};

function tempModulDatei() {
  const tmp = path.join(os.tmpdir(), 'sprachmodul-e2e-' + process.pid + '-' + Date.now() + '.json');
  fs.writeFileSync(tmp, JSON.stringify(SPRACHMODUL), 'utf8');
  return tmp;
}

async function oeffneEinstellungen(page) {
  await page.locator('#tb-einstellungen').click();
  await einstellungenAbschnittOeffnen(page, '#einst-modul-einlassen');
  await expect(page.locator('#einst-modul-einlassen')).toBeVisible();
}

async function schliesseEinstellungen(page) {
  // flowEinstellungen() öffnet mit `ohneAbbrechen:true` — der EINZIGE Schließweg ist der
  // Primär-Knopf #m-ok (STRINGS.btnSchliessen, onPrimaer: (schliessen) => schliessen()).
  await page.click('#m-ok');
  await page.waitForSelector('#modal-rueck.an', { state: 'detached' }).catch(() => {});
}

test('[Übergang 2] Sprachmodul in ein offenes Depot einlassen — Sidebar/Bereichs-Kopf wechseln sofort, ohne Absturz', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  await oeffneSektor(page, 'identity');

  // Vorbedingung: deutsche Rubrik, wie ausgeliefert.
  await expect(page.locator('#content .bereich-kopf')).toContainText('Identität');

  const modulDatei = tempModulDatei();
  try {
    // ── DER ÜBERGANG: Sprachmodul einlassen, DEPOT BLEIBT OFFEN ─────────────
    await oeffneEinstellungen(page);
    await page.locator('#einst-modul-datei').setInputFiles(modulDatei);

    // Erfolgsmeldung (ui.toast) statt eines Absturzes — der Einlassweg wirft nie
    // (modulEinlassen-Kopfkommentar: „gibt IMMER ein Ergebnis zurück und wirft nie").
    // GEÄNDERT (Auftrag, 12.09.2026): Autosave-Toasts (ADR-237) stapeln sich neben dem
    // generischen Locator (s. einlass-register-institutionsart-bei-offenem-depot.spec.js).
    await expect(page.locator('#toast-host .toast', { hasText: 'Erweiterung eingelesen' })).toBeVisible({ timeout: 5000 });

    // `data.textsprache` muss auf 'fr' stehen — der Fund vom 29.08. genau hier.
    const textsprache = await page.evaluate(() => (typeof window.__vdOeffentlich.ankerDaten() !== 'undefined' ? window.__vdOeffentlich.ankerDaten().textsprache : null));
    expect(textsprache, 'r.kennung muss data.textsprache setzen (Fund 29.08.2026)').toBe('fr');

    await schliesseEinstellungen(page);

    // Die Sidebar/der Bereichs-Kopf MÜSSEN sofort wirken — kein Neuladen, kein zweiter Klick.
    await expect(page.locator('.bereiche-umschalter, [data-sektor]').first(), 'Sidebar muss nach dem Sprachwechsel weiter rendern').toBeVisible();
    await expect(page.locator('button', { hasText: 'Documents E2E-FR' }).first(), 'Sidebar zeigt sofort den neuen Text (Sprachmodul-Einlass wirkt ohne Reload)').toBeVisible();

    expect(fehler, 'kein Absturz im Sprach-Übergang bei offenem Depot').toEqual([]);
  } finally {
    fs.rmSync(modulDatei, { force: true });
  }
});
