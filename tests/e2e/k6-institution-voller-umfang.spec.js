'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — K6 (Auftrag K1/K2/K6, 09.08.2026): toter Knopf, halbe Maske.
   ────────────────────────────────────────────────────────────────────────
   Browser-Abnahme (Auftrag: "alle fünf Flows verdrahtet, ein Umfang").
   Deckt beide Fund-Hälften am selben Weg ("Meine Menschen" → Institution
   neu anlegen), da dieser Flow vorher UNVERDRAHTET war UND — wäre er es
   gewesen — nur die halbe Maske gezeigt hätte:
     1. "+ Neue Institution anlegen" tat vorher NICHTS (kein onchange).
     2. Die jetzt erscheinende Inline-Maske trägt den vollen Umfang
        (Telefon/Adresse/E-Mail/Anmerkung), nicht nur Name.
   Die Knopf-Verdrahtung selbst ist im Node-Harness NICHT prüfbar
   (querySelectorAll liefert dort immer [], s. tests/load-kern.js).
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

const KONSOLE_HARMLOS = [
  /Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored when delivered via/i,
];
const istHarmloseKonsole = (t) => KONSOLE_HARMLOS.some((re) => re.test(String(t)));

test('K6: "Meine Menschen" → Person anlegen → Institution "+ neu anlegen" öffnet die volle Maske (nicht nur Name)', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page);

  await oeffneSektor(page, 'people');
  const bearb = page.locator('#b-bearb');
  if (await bearb.count()) await bearb.click();
  await page.click('[data-person-hinzufuegen]');
  await page.waitForSelector('#modal-titel');
  await page.fill('[data-edit="name"]', 'Anna Schmidt');

  // Vorher: kein onchange, der Knopf tat nichts. Jetzt: eine Inline-Maske erscheint.
  await page.selectOption('[data-edit-ref="institution"]', '__neu__');
  const inline = page.locator('.inline-neu[data-fuer="institution"]');
  await expect(inline).toBeVisible();

  // Der volle Umfang, nicht nur {name, art} — dieselben Felder wie flowRefNeueEntitaet
  // (_institutionFelder): name/art/tel/adresse/email/anmerkung.
  await expect(inline.locator('[data-edit="name"]')).toBeVisible();
  await expect(inline.locator('[data-edit="tel"]')).toBeVisible();
  await expect(inline.locator('[data-edit="adresse"]')).toBeVisible();
  await expect(inline.locator('[data-edit="email"]')).toBeVisible();
  await expect(inline.locator('[data-edit="anmerkung"]')).toBeVisible();

  await inline.locator('[data-edit="name"]').fill('Praxis Dr. Müller');
  await inline.locator('[data-edit="tel"]').fill('089 12345678');
  await inline.locator('[data-edit="adresse"]').fill('Musterstraße 1, 80331 München');
  await inline.locator('[data-edit="email"]').fill('kontakt@praxis-mueller.example.de');
  await inline.locator('[data-edit="anmerkung"]').fill('nur nachmittags erreichbar');
  await page.click('[data-neu-anlegen="institution"]');

  // Die Inline-Maske verschwindet, die neue Institution ist im Picker ausgewählt.
  await expect(inline).toBeHidden();
  const gewaehlterText = await page.locator('[data-edit-ref="institution"] option:checked').textContent();
  expect(gewaehlterText).toBe('Praxis Dr. Müller');

  await page.click('#m-ok');
  await page.waitForTimeout(200);
  await expect(page.locator('#sek-menschen-liste .liste-eintrag-text', { hasText: 'Anna Schmidt' })).toBeVisible();

  expect(fehler, 'keine JS-/Konsolen-Fehler beim vollen Institution-Anlegen-Weg').toEqual([]);
});
