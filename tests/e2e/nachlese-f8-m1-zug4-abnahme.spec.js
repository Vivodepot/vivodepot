'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — Nachlese F8/M1 Zug 4: Browser-Abnahme („Nachlese F8/M1",
   11.08.2026)
   ────────────────────────────────────────────────────────────────────────
   Auftrag Zug 4: „Freiheitsentzug-Punkt auf 'nein' setzen, Blatt erzeugen,
   das Nein sehen. Besprochen-Angabe setzen, Klausel im Satz sehen; wieder
   entfernen, Satz ohne Klausel sehen." Echter Browser, echtes Overlay,
   echte gerenderte Zeichenketten — keine Node-Simulation.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

const IDENTITAET = {
  givenName: 'Elisabeth', familyName: 'Beispiel', birthDate: '1958-03-14',
  birthPlace: 'München', streetAddress: 'Lindenweg 4', postcodeCity: '80331 München', telephone: '089 1234567',
};

async function bauteZeile(page, zeile) {
  await page.evaluate(({ id, zeile }) => {
    window.__vdOeffentlich.ankerDaten().sektoren.identity = Object.assign({}, window.__vdOeffentlich.ankerDaten().sektoren.identity, id);
    window.__vdOeffentlich.ankerDaten().sektoren.advanceCare = Object.assign({}, window.__vdOeffentlich.ankerDaten().sektoren.advanceCare, {
      provisionInstruments: [Object.assign({ id: 'e2e-zug4', instrument: 'enduring-power-of-attorney',
        authorizedPersons: [{ override: 'Max Mustermann' }] }, zeile)],
    });
  }, { id: IDENTITAET, zeile });
}

test('Freiheitsentzug-Punkt auf "nein" gesetzt → das Blatt zeigt "nein" explizit', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await bauteZeile(page, { healthCarePlacementDepriving: 'nein' });
  await page.evaluate(() => window.__vdOeffentlich.dokumentOeffnen('vorsorgevollmacht', 'e2e-zug4'));
  await expect(page.locator('#pv-dok-overlay')).toBeVisible();
  const blatt = page.locator('.pv-dok-blatt');
  await expect(blatt).toContainText('freiheitsentziehende Unterbringung');
  await expect(blatt).toContainText('☐ ja  ☒ nein');
  await page.screenshot({ path: 'test-results/zug4-abnahme-freiheitsentzug-nein.png' });
});

test('Besprochen-Angabe gesetzt → Klausel steht im Satz der Patientenverfügung (Ziffer 2.7); entfernt → Satz ohne Klausel', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  // Ziffer 2.7 lebt im PV-Dokument (PV_MODUL), nicht im Vollmacht-Dokument selbst — der Verweis
  // AUF die Vollmacht steht dort (s. Zug 2). Die Zeile muss trotzdem existieren, damit der
  // Verweis überhaupt eine Person hat, auf die er zeigen kann.
  await bauteZeile(page, {});
  await page.evaluate(() => {
    window.__vdOeffentlich.ankerDaten().sektoren.advanceCare.contentOfTheAdvanceDirective = 'ja';
  });
  await page.evaluate(() => window.__vdOeffentlich.dokumentOeffnen('patientenverfuegung'));
  await expect(page.locator('#pv-dok-overlay')).toBeVisible();
  await expect(page.locator('.pv-dok-blatt')).toContainText(
    'Ich habe zusätzlich zur Patientenverfügung eine Vorsorgevollmacht für Gesundheitsangelegenheiten erteilt und den Inhalt dieser Patientenverfügung mit der von mir bevollmächtigten Person besprochen:');
  await page.screenshot({ path: 'test-results/zug4-abnahme-besprochen-gesetzt.png' });

  // Wieder entfernen — derselbe Satz OHNE Klausel.
  await page.click('#pv-dok-schliessen');
  await page.evaluate(() => {
    window.__vdOeffentlich.ankerDaten().sektoren.advanceCare.contentOfTheAdvanceDirective = '';
  });
  await page.evaluate(() => window.__vdOeffentlich.dokumentOeffnen('patientenverfuegung'));
  await expect(page.locator('#pv-dok-overlay')).toBeVisible();
  const blatt = page.locator('.pv-dok-blatt');
  await expect(blatt).toContainText('Ich habe zusätzlich zur Patientenverfügung eine Vorsorgevollmacht für Gesundheitsangelegenheiten erteilt:');
  await expect(blatt).not.toContainText('besprochen');
  await page.screenshot({ path: 'test-results/zug4-abnahme-besprochen-entfernt.png' });
});
