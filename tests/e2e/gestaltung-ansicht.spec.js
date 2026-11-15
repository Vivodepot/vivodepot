'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Wächter „Ansicht“ (Gestaltungsdefinition, Stufe 7; läuft ab Stufe 3 je Baustein mit).
   Misst in jeder Ansicht die sichtbaren Elemente ohne Baustein (tools/gestaltung-ansicht.js, SAMMLER) und vergleicht
   mit tools/gestaltung-ansicht-grundlinie.json: steigt eine Zahl, ist es rot; sinkt sie, ist die Grundlinie nachzuziehen.
   Die Messung liegt danach in test-results/gestaltung-ansicht-messung.json (für --stellen und --grundlinie-schreiben).
   VD_ANSICHT_ERHEBEN=1 misst nur und schreibt die Datei, ohne zu vergleichen: so wird die Grundlinie erhoben.
   Eine neue Ansicht kommt hier in ANSICHTEN dazu und braucht eine Erhebung (Trailer der Gegenlesung).
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { oeffneApp, depotAnlegen, oeffneSektor, inLeisteKlicken } = require('./helpers');
const A = require('../../tools/gestaltung-ansicht.js');
// Die Grundlinie ist am privaten Bestand erhoben. Der öffentliche Zuschnitt baut die Ansichten aus einem anderen Bestand
// (gemessen 14.11.2026, öffentlicher Lauf d25247c68: bereich-gesundheit rund elf Elemente unter der Grundlinie); dort
// springt der Wächter sichtbar auf skip. Privat bleibt er scharf (Gegenstück im privaten Repo).
const OEFFENTLICHER_ZUSCHNITT = require('../../tools/lib/wurzel-kopfzeile.js').imOeffentlichenZuschnitt(path.join(__dirname, '..', '..'));

const MESSUNG = path.join(__dirname, '..', '..', 'test-results', 'gestaltung-ansicht-messung.json');

const ANSICHTEN = {
  willkommen: async (page) => { await oeffneApp(page); },
  uebersicht: async (page) => { await oeffneApp(page); await depotAnlegen(page); },
  'bereich-identitaet': async (page) => { await oeffneApp(page); await depotAnlegen(page); await oeffneSektor(page, 'identity'); },
  'bereich-gesundheit': async (page) => { await oeffneApp(page); await depotAnlegen(page); await oeffneSektor(page, 'health'); },
  // Meine Dokumente und Prüftermine über ihre Anker in der Leiste (data-mappe, data-prueftermine), wie die bestehenden
  // Proben; beide leer, wie Stufe 3 sie zeigt.
  'meine-dokumente-leer': async (page) => {
    await oeffneApp(page); await depotAnlegen(page);
    await inLeisteKlicken(page, '[data-mappe]');
    await page.waitForSelector('#mappe-add', { state: 'visible' });
  },
  'prueftermine-leer': async (page) => {
    await oeffneApp(page); await depotAnlegen(page);
    await inLeisteKlicken(page, '[data-prueftermine]');
    await expect(page.locator('#content')).toContainText('Prüftermine');
  },
  'sub-depots-leer': async (page) => {
    await oeffneApp(page); await depotAnlegen(page);
    await page.click('#tb-depot-pille');
    await page.waitForSelector('#tb-depot-menue-verwaltung', { state: 'visible' });
    await page.click('#tb-depot-menue-verwaltung');
    await expect(page.locator('#content')).toContainText('Sub-Depots');
  },
};

test('[Ansicht] je Ansicht steigt die Zahl der Elemente ohne Baustein nicht', async ({ browser }) => {
  // FIXME-ID: OEFFENTLICH-BESTAND-ANSICHT
  test.skip(OEFFENTLICHER_ZUSCHNITT, 'öffentlich ein anderer Bestand als die private Grundlinie');
  test.setTimeout(ANSICHTEN_ZEIT());
  const messung = {};
  for (const [name, hin] of Object.entries(ANSICHTEN)) {
    const kontext = await browser.newContext();
    const page = await kontext.newPage();
    await hin(page);
    messung[name] = await page.evaluate(A.SAMMLER);
    expect(messung[name].length, `${name}: die Ansicht zeigt etwas`).toBeGreaterThan(0);
    await kontext.close();
  }
  fs.mkdirSync(path.dirname(MESSUNG), { recursive: true });
  fs.writeFileSync(MESSUNG, JSON.stringify(messung, null, 1) + '\n');
  if (process.env.VD_ANSICHT_ERHEBEN === '1') return;
  const grundlinie = JSON.parse(fs.readFileSync(A.GRUNDLINIE, 'utf8'));
  const r = A.vergleichen(messung, grundlinie, A.bausteinSatz(A.definitionLesen()));
  expect(r.zeilen, 'Wächter „Ansicht“ (Stellen: node tools/gestaltung-ansicht.js --stellen <ansicht> --messung ' +
    path.relative(path.join(__dirname, '..', '..'), MESSUNG) + ')').toEqual([]);
});

function ANSICHTEN_ZEIT() { return 60000 * Object.keys(ANSICHTEN).length; }
