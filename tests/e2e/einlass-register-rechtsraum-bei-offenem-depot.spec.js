'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Einlass-Register 3/4 (rechtsraum) — Modul-Einlass in ein BEREITS OFFENES
   Depot, derselbe Weg wie Übergang 2 (Sprache), nur das zweite von drei
   ungefahrenen Registern („Fehlerpfade und Einlass-Register",
   10.09.2026, Teil 2 — Bericht sechs-uebergangsproben-bericht-2026-09-09.md:
   „Rechtsraum-/Stellensatz-Module gehen denselben Weg, ungeprüft").
   ────────────────────────────────────────────────────────────────────────
   `_moduleEinlassWirken()` (vivodepot.html:38529) ruft `_rechtsraumModuleAus-
   DepotAnmelden(data)` für JEDES angenommene Modul, unabhängig vom Typ — das
   ist der Fall (r.typ !== 'textsatz'), den bisher keine e2e-Probe fährt.

   Anders als bei Sprache liest der reale Konsument (`_rechtsraumKatalogLesen`,
   vivodepot.html:24264) den Rechtsraum NICHT über einen aktiven Depot-Zustand
   (`data.rechtsraum` — für ein neu angelegtes Depot faktisch immer leer, es
   gibt noch keinen UI-Weg, einen zweiten Rechtsraum als „aktiv" zu wählen),
   sondern nimmt ihn als EXPLIZITEN Parameter. Die Probe liest darum direkt
   über diesen Parameter (`_rechtsraumKatalogLesen('enduring-power-of-attorney', 'FR',
   'wortlaut')`) — derselbe Aufruf, den ein künftiger FR-Konsument tun würde,
   kein Umweg um die Registry.

   Fixture (moduleVersion/typen-Form) wörtlich aus tests/a481-rechtsraum-gb-
   beleg.test.js übernommen — geprüfte, im Kern bereits belegte Form, keine
   geratene.

   Positivkontrolle (Beleg im Commit-Text): mit dem Aufruf
   `_rechtsraumModuleAusDepotAnmelden(data);` in `_moduleEinlassWirken()`
   auskommentiert bleibt `_RECHTSRAUM_MODUL_REGISTRY.FR` unbesetzt — der Assert
   unten auf den Wortlaut wird `undefined` statt der Modul-Kennung und der Test
   rot. Manuell geprüft und wieder hergestellt, nicht dauerhaft im Baum.
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

const PW = 'einlass-rechtsraum-pw-217';
const WORTLAUT = 'Lasting Power of Attorney — Property and Financial Affairs (E2E-FR-Probe)';

const RECHTSRAUM_MODUL = {
  modulTyp: 'rechtsraum', rechtsraum: 'FR', sprache: 'de', moduleVersion: 1,
  typen: { 'enduring-power-of-attorney': { katalogVersion: 1, wortlaut: WORTLAUT } },
};

function tempModulDatei() {
  const tmp = path.join(os.tmpdir(), 'rechtsraummodul-e2e-' + process.pid + '-' + Date.now() + '.json');
  fs.writeFileSync(tmp, JSON.stringify(RECHTSRAUM_MODUL), 'utf8');
  return tmp;
}

async function oeffneEinstellungen(page) {
  await page.locator('#tb-einstellungen').click();
  await einstellungenAbschnittOeffnen(page, '#einst-modul-einlassen');
  await expect(page.locator('#einst-modul-einlassen')).toBeVisible();
}

test('[Einlass-Register 3/4] Rechtsraum-Modul in ein offenes Depot einlassen — Registry trägt den Wortlaut', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });

  const modulDatei = tempModulDatei();
  try {
    // ── DER EINLASS: Rechtsraum-Modul, DEPOT BLEIBT OFFEN ──────────────────
    await oeffneEinstellungen(page);
    await page.locator('#einst-modul-datei').setInputFiles(modulDatei);
    // GEÄNDERT (Auftrag, 12.09.2026): s. einlass-register-institutionsart-bei-offenem-
    // depot.spec.js — Autosave-Toasts (ADR-237) stapeln sich neben dem generischen Locator.
    await expect(page.locator('#toast-host .toast', { hasText: 'Erweiterung eingelesen' })).toBeVisible({ timeout: 5000 });

    // Im Depot liegt es roh …
    const imDepot = await page.evaluate(() => window.__vdOeffentlich.ankerDaten().rechtsraumModule.length);
    expect(imDepot, 'Modul landet in data.rechtsraumModule').toBe(1);

    // … und es WIRKT: die Registry, aus der der reale Konsument liest, trägt es.
    const wortlaut = await page.evaluate(() =>
      window.__vdOeffentlich._rechtsraumKatalogLesen('enduring-power-of-attorney', 'FR', 'wortlaut'));
    expect(wortlaut, '_rechtsraumModuleAusDepotAnmelden muss beim Einlass laufen (nicht nur bei textsatz)').toBe(WORTLAUT);

    expect(fehler, 'kein Absturz beim Rechtsraum-Einlass in ein offenes Depot').toEqual([]);
  } finally {
    fs.rmSync(modulDatei, { force: true });
  }
});
