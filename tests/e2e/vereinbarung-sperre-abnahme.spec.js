'use strict';
/* ═════════════════════════════════════════════════════════════════════════════
   Erst vereinbaren, dann der Auszug — Browser-Abnahme des Sperrdialogs
   (MyTerms v1-Schnitt, Teil D, 16.09.2026)
   ─────────────────────────────────────────────────────────────────────────────
   Nachweis ist der DOWNLOAD, nicht der Dialog: ohne Festlegung geht die Datei wie vorher hinaus;
   mit Festlegung geht ohne Annahme und ohne Ja der Person nichts hinaus; eine Ablehnung steht im
   Protokoll; eine ungeprüfte Annahme gibt erst mit dem Ja frei. Die geprüfte Strecke mit Zertifikat
   belegt tests/vereinbarung-generator-kern.test.js.
   ═════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

async function mitPerson(page) {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.evaluate(() => window.__vdOeffentlich.personHinzufuegen({ name: 'Peter Nachbar', tel: '0891112233', beziehung: 'Nachbar' }));
}
async function keinDownload(page, ms) {
  let kam = false;
  const h = () => { kam = true; };
  page.on('download', h);
  await page.waitForTimeout(ms);
  page.off('download', h);
  return !kam;
}
async function felderAusfuellen(page) {
  await page.fill('#up-empfaenger', 'Praxis am Markt');
  await page.fill('#up-umfang', 'Kontakte');
  await page.fill('#up-zweck', 'Behandlung');
}
async function letzterEintrag(page) {
  return page.evaluate(() => JSON.parse(JSON.stringify(window.__vdOeffentlich.ankerDaten().uebergabeProtokoll[window.__vdOeffentlich.ankerDaten().uebergabeProtokoll.length - 1])));
}
async function antwortEinfuegen(page, entscheidung) {
  const text = await page.evaluate((ent) => {
    const e = window.__vdOeffentlich.ankerDaten().uebergabeProtokoll[window.__vdOeffentlich.ankerDaten().uebergabeProtokoll.length - 1];
    const a = { art: 'vivodepot-vereinbarung-antwort', version: 1, agreementId: e.kennung, entscheidung: ent, stelle: 'Praxis ohne Zertifikat',
      angenommen: ent === 'angenommen' ? 'bevorzugt' : null,
      pruefsumme: ent === 'angenommen' ? e.vereinbarung.angebot.bevorzugt.pruefsumme : null };
    return window.__vdOeffentlich.vereinbarungAlsText({ antwort: a });
  }, entscheidung);
  await page.click('#m-ok');                        // Angebot-Ansicht → „Antwort öffnen"
  await page.fill('#vb-antwort-text', text);
  await page.click('#m-ok');
}

test('ohne Festlegung: die Weitergabe läuft wie vorher, ohne Rückfrage', async ({ page }) => {
  await mitPerson(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => window.__vdOeffentlich.flowFormatExport('vcard-menschen'))]);
  expect(fs.readFileSync(await download.path(), 'utf8')).toContain('FN:Peter Nachbar');
});

test('[Rot-Beweis] mit Festlegung: ohne Annahme und ohne Ja kein Auszug — auch nicht nach Abbrechen', async ({ page }) => {
  await mitPerson(page);
  await page.evaluate(() => window.__vdOeffentlich.bedingungFestlegen('SD-BASE', 'PDC-AI'));
  await page.evaluate(() => { window.__vdOeffentlich.flowFormatExport('vcard-menschen'); });
  await expect(page.locator('#modal-titel')).toHaveText('Ihre Bedingung für diese Weitergabe');
  expect(await keinDownload(page, 1500)).toBe(true);
  await page.click('#m-abbr');
  expect(await keinDownload(page, 1000)).toBe(true);
});

test('mit Festlegung: „Ohne vereinbarte Bedingung weitergeben?" — erst das Ja gibt heraus, das Protokoll vermerkt es', async ({ page }) => {
  await mitPerson(page);
  await page.evaluate(() => window.__vdOeffentlich.bedingungFestlegen('SD-BASE'));
  await page.evaluate(() => { window.__vdOeffentlich.flowFormatExport('vcard-menschen'); });
  await felderAusfuellen(page);
  await page.click('#m-dritt');
  await expect(page.locator('#modal-titel')).toHaveText('Ohne vereinbarte Bedingung weitergeben?');
  expect(await keinDownload(page, 800)).toBe(true);
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#m-ok')]);
  expect(fs.readFileSync(await download.path(), 'utf8')).toContain('FN:Peter Nachbar');
  const e = await letzterEintrag(page);
  expect(e.vereinbarung.status).toBe('ohne-vereinbarung');
  expect(e.vereinbarung.ausgegebenAm).toBeTruthy();
});

test('[Rot-Beweis] eine Ablehnung steht im Protokoll, und ohne Ja geht nichts hinaus', async ({ page }) => {
  await mitPerson(page);
  await page.evaluate(() => window.__vdOeffentlich.bedingungFestlegen('SD-BASE', 'PDC-AI'));
  await page.evaluate(() => { window.__vdOeffentlich.flowFormatExport('vcard-menschen'); });
  await felderAusfuellen(page);
  await page.click('#m-ok');                        // Angebot erstellen
  await expect(page.locator('#modal-titel')).toHaveText('Angebot für die Stelle');
  await antwortEinfuegen(page, 'abgelehnt');
  await expect(page.locator('#modal-titel')).toHaveText('Ohne vereinbarte Bedingung weitergeben?');
  await page.click('#m-abbr');
  expect(await keinDownload(page, 1000)).toBe(true);
  const e = await letzterEintrag(page);
  expect(e.vereinbarung.status).toBe('abgelehnt');
  expect(e.vereinbarung.ablehnung.geprueft).toBe(false);
});

test('eine ungeprüfte Annahme gibt nicht von selbst frei — erst mit Ja, das Protokoll sagt „Annahme ungeprüft"', async ({ page }) => {
  await mitPerson(page);
  await page.evaluate(() => window.__vdOeffentlich.bedingungFestlegen('SD-BASE'));
  await page.evaluate(() => { window.__vdOeffentlich.flowFormatExport('vcard-menschen'); });
  await felderAusfuellen(page);
  await page.click('#m-ok');
  await antwortEinfuegen(page, 'angenommen');
  await expect(page.locator('#modal-titel')).toHaveText('Annahme nicht geprüft');
  expect(await keinDownload(page, 800)).toBe(true);
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#m-ok')]);
  expect(fs.readFileSync(await download.path(), 'utf8')).toContain('FN:Peter Nachbar');
  const e = await letzterEintrag(page);
  expect(e.vereinbarung.freigabe).toBe('person');
  expect(await page.evaluate((k) => window.__vdOeffentlich.vereinbarungStatusText(window.__vdOeffentlich.ankerDaten().uebergabeProtokoll.find((x) => x.kennung === k)), e.kennung)).toBe('Annahme ungeprüft');
});

test('Teil C: das Bereichs-PDF trägt nach der Freigabe die Bedingung als zweiten Anhang — Prüfsumme wie im Protokoll', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.evaluate(() => window.__vdOeffentlich.bedingungFestlegen('SD-BASE'));
  await page.evaluate(() => { window.__vdOeffentlich.flowBereichPdf('identity', {}); });
  await felderAusfuellen(page);
  await page.click('#m-dritt');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#m-ok')]);
  const pdf = fs.readFileSync(await download.path()).toString('latin1');
  expect(pdf).toContain('(bedingung.json)');
  expect(pdf).toContain('/AFRelationship /Supplement');
  const e = await letzterEintrag(page);
  expect(pdf).toContain(e.vereinbarung.angebot.bevorzugt.pruefsumme);
  expect(pdf).toContain('"status": "ohne-vereinbarung"');
});

test('[Rot-Beweis] Teil C: ohne Festlegung trägt dasselbe PDF keinen Bedingungs-Anhang', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => { window.__vdOeffentlich.flowBereichPdf('identity', {}); })]);
  const pdf = fs.readFileSync(await download.path()).toString('latin1');
  expect(pdf).not.toContain('(bedingung.json)');
  expect(pdf).toContain('/AFRelationship /Data');
});
