'use strict';
/* Abnahme 1 — „Drei Abnahmen und vier Messungen" (12./13.08.2026).
   Der Bericht vom 12.08. (A169) erreichte keinen vollen interaktiven Klickweg — der
   Wizard-Start-Knopf ließ sich über den erwarteten Selektor nicht auslösen. Der neue
   `wizardStarten()`-Helfer (12.08., `helpers.js`) behebt genau das (die
   `<details class="wizard-gruppe">`-Gate-Falle). Diese Spec fährt umzwiz einmal ohne und
   einmal MIT gesetztem `wohnung_typ:'eigentum'` — der eigentliche A169-Fund war, dass
   `verborgenWenn` bereits heute greift (KEIN Cross-Sektor-Fall, `wohnung_typ` steht im selben
   Zielbereich `wohnen`), node-getestet aber nie im echten Klickweg belegt. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, wizardStarten } = require('./helpers');

test('umzwiz: voller Klickweg, Mietverhältnis-Schritte sichtbar ohne wohnung_typ', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'identity');

  await wizardStarten(page, 'umzwiz');
  await expect(page.locator('.wizard-frage')).toBeVisible();
  await expect(page.locator('#content')).toContainText('Schritt 1 von');

  await page.fill('#content [data-edit="streetAddress"]', 'Seestraße 4');
  await page.click('#wiz-weiter');
  await page.fill('#content [data-edit="postcodeCity"]', '18055 Rostock');
  await page.click('#wiz-weiter');
  await page.fill('#content [data-edit="reRegistrationWithTheResidents"]', 'Termin Bürgerbüro 12.09.');
  await page.click('#wiz-weiter');
  await page.fill('#content [data-edit="changingUtilityProviders"]', 'Strom/Internet ummelden; Bank informieren');
  await page.click('#wiz-weiter');

  // Der eigentliche Beleg: ohne gesetztes wohnung_typ bleibt der Schritt sichtbar (Negativ-Form,
  // U2-ADR-102 — unbeantwortet zeigt, nur AKTIV 'eigentum' verbirgt).
  await expect(page.locator('#content')).toContainText('Mietverhältnis');
  await page.fill('#content [data-edit="tenancyTerminationHandover"]', 'alte Wohnung zum 30.09. gekündigt; Übergabe mit Protokoll');
  await page.click('#wiz-weiter');
  await expect(page.locator('#content')).toContainText('gekündigt');
  await page.fill('#content [data-edit="noticeDate"]', '2026-09-30');
  await page.click('#wiz-weiter');
  await page.fill('#content [data-edit="moveOutDate"]', '2026-10-01');
  await page.click('#wiz-weiter');
  await page.fill('#content [data-edit="handoverDateNewHome"]', '2026-10-02');
  await page.click('#wiz-weiter');

  // Abschluss: Wizard schließt, Toast bestätigt die drei Zielbereiche.
  await expect(page.locator('.wizard-frage')).toHaveCount(0);

  // Die Werte landen wirklich in den drei verschiedenen Zielbereichen (Identität/Verwaltung/Wohnen).
  // Sektor-Felder sind Inline-Inputs — der Wert steht im `value`, nicht im sichtbaren Text.
  await oeffneSektor(page, 'identity');
  await expect(page.locator('#content [data-edit="streetAddress"]')).toHaveValue('Seestraße 4');
  await page.screenshot({ path: 'tests/e2e/.artifacts/umzwiz-1-identitaet.png', fullPage: true }).catch(() => {});

  await oeffneSektor(page, 'housing');
  await expect(page.locator('#content [data-edit="tenancyTerminationHandover"]')).toHaveValue(/alte Wohnung zum 30\.09/);
  await expect(page.locator('#content [data-edit="noticeDate"]')).toHaveValue('2026-09-30');
  await page.screenshot({ path: 'tests/e2e/.artifacts/umzwiz-2-wohnen-sichtbar.png', fullPage: true }).catch(() => {});

  await oeffneSektor(page, 'administration');
  await expect(page.locator('#content [data-edit="changingUtilityProviders"]')).toHaveValue(/Bank informieren/);
});

test('umzwiz: mit wohnung_typ=eigentum bleiben Mietverhältnis-Schritte verborgen (verborgenWenn, kein Cross-Sektor-Bruch)', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  // wohnung_typ VORAB setzen — derselbe Zielbereich (wohnen), den umzwiz ohnehin beschreibt.
  await oeffneSektor(page, 'housing');
  await page.selectOption('#content [data-edit="ownedOrRented"]', 'eigentum');
  await page.evaluate(() => { window.__vdOeffentlich.bearbeitungSpeichern(); window.__vdOeffentlich.renderContent(); });

  await oeffneSektor(page, 'identity');
  await wizardStarten(page, 'umzwiz');
  await expect(page.locator('.wizard-frage')).toBeVisible();

  await page.fill('#content [data-edit="streetAddress"]', 'Seestraße 4');
  await page.click('#wiz-weiter');
  await page.fill('#content [data-edit="postcodeCity"]', '18055 Rostock');
  await page.click('#wiz-weiter');
  await page.fill('#content [data-edit="reRegistrationWithTheResidents"]', 'erledigt');
  await page.click('#wiz-weiter');
  await page.fill('#content [data-edit="changingUtilityProviders"]', 'Strom ummelden');
  await page.click('#wiz-weiter');

  // Der Beleg: die nächste Frage überspringt Mietverhältnis UND Kündigungstermin und springt
  // direkt zum Auszugstermin — beide `verborgenWenn`-Schritte sind wirklich weg, nicht nur leer.
  await expect(page.locator('#content')).not.toContainText('Mietverhältnis');
  await expect(page.locator('#content')).toContainText('Wann ziehen Sie aus');
  await page.screenshot({ path: 'tests/e2e/.artifacts/umzwiz-3-eigentum-verborgen.png', fullPage: true }).catch(() => {});
});
