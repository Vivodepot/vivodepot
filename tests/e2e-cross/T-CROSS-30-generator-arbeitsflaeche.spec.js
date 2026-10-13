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
      await p.fill('#sd-rechtsform', sd.rechtsform); await p.fill('#sd-land', sd.land || 'Deutschland');
      await p.fill('#sd-strasse', sd.strasse); await p.fill('#sd-plz', sd.plz); await p.fill('#sd-ort', sd.ort);
      await p.fill('#sd-k-name', sd.kontaktName);
      await p.fill('#sd-k-email', sd.kontaktEmail); await p.fill('#sd-k-telefon', sd.kontaktTelefon);
      await p.click('#sd-weiter');
      await p.fill('#sk-pw1', H.SCHLUESSEL_PASSWORT_E2E); await p.fill('#sk-pw2', H.SCHLUESSEL_PASSWORT_E2E);
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
      // Der Weg nach dem Erzeugen ist sichtbar: die Erfolgskarte mit vorbereiteter E-Mail an die Einreichadresse
      await expect(p.locator('#fs-fertig')).toBeVisible();
      const mail = await p.locator('#fs-fertig-mail').getAttribute('href');
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

    // Fund 26.09.2026: im Kopf ein Schild statt des Logos, und schmal lief die Navigation über das Logo und aus dem Bild.
    test('Kopf: das Logo ist da, die Navigation bleibt bei 1440, 1280 und 390 px im Bild und neben bzw. unter dem Logo', async ({ browser }) => {
      for (const breite of [1440, 1280, 390]) {
        const ctx = await browser.newContext({ viewport: { width: breite, height: 800 } });
        const p = await ctx.newPage();
        await H.generator.oeffnen(p, sprache);
        const m = await p.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          const logo = document.querySelector('header.app .logo-mark');
          const l = logo ? logo.getBoundingClientRect() : null;
          const marke = document.getElementById('marke-start').getBoundingClientRect();
          const nav = Array.from(document.querySelectorAll('header.app .app-links > *')).map((x) => x.getBoundingClientRect());
          return {
            logo: !!(l && l.width > 20 && document.querySelector('header.app .logo-mark use[href="#vd-logo"]')),
            aussen: nav.filter((r) => r.right > vw + 1 || r.left < -1).length,
            ueberLogo: nav.filter((r) => r.left < marke.right - 1 && r.top < marke.bottom - 1 && r.bottom > marke.top + 1).length,
            seitlich: document.documentElement.scrollWidth - vw,
          };
        });
        expect(m.logo, breite + ' px: Logo').toBe(true);
        expect(m.aussen, breite + ' px: Navigation außerhalb des Bilds').toBe(0);
        expect(m.ueberLogo, breite + ' px: Navigation über dem Logo').toBe(0);
        expect(m.seitlich, breite + ' px: seitliches Scrollen').toBeLessThanOrEqual(1);
        await ctx.close();
      }
    });

    test('Rechtstexte und Register sind da, ohne zu stören', async ({ browser }) => {
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      await H.generator.oeffnen(p, sprache);
      await expect(p.locator('#kopf-register')).toHaveAttribute('href', 'https://register.vivodepot.de/');
      await expect(p.locator('#fuss-impressum')).toHaveAttribute('href', sprache === 'en' ? 'https://vivodepot.de/impressum.html?lang=en' : 'https://vivodepot.de/impressum.html');
      await expect(p.locator('#fuss-datenschutzerklaerung')).toHaveAttribute('href', sprache === 'en' ? 'https://vivodepot.de/datenschutz.html?lang=en' : 'https://vivodepot.de/datenschutz.html');
      for (const k of ['nutzung', 'einreichung', 'datenschutz', 'lizenz']) {
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

/* ── Eingang auf schmalem Bildschirm (10.10.2026) ─────────────────────────────────────────────────────────────────────
   Gemessen wird die BERECHNETE Kachel im Browser bei 375 px Breite, nicht eine CSS-Zeile: keine Mindesthöhe, das Zeichen
   steht neben dem Titel, der Titel beginnt oben in der Kachel.
   Der Fall dahinter: ein Commit nahm die Regeln für Bildschirme bis 760 px heraus, bevor die kompakte Grundregel da war;
   dazwischen war jede Kachel auf dem Telefon wieder mindestens 196 px hoch. Der Rot-Beweis stellt genau diesen Stand im
   Browser her (die hohe Grundregel, keine Regel für schmale Bildschirme) und misst dieselben Größen noch einmal.
   Die Rechnung ohne Browser steht in tests/studio-eingang.test.js, [Eingang · 7]. */
const KACHEL_HOCH = 196;   // die Mindesthöhe der hohen Grundregel
const GRUNDREGEL_HOCH = [
  '.eingang-kachel { padding: 28px 28px 26px !important; min-height: 196px !important; }',
  '.eingang-kachel .ek-titel { margin: 44px 0 8px !important; font-size: 22px !important; }',
  '.eingang-kachel .ek-glyph { left: 28px !important; top: 26px !important; width: 30px !important; height: 30px !important; }',
].join('\n');
async function kachelnMessen(p) {
  return p.evaluate(() => [...document.querySelectorAll('#raum-eingang .eingang-kachel')].map((k) => {
    const r = k.getBoundingClientRect();
    const titel = k.querySelector('.ek-titel').getBoundingClientRect();
    const zeichen = k.querySelector('.ek-glyph').getBoundingClientRect();
    return { id: k.id, hoehe: Math.round(r.height), mindestens: getComputedStyle(k).minHeight,
      titelOben: Math.round(titel.top - r.top), zeichenNeben: zeichen.right <= titel.left && zeichen.top < titel.bottom };
  }));
}
function kachelBefunde(kacheln) {
  const raus = [];
  for (const k of kacheln) {
    if (parseFloat(k.mindestens) > 0) raus.push(k.id + ': Mindesthöhe ' + k.mindestens);
    if (k.titelOben > 30) raus.push(k.id + ': der Titel beginnt erst bei ' + k.titelOben + ' px');
    if (!k.zeichenNeben) raus.push(k.id + ': das Zeichen steht nicht neben dem Titel');
  }
  return raus;
}
test.describe('T-CROSS-30 Eingang · 375 px', () => {
  test('die Kacheln sind kompakt: keine Mindesthöhe, Titel oben, Zeichen daneben; mit der hohen Grundregel ist es rot', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const p = await ctx.newPage();
    await p.goto(H.URLS.generator);
    await p.waitForSelector('#raum-eingang .eingang-kachel', { state: 'visible' });
    const kacheln = await kachelnMessen(p);
    expect(kacheln.length).toBe(6);
    expect(kachelBefunde(kacheln)).toEqual([]);
    // Die Kachel ohne Zusatzzeile ist niedriger als die alte Mindesthöhe: das Kompakte kommt auf dem Telefon an.
    expect(kacheln.find((k) => k.id === 'ein-anfrage').hoehe).toBeLessThan(KACHEL_HOCH);

    // Rot-Beweis: der Stand mit der hohen Grundregel und ohne Regel für schmale Bildschirme.
    await p.addStyleTag({ content: GRUNDREGEL_HOCH });
    const hoch = await kachelnMessen(p);
    expect(hoch.every((k) => k.hoehe >= KACHEL_HOCH)).toBe(true);
    expect(kachelBefunde(hoch).length).toBeGreaterThanOrEqual(3 * hoch.length);
    await ctx.close();
  });
});
