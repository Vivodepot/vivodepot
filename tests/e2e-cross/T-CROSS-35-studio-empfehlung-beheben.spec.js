'use strict';
/* ═════════════════════════════════════════════════
   T-CROSS-35 — Studio: von der Meldung zur Stelle, an der sie behoben wird (Befund STUDIO-EMPFEHLUNG-OHNE-WEG)
   ─────────────────────────────────────────────────
   Anlass: „ich kann nicht zurück und diese Pflichtfelder erstellen“. Schritt 3 von „Fertigstellen und einreichen“
   nannte die Empfehlung „keine Pflichtfelder“, aber keinen Weg dorthin; der Schalter dafür lag nur im Feld-Editor,
   und der Assistent Aufnahmebogen hatte keinen.
   Belegt im Browser:
   (1) Assistent: Eingang → Aufnahmebogen → Name → Beispiel „Kontaktbogen“ (ohne Pflichtfrage) → Weiter: Einreichen →
       Schritt 3 zeigt die Empfehlung mit „Beheben“ → zurück im Assistenten, Schritt 2, der Schalter „Muss ausgefüllt
       werden“ hat den Fokus → angehakt → Weiter: Einreichen → Schritt 3 ohne die Empfehlung. DE und EN.
   (2) Fachebene mit erzeugtem Schlüssel: „Beheben“ öffnet den Feld-Editor mit Fokus auf „Pflichtfeld“; der Dialog
       ist nur geschlossen — nach „Fertigstellen und einreichen“ steht Schritt 2 weiter auf „gesichert“ und das
       Paket lässt sich erzeugen.
   Rot-Beweis: ohne die Knöpfe „Beheben“ (per page.evaluate entfernt) gibt es aus Schritt 3 keinen Weg zur Stelle.
   Die Abdeckung jeder Meldung (Klassen-Wächter) steht in tests/studio-empfehlung-mit-weg.test.js.
   ═════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const H = require('./support/helpers');
const FIX = require('./fixtures/reise-4-vertrauenskette.json');

const KEINE_PFLICHT = { de: /keine Pflichtfelder/, en: /no required fields/ };
const BEHEBEN = { de: 'Beheben', en: 'Fix' };

async function assistentBisSchritt3(p, sprache) {
  await p.goto(H.URLS.generator);
  await p.click(sprache === 'en' ? '#sp-en' : '#sp-de');   // die Sprache des Browsers soll nicht mitspielen
  await p.click('#ein-aufnahme');
  await p.waitForSelector('#as-name', { state: 'visible' });
  await p.fill('#as-name', 'Musterverein Probe');
  await p.click('#as-art [data-art="andere"]');
  await p.click('#as-weiter-1');
  await expect(p.locator('#as-schritt-2')).toBeVisible();
  await expect(p.locator('#as-felder .as-frage')).toHaveCount(3);          // „Kontaktbogen“: drei Fragen, keine Pflicht
  await expect(p.locator('#as-felder .as-frage-pflicht input:checked')).toHaveCount(0);
  await p.click('#as-weiter-2');
  await expect(p.locator('#dlg-fertig[open]')).toHaveCount(1);
  await p.click('#fs-c-kopf');                                              // Schritt 3 lässt sich ohne Angaben und Schlüssel öffnen
  await expect(p.locator('#fs-c-rumpf')).toBeVisible();
}

for (const sprache of ['de', 'en']) {
  test.describe('T-CROSS-35 Empfehlung mit Weg · Assistent · ' + sprache.toUpperCase(), () => {
    test('„Beheben“ führt in den Assistenten an den Schalter, danach ist die Empfehlung fort', async ({ browser }) => {
      test.setTimeout(60000);
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      await assistentBisSchritt3(p, sprache);

      const zeile = p.locator('#pr-warnungen li', { hasText: KEINE_PFLICHT[sprache] });
      await expect(zeile).toHaveCount(1);
      const knopf = zeile.locator('.pr-beheben');
      await expect(knopf).toHaveText(BEHEBEN[sprache]);
      await knopf.click();

      await expect(p.locator('#dlg-fertig[open]')).toHaveCount(0);
      await expect(p.locator('#raum-assistent')).toBeVisible();
      await expect(p.locator('#as-schritt-2')).toBeVisible();
      const kasten = p.locator('#as-felder .as-frage-pflicht input').first();
      await expect(kasten).toBeFocused();
      await kasten.check();
      await expect(p.locator('#as-felder .as-frage-name').first()).toContainText('*');   // Liste und Karte zeigen die Pflicht
      await expect(p.locator('#as-k-zeilen .as-zeile').first()).toContainText('*');

      await p.click('#as-weiter-2');                                            // ein Klick zurück zum Fertigstellen, wie bisher
      await expect(p.locator('#dlg-fertig[open]')).toHaveCount(1);
      await p.click('#fs-c-kopf');
      await expect(p.locator('#fs-c-rumpf')).toBeVisible();
      await expect(p.locator('#pr-warnungen li', { hasText: KEINE_PFLICHT[sprache] })).toHaveCount(0);
      await ctx.close();
    });
  });
}

test.describe('T-CROSS-35 Empfehlung mit Weg · Fachebene mit Schlüssel', () => {
  test('„Beheben“ öffnet den Feld-Editor bei „Pflichtfeld“; Angaben und Schlüssel bleiben', async ({ browser }) => {
    test.setTimeout(120000);
    const ctx = await browser.newContext({ acceptDownloads: true });
    const p = await ctx.newPage();
    await H.generator.oeffnen(p, 'de');
    await p.click('#start-leer');
    await p.click('#fertig-oeffnen');                                         // ohne Angaben öffnet der Dialog bei den Angaben
    await p.waitForSelector('#sd-name', { state: 'visible' });
    const sd = FIX.stammdaten;
    await p.fill('#sd-name', sd.anbieterName);
    await p.fill('#sd-rechtsform', sd.rechtsform);                            // seit U2-ADR-495 ein freies Textfeld
    await p.fill('#sd-strasse', sd.strasse); await p.fill('#sd-plz', sd.plz); await p.fill('#sd-ort', sd.ort);
    await p.fill('#sd-land', sd.land);
    await p.fill('#sd-k-name', sd.kontaktName); await p.fill('#sd-k-email', sd.kontaktEmail);
    await p.click('#sd-weiter');
    await H.generator.schluesselErzeugen(p);
    await expect(p.locator('#fs-b-stand')).toContainText('gesichert');
    // Zwei Felder ohne Pflicht; dreiFelder öffnet danach den Dialog bei „Prüfen und absenden“.
    await H.generator.dreiFelder(p, FIX.felder.slice(0, 2).map((f) => Object.assign({}, f, { pflicht: false })));
    await expect(p.locator('#fs-c-rumpf')).toBeVisible();

    const zeile = p.locator('#pr-warnungen li', { hasText: KEINE_PFLICHT.de });
    await expect(zeile).toHaveCount(1);
    await zeile.locator('.pr-beheben').click();
    await expect(p.locator('#dlg-fertig[open]')).toHaveCount(0);
    await expect(p.locator('#feld-editor')).toBeVisible();
    await expect(p.locator('#ed-pflicht')).toBeFocused();
    await p.check('#ed-pflicht');
    await expect(p.locator('.vk').first().locator('.vk-stern')).toBeVisible();   // die Arbeitsfläche zeigt die Pflicht ohne Auswahl

    await p.click('#fertig-oeffnen');                                         // Angaben und Schlüssel stehen noch → Schritt 3
    await expect(p.locator('#fs-c-rumpf')).toBeVisible();
    await expect(p.locator('#fs-b-stand')).toContainText('gesichert');
    await expect(p.locator('#pr-warnungen li', { hasText: KEINE_PFLICHT.de })).toHaveCount(0);
    await p.click('#pr-pruefen');
    await expect(p.locator('#pr-submit')).toBeEnabled();                      // der Schlüssel liegt weiter im Tresor
    await ctx.close();
  });
});

test.describe('T-CROSS-35 Empfehlung mit Weg · Rot-Beweis', () => {
  test('ohne die Knöpfe „Beheben“ gibt es aus Schritt 3 keinen Weg zur Stelle', async ({ browser }) => {
    test.setTimeout(60000);
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await assistentBisSchritt3(p, 'de');
    await expect(p.locator('#pr-warnungen .pr-beheben')).not.toHaveCount(0);  // Gegenprobe: mit dem Bau sind sie da
    await p.evaluate(() => document.querySelectorAll('.pr-beheben').forEach((b) => b.remove()));
    const zeile = p.locator('#pr-warnungen li', { hasText: KEINE_PFLICHT.de });
    await expect(zeile).toHaveCount(1);                                       // die Meldung steht …
    await expect(p.locator('.pr-beheben')).toHaveCount(0);                    // … aber nichts führt zur Stelle
    await expect(zeile.locator('button')).toHaveCount(0);
    await expect(p.locator('#dlg-fertig[open]')).toHaveCount(1);
    await expect(p.locator('#as-schritt-2')).toBeHidden();
    await ctx.close();
  });
});
