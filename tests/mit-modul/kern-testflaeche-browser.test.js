'use strict';
/* Kern-Testfläche im Browser (U2-ADR-494, 09.10.2026). Das ausgelieferte Produkt hat keine window.__vdOeffentlich und läuft ohne
   Seitenfehler in die App — auch die Code-Listen, die bis zum 09.10. über die Fläche riefen, melden sich jetzt im Verschluss an
   (ein Aufruf über eine fehlende Fläche wäre ein TypeError beim Laden). Die Testfassung trägt die Fläche. Dass beide sich nur in der
   Region unterscheiden, hält tests/kern-testflaeche.test.js byteweise. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { konfektionieren } = require('../../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../../tools/lib/vier-produkte.js');

function bauen(slug, extra = {}) {
  const gebacken = konfektionieren(Object.assign({
    ziel: fs.mkdtempSync(path.join(os.tmpdir(), 'kern-testflaeche-browser-')),
    slug,
    modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien: modulDateienFuer(PRODUKTE.find((p) => p.slug === slug)),
  }, extra));
  return { datei: path.join(gebacken.ordner, 'vivodepot.html'), ordner: gebacken.ordner };
}
const aufraeumen = (ordner) => fs.rmSync(ordner, { recursive: true, force: true });

async function flaecheImBrowser(url) {
  const browser = await chromium.launch(require('../../tools/lib/netz-sperre.js').mitSperre());
  try {
    const seite = await browser.newPage();
    const fehler = [];
    seite.on('pageerror', (e) => fehler.push(String(e.message)));
    await seite.goto(url);
    await seite.waitForSelector('#w-anfangen', { timeout: 15000 });
    await seite.click('#w-anfangen');
    await seite.waitForTimeout(1200);
    const art = await seite.evaluate(() => typeof window.__vdOeffentlich);
    return { art, fehler };
  } finally { await browser.close(); }
}

// Im öffentlichen Zuschnitt nur die baubaren Produkte (tools/lib/vier-produkte.js, PRODUKTE); im Kanon beide.
for (const slug of ['privat-de', 'pro-en'].filter((s) => PRODUKTE.some((p) => p.slug === s))) {
  test(`[Kern-Testfläche·Browser] ${slug}: das ausgelieferte Produkt hat keine Fläche und läuft ohne Seitenfehler in die App`, async () => {
    const { datei, ordner } = bauen(slug);
    try {
      const b = await flaecheImBrowser('file://' + datei);
      assert.equal(b.art, 'undefined', 'window.__vdOeffentlich fehlt im Produkt');
      assert.deepEqual(b.fehler, [], 'keine Seitenfehler — die Code-Listen melden sich ohne Fläche an');
    } finally { aufraeumen(ordner); }
  });
}

test('[Kern-Testfläche·Positivkontrolle·Browser] die Testfassung (mitTestflaeche) trägt die Fläche', async () => {
  const { datei, ordner } = bauen('privat-de', { mitTestflaeche: true });
  try {
    const b = await flaecheImBrowser('file://' + datei);
    assert.equal(b.art, 'object');
    assert.deepEqual(b.fehler, []);
  } finally { aufraeumen(ordner); }
});
