'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Einlass-Register 4/4 (institutionsArt) — Modul-Einlass in ein BEREITS
   OFFENES Depot, derselbe Weg wie Übergang 2 (Sprache), das letzte der drei
   ungefahrenen Register aus den ursprünglichen vier (U2-ADR-145: Textsatz,
   Stellensatz, Rechtsraum, institutionsArt — „Fehlerpfade
   und Einlass-Register", 10.09.2026, Teil 2).
   ────────────────────────────────────────────────────────────────────────
   `_moduleEinlassWirken()` (vivodepot.html:38529) ruft
   `_institutionsArtenAusDepotAnmelden(data)` für JEDES angenommene Modul.
   Anders als Rechtsraum/Stellensatz ist der reale Konsument
   `institutionsArtenAlle()` (vivodepot.html:12746) NICHT rechtsraum-
   gebunden — er speist die echte Auswahlmaske der Institutions-Eingabe
   (`_institutionFelder`, vivodepot.html:28894, Feld `art`). Die Probe liest
   `institutionsArtenAlle()` direkt — dieselbe Funktion, die die Maske
   aufruft — statt den Umweg über eine konkrete Institutions-Anlegestelle zu
   suchen (die je nach Bereich variiert und hier keine zusätzliche Aussage
   über den Einlassweg selbst träfe).

   Fixture wörtlich aus tests/einlassweg-module.test.js übernommen
   (Rot-Beleg 1: „auch für die beiden anderen Register — EIN Weg, nicht
   drei"), `herkunft`/`arten`-Form bereits im Kern belegt.

   Positivkontrolle (Beleg im Commit-Text): mit dem Aufruf
   `_institutionsArtenAusDepotAnmelden(data);` in `_moduleEinlassWirken()`
   auskommentiert bleibt `institutionsArtenAlle()` bei den zwölf eingebauten
   Arten — der Assert unten auf den angedockten Eintrag findet ihn nicht und
   der Test wird rot. Manuell geprüft und wieder hergestellt, nicht dauerhaft
   im Baum.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const KONSOLE_HARMLOS = [
  /Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored when delivered via/i,
];
const istHarmloseKonsole = (t) => KONSOLE_HARMLOS.some((re) => re.test(String(t)));
const { oeffneApp, depotAnlegen, einstellungenAbschnittOeffnen } = require('./helpers');

const PW = 'einlass-institutionsart-pw-459';
const KENNUNG = 'notaire';
const LABEL = 'Notaire (E2E-FR-Probe)';

const INSTITUTIONSART_MODUL = {
  modulTyp: 'institutionsArt', sprache: 'de', herkunft: 'fr-kammer-e2e', moduleVersion: 1,
  arten: { [KENNUNG]: LABEL },
};

function tempModulDatei() {
  const tmp = path.join(os.tmpdir(), 'institutionsartmodul-e2e-' + process.pid + '-' + Date.now() + '.json');
  fs.writeFileSync(tmp, JSON.stringify(INSTITUTIONSART_MODUL), 'utf8');
  return tmp;
}

async function oeffneEinstellungen(page) {
  await page.locator('#tb-einstellungen').click();
  await einstellungenAbschnittOeffnen(page, '#einst-modul-einlassen');
  await expect(page.locator('#einst-modul-einlassen')).toBeVisible();
}

test('[Einlass-Register 4/4] Institutions-Arten-Modul in ein offenes Depot einlassen — institutionsArtenAlle() trägt die neue Art', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });

  const modulDatei = tempModulDatei();
  try {
    // ── DER EINLASS: Institutions-Arten-Modul, DEPOT BLEIBT OFFEN ──────────
    await oeffneEinstellungen(page);
    await page.locator('#einst-modul-datei').setInputFiles(modulDatei);
    // GEÄNDERT (Auftrag, 12.09.2026): der generische Locator traf früher genau einen
    // Toast. Seit ADR-237 still speichert, stapeln sich daneben Autosave-Toasts
    // ("Gespeichert. Für eine Sicherung…") — Strict Mode bricht bei mehreren Treffern.
    // Eingeengt auf den Einlass-Erfolgstoast, den dieser Test tatsächlich meint.
    await expect(page.locator('#toast-host .toast', { hasText: 'Erweiterung eingelesen' })).toBeVisible({ timeout: 5000 });

    const imDepot = await page.evaluate(() => window.__vdOeffentlich.ankerDaten().institutionsArten.length);
    expect(imDepot, 'Modul landet in data.institutionsArten').toBe(1);

    // Vorher: nur die zwölf eingebauten. Nachher: dreizehn, die neue Art dabei, mit ihrem Label —
    // dieselbe Funktion, die die echte Auswahlmaske (_institutionFelder) speist.
    const arten = await page.evaluate(() => window.__vdOeffentlich.institutionsArtenAlle());
    expect(arten.length, '_institutionsArtenAusDepotAnmelden muss beim Einlass laufen (nicht nur bei textsatz)').toBe(13);
    const eingelassen = arten.find((a) => a.wert === KENNUNG);
    expect(eingelassen, 'die angedockte Art muss in institutionsArtenAlle() auftauchen').toBeTruthy();
    expect(eingelassen.label).toBe(LABEL);

    expect(fehler, 'kein Absturz beim Institutions-Arten-Einlass in ein offenes Depot').toEqual([]);
  } finally {
    fs.rmSync(modulDatei, { force: true });
  }
});
