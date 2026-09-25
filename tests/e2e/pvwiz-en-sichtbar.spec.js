'use strict';
/* PV-Assistent im englischen Produkt: kein deutscher Assistenten-Text sichtbar (23.09.2026).

   ANLASS: eine Zählung sichtbarer deutscher Sätze in privat-en ordnete Treffer per Textgleichheit dem Schlüsselraum
   `wizard:pvwiz.*` zu. Dieselben amtlichen Sätze stehen aber auch im Wortlaut der Standardvorlagen — sichtbar kamen sie von
   dort (eigene, behobene Klasse: tests/standardvorlage-sprache-luecke.test.js), nicht aus dem Assistenten. Gemessen über
   textLesen: alle pvwiz-Kennungen liefern im englischen Produkt Englisch. Diese Probe belegt die Herkunft über den
   Anzeigeweg statt über Textgleichheit: am GERENDERTEN Assistenten, Schritt für Schritt bis zum Ende.

   Grün heißt: kein deutscher pvwiz-Text (aus tools/textsatz-de-modul.json) steht sichtbar in einem Schritt. Positivkontrolle:
   mindestens ein englischer pvwiz-Text (aus tools/textsatz-en-modul.json) steht sichtbar — sonst hätte die Probe nichts gesehen. */
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { KERN_URL_PRIVAT_EN, oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

const REPO = path.join(__dirname, '..', '..');
const DE = require(path.join(REPO, 'tools', 'textsatz-de-modul.json')).texte;
const EN = require(path.join(REPO, 'tools', 'textsatz-en-modul.json')).texte;
const PVWIZ = Object.keys(DE).filter((k) => k.startsWith('wizard:pvwiz.'));
// Kurze Texte („ja", „nein") wären auch in englischem Umfeld denkbar — gezählt werden nur deutsche Texte, die sich vom englischen unterscheiden
// und lang genug sind, um nicht zufällig zu passen.
const DEUTSCH = PVWIZ.map((k) => DE[k]).filter((t, i) => typeof t === 'string' && t.trim().length >= 12 && t !== EN[PVWIZ[i]]);
const ENGLISCH = PVWIZ.map((k) => EN[k]).filter((t) => typeof t === 'string' && t.trim().length >= 12);

test('[pvwiz·EN] der PV-Assistent in privat-en zeigt keinen deutschen Assistenten-Text, in keinem Schritt', async ({ page }) => {
  test.setTimeout(180000);
  expect(DEUTSCH.length, 'Vorbedingung: es gibt deutsche pvwiz-Texte, nach denen gesucht wird').toBeGreaterThan(30);
  await oeffneApp(page, { url: KERN_URL_PRIVAT_EN });
  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');
  const gruppe = page.locator('.wizard-gruppe > summary');
  if (await gruppe.count()) await gruppe.first().click();
  await expect(page.locator('[data-wizard-start="pvwiz"]')).toBeVisible();
  await page.click('[data-wizard-start="pvwiz"]');
  await expect(page.locator('.wizard-frage')).toBeVisible();

  const gesehen = [];
  const deutschGefunden = new Set();
  for (let schritt = 0; schritt < 40; schritt++) {
    const text = await page.locator('#content').innerText();
    gesehen.push(text);
    for (const d of DEUTSCH) if (text.includes(d)) deutschGefunden.add(d);
    // Eine Antwort geben, wo der Schritt eine verlangt, dann weiter.
    const multi = page.locator('#content button[data-edit-multi]');
    if (await multi.count()) await multi.first().click();
    const radio = page.locator('#content input[type="radio"]');
    if (await radio.count()) await radio.first().check().catch(() => {});
    const weiter = page.locator('#wiz-weiter');
    if (!(await weiter.count()) || !(await weiter.isVisible()) || !(await weiter.isEnabled())) break;
    await weiter.click();
    if (!(await page.locator('.wizard-frage').count())) { gesehen.push(await page.locator('#content').innerText()); break; }
  }
  const alles = gesehen.join('\n');
  expect(gesehen.length, 'der Assistent wurde über mehrere Schritte durchlaufen').toBeGreaterThan(3);
  expect(ENGLISCH.some((e) => alles.includes(e)), 'Positivkontrolle: englische pvwiz-Texte sind sichtbar').toBe(true);
  expect([...deutschGefunden], 'deutsche pvwiz-Texte sichtbar im englischen Produkt').toEqual([]);
});
