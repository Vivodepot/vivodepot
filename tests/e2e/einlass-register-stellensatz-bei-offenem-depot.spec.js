'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Einlass-Register 2/4 (stellensatz) — Modul-Einlass in ein BEREITS OFFENES
   Depot, derselbe Weg wie Übergang 2 (Sprache), nur das dritte von drei
   ungefahrenen Registern („Fehlerpfade und Einlass-Register",
   10.09.2026, Teil 2).
   ────────────────────────────────────────────────────────────────────────
   `_moduleEinlassWirken()` (vivodepot.html:38529) ruft
   `_stellensatzModuleAusDepotAnmelden(data)` für JEDES angenommene Modul —
   ungeprüft seit U2-ADR-284 (05.09.2026), keine e2e-Probe fuhr diesen Weg
   bisher, nur node:test gegen den Kern direkt (tests/u2-adr-284-
   stellensatz.test.js).

   Der reale Konsument `stelleLesen(kennung)` (vivodepot.html:4673) liest
   den Rechtsraum über `textsatzRechtsraumAktiv()` — d. h. `data.rechtsraum` —,
   NICHT über einen Parameter (anders als beim Rechtsraum-Katalog). Ein frisch
   angelegtes Depot hat dafür keinen UI-Weg (kein Rechtsraum-Wähler im
   Anlege-Dialog); die Probe setzt `data.rechtsraum` darum direkt per
   `page.evaluate` — genau der Zustand, den ein Depot hätte, das in Frankreich
   eröffnet wurde. Das ist eine Vorbedingung für die LESE-Seite, kein Bypass
   des EINLASS-Wegs selbst: der Modul-Einlass läuft unverändert über die echte
   Datei → `#einst-modul-datei` → `modulEinlassen` → `_moduleEinlassWirken`.

   Fixture (`stellen`-Form) wörtlich aus tests/u2-adr-284-stellensatz.test.js
   übernommen (Zeile „ein natives Feld mit .hint darf eine Stelle bekommen"),
   `identity.dateOfSeparation` trägt im Kern ein `.hint` (vivodepot.html:5475),
   ist also KEINE erfundene Kennung.

   Positivkontrolle (Beleg im Commit-Text): mit dem Aufruf
   `_stellensatzModuleAusDepotAnmelden(data);` in `_moduleEinlassWirken()`
   auskommentiert liefert `stelleLesen('identity.dateOfSeparation')` weiterhin
   `null` (STELLENSATZ_EINGEBAUT ist bewusst leer, s. dessen Kopf-Kommentar) —
   der Assert unten wird rot. Manuell geprüft und wieder hergestellt, nicht
   dauerhaft im Baum.
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

const PW = 'einlass-stellensatz-pw-368';
const STELLE_TEXT = 'Caisse de Retraite E2E-FR-Probe';
const KENNUNG = 'identity.dateOfSeparation';

const STELLENSATZ_MODUL = {
  modulTyp: 'stellensatz', rechtsraum: 'FR', moduleVersion: 1,
  stellen: { [KENNUNG]: STELLE_TEXT },
};

function tempModulDatei() {
  const tmp = path.join(os.tmpdir(), 'stellensatzmodul-e2e-' + process.pid + '-' + Date.now() + '.json');
  fs.writeFileSync(tmp, JSON.stringify(STELLENSATZ_MODUL), 'utf8');
  return tmp;
}

async function oeffneEinstellungen(page) {
  await page.locator('#tb-einstellungen').click();
  await einstellungenAbschnittOeffnen(page, '#einst-modul-einlassen');
  await expect(page.locator('#einst-modul-einlassen')).toBeVisible();
}

test('[Einlass-Register 2/4] Stellensatz-Modul in ein offenes Depot einlassen — stelleLesen() trägt die Stelle', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });

  // Vorbedingung für die LESE-Seite (s. Kopf-Kommentar): das Depot "ist" in FR eröffnet.
  await page.evaluate(() => { window.__vdOeffentlich.ankerDaten().rechtsraum = 'FR'; });

  const modulDatei = tempModulDatei();
  try {
    // ── DER EINLASS: Stellensatz-Modul, DEPOT BLEIBT OFFEN ─────────────────
    await oeffneEinstellungen(page);
    await page.locator('#einst-modul-datei').setInputFiles(modulDatei);
    // GEÄNDERT (Auftrag, 12.09.2026): s. einlass-register-institutionsart-bei-offenem-
    // depot.spec.js — Autosave-Toasts (ADR-237) stapeln sich neben dem generischen Locator.
    await expect(page.locator('#toast-host .toast', { hasText: 'Erweiterung eingelesen' })).toBeVisible({ timeout: 5000 });

    const imDepot = await page.evaluate(() => window.__vdOeffentlich.ankerDaten().stellensatzModule.length);
    expect(imDepot, 'Modul landet in data.stellensatzModule').toBe(1);

    const stelle = await page.evaluate((k) => window.__vdOeffentlich.stelleLesen(k), KENNUNG);
    expect(stelle, '_stellensatzModuleAusDepotAnmelden muss beim Einlass laufen (nicht nur bei textsatz)').toBe(STELLE_TEXT);

    expect(fehler, 'kein Absturz beim Stellensatz-Einlass in ein offenes Depot').toEqual([]);
  } finally {
    fs.rmSync(modulDatei, { force: true });
  }
});
