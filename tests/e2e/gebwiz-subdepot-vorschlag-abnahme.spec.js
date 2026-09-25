'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — Gebwiz Kind und Sub-Depot Zug 3: Sub-Depot-Vorschlag („Gebwiz Kind und Sub-Depot", 11.08.2026, echter Klickweg)
   ────────────────────────────────────────────────────────────────────────
   Auftrag Zug 3: „Vorschlagen heißt vorschlagen — nach dem Fertig-Toast, mit
   echtem, unausgefülltem Passwort-Dialog (kein vorausgefülltes Passwort)."
   Zwei Fälle: genannter Name → Vorschlag erscheint, „Ja" öffnet den ECHTEN
   Sub-Depot-Dialog (flowKindSubDepotAnlegen); kein Name → kein Vorschlag.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, einmalDialogeSchliessen } = require('./helpers');

// Wizard „Geburt eines Kindes" über den echten Anlass-Weg starten (Sidebar → Anlass-Auswahl).
async function gebwizStarten(page) {
  await page.click('[data-anlass-auswahl]');
  await page.waitForSelector('[data-anlass="geburt"]', { state: 'visible' });
  await page.click('[data-anlass="geburt"]');
  await expect(page.locator('.wizard-frage')).toBeVisible();
}

// Die sechs bestehenden Geburts-Schritte leer durchklicken (alle optional) bis zum
// Namens-Schritt — Zukunftsform ist der Regelfall, zu diesem Zeitpunkt ist nichts davon bekannt.
async function bisZumNamenSchrittDurchklicken(page) {
  for (let i = 0; i < 6; i++) await page.click('#wiz-weiter');
  await expect(page.locator('#content [data-edit="guidedBirthEntryChildsNameNot"]')).toBeVisible();
}

test('Geburts-Assistent mit genanntem Namen → Kind-Eintrag entsteht → Sub-Depot-Vorschlag → „Ja" öffnet den echten, leeren Passwort-Dialog', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await gebwizStarten(page);
  await bisZumNamenSchrittDurchklicken(page);

  await page.fill('#content [data-edit="guidedBirthEntryChildsNameNot"]', 'Mia Musterfrau');
  await page.click('#wiz-weiter');
  await expect(page.locator('#content [data-edit="guidedBirthEntryDateOfBirthNot"]')).toBeVisible();
  await page.fill('#content [data-edit="guidedBirthEntryDateOfBirthNot"]', '2027-03-15');
  await page.click('#wiz-weiter');
  await expect(page.locator('#content select[data-edit="guidedBirthEntryRelationship"]')).toBeVisible();
  await page.selectOption('#content select[data-edit="guidedBirthEntryRelationship"]', 'leiblich');
  await page.click('#wiz-weiter');   // letzter Schritt: Fertig

  // Kind-Eintrag entstand (Zug 2, hier nur als Voraussetzung des Vorschlags mitgeprüft).
  await page.waitForFunction(() => {
    const liste = (window.__vdOeffentlich.ankerDaten().sektoren['people'] || {}).childrenAndDependants || [];
    return liste.some(r => (window.__vdOeffentlich.personName ? window.__vdOeffentlich.personName(r.person) : '') === 'Mia Musterfrau');
  });

  // Sub-Depot-Vorschlag erscheint NACH dem Fertig-Toast.
  await expect(page.locator('#modal-titel')).toContainText('Eigenes Depot für Ihr Kind?');
  await expect(page.locator('#modal-inhalt')).toContainText('Mia Musterfrau');

  await page.click('#m-ok');   // „Ja, Depot anlegen"

  // Der ECHTE Sub-Depot-Dialog öffnet — Vorname vorbefüllt (aus dem Kind-Namen), Passwort LEER.
  await expect(page.locator('#id-pw')).toBeVisible();
  await expect(page.locator('#id-vorname')).toHaveValue('Mia');
  await expect(page.locator('#id-pw')).toHaveValue('');
  await expect(page.locator('#id-pw2')).toHaveValue('');
});

test('Geburts-Assistent ohne Namen (Zukunftsform) → kein Kind-Eintrag, kein Sub-Depot-Vorschlag', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await gebwizStarten(page);
  await bisZumNamenSchrittDurchklicken(page);

  // Namens-Schritt leer lassen, ebenso Geburtsdatum; Verhältnis auf Vorgabe belassen.
  await page.click('#wiz-weiter');
  await expect(page.locator('#content [data-edit="guidedBirthEntryDateOfBirthNot"]')).toBeVisible();
  await page.click('#wiz-weiter');
  await expect(page.locator('#content select[data-edit="guidedBirthEntryRelationship"]')).toBeVisible();
  await page.click('#wiz-weiter');   // Fertig

  // Seit der Speicher-Funktionsprobe (12.09.2026) kann neben dieser Meldung eine zweite
  // Pille stehen („Dieses Gerät kann den …"), wenn der interne Speicher im Testbrowser
  // nicht trägt. Beide sind richtig — darum auf DIESE Pille filtern statt auf „irgendeine".
  // Die Zusicherung wird dadurch schärfer, nicht weicher: genau eine trägt den Text.
  const toast = page.locator('#toast-host .toast', { hasText: 'Meine Menschen' });
  await expect(toast).toHaveCount(1);   // gebwizKindOffenToast: Name jederzeit nachtragbar

  await page.waitForTimeout(300);   // dem Vorschlags-Modal Gelegenheit geben, fälschlich aufzugehen
  await expect(page.locator('#modal-titel')).toHaveCount(0);
  const kinder = await page.evaluate(() => (window.__vdOeffentlich.ankerDaten().sektoren['people'] || {}).childrenAndDependants || []);
  expect(kinder.length, 'ohne Namen entsteht kein Kind-Eintrag').toBe(0);
});
