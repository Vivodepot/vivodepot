'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Vorführungskarte mit eigenem Platz + Kachel-Icons (24.09.2026)
   ────────────────────────────────────────────────────────────────────────
   VORFUEHRUNGSKARTE-VERDECKT: die Erklärkarte der Vorführung lag halbdurchsichtig über den Kacheln. Jetzt ein Band am unteren
   Rand, die Ansicht endet darüber. Probe: in JEDER Station, Desktop und Handy-Breite, liegt unter dem Kartenrechteck kein Element
   der Anwendung (elementsFromPoint über ein Raster — das achtet auch auf Beschneiden durch den Scroll-Bereich).
   KACHEL-ICON-KLEBT: in der Eintragen-Übersicht klebte das Symbol am Titel, die Icon-Fläche griff nicht. Probe: jede Kachel —
   Icon-Fläche 32×32, das Symbol in ihrer Mitte, Abstand zum Titel mindestens 8 px.
   NOTIZ (30.09.2026, Abnahme der Demo „Patientin“): das Band ist ersetzt durch eine kleine Notiz, angeheftet an die Ecke des
   Elements, von dem sie spricht. Probe: in JEDER Station, Desktop und Handy, liegt kein Text der Anwendung unter der Notiz
   (Textrechtecke aller Textknoten gegen das Notizrechteck — misst das, worauf es ankommt: nichts Lesbares ist verdeckt), die
   Notiz ist gelb, trägt einen Screenreader-Namen und keine Überschrift, und der erste Tipp gibt die Anwendung frei.
   WebKit: die Suite fährt hier Chromium; dieselbe Messung in WebKit steht einmalig im Bericht (gleiches Ergebnis).
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const WERKZEUG = require('../../tools/vorfuehrung-showcase-erzeugen.js');
const { oeffneApp, depotAnlegen, unterDerNotiz } = require('./helpers.js');

function demoDatei() {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'vorfuehrung-karte-'));
  const produktText = fs.readFileSync(require('../produkt-html-erzeugen.js').produktHtml('privat-de'), 'utf8');
  const { text } = WERKZEUG.vorfuehrungDateiErzeugen({ sprache: 'de', produktText });
  const datei = path.join(ordner, 'vivodepot.html');
  fs.writeFileSync(datei, text, 'utf8');
  return { datei, ordner };
}

for (const [name, viewport] of [['Desktop', { width: 1180, height: 820 }], ['Handy', { width: 390, height: 844 }]]) {
  test('[Vorführung·Notiz] ' + name + ': in jeder Station verdeckt die Notiz keinen Text, sie ist gelb, benannt und ohne Überschrift', async ({ browser }) => {
    const { datei, ordner } = demoDatei();
    const kontext = await browser.newContext({ viewport, hasTouch: name === 'Handy' });
    try {
      const seite = await kontext.newPage();
      await seite.clock.install();
      await seite.goto('file://' + datei);
      await expect(seite.locator('.vorfuehrung-notiz')).toBeVisible();
      const stil = await seite.evaluate(() => {
        const n = document.querySelector('.vorfuehrung-notiz');
        return { hintergrund: getComputedStyle(n).backgroundColor, name: n.getAttribute('aria-label'), rolle: n.getAttribute('role'), text: n.textContent };
      });
      expect(stil.hintergrund).toBe('rgb(255, 243, 166)');
      expect(stil.rolle).toBe('note');
      expect(stil.name).toBe('Erklärung');
      expect(stil.text).not.toMatch(/Vorführung/);
      const gesehen = new Set();
      for (let i = 0; i < 20; i++) {
        await expect(seite.locator('.vorfuehrung-notiz')).toBeVisible();
        const text = await seite.locator('.vorfuehrung-notiz .vorfuehrung-notiz-text').textContent();
        if (gesehen.has(text)) break;
        gesehen.add(text);
        expect(await unterDerNotiz(seite), 'Station ' + i + ': ' + text.slice(0, 40)).toEqual([]);
        await seite.clock.runFor(8100);
      }
      expect(gesehen.size, 'Kontrolle: mehrere Stationen durchlaufen').toBeGreaterThan(2);
      // Die erste Berührung gibt frei; Notiz und der für sie geschaffene Platz gehen mit.
      await seite.locator('#vorfuehrung-schleife').click({ position: { x: 20, y: 120 } });
      await expect(seite.locator('#vorfuehrung-schleife')).toHaveCount(0);
      await expect(seite.locator('.vorfuehrung-notiz')).toHaveCount(0);
      expect(await seite.evaluate(() => document.querySelectorAll('[data-vorfuehrung-rand], [data-vorfuehrung-ausrichtung]').length)).toBe(0);
    } finally { await kontext.close(); fs.rmSync(ordner, { recursive: true, force: true }); }
  });
}

// Rot-Beweis der Messung: eine Notiz, die über Text gelegt wird, fällt auf.
test('[Vorführung·Notiz·Rot-Beweis] eine über Text geschobene Notiz wird als Verdeckung gefunden', async ({ browser }) => {
  const { datei, ordner } = demoDatei();
  const kontext = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  try {
    const seite = await kontext.newPage();
    await seite.clock.install();
    await seite.goto('file://' + datei);
    await expect(seite.locator('.vorfuehrung-notiz')).toBeVisible();
    await seite.evaluate(() => {
      const n = document.querySelector('.vorfuehrung-notiz');
      const ziel = [...document.querySelectorAll('#content h1, #content h2, #content .bereich-karte-titel')].find((e) => e.getBoundingClientRect().width > 0);
      const r = ziel.getBoundingClientRect();
      Object.assign(n.style, { position: 'fixed', top: r.top + 'px', left: r.left + 'px', transform: 'none' });
    });
    expect((await unterDerNotiz(seite)).length).toBeGreaterThan(0);
  } finally { await kontext.close(); fs.rmSync(ordner, { recursive: true, force: true }); }
});

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
