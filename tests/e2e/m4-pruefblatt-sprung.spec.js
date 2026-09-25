'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — M4 (Auftrag M3/M4, 09.08.2026): Adressierbarkeit.
   ────────────────────────────────────────────────────────────────────────
   Gemessener Befund (nicht nur behauptet): `prueftermineSpringeZuDokument`
   rief `el.scrollIntoView({behavior:'smooth', ...})` SYNCHRON direkt nach
   `renderContentInner()`s `innerHTML=`-Ersatz auf — der Browser hatte das
   neu eingefügte Ziel-Element zu diesem Zeitpunkt noch nicht layoutet,
   `scrollIntoView` blieb wirkungslos (per Playwright gemessen:
   `#content.scrollTop` blieb 0, obwohl das Element existierte und ein
   manueller, isoliert aufgerufener `scrollIntoView` auf demselben Element
   sehr wohl scrollte). Fix: ein `requestAnimationFrame`-Tick vor dem
   scrollIntoView-Aufruf.

   Diese Probe belegt den ECHTEN Klickweg: Prüfblatt → „Ansehen/bearbeiten"
   → tatsächlich beim Dokument angekommen (nicht nur auf der Bereichsseite).
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

test('M4: Prüfblatt "Ansehen/bearbeiten" springt WIRKLICH zum Dokument, nicht nur zur Bereichsseite', async ({ page }) => {
  const fehler = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored/i.test(m.text())) fehler.push(m.text());
  });
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page);
  await page.evaluate(() => {
    window.__vdOeffentlich.dokumentAnlegen({ name: 'Mietvertrag', sektorId: 'housing', gueltigAb: '2025-01-01', pruefIntervallMonate: 12 }, new Date());
  });

  await page.click('[data-prueftermine]');
  await expect(page.locator('[data-prtm-bearb]').first()).toBeVisible();
  await page.click('[data-prtm-bearb]');

  // Der Sprung braucht einen requestAnimationFrame-Tick — kurz warten, dann prüfen, dass
  // #content wirklich gescrollt hat (nicht bei 0 stehen geblieben ist).
  await page.waitForTimeout(400);
  const scrollTop = await page.evaluate(() => (document.getElementById('content') || {}).scrollTop);
  expect(scrollTop, 'Sprung zum Dokument hat tatsächlich gescrollt').toBeGreaterThan(0);

  // Das Ziel-Element ist im sichtbaren Bereich angekommen.
  const dokAnkerImBlick = await page.evaluate(() => {
    const el = document.querySelector('[id^="dok-"]');
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.top < window.innerHeight;
  });
  expect(dokAnkerImBlick, 'Dokument-Anker ist im sichtbaren Bereich').toBe(true);

  expect(fehler, 'keine JS-/Konsolen-Fehler beim Sprung').toEqual([]);
});
