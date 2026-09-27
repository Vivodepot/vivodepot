'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Kette, Auftrag 7 — Browser-Abnahme (Ebene 2 des Testkonzepts)
   ────────────────────────────────────────────────────────────────────────────
   Die Node-Proben messen die Modelle; DIESE Probe misst, dass ein Mensch den
   Weg findet und geht — und dass der Bestätigungsschritt vor ihm steht, statt
   neben ihm.

   WAS HIER NICHT GEHT, und das gehört gesagt: der GEPRÜFTE Fall. Eine geprüfte
   Anfrage verlangt ein Zertifikat, das gegen den eingebauten Trust-Authority-
   Anker verifiziert — den Testschlüssel dafür gibt es in der ausgelieferten
   Anwendung nicht, und einen Anker einzuschleusen hiesse, genau die Prüfung zu
   umgehen, um die es geht. Der Gegenbeweis („bei einer geprüften erscheint der
   Schritt NICHT") läuft darum am Modell, in
   `tests/kette-07-die-anfrage.test.js`.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, fsaStandardAttrappeEinrichten, KERN_URL_PRIVAT_DE } = require('./helpers');

// Schnitt-Nachtrag (19.09.2026): war die rohe vivodepot.html — seit BUERGERMODUL_BUENDEL
// entfernt ist, hat die keine nativen Bereiche mehr, depotAnlegen()/oeffneSektor() liefen
// darum ins Leere. Jetzt dasselbe gebackene privat-de wie oeffneApp()'s eigener Default.
const KERN_URL = KERN_URL_PRIVAT_DE;

const ANFRAGE = {
  modulTyp: 'anfrage',
  anfrageVersion: 1,
  von: 'Pflegeheim Sonnenhof gGmbH',
  zweck: 'Aufnahme in die vollstationäre Pflege ab 01.10.2026',
  grundlage: '§ 630f BGB und der von Ihnen unterzeichnete Heimvertrag',
  vorgang: 'AUF-2026-0815',
  gueltigBis: '2099-12-31',
  felder: [
    { kennung: 'identity.givenName', zweck: 'Anrede im Aufnahmebogen', pflicht: true },
    { kennung: 'health.insuranceNumber', zweck: 'Abrechnung mit der Kasse', pflicht: true },
    { kennung: 'health.allergiesMedicationFoodOther', zweck: 'Vermeidung von Zwischenfällen', pflicht: false },
  ],
  antwort: { art: 'einmalpasswort', an: 'aufnahme@sonnenhof.example.de' },
};
function alsLink() {
  const roh = Buffer.from(JSON.stringify({ anfrage: ANFRAGE }), 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return KERN_URL + '#anfrage=' + roh;
}

test('Zug 6: eine Anfrage kommt an ihrem Ort an — mit Grundlage vor der Antwort', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  // Der Ort aus Auftrag 4 — KEIN neuer Menüpunkt, er stand schon da.
  await page.click('[data-uebergabe-protokoll]');
  await page.waitForSelector('#anfragen-ort', { state: 'visible' });
  await expect(page.locator('#anfrage-empfangen')).toBeVisible();

  // Datei-/QR-/Link-Text einfügen — EIN Weg für alle drei.
  await page.click('#anfrage-empfangen');
  await page.fill('#anfrage-text', JSON.stringify(ANFRAGE));
  await page.click('#m-ok');
  await page.waitForSelector('#anfrage-kopf', { state: 'visible' });

  // Wer fragt, wozu, AUF WELCHER GRUNDLAGE — und zwar VOR der Antwort.
  await expect(page.locator('#anfrage-kopf')).toContainText('Pflegeheim Sonnenhof');
  await expect(page.locator('#anfrage-grundlage')).toContainText('§ 630f BGB');
  await expect(page.locator('[data-anfrage-geprueft="0"]'), 'sie ist nicht geprüft, und das steht da').toHaveCount(1);

  // Was fehlt, ist benannt — und an Ort und Stelle füllbar.
  const fehlend = page.locator('[data-anfrage-fehlt]');
  expect(await fehlend.count(), 'die verlangten Angaben fehlen im frischen Depot').toBeGreaterThan(0);
  await page.fill('[data-anfrage-fuellen="health.insuranceNumber"]', 'A123456780');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(250);
  await expect(page.locator('[data-anfrage-fehlt="health.insuranceNumber"]'),
    'nachgetragen, ohne den Weg zu verlassen').toHaveCount(0);
});

test('Zug 4: der Bestätigungsschritt steht VOR der Antwort — nicht vorbelegt, nicht überspringbar', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.click('[data-uebergabe-protokoll]');
  await page.click('#anfrage-empfangen');
  await page.fill('#anfrage-text', JSON.stringify(ANFRAGE));
  await page.click('#m-ok');
  await page.waitForSelector('#anfrage-antworten', { state: 'visible' });

  await page.click('#anfrage-antworten');
  await page.waitForSelector('#anfrage-bestaetigt', { state: 'visible' });

  // Er sagt, WOHIN die Antwort geht — nicht nur, DASS etwas ungeprüft ist.
  await expect(page.locator('#anfrage-wohin')).toContainText('aufnahme@sonnenhof.example.de');

  // NICHT VORBELEGT.
  await expect(page.locator('#anfrage-bestaetigt')).not.toBeChecked();
  // NICHT ÜBERSPRINGBAR: der weiterführende Knopf ist gesperrt, bis bestätigt ist.
  await expect(page.locator('#m-ok')).toBeDisabled();
  await page.check('#anfrage-bestaetigt');
  await expect(page.locator('#m-ok')).toBeEnabled();
});

test('Zug 7: eine Anfrage in einer frischen Anwendung führt IN ein Depot und durch ihre Felder', async ({ page }) => {
  await fsaStandardAttrappeEinrichten(page);
  await page.goto(alsLink());

  // Die Anfrage steht vor dem Depot — und sagt, wie viele Angaben sie verlangt.
  await page.waitForSelector('#anfrage-einstieg-zahl', { state: 'visible' });
  await expect(page.locator('#anfrage-einstieg-zahl'), 'drei Angaben, nicht 178').toHaveText('3');
  await page.click('#m-ok');

  // Von hier der GEWÖHNLICHE Anlege-Weg — kein zweiter.
  await page.waitForSelector('#id-vorname', { state: 'visible' });
  await page.fill('#id-vorname', 'Hedwig');
  await page.fill('#id-nachname', 'Brandt');
  await page.fill('#id-pw', 'e2e-passwort-123');
  await page.fill('#id-pw2', 'e2e-passwort-123');
  await page.click('#m-ok');

  // Und danach steht der Mensch VOR der Anfrage, nicht vor 178 leeren Feldern.
  await page.waitForSelector('#anfrage-kopf', { state: 'visible', timeout: 30000 });
  await expect(page.locator('#anfrage-kopf')).toContainText('Pflegeheim Sonnenhof');
  const fehlend = page.locator('[data-anfrage-fehlt]');
  expect(await fehlend.count(), 'genau die Felder, die die Anfrage verlangt').toBeLessThanOrEqual(3);
});
