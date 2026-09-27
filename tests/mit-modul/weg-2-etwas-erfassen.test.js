'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   WEG 2 — Etwas erfassen, durch die Oberfläche (Stufe 1, Bürgerweg 2)
   ────────────────────────────────────────────────────────────────────────────
   Was Weg 1 für das Anlegen tut, tut dieser für das Eintragen: klicken, tippen,
   und lesen, was danach dasteht. Geprüft war bisher nur die Wirkung auf die
   Daten — `sektorFeldSetzen` hat 358 Fundstellen in Tests, das Tippen keine.

   BESONDERHEIT, gemessen: die Eingabefelder tragen `data-edit` statt `id` (der
   Renderer setzt dafür `aria-label`). Wer sie über `id` sucht, findet nichts —
   und meldet dann eine leere Sicht statt eines Formulars.

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
   vivodepot.html prüfte ein bereichsloses Gerüst, nicht ein Produkt: kein Bereich, kein Feld zum
   Erfassen. Derselbe Weg wie überall sonst (`konfektionieren()`, synchron), Standard-Produkt
   privat-de wie `ladeKern()`s Default und `tests/e2e/helpers.js`s KERN_URL. */
const _gebacken = konfektionieren({
  ziel: fs.mkdtempSync(path.join(os.tmpdir(), 'weg2-buergerweg-')),
  slug: 'privat-de',
  modulauswahl: [],
  vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
  unsignierteModulDateien: modulDateienFuer(PRODUKTE.find((p) => p.slug === 'privat-de')),
});
const HTML = 'file://' + path.join(_gebacken.ordner, 'vivodepot.html');
const PW = 'Weg2-Bürgerweg-2026!';
const PROBE = 'Marlies-Probe-4711';

async function seiteOeffnen(browser) {
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
  return { seite, fehler };
}

/* Depot einrichten — der Vorlauf, den Weg 1 als eigenen Weg prüft. */
async function eingerichtet(seite) {
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
  return seite.evaluate(() => { const e = document.querySelector('#id-pw'); return !e || e.getBoundingClientRect().width === 0; });
}

async function wegGehen(seite, { probe = PROBE } = {}) {
  const protokoll = [];
  const schritt = async (was, tun, merkmal, erwartung) => {
    let nichtAusfuehrbar = null;
    try { await tun(); } catch (e) { nichtAusfuehrbar = String(e.message).split('\n')[0]; }
    const da = await seite.evaluate(`(${merkmal.toString()})()`).catch(() => false);
    protokoll.push({ was, erreicht: !!da });
    if (!da) {
      const e = new Error(
        `WEG 2 BRICHT BEI: ${was}\n` +
        (nichtAusfuehrbar ? `  Der Schritt liess sich nicht ausfuehren: ${nichtAusfuehrbar}\n` : '') +
        `  Erwartet danach: ${erwartung}`);
      e.name = 'WegBruch';
      e.protokoll = protokoll;
      throw e;
    }
  };

  await schritt('einen Bereich oeffnen',
    async () => { await seite.evaluate(() => window.__vdOeffentlich.oeffneSektor('identity')); await seite.waitForTimeout(150); },
    () => {
      const sicht = (e) => e.getBoundingClientRect().width > 0;
      return [...document.querySelectorAll('#content input, #content textarea')].filter(sicht).length > 0;
    },
    'im Inhalt sind Eingabefelder sichtbar');

  await schritt('in das erste Feld tippen',
    async () => {
      await seite.evaluate((wert) => {
        const sicht = (e) => e.getBoundingClientRect().width > 0;
        const f = [...document.querySelectorAll('#content input[type=text], #content input:not([type])')].filter(sicht)[0];
        if (!f) throw new Error('kein Textfeld gefunden');
        f.focus();
        f.value = wert;
        f.dispatchEvent(new Event('input', { bubbles: true }));
        f.dispatchEvent(new Event('change', { bubbles: true }));
        f.blur();
        window.__weg2Feld = f.getAttribute('data-edit') || f.id || null;
      }, probe);
      await seite.waitForTimeout(300);
    },
    () => {
      const sicht = (e) => e.getBoundingClientRect().width > 0;
      return [...document.querySelectorAll('#content input')].filter(sicht)
        .some((e) => e.value && e.value.indexOf('Probe-4711') >= 0);
    },
    'der getippte Wert steht im Feld');

  await schritt('der Wert ueberlebt ein Neu-Rendern',
    async () => {
      /* DER NACHWEIS, dass es im MODELL steht, nicht nur im Eingabefeld:
         weg vom Bereich und zurueck. Die Felder werden dabei neu aus dem Modell
         gezeichnet — was danach noch dasteht, ist angekommen.
         (Der erste Versuch las `kernAPI.data()`; das ist KEIN Global der Seite
         und hat darum nichts gemessen. Siebzehnter Fall an einem Tag.) */
      await seite.evaluate(() => window.__vdOeffentlich.oeffneSektor('health'));
      await seite.waitForTimeout(150);
      await seite.evaluate(() => window.__vdOeffentlich.oeffneSektor('identity'));
      await seite.waitForTimeout(200);
    },
    () => {
      const sicht = (e) => e.getBoundingClientRect().width > 0;
      return [...document.querySelectorAll('#content input')].filter(sicht)
        .some((e) => e.value && e.value.indexOf('Probe-4711') >= 0);
    },
    'der Wert steht nach dem Neu-Zeichnen wieder im Feld — er kam also aus dem Modell');

  return protokoll;
}

test('[Weg 2] Etwas erfassen — tippen, und der Wert kommt an', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const { seite, fehler } = await seiteOeffnen(browser);
    assert.ok(await eingerichtet(seite), 'Vorlauf: das Depot ist eingerichtet');
    const protokoll = await wegGehen(seite);
    assert.equal(protokoll.length, 3, 'alle drei Schritte durchlaufen');
    assert.ok(protokoll.every((p) => p.erreicht), 'jeder Schritt ist angekommen');
    assert.deepEqual(fehler, [], 'kein JavaScript-Fehler auf dem Weg');
  } finally { await browser.close(); }
});

/* ── POSITIVKONTROLLE (§3.5b) ─────────────────────────────────────────────── */
test('[Weg 2·Positivkontrolle] ohne Eingabefelder bricht der Weg mit der erwarteten Meldung', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const { seite } = await seiteOeffnen(browser);
    assert.ok(await eingerichtet(seite));
    // Genau der Zustand, der eine leere Messung erzeugt: Felder weg.
    // oeffneSektor unbrauchbar machen: dann findet Schritt 1 keine Felder.
    await seite.evaluate(() => { window.__vdOeffentlich.oeffneSektor = () => {}; document.querySelectorAll('#content input, #content textarea').forEach((e) => e.remove()); });
    await assert.rejects(() => wegGehen(seite), (e) => {
      assert.equal(e.name, 'WegBruch');
      assert.match(e.message, /WEG 2 BRICHT BEI: einen Bereich oeffnen/);
      return true;
    });
  } finally { await browser.close(); }
});

/* ── NEGATIVKONTROLLE (§3.5d) ─────────────────────────────────────────────── */
test('[Weg 2·Negativkontrolle] das Entfernen eines unbeteiligten Elements bricht nichts', async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const { seite } = await seiteOeffnen(browser);
    assert.ok(await eingerichtet(seite));
    await seite.evaluate(() => { const f = document.querySelector('.app-fuss'); if (f) f.remove(); });
    const protokoll = await wegGehen(seite);
    assert.ok(protokoll.every((p) => p.erreicht), 'die Fusszeile geht das Erfassen nichts an');
  } finally { await browser.close(); }
});
