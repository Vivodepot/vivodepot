'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Gemeinsame Hilfe der Bürgerwege
   ────────────────────────────────────────────────────────────────────────
   Die Wege 1 bis 3 tragen ihren Vorlauf und ihre Schritt-Mechanik je einzeln.
   Bei vier weiteren wären das sieben Kopien derselben zwanzig Zeilen — und
   sieben Kopien sind sieben Regeln, die auseinanderlaufen. Der Anlege-Vorlauf
   ist ausserdem genau die Stelle, an der eine falsche Annahme am teuersten
   ist: misslingt er still, misst jeder folgende Schritt den Startbildschirm.

   DIE MECHANIK, unverändert aus Weg 1: jeder Schritt sagt, was er erwartet,
   und ein Schritt, der sich GAR NICHT ausführen lässt, meldet genauso wie
   einer, der ausgeführt wird und nicht ankommt. Sonst käme ein
   Playwright-Timeout zurück — eine Meldung über das Werkzeug statt über den Weg.
   ════════════════════════════════════════════════════════════════════════ */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

/* Schnitt-Nachtrag (18.09.2026): mit BUERGERMODUL_BUENDEL entfernt ist AB_WERK_BEREICH_QUELLEN
   im nativen Gerüst leer (gewollt, s. tests/e2e/global-setup.js) — ein Bürgerweg gegen die rohe
   vivodepot.html prüfte darum ein bereichsloses Gerüst, nicht ein Produkt: kein Sektor zum
   Navigieren, kein Feld zum Erfassen. Derselbe Weg wie überall sonst im Kern (KERN_HTML_PATH/
   `konfektionieren()`, nicht eine zweite Fassung), einmal beim Laden dieser Datei gebacken —
   `konfektionieren()` ist synchron, kein globalSetup-Umweg nötig. Standard-Produkt privat-de,
   dieselbe Wahl wie `ladeKern()`s Default und `tests/e2e/helpers.js`s KERN_URL. */
const _gebackenerOrdner = fs.mkdtempSync(path.join(os.tmpdir(), 'weg-buergerweg-'));
const _produkt = PRODUKTE.find((p) => p.slug === 'privat-de');
const _gebacken = konfektionieren({
  ziel: _gebackenerOrdner,
  slug: 'privat-de',
  modulauswahl: [],
  vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
  unsignierteModulDateien: modulDateienFuer(_produkt),
});
const HTML = 'file://' + path.join(_gebacken.ordner, 'vivodepot.html');

/** Frische Seite auf dem Startbildschirm. Kein Depot. */
async function seiteAmStart(browser, breite = 390) {
  const seite = await browser.newPage({ viewport: { width: breite, height: 900 } });
  const fehler = [];
  seite.on('pageerror', (e) => fehler.push(String(e.message)));
  // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): FSA-Attrappe VOR der Navigation — der
  // Anlege-Weg holt jetzt ein Dateiziel (showSaveFilePicker), headless Chromium zeigt dafür
  // keinen nativen Dialog. Echter Schreibweg (createWritable/write/close), kein App-Bypass.
  await seite.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({
        name: 'weg-messung.vivodepot',
        createWritable: async () => ({ write: async () => {}, close: async () => {} }),
      }),
    });
  });
  await seite.goto(HTML);
  await seite.waitForSelector('#w-anfangen', { timeout: 5000 });
  seite.setDefaultTimeout(2000);
  return { seite, fehler };
}

/** Frische Seite MIT eingerichtetem Depot. Bricht laut ab, statt leer zu messen. */
async function seiteMitDepot(browser, pw, breite = 390) {
  const { seite, fehler } = await seiteAmStart(browser, breite);
  await seite.click('#w-anfangen');
  await seite.waitForTimeout(300);
  await seite.click('#tb-pw-hinweis');
  await seite.waitForTimeout(300);
  for (const [sel, wert] of [['#id-vorname', 'Marlies'], ['#id-nachname', 'Beispiel'], ['#id-pw', pw], ['#id-pw2', pw]]) {
    await seite.fill(sel, wert);
  }
  await seite.evaluate(() => {
    // U2-ADR-288-Nachtrag (05.09.2026): '.modal' bekam einen neuen Kind-Wrapper
    // ('.modal-koerper', selbst ein div) für Kopf/Körper/Fuß-Layout — ein bloßes 'div' in dieser
    // Liste stoppte closest() jetzt am Wrapper, BEVOR er '.modal' selbst erreicht, und der
    // „Anlegen"-Knopf (in .modal-aktionen, einem GESCHWISTER von .modal-koerper) war darüber
    // nicht mehr auffindbar. 'div' entfernt — '.modal'/'#overlay-inhalt'/'section' benennen die
    // echten Container bereits explizit.
    const raum = document.querySelector('#id-pw').closest('form, .modal, #overlay-inhalt, section');
    const k = [...(raum || document).querySelectorAll('button')]
      .find((b) => /anleg|einricht|erstell|speicher|weiter|fertig|ok/i.test(b.textContent || ''));
    if (k) k.click();
  });
  await seite.waitForTimeout(600);
  const drin = await seite.evaluate(() => { const e = document.querySelector('#id-pw'); return !e || e.getBoundingClientRect().width === 0; });
  assert.ok(drin, 'Vorlauf: das Depot ist eingerichtet — ohne das misst jeder Schritt den Startbildschirm');
  return { seite, fehler };
}

/**
 * Erzeugt den Schritt-Läufer für einen Weg. `nr` steht in jeder Bruchmeldung,
 * damit ein Fehlschlag im Suite-Rauschen sofort seinem Weg zuzuordnen ist.
 */
function wegLaeufer(seite, nr) {
  const protokoll = [];
  const schritt = async (was, tun, merkmal, erwartung) => {
    let nichtAusfuehrbar = null;
    try { await tun(); } catch (e) { nichtAusfuehrbar = String(e.message).split('\n')[0]; }
    const da = await seite.evaluate(`(${merkmal.toString()})()`).catch(() => false);
    protokoll.push({ was, erreicht: !!da, erwartung });
    if (!da) {
      const e = new Error(
        `WEG ${nr} BRICHT BEI: ${was}\n` +
        (nichtAusfuehrbar ? `  Der Schritt liess sich nicht ausfuehren: ${nichtAusfuehrbar}\n` : '') +
        `  Erwartet danach: ${erwartung}\n` +
        '  Das ist ein Abbruch, kein Ergebnis.');
      e.name = 'WegBruch';
      e.protokoll = protokoll;
      throw e;
    }
  };
  return { schritt, protokoll };
}

/** Ein sichtbarer Knopf, dessen Beschriftung passt — als Merkmal im Browser. */
const knopfSichtbar = (muster) => new Function(`return [...document.querySelectorAll('button')]
  .some((b) => ${muster}.test(b.textContent || '') && b.getBoundingClientRect().width > 0);`);

/** Ein sichtbares Element zu einem Selektor — als Merkmal im Browser. */
const sichtbar = (sel) => new Function(`const e = document.querySelector('${sel}');
  if (!e) return false; const r = e.getBoundingClientRect();
  return getComputedStyle(e).display !== 'none' && r.width > 0 && r.height > 0;`);

module.exports = { HTML, seiteAmStart, seiteMitDepot, wegLaeufer, knopfSichtbar, sichtbar };
