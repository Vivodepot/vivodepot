'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   T-CROSS-20 (U2-ADR-258) — DIE HERKUNFT ÜBERSTEHT DIE DATEI
   ────────────────────────────────────────────────────────────────────────────
   Die Node-Proben (tests/u2-adr-258-herkunft-sichtbar.test.js) messen beide
   Anwendungen EINZELN, jede in ihrem eigenen Kontext. Was sie NICHT messen
   können, ist die Strecke dazwischen: Modul einlassen → Depot verschlüsseln →
   Datei schreiben → beim Empfänger entschlüsseln → Herkunft anzeigen.

   GENAU DA lag der Befund. Die Marke `ungeprueft` reist AM MODUL mit, im
   verschlüsselten Teil des Depots. Ob sie den Weg durch die Datei wirklich
   übersteht — durch `depotNormalisieren`, durch den Feld-Zerfall, durch die
   Umschlagstabelle — ist eine Frage an den Lauf, nicht an den Quelltext.

   ZWEI BROWSER-KONTEXTE, wie T-CROSS-17 und T-CROSS-01: der Kern baut, die
   Lese-App liest. Das Modul geht durch `modulEinlassen` — den ECHTEN Einlassweg,
   nicht durch ein von Hand gesetztes Feld: sonst prüfte die Probe eine Marke,
   die sie sich selbst geschrieben hat.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const H = require('./support/helpers');

const PW = 'cross-e2e-herkunft-258';

test.describe('T-CROSS-20 die Herkunft eines Moduls übersteht die Datei', () => {
  let tmp;
  test.beforeAll(() => { tmp = H.frischerTmp('herkunft258'); });
  test.afterAll(() => H.tmpAufraeumen(tmp));

  test('[U2-ADR-258] ein selbst eingelassenes Modul ist beim Empfänger als ungeprüft erkennbar', async ({ browser }) => {
    test.setTimeout(120000);

    /* ── Kontext A: der Kern legt an, läßt ein Modul ein und sichert ───────── */
    const ctxA = await browser.newContext({ acceptDownloads: true });
    const a = await ctxA.newPage();
    await H.kern.oeffnen(a);
    await H.kern.depotAnlegen(a, { name: 'Herkunft Nachweis', pw: PW });
    await H.kern.oeffneSektor(a, 'identity');
    await H.kern.setzeFeld(a, 'familyName', 'Herkunftsnachweis');

    /* Der ECHTE Einlassweg: derselbe `modulEinlassen`, den auch der Datei-Knopf
       ruft. Er setzt `ungeprueft: true` selbst — die Probe schreibt die Marke
       nicht, sie erzeugt sie. */
    const eingelassen = await a.evaluate(() => {
      const modul = { modulTyp: 'textsatz', moduleVersion: 1, sprache: 'fr',   // eine Sprache ohne eingebackene Saat: seit der Rückfall-Reihenfolge Modulsprache → Englisch → Deutsch (19.09.2026, s. tests/textsatz-rueckfall-eigene-sprache.test.js) zeigt ein Zusicherungssatz ohne fr-Fassung jetzt Englisch, sichtbar mit „[English]" markiert — vorher Deutsch
        texte: { 'strings:moduleEinlassenKnopf.text': 'Charger une extension depuis un fichier' } };
      const r = window.__vdOeffentlich.modulEinlassen(JSON.stringify(modul));
      return { angenommen: r.angenommen, grund: r.grund };
    });
    expect(eingelassen.angenommen, 'Modul eingelassen (' + (eingelassen.grund || '') + ')').toBe(true);
    /* Die Zählung im Kern (`modulHerkunftBerechnen`) liegt hinter dem Kern-Verschluss und ist keine öffentliche Fläche;
       ob das Modul als ungeprüft gilt, zeigt der Nachweis beim Empfänger unten — die Marke steht auf „offen“, im Text. */

    const datei = await H.kern.speichernNachTmp(a, tmp);
    await ctxA.close();

    /* ── Kontext B: der Empfänger öffnet die Datei ─────────────────────────── */
    const ctxB = await browser.newContext();
    const b = await ctxB.newPage();
    await H.lesen.oeffnen(b);
    await H.lesen.dateiOeffnen(b, datei, PW);

    // Das Depot ist wirklich angekommen — sonst prüfte alles Weitere eine leere Sicht.
    await b.click('[data-sektor="identity"]');
    await expect(b.locator('#content')).toContainText('Herkunftsnachweis');

    /* DER NACHWEIS: die Marke ist da, sie steht auf „offen", und sie sagt es im
       TEXT — nicht nur in der Farbe. */
    const marke = b.locator('#herkunft-marke');
    await expect(marke).toBeVisible();
    await expect(marke).toHaveClass(/herkunft-marke--offen/);
    await expect(marke).toContainText('without a checked origin');
    await expect(marke).toContainText('[English]');
    await expect(marke).not.toContainText('Their origin has been checked');

    /* Und der Empfänger sieht sie, ohne etwas aufzuklappen: sie steht im ersten
       Bildschirm, nicht hinter einem Knopf. Ein Hinweis, den man suchen muss,
       ist keiner. */
    const sichtbarOhneScroll = await marke.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.top < window.innerHeight;
    });
    expect(sichtbarOhneScroll, 'die Marke steht im ersten Bildschirm').toBe(true);

    await ctxB.close();
  });

  test('[U2-ADR-258] ein Depot ganz ohne Modul sagt das ausdrücklich — der Block verschwindet nie', async ({ browser }) => {
    test.setTimeout(120000);
    const ctxA = await browser.newContext({ acceptDownloads: true });
    const a = await ctxA.newPage();
    await H.kern.oeffnen(a);
    await H.kern.depotAnlegen(a, { name: 'Ohne Modul', pw: PW });
    await H.kern.oeffneSektor(a, 'identity');
    await H.kern.setzeFeld(a, 'familyName', 'Ohnemodul');
    const datei = await H.kern.speichernNachTmp(a, tmp);
    await ctxA.close();

    const ctxB = await browser.newContext();
    const b = await ctxB.newPage();
    await H.lesen.oeffnen(b);
    await H.lesen.dateiOeffnen(b, datei, PW);
    const marke = b.locator('#herkunft-marke');
    await expect(marke).toBeVisible();
    await expect(marke).toContainText('ganz aus Vivodepot selbst');
    await ctxB.close();
  });
});
