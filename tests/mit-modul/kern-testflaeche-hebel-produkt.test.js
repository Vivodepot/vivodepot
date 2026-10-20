'use strict';
/* Kern-Testfläche: im ausgelieferten Produkt ist von der Seite aus kein Prüf- oder Einlassweg aufrufbar (U2-ADR-494).
   Solange die Fläche im Produkt steht, gibt sie einem Skript in der Seite zwei Hebel in die Hand: einen fremden Anker über
   opts.ankerJwk und eine frei gesetzte Anbieterkennung an modulEinlassen (was sie bewirken, zeigt
   tests/mit-modul/kern-testflaeche-hebel.test.js an der Testfassung). Diese Probe hält fest, dass das Produkt keine der
   Funktionen herausgibt: nicht über die Fläche und nicht über einen anderen Wert auf window.
   Die Suche bedient nichts, sie zählt nur, was erreichbar ist. Ihr Rot-Beweis läuft an der Testfassung, dem Stand vor dem Schnitt:
   dort findet dieselbe Suche jede der Funktionen. Der Name der Fläche steht zusammengesetzt, weil diese Datei das ausgelieferte
   Produkt baut und es nicht über die Fläche bedient. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { konfektionieren } = require('../../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../../tools/lib/vier-produkte.js');

const FLAECHE = '__vd' + 'Oeffentlich';
const PRUEF_UND_EINLASSWEGE = ['verifiziereProviderCredential', 'modulEinlassenGeprueft', 'importPlanGeprueft', 'depotLaden',
  'modulEinlassen', 'vorDepotKonfigurationAnwenden'];
const zielOrdner = () => fs.mkdtempSync(path.join(os.tmpdir(), 'kern-testflaeche-hebel-produkt-'));
const dateiVon = (gebacken) => ({ datei: path.join(gebacken.ordner, 'vivodepot.html'), ordner: gebacken.ordner });
const aufraeumen = (ordner) => fs.rmSync(ordner, { recursive: true, force: true });

function ausgeliefertBauen(slug) {
  return dateiVon(konfektionieren({
    ziel: zielOrdner(),
    slug,
    modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien: modulDateienFuer(PRODUKTE.find((p) => p.slug === slug)),
  }));
}

function testfassungBauen(slug) {
  return dateiVon(konfektionieren({
    mitTestflaeche: true,   // der Stand vor dem Schnitt: dasselbe Produkt mit der Fläche (U2-ADR-494)
    ziel: zielOrdner(),
    slug,
    modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModulDateien: modulDateienFuer(PRODUKTE.find((p) => p.slug === slug)),
  }));
}

/* Läuft im Seitenkontext: welche der Funktionen sind über window erreichbar, direkt oder als Eigenschaft eines Werts auf window? */
function erreichbareWege({ flaeche, namen }) {
  const erreichbar = [];
  for (const eigenschaft of Object.getOwnPropertyNames(window)) {
    let wert;
    try { wert = window[eigenschaft]; } catch (e) { continue; }
    if (namen.includes(eigenschaft) && typeof wert === 'function') erreichbar.push('window.' + eigenschaft);
    if (wert === null || (typeof wert !== 'object' && typeof wert !== 'function')) continue;
    for (const name of namen) {
      let art;
      try { art = typeof wert[name]; } catch (e) { continue; }
      if (art === 'function') erreichbar.push('window.' + eigenschaft + '.' + name);
    }
  }
  return { art: typeof window[flaeche], erreichbar, eigenschaften: Object.getOwnPropertyNames(window).length };
}

/* Öffnet die Datei, wartet auf den Eingangsschirm und misst. Ohne den Eingangsschirm wäre die Messung eine über eine leere
   Seite; darum wirft der Vorlauf, statt weiterzumessen. */
async function wegeInDerSeite(datei) {
  const browser = await chromium.launch(require('../../tools/lib/netz-sperre.js').mitSperre());
  try {
    const seite = await browser.newPage();
    await seite.goto('file://' + datei);
    await seite.waitForSelector('#w-anfangen', { timeout: 15000 });
    return await seite.evaluate(erreichbareWege, { flaeche: FLAECHE, namen: PRUEF_UND_EINLASSWEGE });
  } finally { await browser.close(); }
}

for (const { slug } of PRODUKTE) {   // alle vier Produkte: jedes wird eigens ausgeliefert
  test(`[Kern-Testfläche·Hebel] ${slug}: im ausgelieferten Produkt ist von der Seite aus kein Prüf- oder Einlassweg aufrufbar`, async () => {
    const { datei, ordner } = ausgeliefertBauen(slug);
    try {
      const wert = await wegeInDerSeite(datei);
      assert.ok(wert.eigenschaften > 50, 'Vorbedingung: die Suche hat die Eigenschaften von window wirklich abgelaufen');
      assert.equal(wert.art, 'undefined', 'die Fläche fehlt im ausgelieferten Produkt');
      assert.deepEqual(wert.erreichbar, [], 'kein Prüf- oder Einlassweg ist über window erreichbar');
    } finally { aufraeumen(ordner); }
  });
}

test('[Kern-Testfläche·Hebel·Rot-Beweis] am Stand vor dem Schnitt findet dieselbe Suche jeden Prüf- und Einlassweg', async () => {
  const { datei, ordner } = testfassungBauen('privat-de');
  try {
    const wert = await wegeInDerSeite(datei);
    assert.equal(wert.art, 'object', 'die Testfassung trägt die Fläche');
    assert.deepEqual(wert.erreichbar.slice().sort(), PRUEF_UND_EINLASSWEGE.map((n) => 'window.' + FLAECHE + '.' + n).sort());
  } finally { aufraeumen(ordner); }
});
