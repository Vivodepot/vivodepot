'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — Mehrfachauswahl-Unterfelder in der generischen Instrument-Liste
   ────────────────────────────────────────────────────────────────────────
   Befund 27.08.2026: `liesEintragAusDOM` (vivodepot.html) kannte für
   `unterFelder` mit `typ:'liste'` die Zweige 'ref', 'refMehrfach', 'checkbox'
   und einen generischen Rest, der `[data-edit="…"]` sucht — aber KEINEN
   Zweig für 'mehrfachauswahl'. Mehrfachauswahl-Optionen tragen
   `data-edit-multi`, nie `data-edit` (feldInputHTML case 'mehrfachauswahl').
   Der generische Zweig fand also nie ein Element und lieferte '' — beim
   manuellen Bearbeiten einer KI-Verfügung über die Instrument-Liste verlor
   sich die Auswahl bei `ki_zweck`/`ki_datenarten` still, ohne Fehler.

   NICHT betroffen: der geführte Assistent (kiwiz) — der schreibt über
   `_wizardAktuellerWert`, die bereits vor diesem Fund korrekt las
   (dieselbe `data-edit-multi`-Sammlung, s. vivodepot.html).
   Diese Probe deckt bewusst den ANDEREN Weg — „Bearbeiten" im generischen
   Listen-Editor (flowListenEintragBearbeiten → liesEintragAusDOM) —, den
   node:test wegen des DOM-Stubs (tests/rechtsraum-katalog-instrument-
   stempel.test.js, Kommentar dort) nicht erreichen kann.

   Nachtrag nach dem navrahmen→u2-kanon-Merge (27.08.2026): Mehrfachauswahl
   rendert seither als antippbare `aria-pressed`-Pillen-Knöpfe, nicht mehr
   als `<input type="checkbox">` (Screenshot-Review Befund C, navrahmen
   commit f333f8b) — `.check()`/`toBeChecked()` passen an Buttons nicht
   mehr, ersetzt durch `.click()`/`toHaveAttribute('aria-pressed', …)`.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

test('KI-Verfügung über die Instrument-Liste anlegen: ki_zweck bleibt nach dem Speichern erhalten', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');

  await page.locator('[data-eintrag-hinzufuegen="provisionInstruments"]').click();
  await page.waitForSelector('#modal-inhalt');

  await page.selectOption('select[data-edit="instrument"]', 'ki-verfuegung');
  await page.selectOption('select[data-edit="basicDecision"]', 'erlaubnis');

  const zweckKnopf = page.locator('[data-edit-multi="purpose"][value="trauer"]');
  await expect(zweckKnopf).toBeVisible();
  await zweckKnopf.click();
  const datenartenKnopf = page.locator('[data-edit-multi="permittedDataTypes"][value="sprache"]');
  await datenartenKnopf.click();

  await page.click('#m-ok');
  await page.waitForTimeout(200);

  const eintrag = await page.evaluate(() => {
    const liste = (window.__vdOeffentlich.ankerDaten().sektoren.advanceCare && window.__vdOeffentlich.ankerDaten().sektoren.advanceCare.provisionInstruments) || [];
    return liste.find((r) => r && r.instrument === 'ki-verfuegung') || null;
  });

  expect(eintrag, 'die KI-Verfügung ist als Instrument-Zeile im Depot vorhanden').not.toBeNull();
  expect(eintrag.purpose, 'ki_zweck darf beim Speichern nicht verlorengehen').toEqual(['trauer']);
  expect(eintrag.permittedDataTypes, 'ki_datenarten darf beim Speichern nicht verlorengehen').toEqual(['sprache']);
});

test('dieselbe Zeile erneut geöffnet: die Mehrfachauswahl-Häkchen kommen vorbefüllt zurück', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');

  await page.locator('[data-eintrag-hinzufuegen="provisionInstruments"]').click();
  await page.waitForSelector('#modal-inhalt');
  await page.selectOption('select[data-edit="instrument"]', 'ki-verfuegung');
  await page.selectOption('select[data-edit="basicDecision"]', 'erlaubnis');
  await page.locator('[data-edit-multi="purpose"][value="erinnerung"]').click();
  await page.locator('[data-edit-multi="purpose"][value="bildung"]').click();
  await page.click('#m-ok');
  await page.waitForTimeout(200);

  const idx = await page.evaluate(() => {
    const liste = (window.__vdOeffentlich.ankerDaten().sektoren.advanceCare && window.__vdOeffentlich.ankerDaten().sektoren.advanceCare.provisionInstruments) || [];
    return liste.findIndex((r) => r && r.instrument === 'ki-verfuegung');
  });
  expect(idx).toBeGreaterThanOrEqual(0);

  await page.locator('[data-eintrag-bearbeiten="' + idx + '"]').first().click();
  await page.waitForSelector('#modal-inhalt');

  await expect(page.locator('[data-edit-multi="purpose"][value="erinnerung"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-edit-multi="purpose"][value="bildung"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-edit-multi="purpose"][value="trauer"]')).toHaveAttribute('aria-pressed', 'false');
});
