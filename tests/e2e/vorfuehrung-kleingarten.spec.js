'use strict';
/* ═══════════════════════════════════════════════════════════
   Vorführung „Kleingartenverein“ im Browser (06.10.2026, Befund DEMO-QUELLEN-FEHLEN)
   ───────────────────────────────────────────────────────────
   Die Quellen liegen seit heute in tools/vorfuehrung/kleingarten/. Gebaut aus ihnen, auf dem erzeugten Produkt, in beiden
   Sprachen, am Desktop und in Handy-Breite (375 px): jede Station steht, ihre Notiz ist sichtbar und verdeckt keinen Text der
   Anwendung, und der erste Tipp gibt die Anwendung frei. Die Messung unter der Notiz ist dieselbe wie in
   vorfuehrung-karte-und-kacheln.spec.js (helpers.js · unterDerNotiz).
   ═══════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const WERKZEUG = require('../../tools/vorfuehrung-showcase-erzeugen.js');
const { unterDerNotiz } = require('./helpers.js');

const QUELLE = path.join(__dirname, '..', '..', 'tools', 'vorfuehrung', 'kleingarten');
const lesen = (d) => JSON.parse(fs.readFileSync(path.join(QUELLE, d), 'utf8'));

function demoDatei(sprache) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'vorfuehrung-kleingarten-'));
  const produktText = fs.readFileSync(require('../produkt-html-erzeugen.js').produktHtml('privat-' + sprache), 'utf8');
  const { text, nutzlast } = WERKZEUG.vorfuehrungDateiErzeugen({ sprache, produktText, daten: lesen('showcase-depot.json'), szenen: lesen('showcase-szenen.json'), dokumentOrdner: QUELLE });
  const datei = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(datei, text, 'utf8');
  return { datei, ordner, stationen: nutzlast.stationen.length };
}

for (const sprache of ['de', 'en']) {
  for (const [name, viewport] of [['Desktop', { width: 1280, height: 800 }], ['375 px', { width: 375, height: 812 }]]) {
    test('[Vorführung·Kleingarten] ' + sprache + ' · ' + name + ': jede Station mit Notiz, die keinen Text verdeckt; der erste Tipp gibt frei', async ({ browser }) => {
      const { datei, ordner, stationen } = demoDatei(sprache);
      const kontext = await browser.newContext({ viewport, hasTouch: name !== 'Desktop' });
      try {
        const seite = await kontext.newPage();
        await seite.clock.install();
        await seite.goto('file://' + datei);
        await expect(seite.locator('.vorfuehrung-notiz')).toBeVisible();
        // Uhr anhalten: nach install() läuft sie sonst in Echtzeit weiter (Wächter tests/e2e-uhr-angehalten.test.js).
        await seite.clock.pauseAt(await seite.evaluate(() => Date.now() + 50));
        const gesehen = new Set();
        for (let i = 0; i < stationen + 2; i++) {
          await expect(seite.locator('.vorfuehrung-notiz')).toBeVisible();
          const text = await seite.locator('.vorfuehrung-notiz .vorfuehrung-notiz-text').textContent();
          if (gesehen.has(text)) break;
          gesehen.add(text);
          expect(await unterDerNotiz(seite), 'Station ' + i + ': ' + text.slice(0, 40)).toEqual([]);
          await seite.clock.runFor(8100);
        }
        expect(gesehen.size, 'jede Station einmal gesehen').toBe(stationen);
        await seite.locator('#vorfuehrung-schleife').click({ position: { x: 20, y: 120 } });
        await expect(seite.locator('#vorfuehrung-schleife')).toHaveCount(0);
      } finally { await kontext.close(); fs.rmSync(ordner, { recursive: true, force: true }); }
    });
  }
}
