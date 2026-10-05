'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Klartext-Bindung: ein Feldname aus der Datei erscheint in der Warnung als Text, nicht als Element
   (U2-ADR-156-Nachtrag Klartext-Bindung, 05.10.2026)
   ────────────────────────────────────────────────────────────────────────
   Die Warnung über veränderte Umschlagfelder nennt deren Namen. Die Namen stammen aus der Datei, also
   von dem, der sie verändert hat. tests/umschlag-klartext-bindung.test.js prüft den HTML-String im
   Node-Lader; der parst kein DOM. Diese Probe misst im echten Browser am gebackenen privat-de: Depot
   anlegen, den Umschlag mit einem Feld namens `<img …>` wieder öffnen, die Warnung zeigen, und dann
   zählen, ob unter `#klartext-bindung-hinweis` ein `img` steht.

   ROT-BEWEIS am DOM: dieselbe Reise gegen eine Kopie des gebackenen Produkts, in der das Escapen der
   Warnung im Quelltext zurückgenommen ist. Dort steht das `img` im Hinweis. Ein Überschreiben über
   `window.__vdOeffentlich` reichte nicht, der interne Aufruf bindet lexikalisch (s. Kommentar an der
   Liste im Kern).
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { oeffneApp, depotAnlegen } = require('./helpers');
const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup.js');

const PW = 'klartext-bindung-dom-2026';
// Höchstens 40 Zeichen, sonst kürzt die Warnung den Namen und das Element wäre schon dadurch zerbrochen.
const BOESER_NAME = '<img src=x onerror=window.__xk=1>';

async function warnungMitBoesemFeldnamen(page, url) {
  await oeffneApp(page, { url });
  await depotAnlegen(page, { name: 'Probe Person', pw: PW });
  return page.evaluate(async ({ name, pw }) => {
    const u = JSON.parse(JSON.stringify(await window.__vdOeffentlich.depotSerialisieren()));
    u[name] = 'x';
    await window.__vdOeffentlich.depotLaden(u, pw);
    window.__vdOeffentlich.klartextBindungHinweisZeigen();
    for (let i = 0; i < 60 && !document.getElementById('klartext-bindung-hinweis'); i++) await new Promise((r) => setTimeout(r, 100));
    const p = document.getElementById('klartext-bindung-hinweis');
    await new Promise((r) => setTimeout(r, 300));   // ein onerror hätte Zeit zu feuern
    return { da: !!p, text: p ? p.textContent : '', imgs: p ? p.querySelectorAll('img').length : -1, marke: window.__xk === 1 };
  }, { name: BOESER_NAME, pw: PW });
}

test('[Klartext-Bindung·DOM] ein Feldname mit HTML steht in der Warnung als Text, es entsteht kein Element', async ({ page }) => {
  const r = await warnungMitBoesemFeldnamen(page, 'file://' + GEBACKENE_PRODUKT_PFADE['privat-de']);
  expect(r.da, 'die Warnung erscheint').toBe(true);
  expect(r.text, 'der Name steht als Text in der Warnung').toContain(BOESER_NAME);
  expect(r.imgs, 'kein img unter #klartext-bindung-hinweis').toBe(0);
  expect(r.marke, 'kein Script aus dem Feldnamen gelaufen').toBe(false);
});

test('[Klartext-Bindung·DOM·Rot-Beweis] ohne das Escapen im Quelltext steht das img im Hinweis', async ({ page }) => {
  const anker = "koerperHTML: '<p class=\"modal-text\" id=\"klartext-bindung-hinweis\">' + escapeHTML(klartextBindungHinweisText(_klartextBindungBefund)) + '</p>',";
  const html = fs.readFileSync(GEBACKENE_PRODUKT_PFADE['privat-de'], 'utf8');
  expect(html.split(anker).length - 1, 'die Stelle steht genau einmal im Produkt').toBe(1);
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-klartext-dom-rot-'));
  try {
    const datei = path.join(ziel, 'vivodepot.html');
    fs.writeFileSync(datei, html.replace(anker, anker.replace('escapeHTML(klartextBindungHinweisText(_klartextBindungBefund))', 'klartextBindungHinweisText(_klartextBindungBefund)')), 'utf8');
    const r = await warnungMitBoesemFeldnamen(page, 'file://' + datei);
    expect(r.da, 'die Warnung erscheint auch hier').toBe(true);
    expect(r.imgs, 'ohne Escapen entsteht das Element: die Probe oben kann rot werden').toBeGreaterThan(0);
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
});
