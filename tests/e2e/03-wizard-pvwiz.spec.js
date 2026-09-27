'use strict';
/* Reise — Geführte Eingabe in Bereich 8: starten, einen Schritt weiter, zurück,
   abbrechen → zurück in den Ausgangsbereich (U2-ADR-054).

   VEHIKEL-WECHSEL 23.07. (U2-ADR-096): Diese Reise fuhr auf vvwiz, dem
   Vorsorgevollmacht-Wizard. Der ist ersatzlos entfallen — ein Instrument entsteht
   jetzt durch den Listen-Eintrag, nicht durch einen Wizard. Geprüft wird hier aber
   die NAVIGATION, nicht die Vollmacht; sie gilt für jeden Wizard gleich. Vehikel ist
   deshalb pvwiz, der in Bereich 8 verbliebene geführte Einstieg.

   Der Spec lief seit dem Wizard-Ausbau tot: Das Fehlschlag-Gate liest nur
   `node --test` und sieht Playwright nicht, also wäre er erst beim Push
   aufgeschlagen. Das Gate benennt seinen Geltungsbereich jetzt in der Ausgabe. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

test('pvwiz: Start in Bereich 8, Fortschritt, Weiter/Zurück, Abbrechen → Ausgangsbereich', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');

  // Vorsorge-UX (Teil 1, 25.07.): pvwiz ist ein Instrument-Wizard und steht jetzt als DIREKTER
  // Startknopf (ohne Sammel-Überschrift). Die verbleibende Aufklapp-Zeile ist die Anlass-Kategorie
  // „Übergänge" (pflwiz/heirwiz) — pvwiz liegt NICHT darin. Der defensive Klick öffnet sie höchstens
  // harmlos; pvwiz ist ohnehin direkt sichtbar.
  const gefuehrt = page.locator('.wizard-gruppe > summary');
  if (await gefuehrt.count()) await gefuehrt.click();

  // Datenlage-adaptiver Startknopf (leer → „erstellen").
  await expect(page.locator('[data-wizard-start="pvwiz"]')).toBeVisible();
  await page.click('[data-wizard-start="pvwiz"]');

  // Wizard rendert: Titel, Fortschritt, erste Frage.
  await expect(page.locator('.wizard-frage')).toBeVisible();
  await expect(page.locator('#content')).toContainText('Schritt 1 von');

  // Erster Schritt ist eine Mehrfachauswahl (pv_situationen, amtlicher BMJ-Baustein) — seit dem
  // Pillen-Umbau (Screenshot-Review Befund C, 27.08.2026) ein <button>, kein <input
  // type="checkbox"> mehr; ein Klick genügt, um weiterzukommen.
  await page.locator('#content button[data-edit-multi="applicableSituations"]').first().click();
  await page.click('#wiz-weiter');
  await expect(page.locator('#content')).toContainText('Schritt 2 von');

  // Zurück bewegt den Schritt.
  await page.click('#wiz-zurueck');
  await expect(page.locator('#content')).toContainText('Schritt 1 von');

  // Abbrechen → zurück in den AUSGANGSBEREICH (U2-ADR-054, Bug 1): der Wizard wurde aus Vorsorge
  // gestartet, also landet Abbrechen wieder auf der Vorsorge-Sicht — NICHT mehr auf der Welcome-Seite.
  await page.click('#wiz-abbr');
  await expect(page.locator('.wizard-frage')).toHaveCount(0);
  await expect(page.locator('.bereich-kopf')).toContainText('Vorsorge & Recht');
});
