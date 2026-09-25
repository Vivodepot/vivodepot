'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — Aufenthaltstitel Zug 4: Browser-Abnahme („Aufenthaltstitel",
   10.08.2026, echter Klickweg)
   ────────────────────────────────────────────────────────────────────────
   Ursprünglich: „aufenthaltstitel_gueltig in die Vergangenheit setzen, den
   Vorschlag erscheinen sehen, übernehmen, die überfällige Zeile in den
   Prüfterminen sehen — ohne zweite Eingabe."

   Schnitt Glied 3 (22.08.2026, A448, U2-ADR-161): `aufenthaltstitel_gueltig`
   ist ins Listen-Unterfeld `aufenthaltstitel/gueltig` gewandert, und
   `ERKENNUNG_LEITFELDER.aufenthaltstitel` ist ENTFALLEN (dokumentierter Gap —
   eine Dedup-Regel für mehrere erkannte Aufenthaltstitel ist eine
   Produktentscheidung, keine, die dieser Bau trifft). Die „Dokument erkannt"-
   Karte erscheint darum nicht mehr. Was bleibt UND hier geprüft wird: EIN
   Listen-Eintrag mit `gueltig` genügt weiterhin für eine Prüftermine-Zeile,
   ohne ein zweites Feld auszufüllen — nur der Weg dorthin ist jetzt der
   normale Listen-Eintrag-Dialog statt der Erkennungs-Karte.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

test('Aufenthaltstitel-Listen-Eintrag mit Gültigkeit in der Vergangenheit → Prüftermine-Zeile ohne zweite Eingabe', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'identity');

  await page.click('[data-eintrag-hinzufuegen="residencePermit"]');
  await page.waitForSelector('#modal-inhalt [data-edit="validUntil"]', { state: 'visible' });
  await page.fill('#modal-inhalt [data-edit="number"]', 'AT-12345');
  await page.fill('#modal-inhalt [data-edit="validUntil"]', '2020-01-01');   // eindeutig überfällig
  await page.click('#m-ok');
  await page.waitForSelector('#modal-inhalt', { state: 'hidden' });

  await page.waitForFunction(() =>
    Array.isArray(window.__vdOeffentlich.ankerDaten().sektoren.identity && window.__vdOeffentlich.ankerDaten().sektoren.identity.residencePermit)
    && window.__vdOeffentlich.ankerDaten().sektoren.identity.residencePermit.length === 1);

  // Die überfällige Zeile taucht in den Prüfterminen auf — ohne weitere Eingabe.
  const zeile = await page.evaluate(() => window.__vdOeffentlich.prueftermineFelder(new Date())
    .find((z) => z.sektorId === 'identity' && z.id && z.id.includes('residencePermit')));
  expect(zeile, 'die Zeile steht in den Prüfterminen, ohne dass ein zweites Feld ausgefüllt wurde').toBeTruthy();
  expect(zeile.stufe).toBe('rot');   // deutlich in der Vergangenheit
});

test('Kein Aufenthaltstitel-Eintrag → keine Prüftermine-Zeile, keine „Dokument erkannt"-Karte (dokumentierter Gap)', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'identity');

  const karte = page.locator('.doku-erkannt-karte', { hasText: 'Aufenthaltstitel' });
  await expect(karte).toHaveCount(0);
  const termine = await page.evaluate(() => window.__vdOeffentlich.prueftermineFelder(new Date())
    .filter((z) => z.id && z.id.includes('residencePermit')));
  expect(termine).toEqual([]);
});
