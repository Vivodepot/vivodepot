'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Vorgefundener Bug (27.08.2026, Seiteneffekt des Screenshot-Review Befund C
   von gestern, commit f333f8b — Mehrfachauswahl-Checkboxen → Pillen-Knöpfe):
   ────────────────────────────────────────────────────────────────────────
   `liesEintragAusDOM` (vivodepot.html) kennt die Unterfeld-Typen `ref`,
   `refMehrfach`, `checkbox` und einen Fallback über `data-edit="<fid>"` für
   alles andere. Für `mehrfachauswahl` gab es NIE einen eigenen Zweig — auch
   VOR der Pillen-Umstellung nicht: die alten Checkbox-Zeilen trugen dasselbe
   `data-edit-multi="<fid>"` (nie `data-edit`), der Fallback griff also schon
   damals ins Leere. Der Bug ist vorbestehend, nur heute erst sichtbar
   geworden (Nachlese des Auftrags zur Pillen-Umstellung).

   Betroffen: die generische Instrument-Liste (`provisionInstruments`,
   `flowListenEintragBearbeiten`) — hier speist `liesEintragAusDOM` DIREKT
   ein `purpose`/`permittedDataTypes`-Objekt fürs Speichern. Wer ein bestehendes
   „Verfügung zur digitalen Nachbildung"-Instrument über den BEARBEITEN-Knopf
   öffnet und speichert (auch OHNE etwas zu ändern), verliert die vorher
   gewählten Zweck-/Datenarten-Pillen stillschweigend — `_listenEintragSystem-
   felderErhalten` rettet nur `id`/`rechtsraum`/`katalogStand`, keine
   Formularfelder.

   Diese Probe braucht einen echten Browser (wie mehrfachauswahl-pillen.spec.js
   begründet: der Node-DOM-Stub in tests/load-kern.js hält keine echten
   Elemente, `querySelectorAll` liefert dort immer `[]`) — ANDERS als bei der
   Klick-Verdrahtung geht es hier aber nicht um `_pillMehrfachKlick`, sondern
   um `liesEintragAusDOM`s eigenen `querySelectorAll('[data-edit-multi=…]')`-
   Lesepfad, der ohne echtes DOM nicht zu prüfen ist.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

async function instrumentModalOeffnen(page) {
  await oeffneSektor(page, 'advanceCare');
  await page.locator('[data-eintrag-hinzufuegen="provisionInstruments"]').click();
  await page.waitForTimeout(250);
}

async function typWaehlen(page, typLabel) {
  const typSelect = page.locator('select[data-edit-code="instrument"], select[data-edit="instrument"], [name="instrument"]').first();
  await typSelect.selectOption({ label: typLabel });
  await page.waitForTimeout(250);
}

test('Instrument-Liste bearbeiten: purpose/permittedDataTypes-Pillen überleben ein Speichern ohne Änderung', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);

  // 1) Anlegen: KI-Verfügung mit je einer Zweck-/Datenarten-Pille vorbelegen.
  await instrumentModalOeffnen(page);
  await typWaehlen(page, 'Verfügung zur digitalen Nachbildung');
  await page.locator('button[data-edit-multi="purpose"][value="trauer"]').click();
  await page.locator('button[data-edit-multi="permittedDataTypes"][value="schriftverkehr"]').click();
  await page.locator('#m-ok').click();
  await page.waitForTimeout(250);

  let eintrag = await page.evaluate(() => {
    const liste = (window.__vdOeffentlich.ankerDaten().sektoren.advanceCare && window.__vdOeffentlich.ankerDaten().sektoren.advanceCare.provisionInstruments) || [];
    return liste.find((e) => e && e.instrument === 'ki-verfuegung');
  });
  expect(eintrag, 'die KI-Verfügung muss nach dem Anlegen im Datenmodell stehen').toBeTruthy();
  expect(eintrag.purpose, 'purpose muss direkt nach dem Anlegen gesetzt sein').toEqual(['trauer']);
  expect(eintrag.permittedDataTypes, 'permittedDataTypes muss direkt nach dem Anlegen gesetzt sein').toEqual(['schriftverkehr']);

  // 2) Bearbeiten öffnen (derselbe generische Modal-Flow, jetzt lesend statt neu setzend) und
  // OHNE jede Änderung erneut speichern — das ist der Rundweg, den liesEintragAusDOM heute bricht.
  const reihe = page.locator('[data-feld-liste="provisionInstruments"]').first();
  await reihe.locator('[data-eintrag-bearbeiten]').first().click();
  await page.waitForTimeout(250);

  // Vorbelegung im Modal sichtbar prüfen (Positivkontrolle: das Feld existiert und die Pille
  // erscheint als aktiv — sonst würde ein Bug in der VORBELEGUNG die Probe fälschlich grün machen).
  const pilleZweck = page.locator('button[data-edit-multi="purpose"][value="trauer"]');
  await expect(pilleZweck).toHaveAttribute('aria-pressed', 'true');

  await page.locator('#m-ok').click();
  await page.waitForTimeout(250);

  eintrag = await page.evaluate(() => {
    const liste = (window.__vdOeffentlich.ankerDaten().sektoren.advanceCare && window.__vdOeffentlich.ankerDaten().sektoren.advanceCare.provisionInstruments) || [];
    return liste.find((e) => e && e.instrument === 'ki-verfuegung');
  });
  expect(eintrag, 'die KI-Verfügung muss nach dem Bearbeiten weiterhin im Datenmodell stehen').toBeTruthy();
  expect(eintrag.purpose, 'purpose darf ein Speichern ohne Änderung nicht überleben-negativ — es muss ERHALTEN bleiben').toEqual(['trauer']);
  expect(eintrag.permittedDataTypes, 'permittedDataTypes muss ein Speichern ohne Änderung überstehen').toEqual(['schriftverkehr']);
});
