'use strict';
/* ═════════════════════════════════════════════════
   T-CROSS-30 — GEN1: der Template-Generator als Arbeitsfläche, im Browser, DE und EN
   ─────────────────────────────────────────────────
   Belegt am ERZEUGTEN Artefakt (der heruntergeladenen Submission-Datei), nicht an einer Fixture:
   Start → Felder ziehen und ordnen → Ausprobieren → Fertigstellen → Angaben → Schlüssel →
   Paket. Der Rot-Beweis liegt im Kontrast: derselbe Weg gegen den früheren Fünf-Schritte-
   Assistenten (`#w-weiter`) läuft nicht mehr an (tests/generator-arbeitsflaeche.test.js hält
   das Markup-Kriterium samt Mutation).
   ═════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const { AxeBuilder } = require('@axe-core/playwright');
const H = require('./support/helpers');
const FIX = require('./fixtures/reise-4-vertrauenskette.json');

const DEUTSCH = /\b(Sie|Ihre|Ihr|und|oder|nicht|bitte|Vorlage|Schlüssel|Feld|Angaben|wählen|Absenden)\b/;

for (const sprache of ['de', 'en']) {
  test.describe('T-CROSS-30 Arbeitsfläche · ' + sprache.toUpperCase(), () => {
    let tmp;
    test.beforeAll(() => { tmp = H.frischerTmp('gen1-' + sprache); });
    test.afterAll(() => H.tmpAufraeumen(tmp));

    test('bauen, ziehen, ausprobieren, fertigstellen, absenden: die Datei stimmt', async ({ browser }) => {
      test.setTimeout(120000);
      const ctx = await browser.newContext({ acceptDownloads: true });
      const p = await ctx.newPage();
      await H.generator.oeffnen(p, sprache);
      await expect(p.locator('html')).toHaveAttribute('lang', sprache);
      await expect(p.locator('#w-weiter')).toHaveCount(0);            // der Assistent ist fort

      if (sprache === 'en') {
        // Die Oberfläche ist englisch: kein deutsches Wort im Gehäuse des Starts, der Arbeitsfläche, der Dialoge (Daten ausgenommen).
        await p.click('#start-leer');
        for (const sel of ['#raum-bau .bau-leiste', '#raum-bau .weg-band', '#raum-bau #eigenschaften', '#raum-bau .reiter', '#dlg-fertig .dlg-kopf']) {
          expect((await p.locator(sel).innerText()), sel).not.toMatch(DEUTSCH);
        }
        await p.click('#bau-start');
        expect(await p.locator('#raum-start').innerText()).not.toMatch(DEUTSCH);
        // Auch die Modul-Bausteine hinter „Weitere Möglichkeiten“: jede Kachel, jeder Baustein (die Trefferliste des Feldkatalogs ist Daten und ausgenommen)
        await p.click('#start-module');
        expect(await p.locator('#dlg-module .dlg-kopf').innerText()).not.toMatch(DEUTSCH);
        for (const k of ['anf', 'vb', 'kv', 'ia', 'bm', 'rr', 'fm', 'bd']) {
          await p.click('#mod-kacheln [data-mod="' + k + '"]');
          const text = await p.locator('#' + k + '-block').evaluate((n) => { const c = n.cloneNode(true); c.querySelectorAll('#anf-treffer,#anf-gewaehlt').forEach((x) => x.remove()); return c.innerText; });
          expect(text, 'Baustein ' + k).not.toMatch(DEUTSCH);
        }
        await p.click('#dlg-module .dlg-zu');
      }

      // Bauen: zwei Felder aus der Palette in die Vorschau ziehen, eines umsortieren, ein eigenes Feld anlegen
      await p.click('#start-leer');
      await expect(p.locator('#fertig-oeffnen')).toBeVisible();      // der Weg zur Einreichung steht von der ersten Sekunde an da
      const pal = p.locator('.pal-eintrag[data-kat]');
      await pal.nth(0).dragTo(p.locator('#tpl-felder'));
      await pal.nth(1).dragTo(p.locator('#tpl-felder'));
      await expect(p.locator('.vk')).toHaveCount(2);
      const namen0 = await p.locator('.vk .vk-name').allInnerTexts();
      await p.locator('.vk').nth(1).dragTo(p.locator('.vk').nth(0), { targetPosition: { x: 40, y: 4 } });
      const namen1 = await p.locator('.vk .vk-name').allInnerTexts();
      expect(namen1).toEqual([namen0[1], namen0[0]]);
      await p.click('.pal-frei > summary');
      await p.click('.pal-eintrag[data-typ="datum"] .pal-plus');
      await p.fill('#ed-name', 'Aufnahmedatum');
      await p.check('#ed-pflicht');
      await expect(p.locator('.vk .vk-name', { hasText: 'Aufnahmedatum' })).toBeVisible();   // die Vorschau folgt dem Tippen sofort
      await expect(p.locator('#tpl-anzahl')).toContainText('3');

      // Ausprobieren: Ziehen ist aus, Eingeben geht
      await p.click('#ansicht-probieren');
      await expect(p.locator('.vk[draggable="true"]')).toHaveCount(0);
      await p.click('#ansicht-bauen');
      await expect(p.locator('.vk[draggable="true"]')).toHaveCount(3);

      // Fertigstellen: Angaben → Schlüssel → Prüfen und absenden
      await p.click('#fertig-oeffnen');
      await p.waitForSelector('#sd-name', { state: 'visible' });
      const sd = FIX.stammdaten;
      await p.fill('#sd-name', sd.anbieterName);
      await p.selectOption('#sd-rechtsform', sd.rechtsform);
      await p.fill('#sd-strasse', sd.strasse); await p.fill('#sd-plz', sd.plz); await p.fill('#sd-ort', sd.ort);
      await p.fill('#sd-k-name', sd.kontaktName); await p.fill('#sd-k-funktion', sd.kontaktFunktion);
      await p.fill('#sd-k-email', sd.kontaktEmail); await p.fill('#sd-k-telefon', sd.kontaktTelefon);
      await p.selectOption('#sd-bereich', sd.bereich); await p.fill('#sd-usecase', sd.useCase);
      await p.click('#sd-weiter');
      await p.click('#sk-erzeugen');
      await p.waitForSelector('#sk-downloads:not([hidden])');
      await Promise.all([ p.waitForEvent('download'), p.click('#sk-pub') ]);
      await Promise.all([ p.waitForEvent('download'), p.click('#sk-priv') ]);
      await p.click('#sk-weiter');
      await expect(p.locator('#pr-submit')).toBeEnabled();
      const datei = await H.downloadNachTmp(p, tmp, () => p.click('#pr-submit'));

      // Das erzeugte Artefakt: drei Felder in der gebauten Reihenfolge (das neue hinter dem gewählten), signiert, ohne erneutes Suchen der Schlüsseldatei
      const paket = JSON.parse(fs.readFileSync(datei, 'utf8'));
      expect(paket.templates[0].felder.map((f) => f.feldname)).toEqual([namen0[1], 'Aufnahmedatum', namen0[0]]);   // ein neues Feld kommt hinter das gewählte
      expect(paket.templates[0].felder[1].pflicht).toBe(true);
      expect(paket.templatesJws.length).toBe(1);
      expect(await p.evaluate(() => SCHLUESSEL_TRESOR.vorhanden())).toBe(false);     // der Schlüssel ist nach dem Signieren verworfen
      // Der Weg nach dem Erzeugen ist sichtbar: Absenden mit vorbereiteter E-Mail an die Einreichadresse
      await expect(p.locator('#absenden-block')).toBeVisible();
      const mail = await p.locator('#absenden-mail').getAttribute('href');
      expect(mail).toMatch(/^mailto:register@vivodepot\.de\?subject=/);
      expect(decodeURIComponent(mail)).toContain(paket.submissionId);
      await ctx.close();
    });

    test('axe: Start, Arbeitsfläche und Fertigstellen ohne schwere Verstöße (WCAG 2.2 AA, Kontrast eingeschlossen)', async ({ browser }) => {
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      await H.generator.oeffnen(p, sprache);
      const scan = async (name) => {
        const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
        const hart = r.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
        expect(hart.map((v) => v.id + ': ' + v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' ; ')), '[axe ' + name + ']').toEqual([]);
      };
      await scan('Start');
      await p.click('#bsp-pflegeheim'); await p.click('.vk >> nth=1'); await scan('Arbeitsfläche');
      await p.click('#fertig-oeffnen'); await scan('Fertigstellen');
      await ctx.close();
    });

    test('Rechtstexte und Register sind da, ohne zu stören', async ({ browser }) => {
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      await H.generator.oeffnen(p, sprache);
      await expect(p.locator('#kopf-register')).toHaveAttribute('href', 'https://register.vivodepot.de/');
      for (const k of ['nutzung', 'einreichung', 'datenschutz', 'impressum', 'lizenz']) {
        await p.click('footer [data-recht="' + k + '"]');
        await expect(p.locator('#dlg-recht')).toBeVisible();
        await expect(p.locator('#recht-text')).not.toBeEmpty();
        await expect(p.locator('#recht-text .recht-entwurf')).toHaveCount(0);   // freigegeben (23.09.2026): keine Entwurfsmarke mehr über dem Text
        await p.click('#dlg-recht .dlg-zu');
      }
      await ctx.close();
    });
  });
}
