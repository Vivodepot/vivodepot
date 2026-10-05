'use strict';
/* Jeder fokussierbare Knopf ist sichtbar: mindestens 3:1 Kontrast zu seinem berechneten Grund (WCAG 1.4.11), hell, dunkel
   und im Hochkontrast — auf der Startkarte vor dem Depot und in der App danach (v894, Befund 03.10.2026: der Vorlese-Knopf
   der Einführung trug die Kopfzeilen-Gestalt, helle Schrift auf Weiß — unsichtbar, aber per Tab erreichbar).
   Abgelesen im Browser (tools/kontrast-messen.js knoepfeAblesen), komponiert in Node (tools/lib/kontrast.js). */
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { oeffneApp, depotAnlegen } = require('./helpers.js');

const REPO = path.join(__dirname, '..', '..');
const { knoepfeAblesen } = require(path.join(REPO, 'tools', 'kontrast-messen.js'));
const K = require(path.join(REPO, 'tools', 'lib', 'kontrast.js'));
const MODI = [[], ['dark-mode'], ['high-contrast']];
const MINDEST = 3;

async function zuSchwach(page, bereich = 'body') {
  const raus = [];
  for (const modus of MODI) {
    await page.evaluate(async (m) => {
      for (const k of ['dark-mode', 'high-contrast']) document.documentElement.classList.toggle(k, m.includes(k));
      await new Promise((r) => setTimeout(r, 60));
    }, modus);
    // Als Ausdruck übergeben wie im Kampagnen-Werkzeug — die CSP des Produkts verbietet eval im Seitenkontext.
    const knoepfe = await page.evaluate(`(${knoepfeAblesen.toString()})(${JSON.stringify(bereich)})`);
    for (const k of knoepfe) {
      const r = K.kontrast(k.farbe, k.kette);
      if (r && r.wert < MINDEST) raus.push((modus[0] || 'hell') + ' ' + k.sel + ' „' + k.label + '" ' + r.wert.toFixed(2) + ':1');
    }
  }
  await page.evaluate(() => document.documentElement.classList.remove('dark-mode', 'high-contrast'));
  return raus;
}

test('[Knopf-Kontrast] Startkarte vor dem Depot: jeder fokussierbare Knopf ≥ 3:1 zu seinem Grund, in allen drei Modi', async ({ page }) => {
  await oeffneApp(page);
  expect(await zuSchwach(page)).toEqual([]);
});

test('[Knopf-Kontrast] in der App nach dem Anlegen: jeder fokussierbare Knopf ≥ 3:1 zu seinem Grund, in allen drei Modi', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { name: 'Maria Mustermann' });
  expect(await zuSchwach(page)).toEqual([]);
});

test('[Knopf-Kontrast·Rot-Beweis] ein Knopf in Kopfzeilen-Gestalt auf der Startkarte wird gefunden', async ({ page }) => {
  await oeffneApp(page);
  await page.evaluate(() => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'a11y-btn'; b.id = 'rot-beweis-knopf'; b.textContent = 'Vorlesen';
    document.querySelector('#welcome, .welcome-kopf, main, body').appendChild(b);
  });
  const funde = await zuSchwach(page);
  expect(funde.some((f) => f.includes('#rot-beweis-knopf'))).toBe(true);
});
