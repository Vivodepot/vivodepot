'use strict';
/* Knöpfe an einem Feld haben EINE Gestalt (Abnahme Privatversion v1053, Befund NIEDRIG „drei Gestalten“).
   Gemessen in Gesundheit: „Ausdrücklich keine …“, die Fragen-Zeile und „Medikationsplan einlesen“ tragen dieselbe
   Größe, denselben Rahmen und dieselbe Schriftfarbe; „Fragen“ nennt, was geschieht. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

const FELD_KNOEPFE = '#content [data-ausdruecklich-keine-setzen], #content .feld-fragen-knopf, #content [data-bmp-einlesen]';
const MASSE = ['fontSize', 'fontWeight', 'color', 'backgroundColor', 'borderTopColor', 'borderTopWidth', 'borderTopStyle', 'borderRadius', 'minHeight'];

test('Knöpfe an einem Feld in Gesundheit: eine Gestalt, beschriftet nach dem, was geschieht', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'health');

  const knoepfe = await page.locator(FELD_KNOEPFE).evaluateAll((els, masse) => els.map((el) => {
    const cs = getComputedStyle(el);
    const m = {};
    masse.forEach((k) => { m[k] = cs[k]; });
    return { art: el.matches('[data-ausdruecklich-keine-setzen]') ? 'keine' : el.matches('.feld-fragen-knopf') ? 'fragen' : 'bmp', text: el.textContent.trim(), m };
  }), MASSE);

  const arten = new Set(knoepfe.map((k) => k.art));
  expect([...arten].sort(), 'alle drei Feld-Knöpfe sind da').toEqual(['bmp', 'fragen', 'keine']);
  for (const k of knoepfe) {
    expect(k.m, `${k.art} „${k.text}“ weicht von ${knoepfe[0].art} ab`).toEqual(knoepfe[0].m);
  }
  const fragen = knoepfe.find((k) => k.art === 'fragen');
  expect(fragen.text, 'Fragen-Knopf sagt, was geschieht').not.toBe('Fragen');
  expect(fragen.text).toMatch(/notieren/i);
});
