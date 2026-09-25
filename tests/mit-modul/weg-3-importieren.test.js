'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   WEG 3 — Importieren, durch die Oberfläche (Stufe 1, Bürgerweg 3)
   ────────────────────────────────────────────────────────────────────────────
   `importPlan` und `importAnwenden` haben 69 Fundstellen in Tests; der Weg, auf
   dem eine Bürgerin eine Datei auswählt und die Vorschau bestätigt, keine.
   `flowImportDatei` hatte NULL Testaufrufe.

   Die Probe-Datei entsteht aus der App selbst — kein erfundenes Format, sondern
   der Rundgang, den eine Bürgerin geht: exportieren, dann wieder einlesen.

   DIE ZWEI AUFLAGEN: jeder Schritt prüft, dass er angekommen ist; der Weg lässt
   sich absichtlich rot machen, mit der erwarteten Meldung.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { konfektionieren } = require('../../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../../tools/lib/vier-produkte.js');

/* Schnitt-Nachtrag (18.09.2026): mit BUERGERMODUL_BUENDEL entfernt ist AB_WERK_BEREICH_QUELLEN
   im nativen Gerüst leer (gewollt, s. tests/e2e/global-setup.js) — der Weg gegen die rohe
   vivodepot.html prüfte ein bereichsloses Gerüst, nicht ein Produkt. Derselbe Weg wie überall
   sonst (`konfektionieren()`, synchron), Standard-Produkt privat-de wie `ladeKern()`s Default
   und `tests/e2e/helpers.js`s KERN_URL. */
const _gebacken = konfektionieren({
  ziel: fs.mkdtempSync(path.join(os.tmpdir(), 'weg3-buergerweg-')),
  slug: 'privat-de',
  modulauswahl: [],
  vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
  unsignierteModulDateien: modulDateienFuer(PRODUKTE.find((p) => p.slug === 'privat-de')),
});
const HTML = 'file://' + path.join(_gebacken.ordner, 'vivodepot.html');
const PW = 'Weg3-Bürgerweg-2026!';
const MARKER = 'Immergruen-4711';

async function seiteMitDepot(browser) {
  const seite = await browser.newPage({ viewport: { width: 390, height: 900 } });
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
  await seite.click('#w-anfangen');
  await seite.waitForTimeout(300);
  await seite.click('#tb-pw-hinweis');
  await seite.waitForTimeout(300);
  for (const [sel, wert] of [['#id-vorname', 'Marlies'], ['#id-nachname', 'Beispiel'], ['#id-pw', PW], ['#id-pw2', PW]]) {
    await seite.fill(sel, wert);
  }
  await seite.evaluate(() => {
    // U2-ADR-288-Nachtrag: 'div' entfernt, s. tests/weg-hilfen.js — sonst stoppt closest() am
    // neuen '.modal-koerper'-Wrapper, bevor es '.modal' erreicht.
    const raum = document.querySelector('#id-pw').closest('form, .modal, #overlay-inhalt, section');
    const k = [...(raum || document).querySelectorAll('button')]
      .find((b) => /anleg|einricht|erstell|speicher|weiter|fertig|ok/i.test(b.textContent || ''));
    if (k) k.click();
  });
  await seite.waitForTimeout(600);
  const drin = await seite.evaluate(() => { const e = document.querySelector('#id-pw'); return !e || e.getBoundingClientRect().width === 0; });
  assert.ok(drin, 'Vorlauf: das Depot ist eingerichtet');
  return { seite, fehler };
}

/* Die Probe-Datei entsteht ueber den KERN, nicht ueber die Seite.
   Der erste Versuch las `window.EXPORT_FORMATE` — das ist kein Global der Seite
   (wie `kernAPI` auch nicht), und `.find(...)` gab undefined zurueck.
   Achtzehnter Fall derselben Klasse an einem Tag.
   Sachlich ist der Kern-Weg ohnehin richtiger: die Datei ist EINGABE und muss
   nicht aus derselben Browser-Instanz stammen. */
async function probeDatei() {
  const { ladeKern } = require('../load-kern.js');
  const { V } = ladeKern();
  await V.depotAnlegen('Probe-Erzeugung-2026!');
  V.akteurSelbstErklaeren('Probe');
  V.sektorFeldSetzen('identity', 'givenName', 'Elisabeth');
  V.sektorFeldSetzen('identity', 'familyName', MARKER);
  const def = [...(V.EXPORT_FORMATE || [])].find((d) => d.id === 'vcard-identitaet');
  const x = def.baue(def.sektor);
  const text = typeof x === 'string' ? x : JSON.stringify(x);
  const datei = path.join(os.tmpdir(), 'vd-weg3-' + Date.now() + '.vcf');
  fs.writeFileSync(datei, text);
  return { datei, text };
}

async function wegGehen(seite, dateipfad) {
  const protokoll = [];
  const schritt = async (was, tun, merkmal, erwartung) => {
    let nichtAusfuehrbar = null;
    try { await tun(); } catch (e) { nichtAusfuehrbar = String(e.message).split('\n')[0]; }
    const da = await seite.evaluate(`(${merkmal.toString()})()`).catch(() => false);
    protokoll.push({ was, erreicht: !!da });
    if (!da) {
      const e = new Error(`WEG 3 BRICHT BEI: ${was}\n` +
        (nichtAusfuehrbar ? `  Der Schritt liess sich nicht ausfuehren: ${nichtAusfuehrbar}\n` : '') +
        `  Erwartet danach: ${erwartung}`);
      e.name = 'WegBruch';
      e.protokoll = protokoll;
      throw e;
    }
  };

  /* DER GEMESSENE WEG (28.07.2026, tools/zustand-erkunden.js --wege).
     Der Entwurf nahm an, `flowEinlesenZentral()` zeige sofort ein Datei-Feld.
     Gemessen: es öffnet einen AUSWAHL-Schirm mit zehn Knöpfen — „Ganzes Depot —
     Datei automatisch erkennen" und je einem Bereich. Felder 21→21, Datei-Felder
     NULL. Das Datei-Feld `#i-datei-auto` erscheint erst eine Stufe später.

     Zwei Schritte statt einem, und das ist keine Umständlichkeit des Tests: es
     ist der Weg, den eine Bürgerin geht. Ein Test, der die Zwischenstufe
     überspringt, prüft den Weg nicht, den es gibt. */
  await schritt('den Einlese-Weg oeffnen',
    async () => { await seite.evaluate(() => window.__vdOeffentlich.flowEinlesenZentral()); await seite.waitForTimeout(350); },
    () => [...document.querySelectorAll('button')].some((b) =>
      /automatisch erkenn/i.test(b.textContent || '') && b.getBoundingClientRect().width > 0),
    'ein Auswahl-Schirm mit „Ganzes Depot — Datei automatisch erkennen"');

  await schritt('„Ganzes Depot — Datei automatisch erkennen" waehlen',
    async () => {
      await seite.evaluate(() => {
        const k = [...document.querySelectorAll('button')]
          .find((b) => /automatisch erkenn/i.test(b.textContent || ''));
        if (!k) throw new Error('der Knopf ist fort');
        k.click();
      });
      await seite.waitForTimeout(350);
    },
    () => {
      const f = document.querySelector('#i-datei-auto');
      return !!f && f.getBoundingClientRect().width > 0;
    },
    'das Datei-Feld #i-datei-auto ist sichtbar');

  await schritt('eine Datei auswaehlen',
    async () => {
      const f = await seite.$('#i-datei-auto');
      await f.setInputFiles(dateipfad);
      await seite.waitForTimeout(200);
    },
    () => {
      const f = document.querySelector('#i-datei-auto');
      return !!f && f.files && f.files.length === 1;
    },
    'die Datei haengt am Feld');

  await schritt('die Auswahl bestaetigen und die Vorschau lesen',
    async () => {
      /* GEMESSEN: der Knopf heisst „Weiter zur Vorschau" und traegt #m-ok.
         Die Suche „irgendein Knopf mit weiter|ok|fertig" im umgebenden Kasten
         traf im Entwurf auch „Abbrechen" nicht — aber sie haette es gekonnt,
         und dann waere der Weg gruen abgebrochen statt gegangen. */
      await seite.click('#m-ok');
      await seite.waitForTimeout(700);
    },
    () => {
      // Die Vorschau nennt, WAS uebernommen wuerde — der Marker muss dastehen.
      const t = document.body.textContent || '';
      return t.indexOf('Immergruen-4711') >= 0;
    },
    'die Vorschau nennt den Wert aus der Datei');

  return protokoll;
}

test('[Weg 3] Importieren — Datei waehlen, Vorschau lesen', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  let datei = null;
  try {
    const { seite, fehler } = await seiteMitDepot(browser);
    const p = await probeDatei();
    datei = p.datei;
    assert.match(p.text, /BEGIN:VCARD/, 'die Probe-Datei kommt aus der App und ist eine vCard');
    const protokoll = await wegGehen(seite, datei);
    assert.equal(protokoll.length, 4, 'vier Schritte: oeffnen, Art waehlen, Datei waehlen, Vorschau');
    assert.ok(protokoll.every((x) => x.erreicht));
    assert.deepEqual(fehler, [], 'kein JavaScript-Fehler auf dem Weg');
  } finally {
    await browser.close();
    if (datei && fs.existsSync(datei)) fs.unlinkSync(datei);
  }
});

/* ── POSITIVKONTROLLE (§3.5b) ─────────────────────────────────────────────── */
test('[Weg 3·Positivkontrolle] ohne Datei-Feld bricht der Weg mit der erwarteten Meldung', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  let datei = null;
  try {
    const { seite } = await seiteMitDepot(browser);
    datei = (await probeDatei()).datei;
    await seite.evaluate(() => { window.__vdOeffentlich.flowEinlesenZentral = () => {}; });
    await assert.rejects(() => wegGehen(seite, datei), (e) => {
      assert.equal(e.name, 'WegBruch');
      assert.match(e.message, /WEG 3 BRICHT BEI: den Einlese-Weg oeffnen/);
      return true;
    });
  } finally {
    await browser.close();
    if (datei && fs.existsSync(datei)) fs.unlinkSync(datei);
  }
});

/* ── NEGATIVKONTROLLE (§3.5d) ─────────────────────────────────────────────── */
test('[Weg 3·Negativkontrolle] eine unbeteiligte Aenderung bricht den Weg nicht', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  let datei = null;
  try {
    const { seite } = await seiteMitDepot(browser);
    datei = (await probeDatei()).datei;
    await seite.evaluate(() => { const f = document.querySelector('.app-fuss'); if (f) f.remove(); });
    const protokoll = await wegGehen(seite, datei);
    assert.ok(protokoll.every((x) => x.erreicht), 'die Fusszeile geht den Import nichts an');
  } finally {
    await browser.close();
    if (datei && fs.existsSync(datei)) fs.unlinkSync(datei);
  }
});
