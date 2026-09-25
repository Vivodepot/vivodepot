'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Übergang 6/6 — Wizard betreten → abbrechen → WIEDER betreten, DERSELBE
   Wizard, DERSELBE Tab („Sechs Übergangs-Proben",
   09.09.2026 — testkonzept-nach-den-funden-2026-09-09.md #6)
   ────────────────────────────────────────────────────────────────────────
   `wizardAbbrechen` (vivodepot.html:39590) sichert den offenen Schritt
   (`wizardSchrittSpeichern`) und setzt DANACH `aktiverWizardId = null`,
   `wizardSchrittIndex = 0`, `wizardFehlerGrund = null` zurück — bestehende
   Wizard-Specs (03-wizard-pvwiz.spec.js, 11-wizard-fremder-ausstieg.spec.js)
   prüfen je EINEN Durchlauf (Start…Abbrechen ODER Start…Weiter…Speichern),
   keiner das ZWEITE Betreten danach: bleibt `wizardSchrittIndex` wirklich
   bei 0, oder springt der zweite Einstieg auf den zuletzt verlassenen
   Schritt? Zeigt der Titel wieder „Schritt 1 von …"? Und — die eigentliche
   Übergangs-Frage — steht der beim ERSTEN Durchlauf gesicherte Wert beim
   ZWEITEN Betreten schon vorausgefüllt (echte Persistenz über den Abbruch
   hinweg), ohne dass ein Fehler-Banner aus dem ersten Durchlauf überlebt?

   Vehikel: `pvwiz`, Schritt `pv_beistand_kirche` (Textfeld) — derselbe
   Direkt-Sprung-Kniff wie in 11-wizard-fremder-ausstieg.spec.js
   (`wizardSchrittIndex` gezielt setzen), hier NACH einem echten Klick auf
   `[data-wizard-start="pvwiz"]`, nicht als Ersatz dafür.

   VORAB GEMESSEN, GEGEN DIE ERSTE ANNAHME (nicht übernommen): der erste Entwurf hielt
   „Schritt 1 von" nach dem zweiten Betreten für den Beleg, dass `wizardAbbrechen()` den
   Index zurücksetzt. Die gezielte Positivkontrolle (Zeile `wizardSchrittIndex = 0;`
   in `wizardAbbrechen()`, vivodepot.html:39597, auskommentiert) blieb dabei GRÜN — masked:
   `wizardLauf()` (vivodepot.html:39551) setzt `wizardSchrittIndex = 0` bei JEDEM Start
   selbst, unbedingt. Der Assert auf „Schritt 1 von" prüft darum `wizardLauf`, nicht
   `wizardAbbrechen` — richtig als Beleg für den Übergang (der zweite Einstieg beginnt
   tatsächlich bei Schritt 1), aber falsch benannt als Positivkontrolle für den
   Reset-Aufruf selbst. Steht unten trotzdem, weil er den Übergang korrekt beschreibt.

   Positivkontrolle, tatsächlich scharf (Beleg im Commit-Text): mit
   `wizardSchrittSpeichern();` — dem ERSTEN Aufruf in `wizardAbbrechen()`
   (vivodepot.html:39591) — auskommentiert wird `nachAbbruch.gesichert` (Zeile 79 unten)
   `null` statt `WERT`: der offene Schritt geht beim Abbrechen verloren, der Test wird
   rot. Manuell geprüft und wieder hergestellt, nicht dauerhaft im Baum.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');

// Bekannt-folgenloser Browser-Hinweis (wie 00-smoke.spec.js): CSP 'frame-ancestors' via <meta>
const KONSOLE_HARMLOS = [
  /Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored when delivered via/i,
];
const istHarmloseKonsole = (t) => KONSOLE_HARMLOS.some((re) => re.test(String(t)));
const { oeffneApp, depotAnlegen, oeffneSektor, wizardStarten } = require('./helpers');

const WERT = 'Seelsorge der Gemeinde St. Anna (Übergang 6)';

// Direkt auf den Textfeld-Schritt springen — derselbe Kniff wie
// 11-wizard-fremder-ausstieg.spec.js (wizardSchrittTippen), NACH einem echten Start-Klick.
async function aufTextfeldSchrittSpringen(page) {
  await expect(page.locator('.wizard-frage')).toBeVisible();
  await page.evaluate(() => {
    const def = window.__vdOeffentlich.WIZARD_BY_ID.pvwiz;
    window.__vdOeffentlich.wizardSchrittIndex = def.schritte.findIndex(s => s.feld && s.feld.id === 'supportFromChurchOrCommunity');
    window.__vdOeffentlich.renderContent();
  });
  await expect(page.locator('[data-edit="supportFromChurchOrCommunity"]')).toBeVisible();
}

test('[Übergang 6] Wizard betreten → abbrechen → WIEDER betreten — Index zurückgesetzt, gesicherter Wert vorausgefüllt', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');

  // ── ERSTES Betreten ───────────────────────────────────────────────────
  await wizardStarten(page, 'pvwiz');
  await expect(page.locator('#content')).toContainText('Schritt 1 von');
  await aufTextfeldSchrittSpringen(page);
  await page.fill('[data-edit="supportFromChurchOrCommunity"]', WERT);

  // ── DER ÜBERGANG: abbrechen ──────────────────────────────────────────
  await page.click('#wiz-abbr');
  await expect(page.locator('.wizard-frage')).toHaveCount(0);

  // Zurück im Ausgangs-Bereich (Bug-1-Rückkehr-Kontext), Wert wurde beim Abbrechen gesichert.
  await expect(page.locator('[data-sektor="advanceCare"]')).toBeVisible();
  const nachAbbruch = await page.evaluate(() => ({
    aktiverWizardId: typeof window.__vdOeffentlich.aktiverWizardId !== 'undefined' ? window.__vdOeffentlich.aktiverWizardId : 'undefined-var',
    gesichert: window.__vdOeffentlich.ankerDaten().sektoren.advanceCare.supportFromChurchOrCommunity || null,
  }));
  expect(nachAbbruch.aktiverWizardId, 'aktiverWizardId muss nach Abbruch null sein').toBeNull();
  expect(nachAbbruch.gesichert, 'wizardAbbrechen sichert den offenen Schritt (wie ein fremder Ausstieg)').toBe(WERT);

  // ── ZWEITES Betreten — DERSELBE Wizard, derselbe Tab, kein Reload ──────
  await wizardStarten(page, 'pvwiz');

  // Index-Reset: der zweite Einstieg beginnt wieder bei Schritt 1, nicht beim zuletzt
  // verlassenen Schritt — genau die im Kommentar oben beschriebene Sorge.
  await expect(page.locator('#content'), 'zweites Betreten muss wieder bei Schritt 1 beginnen (Index-Reset)').toContainText('Schritt 1 von');

  // Kein Fehler-Banner aus dem ersten Durchlauf überlebt den Wiedereinstieg.
  const fehlerBannerNoch = await page.evaluate(() => (typeof window.__vdOeffentlich.wizardFehlerGrund !== 'undefined' ? window.__vdOeffentlich.wizardFehlerGrund : 'undefined-var'));
  expect(fehlerBannerNoch, 'wizardFehlerGrund muss beim Wiedereinstieg null sein').toBeNull();

  // Der gesicherte Wert aus dem ERSTEN Durchlauf steht vorausgefüllt, sobald derselbe
  // Schritt wieder erreicht wird — echte Persistenz über den Abbruch hinweg.
  await aufTextfeldSchrittSpringen(page);
  await expect(page.locator('[data-edit="supportFromChurchOrCommunity"]'), 'der beim ersten Durchlauf gesicherte Wert muss beim zweiten Betreten vorausgefüllt sein').toHaveValue(WERT);

  expect(fehler, 'kein Absturz im Übergang Wizard betreten→abbrechen→wieder betreten').toEqual([]);
});
