'use strict';
/* Passwort-Vorschlag im Anlege-Dialog (U2-ADR-463, Teil 1): vorbelegt beim Öffnen, vorschlagen, anderen Vorschlag holen, übernehmen,
   bestätigen, anlegen. Der Hinweis zum eigenen Passwort erscheint nur, wenn jemand selbst tippt, und sperrt nichts.
   Probe der Liste, des Zufalls und der Abdeckung aller Felder: tests/passwort-vorschlag.test.js. */
const { test, expect } = require('@playwright/test');
const { oeffneApp } = require('./helpers');
const DE = require('../../tools/textsatz-de-modul.json').texte;

test('[PW-Vorschlag] vorschlagen, übernehmen, anlegen — der Hinweis gilt nur dem eigenen Passwort', async ({ page }) => {
  await oeffneApp(page);
  await page.click('#w-anfangen');
  await page.waitForSelector(':is([data-anlegen-weg], [data-bereich-leer="vorschau"] [data-umschau-eintragen]):visible', { state: 'attached' });
  await page.click(':is([data-anlegen-weg], [data-bereich-leer="vorschau"] [data-umschau-eintragen]):visible');
  await page.waitForSelector('#id-vorname', { state: 'visible' });
  await page.fill('#id-vorname', 'Maria');
  await page.fill('#id-nachname', 'Mustermann');
  // Seit v1000 (U2-ADR-463 Nachtrag 31.10.2026) steht der Hinweis zum eigenen Passwort in der Hilfe, nicht unter dem Feld. Ob der Dialog
  // den Vorschlag oder ein eigenes Passwort sieht, zeigen der Satz über dem Feld und der Weg „Lieber ein eigenes Passwort“.
  const S = { vorschlag: DE['strings:anlegenPwSatzVorschlag.text'], eigen: DE['strings:anlegenPwSatzEigen.text'] };
  const imVorschlag = async () => {
    await expect(page.locator('#id-pw-satz-text')).toHaveText(S.vorschlag);
    await expect(page.locator('#id-pw-eigen-weg')).toBeVisible();
  };
  const imEigenen = async () => {
    await expect(page.locator('#id-pw-satz-text')).toHaveText(S.eigen);
    await expect(page.locator('#id-pw-eigen-weg')).toBeHidden();
  };
  // Zielbild 01 (Umbau 05.11.2026): die Wörter stehen als nummeriertes Raster (je Wort ein Listeneintrag); das Passwort-Feld steht erst
  // beim eigenen Passwort da, die Probe zeigt beim Vorschlag Klartext.
  const woerter = async () => (await page.locator('#id-pw-vorschlag-woerter li').allTextContents()).join('-');
  const eigenesTippen = async (pw) => {
    if (await page.isVisible('#id-pw-eigen-weg')) await page.click('#id-pw-eigen-weg');
    await expect(page.locator('#id-pw')).toBeVisible();
    await page.fill('#id-pw', pw);
  };

  // Vorbelegt (07.10.2026): ohne Klick steht der Vorschlag im Feld und sichtbar darüber; die Bestätigung bleibt leer.
  const vorbelegt = await woerter();
  expect(vorbelegt.split('-')).toHaveLength(6);
  await expect(page.locator('#id-pw-vorschlag-anzeige')).toBeVisible();
  await expect(page.locator('#id-pw')).toHaveValue(vorbelegt);
  await expect(page.locator('#id-pw')).toBeHidden();
  await expect(page.locator('#id-pw2')).toHaveValue('');
  await expect(page.locator('#id-pw2')).toHaveAttribute('type', 'text');
  // U2-ADR-463 Nachtrag 31.10.2026: beim Vorschlag keine Stärke-Anzeige, die Probe steht direkt unter den Wörtern (K4).
  await expect(page.locator('#id-pw-staerke')).toBeHidden();

  await imVorschlag();
  await eigenesTippen('sommer2026!');
  await imEigenen();
  await expect(page.locator('#id-pw2')).toHaveAttribute('type', 'password');
  // Die Stärke rechnet auf den getippten Wert, nicht auf den Vorschlag: beim eigenen Passwort steht sie da, schwach wie stark.
  await expect(page.locator('#id-pw-staerke')).toBeVisible();
  await expect(page.locator('#id-pw-staerke')).not.toHaveClass(/pw-staerke-stark/);
  await page.fill('#id-pw', 'abcdefgh-1234567');
  await expect(page.locator('#id-pw-staerke')).toBeVisible();
  await expect(page.locator('#id-pw-staerke')).toHaveClass(/pw-staerke-stark/);

  await page.click('#id-pw-vorschlag-knopf');
  const erster = await woerter();
  expect(erster).not.toBe(vorbelegt);
  expect(erster.split('-')).toHaveLength(6);
  await expect(page.locator('#id-pw')).toHaveValue(erster);
  await imVorschlag();
  await expect(page.locator('#id-pw-staerke')).toBeHidden();

  await page.click('#id-pw-vorschlag-anderer');
  const zweiter = await woerter();
  expect(zweiter).not.toBe(erster);
  await expect(page.locator('#id-pw')).toHaveValue(zweiter);

  // Wer danach selbst tippt, sieht den alten Vorschlag nicht mehr, sondern den Hinweis; zurück geht es mit dem Knopf.
  await eigenesTippen('sommer2026!');
  await expect(page.locator('#id-pw-vorschlag-anzeige')).toBeHidden();
  await imEigenen();
  await page.click('#id-pw-vorschlag-knopf');
  const dritter = await woerter();
  await expect(page.locator('#id-pw')).toHaveValue(dritter);
  await imVorschlag();
  await expect(page.locator('#id-pw-staerke')).toBeHidden();

  await page.fill('#id-pw2', dritter);
  await page.click('#m-ok');
  await page.waitForSelector('#tb-pw-hinweis', { state: 'hidden' });
});
