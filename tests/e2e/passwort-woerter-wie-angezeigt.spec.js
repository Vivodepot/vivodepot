'use strict';
/* Befund PASSWORT-TRENNZEICHEN (HOCH, 11.11.2026): Die vorgeschlagenen sechs Wörter stehen beim Anlegen als Raster, ein Wort je
   Eintrag, ohne Bindestrich. Die Probe beim Anlegen und das Öffnen nehmen sie aber nur mit Bindestrichen an. Wer die Wörter so
   abtippt, wie sie dastehen, wird bei der Probe abgewiesen und hält beim Wiederöffnen das Depot für verloren.

   Abnahme: Die Wörter, wie angezeigt eingegeben, bestehen die Probe und öffnen das Depot, deutsch und englisch.
   „Wie angezeigt“ heißt: der sichtbare Text der Wortanzeige, Leerraum zwischen den Wörtern als ein Leerzeichen. So tippt eine
   Person sechs Wörter ab, die untereinander stehen.

   Die Probe ist rot, bis Anzeige und Eingabe dieselbe Form haben. Bestehende Depots müssen weiter öffnen; das prüft die Probe
   mit der Kanonform beim Anlegen im zweiten Fall. */
const { test, expect } = require('@playwright/test');
const h = require('./helpers');

const SPRACHEN = [
  { name: 'DE', url: h.KERN_URL_PRIVAT_DE },
  { name: 'EN', url: h.KERN_URL_PRIVAT_EN },
];

// Bis zum Anlege-Dialog mit dem vorgeschlagenen Raster; liefert den Text, wie er angezeigt ist, und die Kanonform im Feld.
async function anlegeDialogMitVorschlag(page, url) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await h.oeffneApp(page, { url });
  await page.click('#w-anfangen');
  await page.waitForSelector('#app.an', { state: 'attached' });
  await page.click(h.ANLEGE_WEG_KANON + ':visible');
  await page.waitForSelector('#id-vorname', { state: 'visible' });
  await page.fill('#id-vorname', 'Erika');
  await page.fill('#id-nachname', 'Muster');
  await page.click('#id-pw-vorschlag-knopf');   // Passwort festlegen (24.11.2026): die Wörter kommen über das Angebot
  const anzeige = page.locator('#id-pw-vorschlag-woerter');
  await expect(anzeige).toBeVisible();
  const wieAngezeigt = (await anzeige.innerText()).trim().split(/\s+/).join(' ');
  const kanon = await page.locator('#id-pw').inputValue();
  expect(kanon.split('-')).toHaveLength(6);
  return { wieAngezeigt, kanon };
}

// Probe bestätigen und die Einmal-Dialoge danach abräumen, bis die Sitzung steht.
async function probeBestaetigen(page, eingabe) {
  await page.fill('#id-pw2', eingabe);
  await page.click('#m-ok');
}

async function anlegenAbschliessen(page) {
  const dateiName = page.locator('#datei-name');
  if (await dateiName.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false)) await page.click('#m-ok');
  await page.waitForSelector('#tb-pw-hinweis', { state: 'hidden' });
  await page.waitForSelector('#app.an', { state: 'attached' });
  await h.einmalDialogeSchliessen(page);
}

for (const s of SPRACHEN) {
  test(`[PASSWORT-TRENNZEICHEN·Probe·${s.name}] die Wörter, wie angezeigt abgetippt, bestehen die Probe beim Anlegen`, async ({ page }) => {
    const { wieAngezeigt } = await anlegeDialogMitVorschlag(page, s.url);
    await probeBestaetigen(page, wieAngezeigt);
    // Bestanden heißt: der Dialog geht weiter, das Probefeld steht nicht mehr da.
    await expect(page.locator('#id-pw2'),
      'die Probe weist die Wörter ab, obwohl sie so getippt sind, wie sie dastehen: „' + wieAngezeigt + '“').toBeHidden({ timeout: 10000 });
    await anlegenAbschliessen(page);
  });

  test(`[PASSWORT-TRENNZEICHEN·Öffnen·${s.name}] die Wörter, wie angezeigt eingegeben, öffnen das Depot; die Kanonform weiter auch`, async ({ page }) => {
    const { wieAngezeigt, kanon } = await anlegeDialogMitVorschlag(page, s.url);
    // Angelegt mit der Kanonform, wie jedes bestehende Depot.
    await probeBestaetigen(page, kanon);
    await anlegenAbschliessen(page);

    await page.reload();
    await page.locator('#co-pw').waitFor({ state: 'visible', timeout: 10000 });
    await page.fill('#co-pw', wieAngezeigt);
    await page.click('#w-oeffnen');
    await expect(page.locator('#app.an'), 'das Depot öffnet mit den Wörtern, wie angezeigt: „' + wieAngezeigt + '“')
      .toBeAttached({ timeout: 15000 });

    // Bestehende Depots: die Kanonform öffnet weiter.
    await page.reload();
    await page.locator('#co-pw').waitFor({ state: 'visible', timeout: 10000 });
    await page.fill('#co-pw', kanon);
    await page.click('#w-oeffnen');
    await expect(page.locator('#app.an')).toBeAttached({ timeout: 15000 });
  });
}

/* Befund PASSWORT-OHNE-TRENNER (HOCH, 24.11.2026): wer die sechs Wörter aneinander abschreibt, ohne Leerzeichen, besteht die Probe
   und öffnet das Depot, in beliebiger Schreibung. Zerlegt wird über die Wortliste der Produktsprache. Bei 375 px, wie auf dem
   Telefon; der Hinweis am Probe-Feld steht dabei sichtbar da. */
for (const s of SPRACHEN) {
  test(`[PASSWORT-OHNE-TRENNER·${s.name}] aneinander getippt: Probe besteht, Depot öffnet, auch in Großschreibung`, async ({ page }) => {
    const { wieAngezeigt } = await anlegeDialogMitVorschlag(page, s.url);
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('#id-pw2-hinweis'), 'der Hinweis zur Schreibweise steht am Probe-Feld').toBeVisible();
    const ohne = wieAngezeigt.split(' ').join('');
    await probeBestaetigen(page, ohne);
    await expect(page.locator('#id-pw2'), 'die Probe weist die Wörter ohne Trenner ab: „' + ohne + '“').toBeHidden({ timeout: 10000 });
    await anlegenAbschliessen(page);

    await page.reload();
    await page.locator('#co-pw').waitFor({ state: 'visible', timeout: 10000 });
    await expect(page.locator('#co-pw-hinweis')).toBeVisible();
    await page.fill('#co-pw', ohne.toUpperCase());
    await page.click('#w-oeffnen');
    await expect(page.locator('#app.an'), 'das Depot öffnet ohne Trenner: „' + ohne.toUpperCase() + '“').toBeAttached({ timeout: 15000 });
  });
}
