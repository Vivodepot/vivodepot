'use strict';
/* kopf-suchfeld-1280.spec.js — Desktop-Dummy D87: bei 1280 px steht im Kopf das Suchfeld, nicht nur die Lupe.
   ─────────────────────────────────────────────────────────────────
   Der Kopf schaltet bei Enge stufenweise zurück (topbarPlatzAnpassen: zuerst weicht der Ruhetext des Speicher-Status, tb-eng-s; erst
   tb-eng-0 nimmt die Suche aus dem Kopf). Bei 1280 px darf höchstens tb-eng-s greifen: Suchfeld, Einlesen und Herausgeben stehen im Kopf wie im Dummy, die Leiste der Barrierefreiheit bleibt.
   Die Breiten der Kopf-Teile stehen in der Anmerkung des Laufs (zum Nachmessen gegen den Dummy).
   Rot-Beweis: wird der Kopf künstlich breiter, greift tb-eng-0 und die Probe erkennt es. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

async function kopfMessen(page) {
  return page.evaluate(() => {
    const tb = document.querySelector('.topbar');
    const teile = [...tb.children].filter((el) => el.getClientRects().length)
      .map((el) => (el.id || el.className || el.tagName).toString().slice(0, 40) + ' ' + Math.round(el.getBoundingClientRect().width));
    const feld = document.querySelector('#tb-suche-platz');
    return {
      eng: ['tb-eng-s', 'tb-eng-0', 'tb-eng-1', 'tb-eng-2'].filter((k) => tb.classList.contains(k)),
      sucheSichtbar: !!(feld && feld.getClientRects().length && feld.getBoundingClientRect().width > 120),
      breite: Math.round(tb.clientWidth), inhalt: tb.scrollWidth, teile,
    };
  });
}

test('[Kopf·D87] bei 1280 px steht das Suchfeld im Kopf, die Suche weicht nicht, mit Rot-Beweis', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.waitForTimeout(400);
  const m = await kopfMessen(page);
  test.info().annotations.push({ type: 'kopf-1280', description: JSON.stringify(m) });
  expect(m.eng.filter((k) => k !== 'tb-eng-s'), 'bei 1280 weicht höchstens der Ruhetext des Speicher-Status: ' + m.teile.join(' · ')).toEqual([]);
  await expect(page.locator('#tb-save-status .tb-save-text'), 'der Status bleibt für Vorleseprogramme im Kopf').toHaveText(/\S/);
  // Wort D87: der Text weicht, der Haken bleibt sichtbar.
  const haken = () => page.evaluate(() => { const i = document.querySelector('#tb-save-status .ico'); const c = getComputedStyle(i, '::before');
    return i.getClientRects().length > 0 && c.content.includes('\u2713') && c.display !== 'none'; });
  if (m.eng.includes('tb-eng-s')) expect(await haken(), 'im Ruhezustand mit tb-eng-s steht der Haken sichtbar im Kopf').toBe(true);
  expect(m.sucheSichtbar, 'Suchfeld im Kopf: ' + m.teile.join(' · ')).toBe(true);
  await expect(page.locator('#tb-a11y'), 'die Leiste der Barrierefreiheit bleibt im Kopf').toBeVisible();
  await page.screenshot({ path: test.info().outputPath('kopf-1280-ruhezustand.png') });   // Bild für die Abnahme

  // Rot-Beweis Haken: ohne die Regel sieht die Probe keinen Haken.
  if (m.eng.includes('tb-eng-s')) {
    const ohne = await page.addStyleTag({ content: '#tb-save-status .ico::before { content: none !important; }' });
    expect(await haken(), 'Rot-Beweis: ohne Regel kein Haken').toBe(false);
    await ohne.evaluate((el) => el.remove());
  }
  // Rot-Beweis: ein künstlich breiterer Kopf löst die Enge-Stufe aus, und die Probe sieht es.
  await page.addStyleTag({ content: '#tb-a11y { min-width: 900px; }' });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await page.waitForTimeout(400);
  const rot = await kopfMessen(page);
  expect(rot.eng, 'Rot-Beweis: Enge-Stufe greift').toContain('tb-eng-0');
  expect(rot.sucheSichtbar, 'Rot-Beweis: Suchfeld weg').toBe(false);
});

/* Bedingung zu D87: Warnzustände behalten ihren Text in jeder Breite über 760 px (darunter zeigt der Kopf seit jeher Zeichen und
   Sichern-Knopf statt Text, Schutz-Block). Bei 1440, 1280 und 1024 px steht der Text sichtbar (über 20 px). Bei 800 px kürzt die
   bestehende Stufe tb-eng-2 den Status schon vor D87 auf ein Bruchstück (Kommentar der Stufe in grundlage.css); dort prüft die Probe,
   dass die D87-Regel den Text eines Warnzustands nicht wegnimmt (keine Ausblendung, Text in voller Länge im Kopf).
   Rot-Beweis: im Ruhezustand weicht der Text bei Enge, die Messung erkennt das. */
test('[Kopf·D87·Warnung] ein Warnzustand des Speicher-Status behält seinen Text bei 1440, 1280, 1024 und 800 px, mit Rot-Beweis', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await oeffneApp(page);
  await depotAnlegen(page);
  const textBreite = async (breite, zustand) => {
    await page.setViewportSize({ width: breite, height: 800 });
    await page.evaluate((z) => {
      const el = document.getElementById('tb-save-status');
      el.classList.remove('ist-gespeichert', 'ist-ungespeichert', 'ist-fehlgeschlagen', 'ist-unbestaetigt');
      el.classList.add(z);
      window.dispatchEvent(new Event('resize'));
    }, zustand);
    await page.waitForTimeout(400);
    return page.evaluate(() => Math.round(document.querySelector('#tb-save-status .tb-save-text').getBoundingClientRect().width));
  };
  const d87Ausgeblendet = () => page.evaluate(() => getComputedStyle(document.querySelector('#tb-save-status .tb-save-text')).position === 'absolute');
  await textBreite(1280, 'ist-ungespeichert');
  await page.screenshot({ path: test.info().outputPath('kopf-1280-warnzustand.png') });   // Bild für die Abnahme
  for (const breite of [1440, 1280, 1024, 800]) {
    for (const zustand of ['ist-ungespeichert', 'ist-fehlgeschlagen', 'ist-unbestaetigt']) {
      const w = await textBreite(breite, zustand);
      expect(await d87Ausgeblendet(), zustand + ' bei ' + breite + ' px: die D87-Regel blendet den Text nicht aus').toBe(false);
      if (breite >= 1024) expect(w, zustand + ' bei ' + breite + ' px: Text sichtbar').toBeGreaterThan(20);
    }
  }
  // Rot-Beweis: im Ruhezustand weicht der Text, sobald der Kopf eng ist — dieselbe Messung sieht ihn dann nicht mehr.
  await page.addStyleTag({ content: '#tb-a11y { min-width: 700px; }' });
  expect(await textBreite(1280, 'ist-gespeichert'), 'Rot-Beweis: Ruhezustand bei Enge ohne sichtbaren Text').toBeLessThanOrEqual(1);
  expect(await d87Ausgeblendet(), 'Rot-Beweis: die Ausblendung wird erkannt').toBe(true);
});
