'use strict';
/* ═════════════════════════════════════════════════
   T-CROSS-41 — Studio auf dem Weg einer Vorführung, im Browser (Prüfung am iPad 14.10.2026, Nachtrag U2-ADR-493)
   ─────────────────────────────────────────────────
   Belegt im Browser, was die Node-Probe tests/studio-vorfuehrpfad.test.js nur ohne DOM sehen kann:
   (1) „Ihr Zeichen“: das Feld ist leer, der Vorschlag steht als Platzhalter; Getipptes ersetzt ihn, die Vorschau zeigt nur
       das Getippte. Ein leeres Feld nimmt den Vorschlag.
   (2) Beispiel „Anmeldung Stadtbibliothek“ (Liste mit drei Unterfeldern): unter „Ausprobieren“ legt „+ Eintrag hinzufügen“
       eine Zeile mit drei Eingaben an, „Entfernen“ nimmt sie weg; die Vorlage behält ihre Felder.
   (3) Feldliste: ab Werk keine Kennung zu sehen, jede Zeile trägt sie im title; der Schalter „Kennungen zeigen“ blendet sie ein.
   Rot-Beweise je Prüfung in tests/studio-vorfuehrpfad.test.js (an veränderten Fassungen). Hier Gegenproben im Lauf.
   ═════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const H = require('./support/helpers');

test.describe('T-CROSS-41 Studio auf dem Weg einer Vorführung', () => {
  test('(1) „Ihr Zeichen“: der Vorschlag ist Platzhalter, Getipptes ersetzt ihn', async ({ page: p }) => {
    await p.goto(H.URLS.generator);
    await p.click('#sp-de');
    await p.click('#ein-anfrage');
    await expect(p.locator('#aa-vorgang')).toHaveValue('');
    await expect(p.locator('#aa-vorgang')).toHaveAttribute('placeholder', /^Anfrage-\d{4}-\d{2}-\d{2}$/);
    await expect(p.locator('#aa-v-vorgang')).toHaveText(/^Anfrage-\d{4}-\d{2}-\d{2}$/);   // leer: der Vorschlag gilt
    await p.click('#aa-vorgang');
    await p.keyboard.type('MA-117');
    await expect(p.locator('#aa-vorgang')).toHaveValue('MA-117');
    await expect(p.locator('#aa-v-vorgang')).toHaveText('MA-117');
    // Gegenprobe: wieder geleert, gilt wieder der Vorschlag.
    await p.fill('#aa-vorgang', '');
    await expect(p.locator('#aa-v-vorgang')).toHaveText(/^Anfrage-\d{4}-\d{2}-\d{2}$/);
  });

  test('(2) Liste mit Unterfeldern: „+ Eintrag hinzufügen“ wirkt unter „Ausprobieren“', async ({ page: p }) => {
    await H.generator.oeffnen(p, 'de');
    await p.click('#bsp-bibliothek');
    await expect(p.locator('.vk')).toHaveCount(7);
    const liste = p.locator('.vk', { has: p.locator('.vk-name', { hasText: 'Weitere Personen im Familienausweis' }) });
    await p.click('#ansicht-probieren');
    await expect(liste.locator('.vk-eintrag')).toHaveCount(0);
    await liste.locator('.vk-eintrag-hinzu').click();
    await expect(liste.locator('.vk-eintrag')).toHaveCount(1);
    await expect(liste.locator('.vk-eintrag .vk-unterfeld-name')).toHaveText(['Vorname', 'Nachname', 'Geburtsdatum']);
    await expect(liste.locator('.vk-eintrag input[type="date"]')).toHaveCount(1);
    await liste.locator('.vk-eintrag-hinzu').click();
    await expect(liste.locator('.vk-eintrag')).toHaveCount(2);
    await liste.locator('.vk-eintrag-weg').first().click();
    await expect(liste.locator('.vk-eintrag')).toHaveCount(1);
    await expect(p.locator('.vk')).toHaveCount(7);   // die Vorlage behält ihre Felder
    // Gegenprobe: unter „Bearbeiten“ legt der Knopf nichts an.
    await p.click('#ansicht-bauen');
    await liste.locator('.vk-eintrag-hinzu').click({ force: true });
    await expect(liste.locator('.vk-eintrag')).toHaveCount(0);
  });

  test('(3) Kennungen in der Feldliste: ab Werk eingeklappt, der Schalter blendet sie ein', async ({ page: p }) => {
    await H.generator.oeffnen(p, 'de');
    await p.click('#start-leer');
    await expect(p.locator('#pal-liste .pal-eintrag').first()).toBeVisible();
    await expect(p.locator('#pal-liste small.pal-kennung')).toHaveCount(0);
    await expect(p.locator('#pal-liste [data-kennung="identity.givenName"]')).toHaveAttribute('title', 'identity.givenName');
    await p.check('#pal-kennungen');
    await expect(p.locator('#pal-liste small.pal-kennung').first()).toBeVisible();
    await expect(p.locator('#pal-liste small.pal-kennung', { hasText: 'identity.givenName' })).toHaveCount(1);
    await p.uncheck('#pal-kennungen');
    await expect(p.locator('#pal-liste small.pal-kennung')).toHaveCount(0);
  });
});
