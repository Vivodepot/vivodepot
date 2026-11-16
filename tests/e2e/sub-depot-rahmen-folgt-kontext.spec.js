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

/* Umbau nach dem Desktop-Dummy (13.11.2026, Plan U-1, Leitfaden 5.24): Im Sub-Depot bleibt die Oberfläche Salbei. Bis dahin (Entscheidung
   05.10.2026, U2-ADR-236 Nachtrag) trug die ganze Oberfläche den Ton des Depots; seither zeigt sich die Person nur am Farbkreis des
   Wechslers, am Streifen oben an der Kopfzeile und an der Kontextzeile (Probe: tests/e2e/sub-depot-kopfzeile-schmal.spec.js).
   Verglichen wird die berechnete Hintergrundfarbe. Rot-Beweis: eine Akzentfläche an der Marke folgt dem Ton der Person und fällt auf. */
const flaeche = (sel) => getComputedStyle(document.querySelector(sel)).backgroundColor;
const marke = () => { const m = document.getElementById('tb-marke'); const cs = getComputedStyle(m); return { schrift: cs.color, flaeche: cs.backgroundColor }; };
async function subBetreten(page, akzent, bezeichnung) {
  return page.evaluate(async ([pw, akzent, bezeichnung]) => {
    const e = await window.__vdOeffentlich.subDepotAnlegen({ bezeichnung, inhaberin: 'Testperson', verwaltungsTyp: 'verwaltet', akzent }, pw);
    await window.__vdOeffentlich.subDepotVertrauenOeffnen(e.depotUUID, pw);
    window.__vdOeffentlich.subKontextBetreten(e.depotUUID);
  }, [PW, akzent, bezeichnung]);
}

test('Kopfzeile: sie bleibt Salbei, die Marke bleibt; die Kontextzeile trägt eine Fläche', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  const ankerKopf = await page.evaluate(flaeche, 'header');
  const ankerMarke = await page.evaluate(marke);

  await subBetreten(page, 'malve', 'E2E-Sub');
  expect(await page.evaluate(flaeche, 'header'), 'die Kopfzeile bleibt wie im eigenen Depot').toBe(ankerKopf);
  const markeMalve = await page.evaluate(marke);
  expect(markeMalve.schrift, 'die Schrift der Marke bleibt unverändert').toBe(ankerMarke.schrift);
  expect(markeMalve.flaeche, 'die Fläche der Marke bleibt unverändert').toBe(ankerMarke.flaeche);
  const zeile = await page.evaluate(() => { const z = document.getElementById('sub-kontextzeile'); return z && !z.hidden ? getComputedStyle(z).backgroundColor : null; });
  expect(zeile, 'Voraussetzung: im Sub-Kontext steht die Kontextzeile').not.toBeNull();
  expect(zeile, 'die Kontextzeile trägt eine Fläche').not.toBe('rgba(0, 0, 0, 0)');

  // Ein zweiter Ton ändert die Marke nicht.
  await page.evaluate(() => window.__vdOeffentlich.subKontextVerlassen());
  await subBetreten(page, 'hellblau', 'E2E-Sub-B');
  const markeHellblau = await page.evaluate(marke);
  expect(markeHellblau.flaeche, 'die Fläche der Marke folgt nicht dem Ton').toBe(markeMalve.flaeche);
  expect(markeHellblau.schrift).toBe(ankerMarke.schrift);
  // Rot-Beweis: eine Akzentfläche an der Marke folgt dem Ton der Person und fällt darum auf.
  await page.evaluate(() => { const s = new CSSStyleSheet(); s.replaceSync('#tb-marke { background: var(--person) !important; }'); document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; });
  expect((await page.evaluate(marke)).flaeche, 'Rot-Beweis: die gefärbte Marke fällt auf').not.toBe(markeMalve.flaeche);
});

test('Seitenleiste und Inhalt bleiben im Sub-Kontext wie im eigenen Depot, auch bei einem anderen Ton', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  const anker = { leiste: await page.evaluate(flaeche, '#sidebar'), inhalt: await page.evaluate(flaeche, '#content') };

  await subBetreten(page, 'nebel', 'E2E-Sub-2');
  expect(await page.evaluate(flaeche, '#sidebar'), 'Seitenleiste im Sub-Kontext = eigenes Depot').toBe(anker.leiste);
  expect(await page.evaluate(flaeche, '#content'), 'Inhalt im Sub-Kontext = eigenes Depot').toBe(anker.inhalt);

  await page.evaluate(() => window.__vdOeffentlich.subKontextVerlassen());
  expect(await page.evaluate(flaeche, '#sidebar'), 'zurück im eigenen Depot: dieselbe Seitenleiste').toBe(anker.leiste);
  expect(await page.evaluate(flaeche, '#content'), 'zurück im eigenen Depot: derselbe Inhalt').toBe(anker.inhalt);

  await subBetreten(page, 'pfirsich', 'E2E-Sub-3');
  expect(await page.evaluate(flaeche, '#content'), 'ein anderer Ton ändert die Fläche des Inhalts nicht').toBe(anker.inhalt);
});
