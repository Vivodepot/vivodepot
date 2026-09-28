'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Journey (c), Todesfall (SPRIND „Todesfall-Formulare per KI-Agent"), 24.09.2026, Auftrag:
   Die Inhaberin (erfundene Beispielperson, Adressen auf example.de) hat einen Empfängerkreis „erbe" mit Fachpasswort.
   Die ANGEHÖRIGE öffnet die Fach-Datei in einer frischen Sitzung, findet über die Suche das Blatt „Behörden und
   Nachlass", nimmt eine Anfrage des Standesamts (Sterbefallanzeige, `vivodepot-anfrage@1`, nur Kennungen) an, sieht den
   Abgleich (was da ist, was fehlt), bestätigt und gibt die VERSCHLÜSSELTE Antwort aus.
   Läuft gegen die Auslieferungs-Bytes (global-setup über tests/produkt-test-backen.js). Mit VD_TODESFALL_DIR=<ordner>
   entstehen Bildschirmfotos und ein Video der Angehörigen-Sitzung (für die Vorführung); ohne läuft es nur als Probe.

   QUELLE DER FELDER: § 31 PStG (Eintragung in das Sterberegister), gesetze-im-internet.de/pstg/__31.html, abgerufen
   24.09.2026 (als Zusammenfassung des Abruf-Werkzeugs, Wortlaut gegenzulesen): Vornamen, Familienname, Ort und Tag der
   Geburt, Geschlecht, letzter Wohnsitz, Familienstand, Angaben zum Ehegatten, Ort und Zeitpunkt des Todes. Hier nur, was
   der Kern als Kennung kennt; Ehegatte und Angaben zum Tod sind NICHT im Depot und kommen nicht vor.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { KERN_URL_PRIVAT_DE, oeffneApp, depotAnlegen, fsaStandardAttrappeEinrichten } = require('./helpers.js');

const ANKER_PW = 'anker-todesfall-pw-2026';
const FACH_PW = 'fach-erbe-pw-2026';
const ANTWORT_PW = 'antwort-standesamt-pw-2026';
const DIR = process.env.VD_TODESFALL_DIR || null;

const KENNUNGEN = ['identity.givenName', 'identity.familyName', 'identity.birthDate', 'identity.birthPlace', 'identity.gender',
  'identity.maritalStatus', 'identity.streetAddress', 'identity.postcodeCity'];
const ANFRAGE = {
  modulTyp: 'anfrage', anfrageVersion: 1,
  von: 'Standesamt Beispielstadt (Sterbefallanzeige)',
  zweck: 'Beurkundung eines Sterbefalls im Sterberegister',
  grundlage: '§ 31 PStG (Eintragung in das Sterberegister)',
  vorgang: 'SB-2026-0001', gestelltAm: '2026-09-24', gueltigBis: '2026-12-31',
  felder: KENNUNGEN.map((k) => ({ kennung: k, zweck: 'Angabe im Sterberegister nach § 31 PStG', pflicht: true })),
  antwort: { art: 'einmalpasswort', an: 'sterbefall@standesamt-beispielstadt.example.de' },
};

test('[Journey c·Todesfall] Angehörige öffnet die Fach-Datei, findet „Behörden und Nachlass", beantwortet die Standesamt-Anfrage verschlüsselt', async ({ browser, page }) => {
  test.setTimeout(240000);
  const fehler = [];
  page.on('pageerror', (e) => fehler.push('inhaberin: ' + e.message));
  const foto = async (seite, name) => { if (DIR) { fs.mkdirSync(DIR, { recursive: true }); await seite.screenshot({ path: path.join(DIR, name + '.png') }); } };

  // 1 · Inhaberin: Depot, Angaben (gender bleibt bewusst leer → „fehlt" im Abgleich), Kreis „erbe" mit Fachpasswort
  await fsaStandardAttrappeEinrichten(page);
  await oeffneApp(page, { url: KERN_URL_PRIVAT_DE });
  await depotAnlegen(page, { pw: ANKER_PW });
  await page.evaluate(() => {
    const s = (a, b, c) => window.__vdOeffentlich.sektorFeldSetzen(a, b, c);
    s('identity', 'givenName', 'Hedwig'); s('identity', 'familyName', 'Brandt'); s('identity', 'birthDate', '1938-03-14');
    s('identity', 'birthPlace', 'Musterstadt'); s('identity', 'maritalStatus', 'verwitwet');
    s('identity', 'streetAddress', 'Beispielweg 1'); s('identity', 'postcodeCity', '12345 Beispielstadt');
    s('identity', 'email', 'hedwig.brandt@example.de');
  });
  await page.evaluate(() => window.__vdOeffentlich.flowEinstellungen());
  const kreisNeu = page.locator('#einst-kreis-anlegen');
  if (!(await kreisNeu.isVisible().catch(() => false))) await page.locator('#modal-inhalt details.einst-abschnitt:has(#einst-kreis-anlegen):not([open]) > summary').click();
  await kreisNeu.click();
  await page.fill('#kreis-name', 'Angehörige (Erbfall)');
  await page.locator('[id="kreis-b-erbe"]').check();
  await page.click('#m-ok');
  const dl = page.waitForEvent('download', { timeout: 15000 });
  await page.locator('[data-kreis-datei]').first().click();
  await page.fill('#kreis-pw', FACH_PW); await page.fill('#kreis-pw2', FACH_PW);
  await page.click('#m-ok');
  const datei = path.join(os.tmpdir(), 'todesfall-' + process.pid + '-' + Date.now() + '.vivodepot');
  fs.copyFileSync(await (await dl).path(), datei);

  // 2 · Angehörige: frische Sitzung, optional mit Video
  const ctxOpt = { viewport: { width: 1280, height: 860 }, acceptDownloads: true };
  if (DIR) ctxOpt.recordVideo = { dir: DIR, size: { width: 1280, height: 860 } };
  const kontext = await browser.newContext(ctxOpt);
  const ang = await kontext.newPage();
  ang.on('pageerror', (e) => fehler.push('angehoerige: ' + e.message));
  await fsaStandardAttrappeEinrichten(ang);
  await oeffneApp(ang, { url: KERN_URL_PRIVAT_DE });
  await foto(ang, '01-startseite');

  await test.step('Fach-Datei mit dem Fachpasswort öffnen', async () => {
    await ang.click('#w-datei'); await ang.setInputFiles('#co-datei', datei); await ang.fill('#co-pw', FACH_PW); await ang.click('#w-oeffnen');
    await ang.waitForSelector('#app.an', { state: 'attached', timeout: 20000 });
    const daten = await ang.evaluate(() => JSON.stringify(window.__vdOeffentlich.ankerDaten().sektoren.identity));
    expect(daten, 'der Zuschnitt trägt den Namen der Verstorbenen').toContain('Brandt');
    await foto(ang, '02-fach-datei-geoeffnet');
  });

  await test.step('Blatt „Behörden und Nachlass" über die Suche finden', async () => {
    await ang.fill('#suche-eingabe', 'Behörden und Nachlass');
    const treffer = ang.locator('#suche-vorschlaege li').filter({ hasText: /Behörden und Nachlass/ }).first();
    await expect(treffer).toBeVisible({ timeout: 8000 });
    await treffer.click();
    await expect.poll(() => ang.evaluate(() => (document.querySelector('#content') || {}).innerText.length), { timeout: 8000 }).toBeGreaterThan(200);
    await foto(ang, '03-behoerden-und-nachlass');
  });

  await test.step('Anfrage des Standesamts annehmen, Abgleich sehen', async () => {
    await ang.locator('text=Herausgegeben').first().click();
    await ang.locator('#anfrage-empfangen').click();
    await ang.fill('#anfrage-text', JSON.stringify(ANFRAGE));
    await ang.click('#m-ok');
    const inhalt = ang.locator('#content');
    await expect(inhalt).toContainText('Standesamt Beispielstadt');
    await expect(inhalt).toContainText('§ 31 PStG');
    await expect(inhalt).toContainText(/DAS HABEN SIE \(7\)|Das haben Sie \(7\)/i);
    await expect(inhalt).toContainText(/DAS FEHLT NOCH \(1\)|Das fehlt noch \(1\)/i);   // Geschlecht: nicht eingetragen → ehrlich „fehlt"
    await expect(inhalt).toContainText(/nicht geprüft/i);                                // unsignierte Anfrage: so gekennzeichnet
    await foto(ang, '04-anfrage-abgleich');
  });

  const antwort = await test.step('bestätigen und verschlüsselte Antwort ausgeben', async () => {
    await ang.click('#anfrage-antworten');
    await ang.locator('#anfrage-bestaetigt').check();
    await foto(ang, '05-bestaetigung');
    await ang.click('#m-ok');
    await ang.waitForSelector('.export-geht-liste, #exp-zurueckhalten-weg, #modal-inhalt', { timeout: 8000 });
    await foto(ang, '05b-export-uebersicht');
    await ang.click('#m-ok');   // Export-Übersicht: „Fortfahren"
    if (await ang.locator('#m-ok').isVisible({ timeout: 1500 }).catch(() => false) && !(await ang.locator('#antwort-pw').count())) await ang.click('#m-ok');   // Unstimmigkeits-Hinweis, falls einer kommt
    await ang.fill('#antwort-pw', ANTWORT_PW);
    const d = ang.waitForEvent('download', { timeout: 15000 });
    await ang.click('#m-ok');
    const download = await d;
    expect(download.suggestedFilename()).toMatch(/_Antwort_SB-2026-0001\.json$/);
    const text = fs.readFileSync(await download.path(), 'utf8');
    await foto(ang, '06-antwort-ausgegeben');
    return text;
  });

  // Die Antwort ist CHIFFRAT: kein Feldwert im Klartext
  const umschlag = JSON.parse(antwort);
  expect(JSON.stringify(umschlag)).toContain('"ct"');
  for (const wert of ['Hedwig', 'Brandt', 'Musterstadt', 'Beispielweg', 'verwitwet']) {
    expect(antwort, 'Feldwert im Klartext der Antwort: ' + wert).not.toContain(wert);
  }
  expect(fehler).toEqual([]);
  await kontext.close();
  fs.rmSync(datei, { force: true });
});
