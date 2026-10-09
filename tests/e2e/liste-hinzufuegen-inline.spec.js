// @ts-check
/* liste-hinzufuegen-inline.spec.js — Konvention „Hinzufügen“ (Produktentscheidung 07.10.2026, v922)
   ─────────────────────────────────────────────────────────────────
   Bei leerer Liste stehen die Eingaben des ersten Eintrags direkt im Bereich; der Eintrag entsteht, wenn der Fokus die Gruppe
   verlässt, und der Fokus steht danach im nächsten Feld. Ab einem Eintrag steht darunter „Weitere(s) <Einzelname> hinzufügen“,
   ohne Plus. Einträge mit mehr als sechs Teilen zeigen nur den benennenden Teil und „Alle Angaben“, das den Dialog mit dem schon
   Eingegebenen öffnet. Die Eingaben des ersten Eintrags tragen einen eigenen Namensraum (data-eintrag-*): sie sind kein Bereichsfeld,
   werden nie als solches gespeichert und kollidieren mit keiner Kennung des Bereichs. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

async function bereitsicht(page, sektor) {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, sektor);
  await page.evaluate(() => document.querySelectorAll('#content details').forEach((d) => { d.open = true; }));
}

test('[Hinzufügen·Inline] leere kurze Liste: Eingaben im Bereich, Eintrag beim Verlassen, danach „Weiteres … hinzufügen“ ohne Plus', async ({ page }) => {
  await bereitsicht(page, 'identity');
  const editor = page.locator('#content [data-feld-liste="idDocuments"]');
  await expect(editor.locator('[data-eintrag-hinzufuegen]'), 'leer: kein Knopf').toHaveCount(0);
  const inline = editor.locator('[data-liste-inline="idDocuments"]');
  await expect(inline.locator('[data-edit], [data-edit-ref], [data-edit-override], [data-edit-multi]'), 'eigener Namensraum: kein Bereichsfeld-Attribut im ersten Eintrag').toHaveCount(0);
  await inline.locator('[data-eintrag-edit="system"]').fill('Personalausweis');
  await inline.locator('[data-eintrag-edit="documentNumber"]').fill('E2E-INLINE-1');
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await expect(editor.locator('.liste-eintraege li')).toHaveCount(1);
  const weitere = editor.locator('[data-eintrag-hinzufuegen="idDocuments"]');
  await expect(weitere).toHaveText('Weiteres Ausweisdokument hinzufügen');
  const daten = await page.evaluate(() => {
    const id = window.__vdOeffentlich.ankerDaten().sektoren.identity;
    return { liste: id.idDocuments, streu: ['system', 'documentNumber'].filter((k) => Object.prototype.hasOwnProperty.call(id, k)) };
  });
  expect(daten.liste.map((e) => e.documentNumber)).toEqual(['E2E-INLINE-1']);
  expect(daten.streu, 'kein Unterfeld als Bereichsfeld gespeichert').toEqual([]);
});

test('[Hinzufügen·Inline·Fokus] per Tastatur aus dem ersten Eintrag heraus: der Fokus steht danach im nächsten Feld', async ({ page }) => {
  await bereitsicht(page, 'finance');
  const inline = page.locator('#content [data-liste-inline="taxIdsTaxNumbers"]');
  await inline.locator('[data-eintrag-edit="system"]').fill('Deutschland');
  const letztes = inline.locator('[data-eintrag-edit]').last();
  await letztes.fill('E2E-STEUER-1');
  await letztes.press('Tab');
  await expect(page.locator('#content [data-feld-liste="taxIdsTaxNumbers"] .liste-eintraege li')).toHaveCount(1);
  const aktiv = await page.evaluate(() => {
    const a = document.activeElement;
    return { imContent: !!(a && a.closest && a.closest('#content')), body: a === document.body };
  });
  expect(aktiv.body, 'der Fokus ist nicht verloren').toBe(false);
  expect(aktiv.imContent, 'der Fokus steht im Bereich').toBe(true);
});

test('[Hinzufügen·Groß] mehr als sechs Teile: nur der benennende Teil und „Alle Angaben“, das den Dialog vorbelegt öffnet', async ({ page }) => {
  await bereitsicht(page, 'advanceCare');
  const inline = page.locator('#content [data-liste-inline="provisionInstruments"]');
  await expect(inline.locator('[data-sub-zeile]')).toHaveCount(1);
  const art = inline.locator('select').first();
  await art.selectOption('will');
  await inline.locator('[data-eintrag-alle-angaben="provisionInstruments"]').click();
  await expect(page.locator('#modal-rueck.an')).toBeVisible();
  await expect(page.locator('#modal-inhalt .liste-eintrag-form select').first()).toHaveValue('will');
});

/* Der erste Eintrag hat keinen „Abbrechen“: wer darin eine Person anlegt und die Auswahl wieder leert, verlässt die Gruppe ohne Eintrag.
   Die angelegte Person, auf die dann nichts verweist, geht zurück wie beim Abbrechen des Dialogs — keine Karteileiche im Register.
   Gegenprobe: wird der Eintrag übernommen, bleibt die Person (sie ist referenziert). */
async function registerNamen(page) {
  return page.evaluate(() => (window.__vdOeffentlich.ankerDaten().menschen || []).map((p) => p.name));
}
async function inlinePersonAnlegen(page, name) {
  const inline = page.locator('#content [data-liste-inline="pets"]');
  await inline.locator('[data-eintrag-edit-ref="emergencyCarePersonContact"]').selectOption('__neu__');
  const nameInp = page.locator('#content [data-neu-name="emergencyCarePersonContact"]');
  await expect(nameInp).toBeVisible();
  await nameInp.fill(name);
  await page.click('#content [data-neu-anlegen="emergencyCarePersonContact"]');
  await expect(inline.locator('[data-eintrag-edit-ref="emergencyCarePersonContact"]')).toHaveValue(/.+/);
  return inline;
}

test('[Hinzufügen·Inline·Karteileiche] Person im ersten Eintrag angelegt, Auswahl geleert, Gruppe verlassen → keine Karteileiche', async ({ page }) => {
  await bereitsicht(page, 'identity');
  const name = 'Inline Leer Eins';
  const inline = await inlinePersonAnlegen(page, name);
  expect(await registerNamen(page), 'Voraussetzung: die Person steht nach dem Anlegen im Register').toContain(name);
  await inline.locator('[data-eintrag-edit-ref="emergencyCarePersonContact"]').selectOption('');
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await expect.poll(() => registerNamen(page)).not.toContain(name);
  await expect(page.locator('#content [data-feld-liste="pets"] .liste-eintraege li')).toHaveCount(0);
});

test('[Hinzufügen·Inline·Karteileiche·Gegenprobe] wird der erste Eintrag übernommen, bleibt die angelegte Person', async ({ page }) => {
  await bereitsicht(page, 'identity');
  const name = 'Inline Bleibt Zwei';
  await inlinePersonAnlegen(page, name);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await expect(page.locator('#content [data-feld-liste="pets"] .liste-eintraege li')).toHaveCount(1);
  expect(await registerNamen(page)).toContain(name);
});
