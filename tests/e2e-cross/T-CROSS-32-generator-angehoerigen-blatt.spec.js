'use strict';
/* ═════════════════════════════════════════════════
   T-CROSS-32 — GEN3: der Generator baut ein Angehörigen-Blatt (Klick-Weg, DE und EN)
   ─────────────────────────────────────────────────
   Start-Kachel → Blatt und Block benennen → Felder aus dem Register per + und per Ziehen in Blöcke → „Gilt für“ →
   Fertigstellen (Angaben, Schlüssel) → echter Klick → die Datei. Geprüft wird die ERZEUGTE Datei: Form des Kerns
   (modulTyp angehoerigenVorlage), die Zeiger in den gebauten Blöcken, die Signatur, die den Public-Key des Paares
   trägt, und dass der Schlüssel danach fort ist. Der Rundlauf bis in die Lese-App: T-CROSS-33 (nach ANG1 Stufe e).
   Rot-Beweis: ein von einem Skript ausgelöster Klick erzeugt kein Blatt.
   ═════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const H = require('./support/helpers');
const FIX = require('./fixtures/reise-4-vertrauenskette.json');

function b64uJson(teil) { return JSON.parse(Buffer.from(teil.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); }

for (const sprache of ['de', 'en']) {
  test.describe('T-CROSS-32 Angehörigen-Blatt · ' + sprache.toUpperCase(), () => {
    let tmp;
    test.beforeAll(() => { tmp = H.frischerTmp('gen3-' + sprache); });
    test.afterAll(() => H.tmpAufraeumen(tmp));

    test('ein Blatt bauen, signieren, als Datei erzeugen', async ({ browser }) => {
      test.setTimeout(120000);
      const ctx = await browser.newContext({ acceptDownloads: true });
      const p = await ctx.newPage();
      await H.generator.oeffnen(p, sprache);
      await p.click('#start-blatt');
      await expect(p.locator('#blatt-meta')).toBeVisible();
      await expect(p.locator('#blatt-eig')).toBeVisible();
      await expect(p.locator('#fertig-oeffnen')).toBeHidden();      // der Weg zum Erzeugen heißt hier anders
      await expect(p.locator('#blatt-fertig')).toBeVisible();
      await expect(p.locator('.pal-frei')).toBeHidden();             // ein eigenes Feld gibt es im Blatt nicht

      // Blatt und Block benennen (live)
      await p.click('.bk-kopf >> nth=0');
      await p.fill('#ab-s-titel', sprache === 'de' ? 'Krankenhaus' : 'Hospital');
      await p.selectOption('#ab-s-icon', 'heartPulse');
      await p.fill('#ab-s-einfuehrung', sprache === 'de' ? 'Aufnahme und Aufenthalt.' : 'Admission and stay.');
      await p.click('.bk-block-kopf >> nth=0');
      await p.fill('#ab-b-titel', sprache === 'de' ? 'Aus Gesundheit' : 'From Health');
      await expect(p.locator('.bk-titel').first()).toHaveText(sprache === 'de' ? 'Krankenhaus' : 'Hospital');

      // Felder: zwei per +, eines per Ziehen in einen zweiten Block; dazu ein Sonderzeiger
      await p.click('.pal-eintrag[data-kat] .pal-plus >> nth=0');
      await p.click('.pal-eintrag[data-kat] .pal-plus >> nth=1');
      await expect(p.locator('.bk-eintrag')).toHaveCount(2);
      await p.click('.bk-fuss >> nth=0 >> text=/\\+ Block|\\+ Block/');
      await expect(p.locator('.bk-block')).toHaveCount(2);
      await p.fill('#ab-b-titel', sprache === 'de' ? 'Meine Menschen' : 'My people');
      await p.locator('.pal-eintrag[data-kat]').nth(3).dragTo(p.locator('.bk-block').nth(1));
      await p.locator('.pal-eintrag[data-sq="people"]').dragTo(p.locator('.bk-block').nth(1));
      await expect(p.locator('.bk-block').nth(0).locator('.bk-eintrag')).toHaveCount(2);
      await expect(p.locator('.bk-block').nth(1).locator('.bk-eintrag')).toHaveCount(2);

      // Gilt für
      await p.fill('#ab-rechtsraum', 'DE'); await p.fill('#ab-rechtsraumname', sprache === 'de' ? 'Deutschland' : 'Germany'); await p.fill('#ab-sprache', sprache);

      // Fertigstellen: Angaben, Schlüssel, erzeugen
      await p.click('#blatt-fertig');
      await p.waitForSelector('#sd-name', { state: 'visible' });
      const sd = FIX.stammdaten;
      await p.fill('#sd-name', sd.anbieterName); await p.selectOption('#sd-rechtsform', sd.rechtsform);
      await p.fill('#sd-strasse', sd.strasse); await p.fill('#sd-plz', sd.plz); await p.fill('#sd-ort', sd.ort);
      await p.fill('#sd-k-name', sd.kontaktName); await p.fill('#sd-k-funktion', sd.kontaktFunktion);
      await p.fill('#sd-k-email', sd.kontaktEmail); await p.fill('#sd-k-telefon', sd.kontaktTelefon);
      await p.selectOption('#sd-bereich', sd.bereich); await p.fill('#sd-usecase', sd.useCase);
      await p.click('#sd-weiter');
      await p.click('#sk-erzeugen');
      await p.waitForSelector('#sk-downloads:not([hidden])');
      await Promise.all([p.waitForEvent('download'), p.click('#sk-pub')]);
      await Promise.all([p.waitForEvent('download'), p.click('#sk-priv')]);
      await p.click('#sk-weiter');
      await expect(p.locator('#ab-erzeugen')).toBeEnabled();
      await expect(p.locator('#pr-submit')).toBeHidden();

      // Rot-Beweis: ein Skript löst den Knopf aus — kein Blatt, der Schlüssel bleibt
      await p.evaluate(() => document.getElementById('ab-erzeugen').click());
      await expect(p.locator('#pr-ergebnis')).toContainText(sprache === 'de' ? /echten Klick/ : /real click/);
      expect(await p.evaluate(() => SCHLUESSEL_TRESOR.vorhanden())).toBe(true);
      // der echte Klick erzeugt die Datei
      const datei = await H.downloadNachTmp(p, tmp, () => p.click('#ab-erzeugen'));
      const umschlag = JSON.parse(fs.readFileSync(datei, 'utf8'));
      expect(umschlag.format).toBe('vivodepot-angehoerigenvorlage@1');
      const m = umschlag.modul;
      expect(m.modulTyp).toBe('angehoerigenVorlage');
      expect(m.sprache).toBe(sprache);
      expect(m.rechtsraum).toBe('DE');
      expect(m.herkunft).toMatch(/^institution\//);
      const blaetter = Object.values(m.situationen);
      expect(blaetter.length).toBe(1);
      expect(blaetter[0].titel).toBe(sprache === 'de' ? 'Krankenhaus' : 'Hospital');
      expect(blaetter[0].icon).toBe('heartPulse');
      expect(blaetter[0].bloecke.length).toBe(2);
      expect(blaetter[0].bloecke[0].eintraege.length).toBe(2);
      expect(blaetter[0].bloecke[1].eintraege.map((e) => e.quelle + '.' + e.feld)).toContain('people.menschen');
      // die Signatur trägt genau dieses Modul, und der Schlüssel ist verbraucht
      const teile = umschlag.modulSignaturJws.split('.');
      expect(teile.length).toBe(3);
      expect(b64uJson(teile[1])).toEqual(m);
      expect(await p.evaluate(() => SCHLUESSEL_TRESOR.vorhanden())).toBe(false);
      await ctx.close();
    });
  });
}
