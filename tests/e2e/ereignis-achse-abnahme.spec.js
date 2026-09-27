'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — „Die Ereignis-Achse" (13.08.2026), Zug 5 — Abnahme.
   ────────────────────────────────────────────────────────────────────────
   Der volle Szenario-Klickweg: Familienstand von „verheiratet" auf
   „getrennt lebend" setzen, während eine Vollmacht auf den Ehepartner
   zeigt — der Eintrag muss in der Prüftermine-Sicht mit Grund erscheinen.
   Dann als geprüft schließen — er muss verschwinden, OHNE dass die
   Vollmacht selbst bearbeitet wurde.

   Setup (Person + ehepartner-ref + Vollmacht mit ref-genauer bevollmaech-
   tigter-Referenz) läuft über die echten Kern-Funktionen (window.person-
   Hinzufuegen/sektorFeldSetzen/listenEintragHinzufuegen) statt über den
   vollen Formular-Klickweg — dasselbe Muster wie window.__vdOeffentlich.dokumentAnlegen in
   tests/e2e/m4-pruefblatt-sprung.spec.js und die direkte vorsorge_instru-
   mente-Injektion in f8-dokument-oeffner-abnahme.spec.js. Der ECHTE
   Klickweg wird ab hier gefahren: Familienstand ändern (UI-Select),
   Prüftermine-Sicht öffnen (UI-Klick), Anlass sehen, „Bleibt, wie es ist"
   klicken (UI-Klick), Verschwinden belegen.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

test('Ereignis-Achse: Familienstandswechsel markiert die Vollmacht, „Bleibt, wie es ist" nimmt den Anlass wieder', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored/i.test(m.text())) fehler.push(m.text());
  });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page);

  await page.evaluate(() => {
    const partnerId = window.__vdOeffentlich.personHinzufuegen({ name: 'Jonas Partner' });
    window.__vdOeffentlich.sektorFeldSetzen('identity', 'maritalStatus', 'verh');
    window.__vdOeffentlich.sektorFeldSetzen('people', 'spouseOrCivilPartner', { ref: partnerId });
    window.__vdOeffentlich.listenEintragHinzufuegen('advanceCare', 'provisionInstruments',
      { instrument: 'enduring-power-of-attorney', typeOfPowerOfAttorney: 'vorsorge', authorizedPersons: [{ ref: partnerId }] });
    window.__vdOeffentlich.renderContent();
  });

  // ── Der echte Auslöser: Familienstand über die Bereichsseite ändern ──
  await oeffneSektor(page, 'identity');
  await page.selectOption('[data-edit="maritalStatus"]', 'getrennt');
  await page.evaluate(() => { window.__vdOeffentlich.bearbeitungSpeichern(); window.__vdOeffentlich.renderContent(); });

  // ── Prüftermine-Sicht: der Anlass ist sichtbar, mit Grund ──
  await page.click('[data-prueftermine]');
  const zeile = page.locator('.ampel-zeile', { hasText: 'Zu prüfen, weil' });
  await expect(zeile).toBeVisible();
  await expect(zeile).toContainText('Familienstand geändert');

  await page.waitForTimeout(1200);   // Toasts abklingen lassen
  await page.screenshot({ path: 'tests/e2e/.artifacts/ereignis-achse-anlass-sichtbar.png', fullPage: true });

  // ── „Bleibt, wie es ist" — der Eintrag verschwindet, OHNE die Vollmacht zu bearbeiten ──
  const bevollmaechtigterVorher = await page.evaluate(() => {
    const z = window.__vdOeffentlich.ankerDaten().sektoren.advanceCare.provisionInstruments[0];
    return JSON.stringify(z.authorizedPersons);
  });
  await zeile.locator('[data-prtm-ereignis-schliessen]').click();
  await expect(page.locator('.ampel-zeile', { hasText: 'Zu prüfen, weil' })).toHaveCount(0);

  const bevollmaechtigterNachher = await page.evaluate(() => {
    const z = window.__vdOeffentlich.ankerDaten().sektoren.advanceCare.provisionInstruments[0];
    return JSON.stringify(z.authorizedPersons);
  });
  expect(bevollmaechtigterNachher, 'die Vollmacht selbst bleibt unverändert').toBe(bevollmaechtigterVorher);

  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'tests/e2e/.artifacts/ereignis-achse-anlass-geschlossen.png', fullPage: true });

  expect(fehler, 'keine JS-/Konsolen-Fehler über den ganzen Weg').toEqual([]);
});
