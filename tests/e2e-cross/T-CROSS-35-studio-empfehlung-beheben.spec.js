'use strict';
/* ═════════════════════════════════════════════════
   T-CROSS-35 — Studio: von der Meldung zur Stelle, an der sie behoben wird (Befund STUDIO-EMPFEHLUNG-OHNE-WEG)
   ─────────────────────────────────────────────────
   Anlass: „ich kann nicht zurück und diese Pflichtfelder erstellen“. Schritt 3 von „Fertigstellen und einreichen“
   nannte die Empfehlung „keine Pflichtfelder“, aber keinen Weg dorthin; der Schalter dafür lag nur im Feld-Editor,
   und der Assistent Aufnahmebogen hatte keinen.
   Belegt im Browser:
   (1) Start-Beispiel (seit 14.11.2026, vorher der Assistent): Eingang → Aufnahmebogen → Name der Stelle → Beispiel
       „Kontaktbogen“, Pflicht abgewählt → Fertigstellen → Schritt 3 zeigt die Empfehlung mit „Beheben“ → Arbeitsfläche, der
       Schalter „Pflichtfeld“ der Feldkarte hat den Fokus → angehakt → Fertigstellen → Schritt 3 ohne die Empfehlung. DE und EN.
   (2) Leere Vorlage mit erzeugtem Schlüssel: „Beheben“ öffnet den Feld-Editor mit Fokus auf „Pflichtfeld“; der Dialog
       ist nur geschlossen — nach „Fertigstellen und einreichen“ steht Schritt 2 weiter auf „gesichert“ und das
       Paket lässt sich erzeugen.
   Rot-Beweis: ohne die Knöpfe „Beheben“ (per page.evaluate entfernt) gibt es aus Schritt 3 keinen Weg zur Stelle.
   Die Abdeckung jeder Meldung (Klassen-Wächter) steht in tests/studio-empfehlung-mit-weg.test.js.
   ═════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const H = require('./support/helpers');
const FIX = require('./fixtures/reise-4-vertrauenskette.json');

// Der Dialog nennt die Empfehlung in Alltagswörtern (Wagen 1.5, einfachWorte); seit 14.11.2026 für jede Vorlage.
const KEINE_PFLICHT_EINFACH = { de: /kein Datenfeld mit „Pflicht“/, en: /no data field marked “required”/ };
const BEHEBEN = { de: 'Beheben', en: 'Fix' };

// Seit „Einreichen in drei Schritten“ (16.10.2026) ist offen genau ein Schritt, und nur der Kopf von ① lässt sich
// anklicken (einreichenStufen in vivodepot-studio.html). Schritt ③ erreicht man also über ① Angaben und ② Sicherung,
// nicht mehr über seinen Kopf; der Rot-Beweis unten hält fest, dass der alte Weg zu ist.
async function angabenUndSicherung(p) {
  await p.waitForSelector('#sd-name', { state: 'visible' });                // ohne Angaben öffnet der Dialog bei ①
  const sd = FIX.stammdaten;
  await p.fill('#sd-name', sd.anbieterName);
  await H.weitereAngabenOeffnen(p); await p.fill('#sd-rechtsform', sd.rechtsform);
  await p.fill('#sd-strasse', sd.strasse); await p.fill('#sd-plz', sd.plz); await p.fill('#sd-ort', sd.ort);
  await p.fill('#sd-land', sd.land);
  await p.fill('#sd-k-name', sd.kontaktName); await p.fill('#sd-k-email', sd.kontaktEmail);
  await p.click('#sd-weiter');
  await H.generator.schluesselErzeugen(p);
  await expect(p.locator('#sk-priv-status')).toContainText(/Sicherung geprüft|Backup checked/);
}

/* Die Pflicht jedes Felds in seiner Karte abwählen, wie eine Person: Bearbeiten, Schalter „Pflichtfeld“, Fertig. */
/* Die Karte zeigt die Pflicht als gedrückten Knopf „Pflicht“ im Schalter (Vorgabe-Dummy 14.11.2026); vorher als Stern. */
const PFLICHT_AN = '.vk-pflicht-wahl > .vk-pflicht-knopf:first-child[aria-pressed="true"]';
async function pflichtAbwaehlen(p) {
  const n = await p.locator('#tpl-felder .vk').count();
  for (let i = 0; i < n; i++) {
    await p.locator('#tpl-felder .vk').nth(i).locator('.vk-bearbeiten').click();
    await p.waitForSelector('#feld-editor:not([hidden])');
    await p.uncheck('#ed-pflicht');
    await p.click('#ed-speichern');
  }
}
/* Vom Eingang über den Start (Name der Stelle, Beispiel „Kontaktbogen“) in die Arbeitsfläche und zu „Fertigstellen“. */
async function assistentBisFertigDialog(p, sprache) {
  await p.goto(H.URLS.generator);
  await p.click(sprache === 'en' ? '#sp-en' : '#sp-de');   // die Sprache des Browsers soll nicht mitspielen
  await p.waitForSelector('#as-name', { state: 'visible' });
  await p.fill('#as-name', 'Musterverein Probe');
  await p.evaluate(() => { const d = document.getElementById('start-weitere'); if (d) d.open = true; });   // seit S-1 unter „Weitere Wege“
  await p.click('#as-beispiele [data-beispiel="andere"]');
  await expect(p.locator('#tpl-felder .vk')).toHaveCount(3);              // „Kontaktbogen“: drei Felder
  // Seit Wagen 1.5 stehen Vorname, Nachname und E-Mail als Pflicht vorbelegt da; abgewählt hat die Vorlage keine Pflicht.
  await expect(p.locator('#tpl-felder .vk ' + PFLICHT_AN)).toHaveCount(3);
  await pflichtAbwaehlen(p);
  await expect(p.locator('#tpl-felder .vk ' + PFLICHT_AN)).toHaveCount(0);
  await p.click('#fertig-oeffnen');
  await expect(p.locator('#dlg-fertig[open]')).toHaveCount(1);
}

async function assistentBisSchritt3(p, sprache) {
  await assistentBisFertigDialog(p, sprache);
  await angabenUndSicherung(p);
  await expect(p.locator('#fs-c-rumpf')).toBeVisible();                     // ① und ② erledigt → ③ steht offen
}

for (const sprache of ['de', 'en']) {
  test.describe('T-CROSS-35 Empfehlung mit Weg · Start-Beispiel · ' + sprache.toUpperCase(), () => {
    test('„Beheben“ führt in die Arbeitsfläche an den Schalter der Feldkarte, danach ist die Empfehlung fort', async ({ browser }) => {
      test.setTimeout(120000);
      const ctx = await browser.newContext({ acceptDownloads: true });
      const p = await ctx.newPage();
      await assistentBisSchritt3(p, sprache);

      await H.einzelheitenOeffnen(p);
      const zeile = p.locator('#pr-warnungen li', { hasText: KEINE_PFLICHT_EINFACH[sprache] });
      await expect(zeile).toHaveCount(1);
      const knopf = zeile.locator('.pr-beheben');
      await expect(knopf).toHaveText(BEHEBEN[sprache]);
      await knopf.click();

      await expect(p.locator('#dlg-fertig[open]')).toHaveCount(0);
      await expect(p.locator('#raum-bau')).toBeVisible();
      await expect(p.locator('#feld-editor')).toBeVisible();
      await expect(p.locator('#ed-pflicht')).toBeFocused();
      await p.check('#ed-pflicht');
      await expect(p.locator('#tpl-felder .vk').first().locator(PFLICHT_AN)).toBeVisible();          // Karte und Vorschau zeigen die Pflicht
      await expect(p.locator('#av-felder .as-zeile').first().locator('.av-art')).toHaveText(/Pflicht|required/);

      await p.click('#fertig-oeffnen');                                         // ein Klick zurück zum Fertigstellen, wie bisher
      await expect(p.locator('#dlg-fertig[open]')).toHaveCount(1);
      // Seit Wagen 1.5: die Angaben stehen vollständig, ② ist erledigt, also öffnet der Dialog gleich bei ③;
      // ① steht als erledigte Zeile mit dem Namen da.
      await expect(p.locator('#sd-name')).toHaveValue(FIX.stammdaten.anbieterName);
      await expect(p.locator('#fs-c-rumpf')).toBeVisible();
      await expect(p.locator('#pr-warnungen li', { hasText: KEINE_PFLICHT_EINFACH[sprache] })).toHaveCount(0);
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
    await H.weitereAngabenOeffnen(p); await p.fill('#sd-rechtsform', sd.rechtsform);                            // seit U2-ADR-495 ein freies Textfeld
    await p.fill('#sd-strasse', sd.strasse); await p.fill('#sd-plz', sd.plz); await p.fill('#sd-ort', sd.ort);
    await p.fill('#sd-land', sd.land);
    await p.fill('#sd-k-name', sd.kontaktName); await p.fill('#sd-k-email', sd.kontaktEmail);
    await p.click('#sd-weiter');
    await H.generator.schluesselErzeugen(p);
    await expect(p.locator('#sk-priv-status')).toContainText('Sicherung geprüft');   // seit 16.10.2026: geprüft, bevor die Einreichung frei wird
    // Zwei Felder ohne Pflicht; dreiFelder öffnet danach den Dialog bei „Prüfen und absenden“.
    await H.generator.dreiFelder(p, FIX.felder.slice(0, 2).map((f) => Object.assign({}, f, { pflicht: false })));
    await expect(p.locator('#fs-c-rumpf')).toBeVisible();

    await H.einzelheitenOeffnen(p);
    const zeile = p.locator('#pr-warnungen li', { hasText: KEINE_PFLICHT_EINFACH.de });
    await expect(zeile).toHaveCount(1);
    await zeile.locator('.pr-beheben').click();
    await expect(p.locator('#dlg-fertig[open]')).toHaveCount(0);
    await expect(p.locator('#feld-editor')).toBeVisible();
    await expect(p.locator('#ed-pflicht')).toBeFocused();
    await p.check('#ed-pflicht');
    await expect(p.locator('.vk').first().locator(PFLICHT_AN)).toBeVisible();   // die Arbeitsfläche zeigt die Pflicht ohne Auswahl

    await p.click('#fertig-oeffnen');                                         // Angaben und Schlüssel stehen noch → „Fertig“
    await expect(p.locator('#fs-c-rumpf')).toBeVisible();
    await expect(p.locator('#sk-priv-status')).toContainText('Sicherung geprüft');   // seit 16.10.2026: geprüft, bevor die Einreichung frei wird
    await expect(p.locator('#pr-warnungen li', { hasText: KEINE_PFLICHT_EINFACH.de })).toHaveCount(0);
    await H.einzelheitenOeffnen(p);
    await p.click('#pr-pruefen');
    await expect(p.locator('#pr-submit')).toBeEnabled();                      // der Schlüssel liegt weiter im Tresor
    await ctx.close();
  });
});

test.describe('T-CROSS-35 Empfehlung mit Weg · Rot-Beweis des alten Wegs', () => {
  test('ohne Angaben und Sicherung öffnet der Kopf von Schritt 3 nichts', async ({ browser }) => {
    test.setTimeout(60000);
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await assistentBisFertigDialog(p, 'de');
    await expect(p.locator('#fs-c-kopf')).toBeDisabled();                     // der Weg der früheren Hilfsfunktion ist zu …
    await p.locator('#fs-c-kopf').click({ force: true });                     // … auch ein erzwungener Klick öffnet ③ nicht
    await expect(p.locator('#fs-c-rumpf')).toBeHidden();
    await expect(p.locator('#sd-name')).toBeVisible();                        // offen ist ①
    await ctx.close();
  });
});

test.describe('T-CROSS-35 Empfehlung mit Weg · Rot-Beweis', () => {
  test('ohne die Knöpfe „Beheben“ gibt es aus Schritt 3 keinen Weg zur Stelle', async ({ browser }) => {
    test.setTimeout(120000);
    const ctx = await browser.newContext({ acceptDownloads: true });
    const p = await ctx.newPage();
    await assistentBisSchritt3(p, 'de');
    await expect(p.locator('#pr-warnungen .pr-beheben')).not.toHaveCount(0);  // Gegenprobe: mit dem Bau sind sie da
    await p.evaluate(() => document.querySelectorAll('.pr-beheben').forEach((b) => b.remove()));
    await H.einzelheitenOeffnen(p);
    const zeile = p.locator('#pr-warnungen li', { hasText: KEINE_PFLICHT_EINFACH.de });
    await expect(zeile).toHaveCount(1);                                       // die Meldung steht …
    await expect(p.locator('.pr-beheben')).toHaveCount(0);                    // … aber nichts führt zur Stelle
    await expect(zeile.locator('button')).toHaveCount(0);
    await expect(p.locator('#dlg-fertig[open]')).toHaveCount(1);
    // Ohne „Beheben“ bekommt der Schalter „Pflichtfeld“ der Feldkarte keinen Fokus.
    await expect(p.locator('#ed-pflicht')).not.toBeFocused();
    await ctx.close();
  });
});
