'use strict';
/* Befund BESTAND-AUSWAHL-PRO-LEER (HOCH, 04.11.2026): in Pro öffnete der sichtbare Link „Was hier hineingehört“ einen Dialog, der nur
   die Frage „Was möchten Sie hinterlegen?“ trug — Pro hat keine Lebenslagen, der Weg brach ab.
   Geprüft wird die ganze Klasse: in keinem der vier Produkte öffnet ein sichtbarer Link einen Dialog ohne Inhalt. Die Probe legt je
   Produkt ein Depot an, geht jeden Eintrag der Seitenleiste durch (außer „Depot verlassen“), nimmt den Eintrag selbst und jeden
   sichtbaren Link im Inhalt (.btn-dezent, .btn-text, a[href="#"]) und misst den Dialog, der sich öffnet.
   Ohne Inhalt heißt: der Körper hat kein Bedienelement und besteht nur aus Einleitungsabsätzen (p.sektor-intro).
   Rot-Beweis am alten Kern: DIALOG_PROBE_KERN=<Pfad zu einem Kern> lenkt nur diese Probe um (sie bäckt selbst, ohne ladeKern). */
const test = require('../helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { testProduktText } = require('../produkt-test-backen.js');
const { oeffneApp, depotAnlegen } = require('../e2e/helpers.js');

const REPO = path.join(__dirname, '..', '..');
const PRODUKTE = ['privat-de', 'privat-en', 'pro-de', 'pro-en'];
const LINKS = '#content button.btn-dezent, #content button.btn-text, #content a[href="#"]';

/* Läuft im Browser (als Text übergeben) und im Rot-Beweis hier: misst den Körper eines Dialogs. */
function koerperMessen(k) {
  if (!k) return { leer: true, bedien: 0, kinder: [] };
  const bedien = k.querySelectorAll('button, input, select, textarea, a[href], details, [role=button]').length;
  const kinder = Array.from(k.children).map((c) => c.tagName.toLowerCase() + (c.classList && c.classList.length ? '.' + c.classList[0] : ''));
  const nurEinleitung = kinder.every((c) => c === 'p.sektor-intro');
  return { leer: bedien === 0 && nurEinleitung, bedien, kinder };
}

async function dialogMessen(page) {
  return page.evaluate((quelle) => {
    const messen = new Function('return (' + quelle + ')')();
    const host = document.getElementById('modal-rueck');
    if (!host || !host.classList.contains('an')) return null;
    return Object.assign({ titel: (document.getElementById('modal-titel') || {}).textContent || '' }, messen(document.querySelector('#modal-inhalt .modal-koerper')));
  }, koerperMessen.toString());
}

async function dialogSchliessen(page) {
  await page.evaluate(() => {
    const host = document.getElementById('modal-rueck');
    if (!host || !host.classList.contains('an')) return;
    const k = document.getElementById('m-abbr') || document.getElementById('m-ok');
    if (k) k.click();
  });
  await page.waitForTimeout(150);
}

async function produktPruefen(browser, slug, ordner) {
  const datei = path.join(ordner, slug + '.html');
  fs.writeFileSync(datei, testProduktText(fs.readFileSync(process.env.DIALOG_PROBE_KERN || path.join(REPO, 'vivodepot.html'), 'utf8'), { slug, entwicklerleiste: false }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const funde = []; let geprueft = 0;
  try {
    await oeffneApp(page, { url: 'file://' + datei });
    await depotAnlegen(page, { pw: 'e2e-passwort-123' });
    // Einträge der Leiste über ihr data-Attribut; „Anlass“ verlässt die Sitzungsansicht und kommt darum zuletzt.
    const eintraege = await page.evaluate(() => {
      document.querySelectorAll('#sidebar details').forEach((d) => { d.open = true; });
      const wahl = [...document.querySelectorAll('#sidebar [data-sektor], #sidebar button, #sidebar a')].filter((e) => e.checkVisibility())
        .map((e) => { const a = [...e.attributes].find((x) => x.name.startsWith('data-')); return a ? '[' + a.name + '="' + a.value + '"]' : null; })
        .filter((w) => w && !w.startsWith('[data-verlassen'));
      return [...new Set(wahl)].sort((x, y) => (x.startsWith('[data-anlass') ? 1 : 0) - (y.startsWith('[data-anlass') ? 1 : 0));
    });
    for (const eintrag of eintraege) {
      const oeffnen = async () => {
        await dialogSchliessen(page);
        await page.evaluate((w) => { document.querySelectorAll('#sidebar details').forEach((d) => { d.open = true; }); const e = document.querySelector('#sidebar ' + w); if (e) e.click(); }, eintrag);
        await page.waitForTimeout(400);
      };
      await oeffnen();
      const vomEintrag = await dialogMessen(page);
      geprueft++;
      if (vomEintrag && vomEintrag.leer) funde.push(slug + ' Leiste ' + eintrag + ' → „' + vomEintrag.titel + '“');
      await dialogSchliessen(page);
      const n = await page.evaluate((s) => [...document.querySelectorAll(s)].filter((b) => b.checkVisibility()).length, LINKS);
      for (let i = 0; i < n; i++) {
        await oeffnen();
        await dialogSchliessen(page);
        const name = await page.evaluate(({ s, i }) => {
          const b = [...document.querySelectorAll(s)].filter((x) => x.checkVisibility())[i];
          if (!b) return null;
          b.click();
          return (b.id || b.className) + ' „' + b.textContent.trim().slice(0, 40) + '“';
        }, { s: LINKS, i });
        if (!name) continue;
        await page.waitForTimeout(250);
        const d = await dialogMessen(page);
        geprueft++;
        if (d && d.leer) funde.push(slug + ' ' + eintrag + ' Link ' + name + ' → „' + d.titel + '“');
      }
    }
  } finally { await page.close(); }
  return { funde, geprueft };
}

test('[Dialog·ohne Inhalt·Browser] in keinem der vier Produkte öffnet ein sichtbarer Link einen Dialog ohne Inhalt', { timeout: 900000 }, async () => {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'dialog-ohne-inhalt-browser-'));
  const browser = await chromium.launch(require('../../tools/lib/netz-sperre.js').mitSperre());
  try {
    const alle = [];
    for (const slug of PRODUKTE) {
      const { funde, geprueft } = await produktPruefen(browser, slug, ordner);
      assert.ok(geprueft >= 10, slug + ': zu wenig geprüft (' + geprueft + ') — die Probe muss Einträge und Links finden');
      alle.push(...funde);
    }
    assert.deepEqual(alle, []);
  } finally {
    await browser.close();
    fs.rmSync(ordner, { recursive: true, force: true });
  }
});

test('[Dialog·ohne Inhalt·Rot-Beweis] der Körper des Pro-Dialogs vor dem Fix gilt als leer, ein Körper mit Auswahl nicht', async () => {
  const browser = await chromium.launch(require('../../tools/lib/netz-sperre.js').mitSperre());
  try {
    const page = await browser.newPage();
    const r = await page.evaluate((quelle) => {
      const messen = new Function('return (' + quelle + ')')();
      const k = (html) => { const d = document.createElement('div'); d.className = 'modal-koerper'; d.innerHTML = html; return messen(d); };
      return {
        vorDemFix: k('<p class="sektor-intro">Was möchten Sie hinterlegen?</p>'),
        mitAuswahl: k('<p class="sektor-intro">Was möchten Sie hinterlegen?</p><div class="klasse-titel">Gruppe</div><div class="lage-grid"><button class="anlass">Lage</button></div>'),
        hinweis: k('<p class="einst-hint">Ein Satz, der etwas sagt.</p>'),
      };
    }, koerperMessen.toString());
    assert.equal(r.vorDemFix.leer, true, 'nur die Frage: leer');
    assert.equal(r.mitAuswahl.leer, false, 'mit Auswahl: nicht leer');
    assert.equal(r.hinweis.leer, false, 'ein Hinweistext ist Inhalt');
  } finally { await browser.close(); }
});

test('[Dialog·ohne Inhalt·Kern] der Link zur Bestandsauswahl hängt an bestandsAuswahlHatLagen, der Dialog selbst auch', () => {
  const kern = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
  assert.match(kern, /\(bestandsAuswahlHatLagen\(\) \? '<p class="sektor-intro"><button class="btn-dezent" id="mappe-bestand-link">/);
  assert.match(kern, /function flowBestandDialog\(\) \{\n  if \(!bestandsAuswahlHatLagen\(\)\) return;/);
});
