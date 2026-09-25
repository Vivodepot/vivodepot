'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Vorführungskarte mit eigenem Platz + Kachel-Icons (24.09.2026)
   ────────────────────────────────────────────────────────────────────────
   VORFUEHRUNGSKARTE-VERDECKT: die Erklärkarte der Vorführung lag halbdurchsichtig über den Kacheln. Jetzt ein Band am unteren
   Rand, die Ansicht endet darüber. Probe: in JEDER Station, Desktop und Handy-Breite, liegt unter dem Kartenrechteck kein Element
   der Anwendung (elementsFromPoint über ein Raster — das achtet auch auf Beschneiden durch den Scroll-Bereich).
   KACHEL-ICON-KLEBT: in der Eintragen-Übersicht klebte das Symbol am Titel, die Icon-Fläche griff nicht. Probe: jede Kachel —
   Icon-Fläche 32×32, das Symbol in ihrer Mitte, Abstand zum Titel mindestens 8 px.
   WebKit: die Suite fährt hier Chromium; dieselbe Messung in WebKit steht einmalig im Bericht (gleiches Ergebnis).
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const WERKZEUG = require('../../tools/vorfuehrung-showcase-erzeugen.js');
const { oeffneApp, depotAnlegen } = require('./helpers.js');

function demoDatei() {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'vorfuehrung-karte-'));
  const produktText = fs.readFileSync(require('../produkt-html-erzeugen.js').produktHtml('privat-de'), 'utf8');
  const { text } = WERKZEUG.vorfuehrungDateiErzeugen({ sprache: 'de', produktText });
  const datei = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(datei, text, 'utf8');
  return { datei, ordner };
}

async function unterDerKarte(seite) {
  return seite.evaluate(() => {
    const k = document.querySelector('#vorfuehrung-schleife .vorfuehrung-karte').getBoundingClientRect();
    const unter = new Set();
    for (let x = k.left + 2; x < k.right - 1; x += Math.max(8, (k.width - 4) / 40)) {
      for (let y = k.top + 2; y < k.bottom - 1; y += Math.max(6, (k.height - 4) / 12)) {
        for (const e of document.elementsFromPoint(x, y)) {
          if (e === document.documentElement || e === document.body || e.closest('#vorfuehrung-schleife')) continue;
          unter.add((e.id ? '#' + e.id : e.tagName.toLowerCase()) + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : ''));
        }
      }
    }
    return [...unter];
  });
}

for (const [name, viewport] of [['Desktop', { width: 1180, height: 820 }], ['Handy', { width: 390, height: 844 }]]) {
  test('[Vorführung·Karte·eigener Platz] ' + name + ': in jeder Station liegt nichts unter der Karte, und die Karte ist deckend mit Rand in der Markenfarbe', async ({ browser }) => {
    const { datei, ordner } = demoDatei();
    const kontext = await browser.newContext({ viewport, hasTouch: name === 'Handy' });
    try {
      const seite = await kontext.newPage();
      await seite.clock.install();
      await seite.goto('file://' + datei);
      await expect(seite.locator('#vorfuehrung-schleife .vorfuehrung-karte')).toBeVisible();
      const stil = await seite.evaluate(() => {
        const cs = getComputedStyle(document.querySelector('#vorfuehrung-schleife .vorfuehrung-karte'));
        const marke = getComputedStyle(document.documentElement).getPropertyValue('--salbei-dunkel').trim();
        const probe = document.createElement('span'); probe.style.color = marke; document.body.appendChild(probe);
        const markeRgb = getComputedStyle(probe).color; probe.remove();
        return { hintergrund: cs.backgroundColor, rand: cs.borderLeftColor, randBreite: parseFloat(cs.borderLeftWidth), markeRgb };
      });
      expect(stil.hintergrund).toBe('rgb(255, 255, 255)');
      expect(stil.rand).toBe(stil.markeRgb);
      expect(stil.randBreite).toBeGreaterThanOrEqual(6);
      const gesehen = new Set();
      for (let i = 0; i < 20; i++) {
        const text = await seite.locator('#vorfuehrung-schleife .vorfuehrung-karte-text').textContent();
        if (gesehen.has(text)) break;
        gesehen.add(text);
        expect(await unterDerKarte(seite), 'Station ' + i + ': ' + text.slice(0, 40)).toEqual([]);
        await seite.clock.runFor(8100);
      }
      expect(gesehen.size, 'Kontrolle: mehrere Stationen durchlaufen').toBeGreaterThan(2);
      // Die erste Berührung gibt weiterhin frei — die durchsichtige Fläche hört zu, und danach endet die Ansicht wieder am Rand.
      await seite.locator('#vorfuehrung-schleife').click({ position: { x: 20, y: 120 } });
      await expect(seite.locator('#vorfuehrung-schleife')).toHaveCount(0);
      expect(await seite.evaluate(() => document.documentElement.classList.contains('vorfuehrung-band'))).toBe(false);
    } finally { await kontext.close(); fs.rmSync(ordner, { recursive: true, force: true }); }
  });
}

test.describe('Kachel-Icons', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('[Kacheln·Icon] jede Kachel der Eintragen-Übersicht: Icon-Fläche 32×32, Symbol mittig, Abstand zum Titel mindestens 8 px', async ({ page }) => {
    await oeffneApp(page);
    await depotAnlegen(page);
    await page.click('#bt-eintragen');
    await expect(page.locator('.bereich-karte').first()).toBeVisible();
    const werte = await page.evaluate(() => [...document.querySelectorAll('.bereich-karte')].map((karte) => {
      const flaeche = karte.querySelector('.bereich-karte-icon').getBoundingClientRect();
      const svg = karte.querySelector('.bereich-karte-icon svg').getBoundingClientRect();
      const titel = karte.querySelector('.bereich-karte-titel').getBoundingClientRect();
      return {
        sektor: karte.dataset.sektor, breite: Math.round(flaeche.width), hoehe: Math.round(flaeche.height),
        versatzX: Math.abs((svg.left + svg.width / 2) - (flaeche.left + flaeche.width / 2)),
        versatzY: Math.abs((svg.top + svg.height / 2) - (flaeche.top + flaeche.height / 2)),
        abstand: Math.max(titel.left - flaeche.right, titel.top - flaeche.bottom),
      };
    }));
    expect(werte.length, 'Kontrolle: Kacheln gefunden').toBeGreaterThan(5);
    for (const w of werte) {
      expect([w.breite, w.hoehe], w.sektor).toEqual([32, 32]);
      expect(w.versatzX, w.sektor + ' waagrecht').toBeLessThanOrEqual(1);
      expect(w.versatzY, w.sektor + ' senkrecht').toBeLessThanOrEqual(1);
      expect(w.abstand, w.sektor + ' Abstand Icon–Titel').toBeGreaterThanOrEqual(8);
    }
  });
});
