'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { konfektionieren } = require('../../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../../tools/lib/vier-produkte.js');

const KERN = path.join(__dirname, '..', '..', 'vivodepot.html');

function bauen(slug, extra = {}) {
  const gebacken = konfektionieren(Object.assign({
    ziel: fs.mkdtempSync(path.join(os.tmpdir(), 'entwicklerleiste-browser-')),
    slug,
    modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien: modulDateienFuer(PRODUKTE.find((p) => p.slug === slug)),
  }, extra));
  return { datei: path.join(gebacken.ordner, 'vivodepot.html'), ordner: gebacken.ordner };
}
const aufraeumen = (ordner) => fs.rmSync(ordner, { recursive: true, force: true });

async function leisteImBrowser(url, { anfangen }) {
  const browser = await chromium.launch();
  try {
    const seite = await browser.newPage();
    const fehler = [];
    seite.on('pageerror', (e) => fehler.push(String(e.message)));
    await seite.goto(url);
    await seite.waitForSelector('#w-anfangen', { timeout: 15000 });
    if (anfangen) { await seite.click('#w-anfangen'); await seite.waitForTimeout(1200); }
    const b = await seite.evaluate(() => {
      const l = document.querySelector('.dev-leiste');
      return { leiste: !!l, select: !!document.getElementById('tb-modus-select'), anzeige: l ? getComputedStyle(l).display : null, inline: l ? l.style.display : null };
    });
    return Object.assign(b, { fehler });
  } finally { await browser.close(); }
}

test('[Entwicklerleiste·Rot-Beweis·Browser] privat-de mit ?dev=1: keine Leiste, und der Weg in die App wirft nicht', async () => {
  const { datei, ordner } = bauen('privat-de');
  try {
    const b = await leisteImBrowser('file://' + datei + '?dev=1', { anfangen: true });
    assert.equal(b.leiste, false, 'kein .dev-leiste-Element');
    assert.equal(b.select, false, 'kein #tb-modus-select');
    assert.deepEqual(b.fehler, [], 'keine Seitenfehler, auch nicht beim Rendern der Kopfzeile');
  } finally { aufraeumen(ordner); }
});

test('[Entwicklerleiste·Positivkontrolle·Browser] Test-Back mit ?dev=1 zeigt die Leiste', async () => {
  const { datei, ordner } = bauen('privat-de', { mitEntwicklerleiste: true });
  try {
    const b = await leisteImBrowser('file://' + datei + '?dev=1', { anfangen: false });
    assert.equal(b.inline, 'inline-flex', 'die ?dev=1-Weiche hat die Leiste eingeblendet');
    assert.notEqual(b.anzeige, 'none', 'berechnet sichtbar (in der Flex-Kopfzeile wird inline-flex zu flex)');
    assert.deepEqual(b.fehler, []);
  } finally { aufraeumen(ordner); }
});

test('[Entwicklerleiste·Positivkontrolle·Browser] der Kern mit ?dev=1 zeigt die Leiste', async () => {
  const b = await leisteImBrowser('file://' + KERN + '?dev=1', { anfangen: false });
  assert.equal(b.inline, 'inline-flex', 'die ?dev=1-Weiche hat die Leiste eingeblendet');
  assert.notEqual(b.anzeige, 'none');
});
