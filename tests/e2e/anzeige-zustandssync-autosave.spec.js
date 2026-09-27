'use strict';
/* E2E — Kette „Anzeige erfährt Zustandsänderung" (Nachtlauf, 01.09.2026): drei Befunde aus der
   Nacht zum 01.09., zusammen angegangen, weil Befund 1 und Befund 3 an DERSELBEN Stelle hängen
   (delegierter Feld-Autosave auf #content, `_autoSaveWennFeld`) und einander widersprechende
   Reparaturen nahelegen — s. Bericht „Anzeige erfährt Zustandsänderung", Zug 0.

   Browser-Abnahme (kein Node-Test), weil beide Befunde an einer echten Maus-/Fokus-Choreografie
   hängen (mousedown blurrt VOR mouseup, das ist der ganze Bug) — ein Test, der die Funktion
   direkt ruft, sieht das nicht.

   Test 3 ist die eigentliche Zusicherung dieses Auftrags: sie beweist, dass die Statuskarten-
   Reparatur NICHT per volles feldgruppenKarteHTML()/renderContent() nachzieht (das würde den
   Fokus-Klau, den `_autoSaveWennFeld`s Kopfkommentar ausdrücklich vermeiden soll, auf JEDEN
   Feld-zu-Feld-Wechsel verallgemeinern — dieselbe Fehlerklasse wie Befund 1, nur an jedem Feld
   statt nur am Sichern-Knopf). Diese Probe muss VOR und NACH der Reparatur grün bleiben. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

test('Befund 1 — Sichern-Knopf verliert den Klick nicht, wenn ein zweites Feld noch fokussiert ist', async ({ page }) => {
  // GEÄNDERT (Auftrag, 12.09.2026, Nachzug — nicht in der ursprünglichen 33er-Liste, aber
  // derselbe Befund: der Sichern-Knopf-Klick selbst ist der Prüfgegenstand, unter internem
  // Speicher bleibt der Knopf verborgen). Datei-Modus erzwungen (Topf A).
  await page.addInitScript(() => {
    try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {}
  });
  await oeffneApp(page);
  await depotAnlegen(page, { name: 'Sync Testerin' });

  // Erster Blur (telefon → strasse) etabliert "1 ungespeicherte Änderung" + sichtbaren Knopf —
  // genau der Ausgangszustand aus dem Bericht ("Kopfzeile vorher: 1 unsaved change").
  await page.locator('[data-edit="telephone"]').click();
  await page.keyboard.type('030 1234567');
  await page.locator('[data-edit="streetAddress"]').click();
  await page.keyboard.type('Musterstraße 1');
  // strasse hat jetzt den Fokus, ist NICHT geblurrt — der eigentliche Testfall.

  const knopf = page.locator('#tb-save-knopf');
  await expect(knopf).toBeVisible();
  const box = await knopf.boundingBox();
  if (!box) throw new Error('Sichern-Knopf ohne boundingBox — Vorbedingung des Tests verletzt');

  // RAW mousedown/mouseup statt .click(): der Bug hängt exakt daran, dass der Browser den
  // Klick-Zielknoten zwischen mousedown und mouseup verliert — ein High-Level-.click() prüft/
  // wartet anders und könnte den Effekt maskieren statt ihn zu zeigen.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(20);   // dem synchronen Blur→Autosave→Render-Kaskade Zeit geben, s.o.
  await page.mouse.up();

  // Erwartung: der Klick zählt, das Depot wird gesichert (Pille erreicht "als Datei gesichert").
  // Verschluckt der Klick (der Bug), bleibt die Pille bei "2 unsaved changes" hängen — genau das
  // vom Bericht gemessene Symptom.
  await expect(page.locator('#tb-save-status')).toHaveClass(/ist-gespeichert/, { timeout: 2000 });
});

test('Befund 3 — Statuskarte zeigt "teilweise ausgefüllt" sofort nach dem Feld-Autosave, ohne Bereichswechsel', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { name: 'Sync Testerin' });

  const leerText = await page.evaluate(() => window.__vdOeffentlich.STRINGS.statuskarteLeer);
  const teilweiseText = await page.evaluate(() => window.__vdOeffentlich.STRINGS.statuskarteTeilweise);

  const karte = page.locator('.feldgruppen-karte', { has: page.locator('[data-edit="telephone"]') });
  const status = karte.locator('.feldgruppen-karte-status');
  await expect(status).toHaveText(leerText);

  await page.locator('[data-edit="telephone"]').click();
  await page.keyboard.type('030 1234567');
  await page.locator('[data-edit="streetAddress"]').click();   // Blur → Autosave, KEIN Bereichswechsel

  // Kein page.reload(), kein Sektor-Wechsel — genau der Repro-Schritt aus dem Bericht:
  // "ohne den Bereich zu verlassen die Statuszeile der Karte lesen".
  await expect(status).toHaveText(teilweiseText, { timeout: 2000 });
});

test('Fokus-Schutz — Klick ins nächste Feld derselben Karte bleibt unterbrechungsfrei nach dem Autosave', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { name: 'Sync Testerin' });

  await page.locator('[data-edit="telephone"]').click();
  await page.keyboard.type('030 1234567');

  // RAW Klick (nicht .fill()) auf ein ZWEITES Feld DERSELBEN Karte, unmittelbar nach dem Blur, der
  // den Autosave (und damit — nach der Reparatur — den Statuskarten-Nachzug) auslöst. Würde die
  // Reparatur die ganze Karte (feldgruppenKarteHTML) statt nur den Status-Text nachziehen, stünde
  // strasse's Eingabefeld-Knoten genau in diesem Moment zur Ersetzung an — derselbe Verschluck-
  // Mechanismus wie Befund 1, nur hier statt am Knopf.
  const strasse = page.locator('[data-edit="streetAddress"]');
  const box = await strasse.boundingBox();
  if (!box) throw new Error('strasse-Feld ohne boundingBox — Vorbedingung des Tests verletzt');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(20);
  await page.mouse.up();
  await page.keyboard.type('Musterstraße 1');

  await expect(strasse).toBeFocused();
  await expect(strasse).toHaveValue('Musterstraße 1');
});
