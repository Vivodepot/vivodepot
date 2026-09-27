'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Fix (Screenshot-Review, 26.08.2026) — Browser-Abnahme des
   Node-Fundes: die Depot-Liste (Pillen-Klick „Mein Depot ▾", flowDepotListe())
   zeigte im Sub-Kontext fälschlich „Mein Depot — aktiv" und bot keinen
   funktionierenden Rückweg (Klick auf die falsch markierte Zeile war ein
   No-op). tests/depot-liste-sub-kontext.test.js belegt die Render-Logik
   bereits am Kern; hier zusätzlich der ECHTE Klickpfad im Browser — inklusive
   des tatsächlichen Kontextwechsels, den nur ein realer Klick + realer
   State-Übergang zeigt (U2-ADR-091 Event-Blindzone).
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

// Real-UI-Weg wie T-CROSS-02 (sub-depot-blackbox): Sub-Depot anlegen, entsiegeln, betreten.
async function subKontextPerUiBetreten(page, { vorname, pw }) {
  await page.click('#tb-depot-pille');
  await page.waitForSelector('#tb-depot-menue-verwaltung', { state: 'visible' });
  await page.click('#tb-depot-menue-verwaltung');
  await page.waitForSelector('#sub-neu', { state: 'visible' });
  await page.click('#sub-neu');
  await page.waitForSelector('#id-vorname', { state: 'visible' });
  await page.fill('#id-vorname', vorname);
  await page.fill('#id-pw', pw);
  await page.fill('#id-pw2', pw);
  await page.click('#m-ok');
  await page.waitForSelector('#id-vorname', { state: 'detached' });   // Dialog schließt
  await page.waitForSelector('[data-sub]');

  const uuid = await page.evaluate(() => (window.getData ? window.getData() : window.__vdOeffentlich.ankerDaten()).verwalteteDepots.slice(-1)[0].depotUUID);
  await page.click(`[data-entsiegeln="${uuid}"]`);
  await page.waitForSelector('#sub-auf', { state: 'visible' });
  await page.fill('#sub-auf', pw);
  await page.click('#m-ok');
  await page.waitForSelector('#sub-auf', { state: 'detached' });
  await page.click(`[data-betreten="${uuid}"]`);
  await page.waitForSelector('#app.modus-vollmacht', { state: 'attached' });   // echter Kontextwechsel steht
  return uuid;
}

test('[Depot-Liste·Sub-Kontext] zeigt Sophies Depot als aktiv, NICHT „Mein Depot", und bietet einen echten Rückweg', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await subKontextPerUiBetreten(page, { vorname: 'Sophie', pw: 'e2e-sub-pw-123' });

  // Der eigentliche Fund: Pillen-Klick → „Mein Depot" öffnet weiterhin denselben Info-Dialog —
  // aber jetzt kontextrichtig.
  await page.click('#tb-depot-pille');
  await page.waitForSelector('#tb-depot-menue-liste', { state: 'visible' });
  await page.click('#tb-depot-menue-liste');
  await expect(page.locator('#modal-titel')).toHaveText('Depot');

  const koerper = page.locator('#modal-inhalt');
  await expect(koerper).toContainText('Sophie');

  // „Mein Depot" behauptet nicht mehr, aktiv zu sein — der genaue Bug aus dem Screenshot.
  const meinDepotZeile = koerper.locator('.depot-liste-eintrag', { hasText: 'Mein Depot' });
  await expect(meinDepotZeile).not.toHaveClass(/\baktiv\b/);
  const sophieZeile = koerper.locator('.depot-liste-eintrag', { hasText: 'Sophie' });
  await expect(sophieZeile).toHaveClass(/\baktiv\b/);

  // Und der Dialog bietet jetzt einen ECHTEN Rückweg, keinen No-op.
  const zurueckKnopf = page.locator('#m-zweit');
  await expect(zurueckKnopf).toBeVisible();
  await zurueckKnopf.click();

  // Der Kontextwechsel ist real — nicht nur der Dialog schließt, der Sub-Kontext ist tatsächlich
  // verlassen (Schieferblau-Klasse fällt weg, wie beim bestehenden #vm-zurueck-Weg).
  await expect(page.locator('#app')).not.toHaveClass(/modus-vollmacht/);
});
