'use strict';
/* uebersicht-anfrage-schmal.spec.js — Handy-Fassung (375) des Desktop-Dummys: in „Wartet auf Sie“ steht der Knopf „Ansehen“
   ganz im Bild, auch bei 360 px (Bildabgleich 375, Zeile M07: „Anseh“ war am rechten Rand abgeschnitten).
   ─────────────────────────────────────────────────────────────────
   Gemessen wird am Knopf selbst: sein Text passt in ihn (scrollWidth ≤ clientWidth), und er endet innerhalb der Karte und des
   Bildschirms. Ein langer Name der Stelle bricht um, statt den Knopf zu schmälern.
   Rot-Beweis: ohne die Regel, die den Knopf in seiner Breite hält, fällt die Probe. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, inLeisteKlicken, oeffneSektor, schubfachOeffnen } = require('./helpers');

// Die Anfrage kommt über die Oberfläche an (Einfügen am Ort der Anfragen, wie kette07-anfrage.spec.js), nicht über die Prüfschnittstelle.
const ANFRAGE = {
  modulTyp: 'anfrage', anfrageVersion: 1,
  von: 'Pflegeheim Sonnenhof gGmbH', zweck: 'Aufnahme in die vollstationäre Pflege ab 01.10.2026',
  grundlage: '§ 630f BGB und der von Ihnen unterzeichnete Heimvertrag', vorgang: 'AUF-2026-0815', gueltigBis: '2099-12-31',
  felder: [{ kennung: 'identity.givenName', zweck: 'Anrede im Aufnahmebogen', pflicht: true }],
  antwort: { art: 'einmalpasswort', an: 'aufnahme@sonnenhof.example.de' },
};
const KNOPF = '.uebersicht-karte [data-anfrage-oeffnen]';

async function zurUebersicht(page) {
  // Nach dem Anlegen steht „Identität & Person“ da; die Übersicht öffnet die Person über die Leiste unten.
  await page.getByRole('navigation', { name: 'Schnellzugriff' }).getByRole('button', { name: 'Übersicht' }).click();
}

async function mitAnfrage(page) {
  // Bis 767 px steht die Seitenleiste eingeklappt; der Weg der Nutzerin geht über den Tab „Bereiche“ unten.
  await schubfachOeffnen(page);
  await inLeisteKlicken(page, '[data-uebergabe-protokoll]');
  await page.waitForSelector('#anfrage-empfangen', { state: 'visible' });
  await page.click('#anfrage-empfangen');
  await page.fill('#anfrage-text', JSON.stringify(ANFRAGE));
  await page.click('#m-ok');
  await page.waitForSelector('#anfrage-kopf', { state: 'visible' });
  await zurUebersicht(page);
  await page.waitForSelector(KNOPF, { state: 'visible' });
}

async function knopfMessen(page) {
  return page.evaluate(() => {
    const b = document.querySelector('.uebersicht-karte [data-anfrage-oeffnen]');
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
const PLAN = '<MP v="026" U="00112233445566778899AABBCCDDEEFF"><P g="Maria" f="Mustermann" b="19600101"/>'
  + '<A n="Hausarztpraxis Dr. Beispiel"/><S><M a="Beispielol 5 mg" m="1" v="1" r="Blutdruck"/></S></MP>';
async function zeileMessen(page) {
  return page.evaluate(() => {
    const r = document.querySelector('[data-uebersicht-feld="health|medicationOngoing"] .uebersicht-rechts');
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
  // Eingelesen über die Oberfläche: ein Medikationsplan (erfunden) mit Aussteller; die Übernahme trägt den Aussteller als Quelle.
  await schubfachOeffnen(page);
  await oeffneSektor(page, 'health');
  await page.locator('#content [data-bmp-einlesen]').first().click();
  await page.locator('input[data-bmp-datei]').setInputFiles({ name: 'medikationsplan.xml', mimeType: 'text/xml', buffer: Buffer.from(PLAN, 'utf8') });
  await page.waitForSelector('[data-bmp-vorschau] .bmp-liste li', { state: 'visible' });
  await page.click('#m-ok');
  await zurUebersicht(page);
  await page.locator('[data-uebersicht-feld="health|medicationOngoing"]').scrollIntoViewIfNeeded();
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
