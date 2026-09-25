'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Glied 9 der Nachtkette 16./17.08.2026 — die zwei Barrierefreiheits-
   Beobachtungen aus A256, gebaut und belegt.
   ────────────────────────────────────────────────────────────────────────
   BEIDE SIND GUTE PRAXIS, NICHT WCAG-AA-PFLICHT — das ist der Grund, warum
   die 35 axe-Scans sie nie gemeldet haben und auch künftig nicht melden
   werden: `wcag-axe.mjs` fährt die Tags `wcag2a/2aa/21aa/22aa`, und beide
   Regeln (`document-title` bei Sichtwechsel, `landmark-unique`) liegen bei
   axe in `best-practice`. Diese Spec ist deshalb die einzige Stelle, die
   den Zustand hält.

   WARUM PLAYWRIGHT UND NICHT DER NODE-HARNISCH: `_dokumentTitelNachziehen`
   liest die gerenderte `h1` über `querySelector`, und der Node-Stub liefert
   dafür immer ein Phantom-Element (belegte Grenze, s. `tests/load-kern.js`).
   Im Harnisch wäre die Probe grün, ohne irgendetwas zu zeigen.

   ROT-BELEG (16.08.2026, an der ECHTEN `vivodepot.html`, zwei getrennte Läufe —
   Playwright lädt keine Kopie): (1) der `_dokumentTitelNachziehen()`-Aufruf am
   Ende von `renderContent` entfernt → Titel-Probe rot, die beiden nav-Proben
   grün. (2) `sb.setAttribute('aria-label', …)` in `renderSidebar` entfernt →
   nav-Namensprobe rot, Titel-Probe grün. Beide Rücknahmen byte-identisch belegt
   (MD5 `ac6e6b2f3c17a89918d5c199a39cccc2` vorher wie nachher).
   Lauf (2) hat die dritte Probe zunächst NICHT rot gemacht — sie prüfte nur
   Eindeutigkeit, und ein einzelner namenloser Eintrag bleibt eindeutig. Die
   Leer-Prüfung dort ist die Folge dieses Laufs, nicht Zierrat.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

test('der Dokumenttitel folgt der Sicht — und der Basistitel bleibt darin stehen', async ({ page }) => {
  await oeffneApp(page);

  // Ausgangszustand: der statische Titel aus dem <head>, unverändert. Er trägt die
  // Build-Version; die Probe kennt sie NICHT hart, sondern liest sie hier ab (§7 — eine
  // eingefrorene Versionszahl wäre bei jedem Release falsch).
  const basis = await page.title();
  expect(basis.length, 'der Basistitel ist nicht leer').toBeGreaterThan(0);

  await depotAnlegen(page);

  await oeffneSektor(page, 'advanceCare');
  const h1Vorsorge = (await page.locator('#content h1').first().textContent() || '').replace(/\s+/g, ' ').trim();
  expect(h1Vorsorge.length, 'die Sicht trägt genau eine sichtbare Überschrift').toBeGreaterThan(0);
  await expect.poll(() => page.title()).toBe(h1Vorsorge + ' · ' + basis);

  // Der eigentliche Fund war nicht „der Titel ist falsch", sondern „er ändert sich NIE".
  // Deshalb ist der Sichtwechsel die Zusicherung, nicht der einzelne Titel.
  await oeffneSektor(page, 'housing');
  const h1Wohnen = (await page.locator('#content h1').first().textContent() || '').replace(/\s+/g, ' ').trim();
  expect(h1Wohnen).not.toBe(h1Vorsorge);
  await expect.poll(() => page.title()).toBe(h1Wohnen + ' · ' + basis);

  // Der Basistitel wird nicht ersetzt, sondern ergänzt — die Build-Version bleibt lesbar.
  expect(await page.title()).toContain(basis);
});

test('das Haupt-nav trägt einen Namen — und keine zwei nav-Landmarks heißen gleich', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');

  await expect(page.locator('#sidebar')).toHaveAttribute('aria-label', /\S/);

  // Die eigentliche Zusicherung ist die EINDEUTIGKEIT, nicht das Vorhandensein: `landmark-unique`
  // schlägt an, wenn zwei Landmarks derselben Rolle denselben (oder keinen) Namen tragen.
  const namen = await page.evaluate(() =>
    Array.from(document.querySelectorAll('nav')).map((n) => (n.getAttribute('aria-label') || '').trim()));
  expect(namen.length, 'mindestens das Haupt-nav ist da').toBeGreaterThan(0);
  expect(namen.filter((n) => n === ''), 'kein nav ohne Namen').toEqual([]);
  expect(new Set(namen).size, 'kein Name doppelt').toBe(namen.length);
});

test('eine Sicht mit mehreren nav-Landmarks bleibt eindeutig benannt (der gemessene Fall aus A256)', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  // Die Vorsorge-Sicht ist eine der fünf, in denen A256 bis zu drei `nav` nebeneinander gemessen
  // hat (Haupt-nav, Regal, Sprungliste/Inhaltsverzeichnis).
  await oeffneSektor(page, 'advanceCare');

  const namen = await page.evaluate(() =>
    Array.from(document.querySelectorAll('nav')).map((n) => (n.getAttribute('aria-label') || '').trim()));
  expect(namen.length, 'diese Sicht trägt mehr als eine nav-Landmark').toBeGreaterThan(1);
  expect(namen.filter((n) => n === ''), 'auch hier kein namenloses nav').toEqual([]);
  expect(new Set(namen).size).toBe(namen.length);
});
