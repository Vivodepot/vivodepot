'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Rückmeldung 4 (Screenshot-Runde, 26.08.2026) — „Vermerken" wirkt lautlos.
   ────────────────────────────────────────────────────────────────────────
   Befund: der Klick auf „Vermerken" (Eigenes-Dokument-Formular im Dokument-
   Panel, `data-doku-neu-add`) legt das Dokument an und springt per
   `scrollIntoView` zum neuen Eintrag (`_dokumentPanelNeuRenderUndSpringe`) —
   aber ohne jede sichtbare Kennzeichnung DIESES Eintrags. Die Produktentscheidung sah
   nur, dass sich irgendwo auf der Seite etwas bewegte, ohne erkennen zu
   können, was der Klick bewirkt hatte.

   Fix: derselbe etablierte Hervorhebungs-Ring wie beim Feld-Prüftermin-Sprung
   (`prueftermineSpringeZuFeld`, Entscheidung 17.08.2026) — die Klasse
   `.feld-hervorgehoben` wird auf den frischen `.doku-eintrag` gesetzt und nach
   2,6s wieder entfernt. Diese Probe belegt: der Ring erscheint GENAU auf dem
   neu angelegten Eintrag (nicht anderswo) und verschwindet wieder von selbst.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

test('Vermerken hebt den neu angelegten Dokument-Eintrag sichtbar hervor', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored/i.test(m.text())) fehler.push(m.text());
  });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'housing');

  const panel = page.locator('.doku-panel');
  if (!(await panel.evaluate((el) => el.open))) await panel.locator('summary').first().click();

  await page.fill('#doku-neu-name', 'Mietvertrag');
  await page.click('[data-doku-neu-add="1"]');

  // Der frische Eintrag trägt die Hervorhebungs-Klasse sofort nach dem Klick …
  const eintrag = page.locator('.doku-eintrag').first();
  await expect(eintrag).toHaveClass(/feld-hervorgehoben/);

  // … und der Ring liegt WIRKLICH auf diesem Eintrag (sichtbarer Effekt, kein totes Attribut):
  const hatSchatten = await eintrag.evaluate((el) => getComputedStyle(el).boxShadow !== 'none');
  expect(hatSchatten, 'Hervorhebungs-Eintrag zeigt einen sichtbaren box-shadow-Ring').toBe(true);

  // … und verschwindet nach der Frist von selbst (2,6s + Toleranz) — keine Dauer-Markierung.
  await expect(eintrag).not.toHaveClass(/feld-hervorgehoben/, { timeout: 4000 });

  expect(fehler, 'keine JS-/Konsolen-Fehler beim Vermerken-Klick').toEqual([]);
});
