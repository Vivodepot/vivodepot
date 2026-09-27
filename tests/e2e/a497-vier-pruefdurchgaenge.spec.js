'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   A497 (Laufzettel Nacht 22./23.08.2026, Posten 10) — Vier Prüfdurchgänge für
   den neuen Scope
   ────────────────────────────────────────────────────────────────────────────
   GEMESSEN 22.08.2026 („Lockstep und Nachzug", Zug 2): von den
   E2E-Spec-Dateien nennt KEINE einen Textsatz, einen Rechtsraum, eine Sprache
   oder ein mehrwertiges Feld — obwohl der Schnitt (Glied 3/4/5) genau diese
   Fähigkeiten gebaut hat. „Ein Durchgang für etwas Ungebautes ist keine
   Prüfung, sondern eine Absichtserklärung" — hier ist er für das bereits
   Gebaute nachgezogen, in demselben Zug, den er belegt.

   VIER FÄHIGKEITEN, VIER DURCHGÄNGE:
     1 · ein angedocktes Modul wirkt im echten Browser (fünftes Einlass-
         Register, Bereich, U2-ADR-154)
     2 · ein zweiter Textsatz ändert einen sichtbaren Text (U2-ADR-141)
     3 · zwei Rechtsräume bei gleicher Sprache — derselbe Schlüssel, zwei Texte
         (Schnitt Glied 4, A469, U2-ADR-162 — Prüfstein 5, hier zum ersten Mal
         im echten Browser statt nur über den jsdom-Harnisch geprüft)
     4 · ein mehrwertiges Feld (Schnitt Glied 3, A448, U2-ADR-161) trägt
         MEHRERE Werte, über den echten Eintrags-Dialog, nicht `sektorFeldSetzen`
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

test('[A497·1] ein angedocktes Bereichs-Modul erscheint als eigener Sektor in der Sidebar', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.evaluate(() => {
    window.__vdOeffentlich.ankerDaten().bereichsModule = [{ modulTyp: 'bereich', sprache: 'de', moduleVersion: 1, herkunft: 'e2e-a497',
      bereiche: { 'e2e-eigene-rubrik': { label: 'E2E-Testbereich' } } }];
    window.__vdOeffentlich._bereichsModuleAusDepotAnmelden(window.__vdOeffentlich.ankerDaten());
    window.__vdOeffentlich.renderSidebar();
  });
  await expect(page.locator('[data-sektor="e2e-eigene-rubrik"]')).toContainText('E2E-Testbereich');
});

test('[A497·2] ein zweiter Textsatz (andere Sprache) ändert einen sichtbaren Text im echten Browser', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.evaluate(() => { window.__vdOeffentlich.oeffneZusammenstellen(); });
  await expect(page.locator('h2')).toContainText('Selbst zusammenstellen');

  await page.evaluate(() => {
    window.__vdOeffentlich.ankerDaten().textsprache = 'fr';
    window.__vdOeffentlich.ankerDaten().textsatzModule = [{ modulTyp: 'textsatz', sprache: 'fr', moduleVersion: 1,
      texte: { 'strings:zusTitel.text': 'Assembler soi-même (E2E)' } }];
    window.__vdOeffentlich._textsatzModuleAusDepotAnmelden(window.__vdOeffentlich.ankerDaten());
    window.__vdOeffentlich.oeffneZusammenstellen();
  });
  await expect(page.locator('h2')).toContainText('Assembler soi-même (E2E)');
});

test('[A497·3] zwei Rechtsräume bei gleicher Sprache -- derselbe Schlüssel liefert zwei Texte', async ({ page }) => {
  // Schnitt Glied 4 / Prüfstein 5: erst im echten Browser geprüft, vorher nur über
  // tests/schnitt-glied3-fuenf-pruefsteine.test.js (load-kern.js, jsdom-Stub).
  await oeffneApp(page);
  await depotAnlegen(page);
  // sprache: 'es' — NICHT 'de': `textsatzModulPruefen` weist die eingebaute Sprache
  // ausdrücklich als 'reserviert' zurück (dieselbe Sprache wie im Kern-Unit-Test
  // Prüfstein 5, tests/schnitt-glied3-fuenf-pruefsteine.test.js).
  await page.evaluate(() => {
    window.__vdOeffentlich.ankerDaten().textsprache = 'es';
    window.__vdOeffentlich.ankerDaten().textsatzModule = [
      { modulTyp: 'textsatz', sprache: 'es', moduleVersion: 1, rechtsraum: 'AT',
        texte: { 'strings:zusTitel.text': 'Selbst zusammenstellen (AT)' } },
      { modulTyp: 'textsatz', sprache: 'es', moduleVersion: 1,
        texte: { 'strings:zusTitel.text': 'Selbst zusammenstellen (Standard)' } },
    ];
    window.__vdOeffentlich._textsatzModuleAusDepotAnmelden(window.__vdOeffentlich.ankerDaten());
  });

  await page.evaluate(() => { window.__vdOeffentlich.ankerDaten().rechtsraum = 'AT'; window.__vdOeffentlich.oeffneZusammenstellen(); });
  await expect(page.locator('h2')).toContainText('Selbst zusammenstellen (AT)');

  await page.evaluate(() => { window.__vdOeffentlich.ankerDaten().rechtsraum = ''; window.__vdOeffentlich.oeffneZusammenstellen(); });
  await expect(page.locator('h2')).toContainText('Selbst zusammenstellen (Standard)');
});

test('[A497·4] ein mehrwertiges Feld (Ausweis) trägt zwei Einträge, über den echten Dialog', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'identity');

  // Erster Eintrag.
  await page.click('[data-eintrag-hinzufuegen="idDocuments"]');
  await page.waitForSelector('#modal-inhalt [data-edit="system"]', { state: 'visible' });
  await page.fill('#modal-inhalt [data-edit="system"]', 'Personalausweis');
  await page.fill('#modal-inhalt [data-edit="documentNumber"]', 'E2E-AUSWEIS-1');
  await page.click('#m-ok');
  await page.waitForSelector('#modal-inhalt', { state: 'hidden' });
  await page.waitForFunction(() =>
    Array.isArray(window.__vdOeffentlich.ankerDaten().sektoren.identity && window.__vdOeffentlich.ankerDaten().sektoren.identity.idDocuments)
    && window.__vdOeffentlich.ankerDaten().sektoren.identity.idDocuments.length === 1);

  // Zweiter Eintrag — derselbe Weg, dasselbe Feld, ein ANDERES System.
  await page.click('[data-eintrag-hinzufuegen="idDocuments"]');
  await page.waitForSelector('#modal-inhalt [data-edit="system"]', { state: 'visible' });
  await page.fill('#modal-inhalt [data-edit="system"]', 'Reisepass');
  await page.fill('#modal-inhalt [data-edit="documentNumber"]', 'E2E-AUSWEIS-2');
  await page.click('#m-ok');
  await page.waitForSelector('#modal-inhalt', { state: 'hidden' });

  const systeme = await page.evaluate(() =>
    window.__vdOeffentlich.ankerDaten().sektoren.identity.idDocuments.map((e) => e.system).sort());
  expect(systeme, 'beide Einträge stehen nebeneinander, keiner hat den anderen überschrieben')
    .toEqual(['Personalausweis', 'Reisepass']);

  // Beide überleben einen echten Speicher-/Entschlüsselungs-Zyklus (nicht nur den RAM-Zustand).
  const nachDemLaden = await page.evaluate(async () => {
    const umschlag = await window.__vdOeffentlich.depotSerialisieren();
    await window.__vdOeffentlich.depotLaden(umschlag, 'e2e-passwort-123');
    return window.__vdOeffentlich.ankerDaten().sektoren.identity.idDocuments.map((e) => e.system).sort();
  });
  expect(nachDemLaden).toEqual(['Personalausweis', 'Reisepass']);
});
