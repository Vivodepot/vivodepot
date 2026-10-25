'use strict';
/* FELD-FEHLER-NICHT-ZUGEORDNET (Barrierefreiheits-Audit 06.09.2026, Befund 3; WCAG 3.3.1 und 4.1.2, Stufe A) — im Browser
   Drei Wege, auf denen ein Feld abgelehnt wird: der Anlege-Dialog (Passwort-Bestätigung), die Bearbeiten-Strecke (ungültiges
   Datum) und der Wizard (ungültiges Datum). Je Weg gilt: das Feld trägt aria-invalid="true" und aria-describedby auf eine
   sichtbare Meldung mit Text; nach der Korrektur ist beides weg.
   Bearbeiten-Strecke, Regel vom 23.10.2026: der ungültige Wert bleibt sichtbar im Feld und hat den Fokus, er wird NIE gespeichert
   oder exportiert (Datensatz und vCard behalten den alten Wert), und nach dem Verlassen der Ansicht zeigt das Feld wieder den
   gespeicherten Wert. Klassenschutz und Rot-Beweis gegen den Kern vor dem Helfer: tests/feld-fehler-gemeinsamer-helfer.test.js. */
const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, setzeFeld, ANLEGE_WEG } = require('./helpers');

/** Prüft am Locator: aria-invalid="true" und ein Verweis auf eine sichtbare Meldung mit Text. Liefert die Meldung. */
async function erwarteZugeordnet(page, feld) {
  await expect(feld).toHaveAttribute('aria-invalid', 'true');
  const ids = String(await feld.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  const sichtbar = [];
  for (const id of ids) {
    const m = page.locator('[id="' + id + '"]');
    if (await m.count() && await m.isVisible() && String(await m.textContent()).trim()) sichtbar.push(m);
  }
  expect(sichtbar.length, 'aria-describedby verweist auf keine sichtbare Meldung mit Text (ids: ' + ids.join(' ') + ')').toBeGreaterThan(0);
  // Neben der Fehlermeldung kann ein Feldhinweis (fh-N) verknüpft sein; geliefert wird die Fehlermeldung.
  for (const m of sichtbar) if (/\bfeld-fehler\b/.test(String(await m.getAttribute('class')))) return m;
  return sichtbar[0];
}
async function erwarteGeloest(feld) {
  await expect(feld).not.toHaveAttribute('aria-invalid', 'true');
  const ids = String(await feld.getAttribute('aria-describedby') || '');
  expect(ids, 'der Verweis auf die Meldung bleibt nach der Korrektur stehen').not.toMatch(/\bff-\d+\b|-fehler\b/);
}

test('[Feld-Fehler·Dialog] Passwort-Bestätigung ungleich: das Feld ist markiert und verweist auf die Meldung, nach der Korrektur nicht mehr', async ({ page }) => {
  await oeffneApp(page);
  await page.click('#w-anfangen');
  await page.waitForSelector('#app.an', { state: 'attached' });
  await page.waitForSelector(ANLEGE_WEG + ':visible', { state: 'attached', timeout: 60_000 });
  await page.locator(ANLEGE_WEG + ':visible').first().click();
  await page.waitForSelector('#id-pw', { state: 'visible' });
  await page.fill('#id-pw', 'e2e-passwort-123');
  await page.fill('#id-pw2', 'e2e-passwort-anders');
  await page.locator('#id-pw2').blur();
  const pw2 = page.locator('#id-pw2');
  const meldung = await erwarteZugeordnet(page, pw2);
  await expect(meldung).toHaveId('id-pw2-fehler');
  await erwarteZugeordnet(page, page.locator('#id-pw'));
  await page.fill('#id-pw2', 'e2e-passwort-123');
  await erwarteGeloest(pw2);
  await erwarteGeloest(page.locator('#id-pw'));
  await expect(page.locator('#id-pw2-fehler')).toBeHidden();
});

test('[Feld-Fehler·Bearbeiten] ungültiges Datum: bleibt sichtbar und markiert, wird nie gespeichert oder exportiert, Verlassen zeigt den gespeicherten Wert', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'identity');
  await setzeFeld(page, 'givenName', 'Maria');
  await setzeFeld(page, 'familyName', 'Mustermann');
  await setzeFeld(page, 'birthDate', '1950-03-01');
  const feld = page.locator('#content [data-edit="birthDate"]');

  // Ein Speichern von außen (Fokus woanders, z. B. Ansichtswechsel) lehnt den Wert ab und setzt den Fokus ins Feld. Verlässt
  // die Nutzerin das Feld selbst (Tab), bleibt der Fokus, wo sie hinwollte; die Meldung mit role="alert" wird angesagt.
  await page.evaluate(() => {
    document.querySelector('#content [data-edit="birthDate"]').value = '0100-01-01';
    document.activeElement && document.activeElement.blur();
    window.__vdOeffentlich.bearbeitungSpeichern();
  });
  const meldung = await erwarteZugeordnet(page, feld);
  await expect(meldung).toHaveClass(/feld-fehler/);
  await expect(feld, 'der ungültige Wert bleibt sichtbar').toHaveValue('0100-01-01');
  await expect(feld, 'der Fokus steht im abgelehnten Feld').toBeFocused();

  // Speichern während ungültig → der Datensatz behält den alten Wert.
  const gespeichert = await page.evaluate(() => { window.__vdOeffentlich.bearbeitungSpeichern(); return window.__vdOeffentlich.ankerDaten().sektoren.identity.birthDate; });
  expect(gespeichert).toBe('1950-03-01');
  await expect(feld).toHaveValue('0100-01-01');
  await erwarteZugeordnet(page, feld);

  // Export während ungültig → die vCard trägt den alten Wert.
  await page.evaluate(() => window.__vdOeffentlich.flowFormatExport('vcard-identitaet'));
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#m-ok')]);
  const vcard = fs.readFileSync(await download.path(), 'utf8');
  expect(vcard).toContain('BDAY:19500301');
  expect(vcard).not.toContain('01000101');
  // Danach fragt der Herausgabe-Vermerk, wem die Datei gegeben wurde — freiwillig, hier „Später“.
  await page.locator('#modal-rueck.an button', { hasText: /^Später$/ }).click();
  await expect(page.locator('#modal-rueck.an')).toHaveCount(0);

  // Korrektur → Markierung weg, der neue Wert ist gespeichert.
  await feld.fill('1960-05-05');
  await feld.blur();
  await erwarteGeloest(feld);
  await expect(page.locator('#content p.feld-fehler')).toHaveCount(0);
  expect(await page.evaluate(() => window.__vdOeffentlich.ankerDaten().sektoren.identity.birthDate)).toBe('1960-05-05');

  // Verlassen der Ansicht mit einem ungültigen Wert → zurück steht der gespeicherte Wert, ohne Markierung.
  await feld.fill('0100-01-01');
  await feld.blur();
  await erwarteZugeordnet(page, feld);
  await oeffneSektor(page, 'health');
  await oeffneSektor(page, 'identity');
  await expect(page.locator('#content [data-edit="birthDate"]')).toHaveValue('1960-05-05');
  await erwarteGeloest(page.locator('#content [data-edit="birthDate"]'));
});

test('[Feld-Fehler·Wizard] ungültiges Datum im Assistenten: die Eingabe ist markiert und verweist auf die Meldung, nach der Korrektur nicht mehr', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  // Klickweg wie tests/e2e/fehlerpfad-wizard-abbruch.spec.js (Fall A): gebwiz bis zum Datums-Schritt.
  await page.click('[data-anlass-auswahl]');
  await page.waitForSelector('[data-anlass="geburt"]', { state: 'visible' });
  await page.click('[data-anlass="geburt"]');
  await expect(page.locator('.wizard-frage')).toBeVisible();
  for (let i = 0; i < 6; i++) await page.click('#wiz-weiter');
  await page.fill('#content [data-edit="guidedBirthEntryChildsNameNot"]', 'E2E Kind');
  await page.click('#wiz-weiter');
  const feld = page.locator('#content [data-edit="guidedBirthEntryDateOfBirthNot"]');
  await expect(feld).toBeVisible();

  await feld.fill('0100-01-01');
  await page.click('#wiz-weiter');
  const meldung = await erwarteZugeordnet(page, feld);
  await expect(meldung).toHaveAttribute('role', 'alert');

  await page.locator('#content [data-edit="guidedBirthEntryDateOfBirthNot"]').fill('2020-02-02');
  await page.click('#wiz-weiter');
  expect(await page.evaluate(() => window.__vdOeffentlich.wizardFehlerGrund)).toBeNull();
  await expect(page.locator('#content [aria-invalid="true"]')).toHaveCount(0);
  await expect(page.locator('#content p.feld-fehler')).toHaveCount(0);
});
