'use strict';
/* uebersicht-anfrage-schmal.spec.js — Handy-Fassung (375) des Desktop-Dummys: in „Wartet auf Sie“ steht der Knopf „Ansehen“
   ganz im Bild, auch bei 360 px (Bildabgleich 375, Zeile M07: „Anseh“ war am rechten Rand abgeschnitten).
   ─────────────────────────────────────────────────────────────────
   Gemessen wird am Knopf selbst: sein Text passt in ihn (scrollWidth ≤ clientWidth), und er endet innerhalb der Karte und des
   Bildschirms. Ein langer Name der Stelle bricht um, statt den Knopf zu schmälern.
   Rot-Beweis: ohne die Regel, die den Knopf in seiner Breite hält, fällt die Probe. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

async function mitAnfrage(page) {
  await page.evaluate(() => {
    const morgen = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
    // Über die öffentliche Prüfschnittstelle: ankerDaten() ist im eigenen Depot dessen Inhalt (kein Sub-Depot betreten).
    const V = window.__vdOeffentlich;
    V.ankerDaten().anfragen = [{ id: 'anf-schmal', von: 'Pflegeheim Sonnenhof gGmbH', zweck: 'Aufnahme in die vollstationäre Pflege ab 01.10.2026',
      empfangenAm: new Date().toISOString(), beantwortetAm: null, gueltigBis: morgen }];
  });
  // Nach dem Anlegen steht „Identität & Person“ da; die Übersicht öffnet die Person über die Leiste unten.
  await page.getByRole('navigation', { name: 'Schnellzugriff' }).getByRole('button', { name: 'Übersicht' }).click();
  await page.waitForSelector('.uebersicht-karte [data-anfrage-oeffnen="anf-schmal"]', { state: 'visible' });
}

async function knopfMessen(page) {
  return page.evaluate(() => {
    const b = document.querySelector('.uebersicht-karte [data-anfrage-oeffnen="anf-schmal"]');
    const karte = b.closest('.uebersicht-karte');
    const r = b.getBoundingClientRect();
    const k = karte.getBoundingClientRect();
    return { passt: b.scrollWidth <= b.clientWidth, rechts: Math.round(r.right), karteRechts: Math.round(k.right),
      bild: document.documentElement.clientWidth, breite: Math.round(r.width), text: b.textContent };
  });
}

for (const breite of [360, 375]) {
  test(`[M07·Ansehen] bei ${breite} px steht „Ansehen“ ganz im Bild`, async ({ page }) => {
    await page.setViewportSize({ width: breite, height: 800 });
    await oeffneApp(page);
    await depotAnlegen(page);
    await mitAnfrage(page);
    const m = await knopfMessen(page);
    test.info().annotations.push({ type: 'knopf-' + breite, description: JSON.stringify(m) });
    expect(m.passt, 'der Text passt in den Knopf: ' + JSON.stringify(m)).toBe(true);
    expect(m.rechts, 'der Knopf endet in der Karte').toBeLessThanOrEqual(m.karteRechts);
    expect(m.rechts, 'der Knopf endet im Bild').toBeLessThanOrEqual(m.bild);
    if (breite === 375) {
      await page.screenshot({ path: test.info().outputPath('uebersicht-anfrage-375.png') });
      // Rot-Beweis: mit dem Stand vor der Regel (der Knopf darf schrumpfen) passt sein Text nicht mehr.
      await page.addStyleTag({ content: '.uebersicht-zeile > .btn { flex: 0 1 auto !important; }' });
      const rot = await knopfMessen(page);
      expect(rot.passt, 'Rot-Beweis: der geschrumpfte Knopf schneidet den Text ab').toBe(false);
    }
  });
}

/* Zuletzt geändert bei 375 px: Zeitpunkt und Herkunft („heute, … · eingelesen von <Stelle>“) stehen in einer eigenen Zeile unter der
   Angabe und enden in der Karte (Desktop-Dummy Z. 227–228; Bild M26). Rot-Beweis: ohne Umbruch läuft die Angabe über den Rand. */
async function zeileMessen(page) {
  return page.evaluate(() => {
    const r = document.querySelector('[data-uebersicht-feld="health|bloodType"] .uebersicht-rechts');
    const k = r.closest('.uebersicht-karte').getBoundingClientRect();
    const b = r.getBoundingClientRect();
    return { rechts: Math.round(b.right), karteRechts: Math.round(k.right), bild: document.documentElement.clientWidth,
      passt: r.scrollWidth <= Math.ceil(b.width), text: r.textContent };
  });
}
test('[M26·Zeile] bei 375 px endet „eingelesen von <Stelle>“ unter „Zuletzt geändert“ in der Karte', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.evaluate(() => {
    const d = window.__vdOeffentlich.ankerDaten();
    d.urheberschaft = d.urheberschaft || {};
    d.urheberschaft.health = d.urheberschaft.health || {};
    d.urheberschaft.health.bloodType = [{ zeitpunkt: new Date().toISOString(), eingabeArt: 'import',
      quelle: 'Gesundheitsdaten einlesen · Hausarztpraxis Dr. Beispiel' }];
  });
  await page.getByRole('navigation', { name: 'Schnellzugriff' }).getByRole('button', { name: 'Übersicht' }).click();
  await page.locator('[data-uebersicht-feld="health|bloodType"]').scrollIntoViewIfNeeded();
  const m = await zeileMessen(page);
  test.info().annotations.push({ type: 'zeile-375', description: JSON.stringify(m) });
  expect(m.text, 'die Stelle steht da, nicht der Weg').toContain('eingelesen von Hausarztpraxis Dr. Beispiel');
  expect(m.rechts, 'die Angabe endet in der Karte: ' + JSON.stringify(m)).toBeLessThanOrEqual(m.karteRechts);
  expect(m.rechts, 'die Angabe endet im Bild').toBeLessThanOrEqual(m.bild);
  await page.screenshot({ path: test.info().outputPath('uebersicht-zuletzt-375.png') });
  // Rot-Beweis: ohne den Umbruch (Stand vor dem Fix) läuft die Angabe über den Rand.
  await page.addStyleTag({ content: 'button.uebersicht-zeile { flex-wrap: nowrap !important; } button.uebersicht-zeile > .uebersicht-rechts { flex: 0 0 auto !important; padding-left: 0 !important; }' });
  const rot = await zeileMessen(page);
  expect(rot.rechts > rot.karteRechts, 'Rot-Beweis: ohne Umbruch endet die Angabe außerhalb der Karte: ' + JSON.stringify(rot)).toBe(true);
});
