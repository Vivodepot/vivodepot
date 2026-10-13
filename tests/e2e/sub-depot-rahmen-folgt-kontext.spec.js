'use strict';
/* U2-ADR-236 — "Rahmen folgt Kontext", echter Browser-Lauf (Playwright, nicht nur
   Kern-Regex): "Der Rahmen trägt die Farbe des Depots, in dem man gerade ist."

   Anker über Struktur (Tag/ID), nicht über CSS-Klasse oder Position — dieselbe Regel,
   die heute schon mehrfach einen formatwechsel-blinden Prüfer zeigte. Verglichen wird
   der ECHTE, vom Browser berechnete Farbwert (getComputedStyle), nicht der
   Quelltext — ein Fund, der reines Regex-Lesen der CSS-Quelle nicht zeigen kann. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

const PW = 'e2e-passwort-123';

/* Seit der Entscheidung vom 05.10.2026 (U2-ADR-236 Nachtrag) trägt im Sub-Depot die ganze Oberfläche den Ton des Depots: Kopfzeile,
   Seitenleiste, Inhalt, Fuß, Banner. Ausgenommen ist nur die Marke in der Kopfzeile, sie bleibt die Marke des Produkts. Linien gibt es
   keine mehr (Zählprobe tests/e2e/flaeche-statt-linien.spec.js). Verglichen wird die berechnete Hintergrundfarbe.
   Rot-Beweise: eine Akzentfläche an der Marke fällt auf; ohne die Flächen-Regeln (Stand bis 09.10.2026) sind Seitenleiste und Inhalt im
   Sub-Depot dieselbe Fläche wie im eigenen Depot, der zweite Test fällt. */
const flaeche = (sel) => getComputedStyle(document.querySelector(sel)).backgroundColor;
const marke = () => { const m = document.getElementById('tb-marke'); const cs = getComputedStyle(m); return { schrift: cs.color, flaeche: cs.backgroundColor }; };
async function subBetreten(page, akzent, bezeichnung) {
  return page.evaluate(async ([pw, akzent, bezeichnung]) => {
    const e = await window.__vdOeffentlich.subDepotAnlegen({ bezeichnung, inhaberin: 'Testperson', verwaltungsTyp: 'verwaltet', akzent }, pw);
    await window.__vdOeffentlich.subDepotVertrauenOeffnen(e.depotUUID, pw);
    window.__vdOeffentlich.subKontextBetreten(e.depotUUID);
  }, [PW, akzent, bezeichnung]);
}

test('Kopfzeile: sie nimmt den Ton des Sub-Depots, die Marke bleibt; das Banner trägt den Ton', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  const ankerKopf = await page.evaluate(flaeche, 'header');
  const ankerMarke = await page.evaluate(marke);

  await subBetreten(page, 'malve', 'E2E-Sub');
  expect(await page.evaluate(flaeche, 'header'), 'die Kopfzeile trägt den Ton').not.toBe(ankerKopf);
  const markeMalve = await page.evaluate(marke);
  expect(markeMalve.schrift, 'die Schrift der Marke bleibt unverändert').toBe(ankerMarke.schrift);
  const banner = await page.evaluate(() => { const b = document.querySelector('.vollmacht-banner'); return b ? getComputedStyle(b).backgroundColor : null; });
  expect(banner, 'Voraussetzung: im Sub-Kontext steht das Banner').not.toBeNull();
  expect(banner, 'das Banner trägt eine Fläche').not.toBe('rgba(0, 0, 0, 0)');

  // Die Fläche der Marke hängt nicht vom Ton ab (sie darf hell unterlegt sein, damit die Wortmarke lesbar bleibt): ein zweiter Ton, dieselbe Fläche.
  await page.evaluate(() => window.__vdOeffentlich.subKontextVerlassen());
  await subBetreten(page, 'hellblau', 'E2E-Sub-B');
  const markeHellblau = await page.evaluate(marke);
  expect(markeHellblau.flaeche, 'die Fläche der Marke folgt nicht dem Ton').toBe(markeMalve.flaeche);
  expect(markeHellblau.schrift).toBe(ankerMarke.schrift);
  // Rot-Beweis: eine Akzentfläche an der Marke folgt dem Ton und fällt darum auf.
  await page.evaluate(() => { const s = new CSSStyleSheet(); s.replaceSync('#tb-marke { background: var(--akzent) !important; }'); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; });
  expect((await page.evaluate(marke)).flaeche, 'Rot-Beweis: die gefärbte Marke fällt auf').not.toBe(markeMalve.flaeche);
});

test('Seitenleiste und Inhalt tragen im Sub-Kontext den Ton des Depots und geben ihn beim Verlassen zurück; zwei Töne, zwei Flächen', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  const anker = { leiste: await page.evaluate(flaeche, '#sidebar'), inhalt: await page.evaluate(flaeche, '#content') };

  await subBetreten(page, 'nebel', 'E2E-Sub-2');
  const nebel = { leiste: await page.evaluate(flaeche, '#sidebar'), inhalt: await page.evaluate(flaeche, '#content') };
  expect(nebel.leiste, 'Seitenleiste im Sub-Kontext ≠ eigenes Depot').not.toBe(anker.leiste);
  expect(nebel.inhalt, 'Inhalt im Sub-Kontext ≠ eigenes Depot').not.toBe(anker.inhalt);

  await page.evaluate(() => window.__vdOeffentlich.subKontextVerlassen());
  expect(await page.evaluate(flaeche, '#sidebar'), 'zurück im eigenen Depot: dieselbe Seitenleiste wie vorher').toBe(anker.leiste);
  expect(await page.evaluate(flaeche, '#content'), 'zurück im eigenen Depot: derselbe Inhalt wie vorher').toBe(anker.inhalt);

  await subBetreten(page, 'pfirsich', 'E2E-Sub-3');
  expect(await page.evaluate(flaeche, '#content'), 'ein anderer Ton ergibt eine andere Fläche').not.toBe(nebel.inhalt);
});
