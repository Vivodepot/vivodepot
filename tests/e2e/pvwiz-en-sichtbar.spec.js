'use strict';
/* PV-Assistent im englischen Produkt: kein deutscher Assistenten-Text sichtbar (23.09.2026).

   ANLASS: eine Zählung sichtbarer deutscher Sätze in privat-en ordnete Treffer per Textgleichheit dem Schlüsselraum
   `wizard:pvwiz.*` zu. Dieselben amtlichen Sätze stehen aber auch im Wortlaut der Standardvorlagen — sichtbar kamen sie von
   dort (eigene, behobene Klasse: eine nicht öffentliche Probe), nicht aus dem Assistenten. Gemessen über
   textLesen: alle pvwiz-Kennungen liefern im englischen Produkt Englisch. Diese Probe belegt die Herkunft über den
   Anzeigeweg statt über Textgleichheit: am GERENDERTEN Assistenten, Schritt für Schritt bis zum Ende.

   Grün heißt: kein deutscher pvwiz-Text (aus tools/textsatz-de-modul.json) steht sichtbar in einem Schritt. Positivkontrolle:
   mindestens ein englischer pvwiz-Text (aus tools/textsatz-en-modul.json) steht sichtbar — sonst hätte die Probe nichts gesehen. */
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { KERN_URL_PRIVAT_EN, oeffneApp, depotAnlegen, oeffneSektor, assistentFertig } = require('./helpers');

const REPO = path.join(__dirname, '..', '..');
const DE = require(path.join(REPO, 'tools', 'textsatz-de-modul.json')).texte;
const EN = require(path.join(REPO, 'tools', 'textsatz-en-modul.json')).texte;
const PVWIZ = Object.keys(DE).filter((k) => k.startsWith('wizard:pvwiz.'));
// Kurze Texte („ja", „nein") wären auch in englischem Umfeld denkbar — gezählt werden nur deutsche Texte, die sich vom englischen unterscheiden
// und lang genug sind, um nicht zufällig zu passen.
const DEUTSCH = PVWIZ.map((k) => DE[k]).filter((t, i) => typeof t === 'string' && t.trim().length >= 12 && t !== EN[PVWIZ[i]]);
const ENGLISCH = PVWIZ.map((k) => EN[k]).filter((t) => typeof t === 'string' && t.trim().length >= 12);
// Namen der Vorsorge-Instrumente (dokument.<typ>.name): nach „Fertig“ zeigt der Bereich sie als Titel und Überschrift (24.11.2026).
const INSTRUMENT_DE = ['living-will', 'enduring-power-of-attorney', 'custodianship-declaration', 'will', 'guardian-nomination', 'ki-verfuegung']
  .map((t) => DE['dokument.' + t + '.name']).filter((t, i, a) => typeof t === 'string' && a.indexOf(t) === i);

test('[pvwiz·EN] der PV-Assistent in privat-en zeigt keinen deutschen Assistenten-Text, in keinem Schritt', async ({ page }) => {
  test.setTimeout(180000);
  expect(DEUTSCH.length, 'Vorbedingung: es gibt deutsche pvwiz-Texte, nach denen gesucht wird').toBeGreaterThan(30);
  await oeffneApp(page, { url: KERN_URL_PRIVAT_EN });
  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');
  const gruppe = page.locator('.bereich-assistenten .wizard-gruppe > summary');
  if (await gruppe.count()) await gruppe.first().click();
  await expect(page.locator('[data-wizard-start="pvwiz"]')).toBeVisible();
  await page.click('[data-wizard-start="pvwiz"]');
  await expect(page.locator('.wizard-frage')).toBeVisible();

  const gesehen = [];
  const deutschGefunden = new Set();
  // U-AS (21.11.2026): alle sichtbaren Fragen stehen auf EINER Seite; gelesen wird je Zeile, dann der Abschluss.
  const zeilen = page.locator('.wizard-liste [data-wiz-idx]');
  const n = await zeilen.count();
  gesehen.push(await page.locator('#content').innerText());
  for (let i = 0; i < n; i++) gesehen.push(await zeilen.nth(i).innerText());
  const multi = page.locator('#content button[data-edit-multi]');
  if (await multi.count()) await multi.first().click();
  const radio = page.locator('#content input[type="radio"]');
  if (await radio.count()) await radio.first().check().catch(() => {});
  await assistentFertig(page);
  // Nach „Fertig“: der Bereich mit dem angelegten Instrument, gelesen wie die Person ihn sieht.
  await expect(page.locator('.wizard-frage')).toHaveCount(0);
  const nachFertig = await page.locator('#content').innerText();
  gesehen.push(nachFertig);
  expect(INSTRUMENT_DE.length, 'Vorbedingung: deutsche Instrument-Namen, nach denen gesucht wird').toBeGreaterThan(3);
  expect(INSTRUMENT_DE.filter((d) => nachFertig.includes(d)), 'deutsche Instrument-Namen nach „Fertig“ im englischen Produkt').toEqual([]);
  for (const text of gesehen) for (const d of DEUTSCH) if (text.includes(d)) deutschGefunden.add(d);
  const alles = gesehen.join('\n');
  expect(gesehen.length, 'der Assistent wurde über mehrere Fragen gelesen').toBeGreaterThan(3);
  expect(ENGLISCH.some((e) => alles.includes(e)), 'Positivkontrolle: englische pvwiz-Texte sind sichtbar').toBe(true);
  expect([...deutschGefunden], 'deutsche pvwiz-Texte sichtbar im englischen Produkt').toEqual([]);
});
