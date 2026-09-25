'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   N2 Zug 3 („Drei Verdrahtungen", 08.08.2026) — Browser-Abnahme
   ────────────────────────────────────────────────────────────────────────────
   `zeichneNotfallkarte` zeichnet über die inline jsPDF-Bibliothek — im
   Node-Test-Harness nicht verfügbar (U2-ADR-091 §6), darum hier. Eine lange
   Notfallkontakt-/Medikamentenliste lief vorher unbegrenzt über den Kartenrand,
   der Fuß stand fest auf `SH - RAND` und überschrieb, was dorthin gewachsen
   war — jetzt bricht die Karte auf eine zweite Seite um, wie
   `zeichneSituationPdf` es bereits tut.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

test('Notfallkarte: eine lange Datenmenge bricht auf eine zweite Seite um, statt den Fuß zu überschreiben', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.waitForFunction(() => typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF === 'function');

  const ergebnis = await page.evaluate(() => {
    // Absichtlich lange Zeilen — mehr, als eine A6-Karte (≈105×74mm) je fassen könnte, um den
    // realen Überlauf-Fall nachzustellen, ohne über die UI zwanzig Felder eintippen zu müssen.
    const langeZeilen = [];
    for (let i = 0; i < 25; i++) {
      langeZeilen.push({
        label: 'Testfeld ' + i,
        wert: 'Ein sehr langer Testwert, der mehrere Zeilen auf der Karte belegt, damit die Karte über den ersten Rand hinaus waechst und der Umbruch-Mechanismus wirklich greifen muss. Eintrag Nummer ' + i + '.',
      });
    }
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a6' });
    let geworfen = null;
    try {
      window.__vdOeffentlich.zeichneNotfallkarte(doc, langeZeilen, { name: 'Test Person', datum: '09.08.2026' }, null);
    } catch (e) { geworfen = String(e && e.message); }
    return { seiten: doc.internal.getNumberOfPages(), geworfen };
  });

  expect(ergebnis.geworfen, 'zeichneNotfallkarte darf bei viel Inhalt nicht werfen').toBeNull();
  expect(ergebnis.seiten, 'eine lange Datenmenge muss auf mehr als eine Karten-Seite umbrechen').toBeGreaterThan(1);
});

test('Notfallkarte: wenig Inhalt bleibt weiterhin auf einer Seite (Positivmaßstab, kein Übertreiben)', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.waitForFunction(() => typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF === 'function');

  const seiten = await page.evaluate(() => {
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a6' });
    window.__vdOeffentlich.zeichneNotfallkarte(doc, [{ label: 'Blutgruppe', wert: 'A positiv' }], { name: 'Test Person', datum: '09.08.2026' }, null);
    return doc.internal.getNumberOfPages();
  });
  expect(seiten).toBe(1);
});
