'use strict';
/* Befund E2E-ARTEFAKT (interner Befund vom 23.09.2026): die Region der Entwicklerleiste ist träge,
   solange niemand klickt — gleicher Produktzustand wie im ausgelieferten Produkt. Die Byte-Probe dazu steht in
   tests/e2e-artefakt-gleich-auslieferung.test.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { konfektionieren } = require('../../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../../tools/lib/vier-produkte.js');
const { ladeIssuer } = require('../load-issuer.js');
const { testProduktText } = require('../produkt-test-backen.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', '..', 'vivodepot.html'), 'utf8');

function ausgeliefert(slug) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-artefakt-'));
  const gebaut = konfektionieren({
    ziel: ordner, slug, modulauswahl: [],
    vorDepotKonfigurationInhaltFn: ladeIssuer().V.vorDepotKonfigurationDateiInhalt,
    unsignierteModulDateien: modulDateienFuer(PRODUKTE.find((p) => p.slug === slug)),
  });
  return { datei: path.join(gebaut.ordner, 'vivodepot.html'), ordner };
}

async function zustand(browser, url, { anfangen }) {
  const seite = await browser.newPage();
  const fehler = [];
  seite.on('pageerror', (e) => fehler.push(String(e.message)));
  await seite.goto(url);
  await seite.waitForSelector('#w-anfangen', { timeout: 15000 });
  if (anfangen) { await seite.click('#w-anfangen'); await seite.waitForTimeout(1200); }
  const z = await seite.evaluate(() => {
    const kopie = document.body.cloneNode(true);
    const kommentare = document.createTreeWalker(kopie, NodeFilter.SHOW_COMMENT);
    const anfaenge = [];
    for (let k = kommentare.nextNode(); k; k = kommentare.nextNode()) if (k.data.trim() === 'ENTWICKLERLEISTE:BEGIN') anfaenge.push(k);
    for (const anfang of anfaenge) {
      let n = anfang;
      while (n) { const weiter = n.nextSibling; const ende = n.nodeType === 8 && n.data.trim() === 'ENTWICKLERLEISTE:END'; n.remove(); if (ende) break; n = weiter; }
    }
    kopie.querySelectorAll('script, style').forEach((n) => n.remove());
    const speicher = (s) => { const o = {}; for (let i = 0; i < s.length; i++) { const k = s.key(i); o[k] = s.getItem(k); } return o; };
    return {
      dom: kopie.outerHTML,
      lokal: speicher(localStorage), sitzung: speicher(sessionStorage),
      globale: Object.getOwnPropertyNames(window).sort(),
      htmlKlassen: document.documentElement.className, lang: document.documentElement.lang,
    };
  });
  await seite.close();
  return Object.assign(z, { fehler });
}

test('[E2E-Artefakt·Träge·Gegenprobe] ohne Klick auf die Leiste: derselbe Produktzustand wie im ausgelieferten Produkt', async () => {
  const { datei, ordner } = ausgeliefert('privat-de');
  const testDatei = path.join(ordner, 'test-artefakt.html');
  fs.writeFileSync(testDatei, testProduktText(KERN, { slug: 'privat-de' }));
  const browser = await chromium.launch();
  try {
    for (const anfangen of [false, true]) {
      const a = await zustand(browser, 'file://' + datei, { anfangen });
      const a2 = await zustand(browser, 'file://' + datei, { anfangen });
      assert.deepEqual(a2, a, 'Kontrolle: zwei Läufe desselben Produkts sind gleich (sonst misst der Vergleich Rauschen)');
      const t = await zustand(browser, 'file://' + testDatei, { anfangen });
      assert.deepEqual(t, a, (anfangen ? 'nach „Hier anfangen"' : 'am Startschirm') + ': Test-Artefakt weicht im Produktzustand ab');
    }
  } finally {
    await browser.close();
    fs.rmSync(ordner, { recursive: true, force: true });
  }
});
