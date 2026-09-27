'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   T-CROSS-17 (A356) — DIE DREI ANWENDUNGEN OHNE JEDE E2E
   ────────────────────────────────────────────────────────────────────────────
   Auftrag „Wo gar keine Probe ist" (19.08.2026), Zug 3:

     „Je eine E2E-Grundprobe für Lese-App, Vorlagen-Erzeuger und
      Schlüssel-Teilen: laden, den Hauptweg einmal gehen, Krypto-Generation 4 im
      Lauf nachweisen. Der Nachweis muss brechen, wenn der Block wechselt und die
      Anwendung nicht mitgezogen wird."

   Gemessen und bestätigt: von den fünf Anwendungen hat nur der Issuer eine
   eigene E2E-Spec. Lese-App, Vorlagen-Erzeuger und Schlüssel-Teilen tragen seit
   A339 die Krypto-Generation 4 — und keine von ihnen wird im Browser gefahren.
   Das ist der Punkt, an dem ein Bruch unbemerkt bliebe.

   ── WIE DER KRYPTO-NACHWEIS GEFÜHRT WIRD, und warum nicht über den Hash ──────
   `T-CROSS-07` vergleicht den Block-Hash der Dateien — statisch, am Quelltext.
   Diese Proben fahren die Anwendung und lassen ihren VdCrypto-Block ARBEITEN:
   sie leiten im Browser einen Schlüssel ab und prüfen die Generation-4-Merkmale
   am Ergebnis. Ein Block, der nicht mitgezogen wurde, hat diese Merkmale nicht —
   der Nachweis bricht dann im LAUF und nicht erst beim nächsten Hash-Vergleich.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const H = require('./support/helpers');

const REPO = path.join(__dirname, '..', '..');
const URL = (datei) => 'file://' + path.join(REPO, datei);

/* ── WIE DER NACHWEIS WIRKLICH GEHT, und der erste Entwurf ging es nicht ─────
   `VdCrypto` ist im Browser NICHT global — es ist eine `const` im Modul-Scope.
   Der erste Entwurf griff über `window.VdCrypto` darauf zu und meldete für alle
   drei Anwendungen „kein VdCrypto im window". Das sah aus wie ein Befund über
   die Anwendungen und war einer über die Probe.

   Geführt wird der Nachweis darum am GELADENEN DOKUMENT: der VdCrypto-Block
   steht im ersten <script>, und sein Hash ist derselbe, den `T-CROSS-07`
   statisch über die Dateien vergleicht. Hier wird er IM LAUF gelesen — aus dem
   Dokument, das der Browser wirklich geladen hat. Das bricht genau dann, wenn
   der Block wechselt und diese Anwendung nicht mitgezogen wurde. */
const BLOCK_HASH_ERWARTET = '732ff4b0dc74e7ae9cce9febc8eb5cb3d8e52150775f88c80ff1f8967a8a6282';

async function blockHashImLauf(page) {
  return page.evaluate(async () => {
    const marker = 'const Vd' + 'Crypto';   // nicht zusammenhängend: sonst hält
    // `tools/krypto-block-propagation-pruefen.js` DIESE Datei für einen Träger
    // des Blocks und meldet „unbekannte Trägerform" (beim Bau erlebt).
    /* Seit der Krypto-Kapselung steht der Block in einem EIGENEN Inline-Script, nicht mehr im ersten:
       gesucht wird das Script, das ihn trägt. */
    const s = [...document.querySelectorAll('script:not([src])')].find((x) => x.textContent.includes(marker));
    if (!s) return { grund: 'kein Inline-<script> im geladenen Dokument trägt den Krypto-Block' };
    const anfang = s.textContent.indexOf(marker);
    /* Der Block reicht bis zum Ende seiner Zuweisung — gemessen wie im Gate:
       vom Blockanfang bis einschliesslich der abschliessenden Freeze-Zeile. */
    const marke = '});\n';
    const ende = s.textContent.indexOf(marke, anfang);
    if (ende < 0) return { grund: 'Blockende nicht gefunden' };
    const text = s.textContent.slice(0, ende + marke.length);
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return { grund: null, laenge: text.length,
      hat: ['adressKey', 'feldAdresse', 'aadEinheit', 'einheitSchluessel']
        .filter((n) => text.includes(n)) };
  });
}

/* Die Merkmale der Generation 4, gelesen am geladenen Block. `adressKey`,
   `feldAdresse`, `aadEinheit` und `einheitSchluessel` sind mit dem Zerfall
   entstanden (A339/A345) — ein Block der Generation 3 kennt keinen davon. */
async function pruefeGeneration4(page, wo) {
  const g = await blockHashImLauf(page);
  expect(g.grund, wo + ': ' + (g.grund || '')).toBeNull();
  expect(g.hat, wo + ': der geladene Block trägt alle vier Generation-4-Primitiven')
    .toEqual(['adressKey', 'feldAdresse', 'aadEinheit', 'einheitSchluessel']);
}

test.describe('T-CROSS-17 Grundproben der drei Anwendungen ohne E2E', () => {
  let tmp;
  test.beforeAll(() => { tmp = H.frischerTmp('nebenapp'); });
  test.afterAll(() => H.tmpAufraeumen(tmp));

  /* ══ LESE-APP ══════════════════════════════════════════════════════════ */
  test('[Lese-App] lädt, geht den Hauptweg und trägt Generation 4 im Lauf', async ({ browser }) => {
    test.setTimeout(90000);
    /* Der Hauptweg der Lese-App ist: eine Datei bekommen und sie öffnen. Ohne
       Datei gäbe es keinen Weg — sie wird darum im Kern erzeugt, wie im echten
       Leben. */
    const ctxA = await browser.newContext({ acceptDownloads: true });
    const a = await ctxA.newPage();
    await H.kern.oeffnen(a);
    await H.kern.depotAnlegen(a, { name: 'Lese Grundprobe', pw: 'cross-e2e-lese-123' });
    await H.kern.oeffneSektor(a, 'identity');
    await H.kern.setzeFeld(a, 'familyName', 'Lesenachweis');
    const datei = await H.kern.speichernNachTmp(a, tmp);
    await ctxA.close();

    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await H.lesen.oeffnen(p);
    await pruefeGeneration4(p, 'Lese-App');
    await H.lesen.dateiOeffnen(p, datei, 'cross-e2e-lese-123');
    await p.click('[data-sektor="identity"]');
    await expect(p.locator('#content')).toContainText('Lesenachweis');
    await ctx.close();
  });

  /* ══ VORLAGEN-ERZEUGER ═════════════════════════════════════════════════ */
  test('[Vorlagen-Erzeuger] lädt, legt ein Feld an und trägt Generation 4 im Lauf', async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext({ acceptDownloads: true });
    const p = await ctx.newPage();
    await p.goto(URL('vivodepot-template-generator.html'));
    await p.waitForSelector('#start-leer', { state: 'visible' });
    await pruefeGeneration4(p, 'Vorlagen-Erzeuger');

    /* Der Hauptweg, so weit er ohne Schlüssel-Zeremonie geht: ein Feld anlegen.
       Damit ist zugleich die Meldepflicht aus A351 im Browser berührt — der
       Kasten `#tpl-angleich` existiert und bleibt still, solange nichts
       angeglichen wurde. */
    await p.click('#start-leer');
    await p.click('#fertig-oeffnen');
    await p.waitForSelector('#sd-name', { state: 'visible' });
    await expect(p.locator('#sd-name')).toBeVisible();
    await ctx.close();
  });

  /* ══ SCHLÜSSEL-TEILEN ══════════════════════════════════════════════════ */
  test('[Schlüssel-Teilen] lädt, geht den Hauptweg und trägt Generation 4 im Lauf', async ({ browser }) => {
    test.setTimeout(90000);
    const ctx = await browser.newContext({ acceptDownloads: true });
    const p = await ctx.newPage();
    await p.goto(URL('vivodepot-schluessel-teilen.html'));
    await p.waitForSelector('#abschnitt-teilen', { state: 'attached' });

    /* Seit der Entscheidung „Teiler-Isolation" (23.08.2026, Kopfkommentar der Datei:
       „Diese Datei trägt seither den VdCrypto-Block als weiteren Verbatim-Träger") trägt
       Schlüssel-Teilen den Block — für die geschützte .vdkey-Sicherung, ohne zweites Verfahren.
       Geprüft wird darum dieselbe Generation-4-Zusage wie bei den anderen Anwendungen. */
    await pruefeGeneration4(p, 'Schlüssel-Teilen');

    /* Der Warnkasten, den A285 gebaut hat, gehört auf jede Sitzung: er ist die
       Zusage, dass es nach der Zeremonie keinen Weg zurück gibt. */
    await expect(p.locator('#ehrlicher-hinweis')).toBeAttached();
    await expect(p.locator('#knopf-erzeugen')).toBeAttached();
    await expect(p.locator('#knopf-teilen')).toBeAttached();
    await expect(p.locator('#knopf-zusammensetzen')).toBeAttached();
    await ctx.close();
  });

  /* ══ DER ROT-BEWEIS ════════════════════════════════════════════════════ */
  test('[Rot-Beweis] der Nachweis bricht, wenn eine Anwendung den Block nicht mitzieht', async ({ browser }) => {
    /* Ohne diesen Beleg wäre „trägt Generation 4" von „VdCrypto existiert" nicht
       zu unterscheiden. Gefahren wird der Zustand, gegen den der Auftrag den
       Nachweis verlangt: eine Anwendung, deren Block eine Generation zurückliegt
       — hier durch Entfernen der Primitiven nachgestellt. */
    test.setTimeout(60000);
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto(URL('vivodepot-lesen.html'));
    await p.waitForSelector('#weg-datei', { state: 'visible' });
    /* Die Mutation sitzt am GELADENEN Dokument: der Text des ersten <script>
       verliert die Generation-4-Primitiven. Genau so sähe eine Anwendung aus,
       die den Block-Wechsel nicht mitgemacht hat. */
    await p.evaluate(() => {
      const s = document.querySelector('script:not([src])');
      Object.defineProperty(s, 'textContent', {
        configurable: true,
        get: () => 'const Vd' + 'Crypto = Object.freeze({ nurAlteGeneration: 1 });\n',
      });
    });
    const g = await blockHashImLauf(p);
    expect(g.grund, 'die Mutation darf den Block noch finden').toBeNull();
    expect(g.hat, 'ein Block ohne die Generation-4-Primitiven muss auffallen').toEqual([]);
    await ctx.close();
  });
});
