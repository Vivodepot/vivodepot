'use strict';
/* ═══════════════════════════════════════════════════════════════════════
   Jedes Depot im Gerätespeicher bleibt über die Oberfläche erreichbar (Befund 19.09.2026)
   ───────────────────────────────────────────────────────────────────────
   Auf einem geteilten Gerät kann jemand ohne Passwort „Doch neu anfangen“ wählen und ein zweites Depot anlegen. Gemessen
   (Firefox): nichts wird gelöscht, aber der Sperrschirm öffnete nur den NEUESTEN Record — das Passwort der Inhaberin
   passte dort nicht, ihr Depot lag verschlüsselt unerreichbar im Browser. Jetzt probiert `depotAusIdbLaden` alle eigenen
   Records der Reihe nach; das Passwort öffnet das Depot, zu dem es gehört.

   Diese Probe legt DREI Depots im selben Gerätespeicher an (ein Bereich der Klasse: nicht „zwei“, sondern „alle“), öffnet
   jedes mit seinem Passwort und prüft an einem Marker, dass es das richtige ist. Ein falsches Passwort öffnet keines und
   sagt dasselbe wie immer. Der Rot-Beweis fährt dieselbe Reise gegen eine Kopie des Produkts, in der die Schleife auf den
   neuesten Record verkürzt ist (der alte Stand): dort bleiben die älteren Depots verschlossen.
   ═══════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { depotAnlegen, oeffneSektor, setzeFeld, KERN_URL } = require('./helpers');
const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup');

const DEPOTS = [
  { name: 'Anna Alt', pw: 'pw-anna-1111', marker: 'Annastraße 1' },
  { name: 'Bernd Bald', pw: 'pw-bernd-2222', marker: 'Berndweg 2' },
  { name: 'Clara Neu', pw: 'pw-clara-3333', marker: 'Claraallee 3' },
];

async function neuLaden(page, url) {
  await page.goto(url);
  await page.waitForSelector('#w-anlass, #co-pw', { state: 'visible' });
}
async function sperrschirm(page, url) {
  await neuLaden(page, url);
  await page.waitForSelector('#co-pw', { state: 'visible' });
}
async function entsperren(page, pw) {
  await page.fill('#co-pw', pw);
  await page.click('#w-oeffnen');
  await page.waitForTimeout(2500);
}
async function identitaetMarker(page) {
  await oeffneSektor(page, 'identity');
  return page.locator('[data-edit="streetAddress"]').inputValue();
}

/* Legt die drei Depots an: jedes nach „Doch neu anfangen“ auf dem Sperrschirm des vorigen. Liefert, ob der
   Willkommensschirm dabei den Hinweis (b) trug. */
async function dreiDepotsAnlegen(page, url) {
  await page.goto(url);
  await page.waitForSelector('#w-anlass', { state: 'visible' });
  const hinweise = [];
  for (let i = 0; i < DEPOTS.length; i++) {
    const d = DEPOTS[i];
    if (i > 0) {
      await sperrschirm(page, url);
      await page.click('#co-neu');
      await page.waitForSelector('#w-anlass', { state: 'visible' });
      await page.waitForTimeout(500);
      hinweise.push(await page.locator('#w-intern-hinweis').count());
    }
    await depotAnlegen(page, { name: d.name, pw: d.pw });
    await oeffneSektor(page, 'identity');
    await setzeFeld(page, 'streetAddress', d.marker);
    await page.waitForTimeout(2500);   // Entprellung des Gerätespeichers
  }
  return hinweise;
}

async function anzahlRecords(page) {
  return page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('vivodepot');
    r.onsuccess = () => { const g = r.result.transaction('depots', 'readonly').objectStore('depots').getAll(); g.onsuccess = () => { r.result.close(); res(g.result.length); }; };
    r.onerror = () => res(-1);
  }));
}

test('[Mehrere Depots] jedes Depot im Gerätespeicher öffnet mit seinem Passwort — und der Willkommensschirm sagt, dass ein Depot da ist', async ({ browser }) => {
  test.setTimeout(120000);
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const hinweise = await dreiDepotsAnlegen(page, KERN_URL);
  expect(hinweise, 'auf dem Willkommensschirm nach „Doch neu anfangen“ steht der Hinweis (b)').toEqual([1, 1]);
  expect(await anzahlRecords(page), 'drei Depots liegen im Gerätespeicher').toBe(3);

  for (const d of DEPOTS) {
    await sperrschirm(page, KERN_URL);
    await entsperren(page, d.pw);
    expect(await page.evaluate(() => (document.getElementById('app') || {}).className), d.name + ': die App ist offen').toMatch(/\ban\b/);
    expect(await identitaetMarker(page), d.name + ': es ist das richtige Depot').toBe(d.marker);
  }

  // Ein falsches Passwort öffnet keines und sagt dasselbe wie immer.
  await sperrschirm(page, KERN_URL);
  await entsperren(page, 'pw-falsch-9999');
  await expect(page.locator('#crypto-fehler')).toHaveText('Das Passwort stimmt nicht.');
  expect(await page.evaluate(() => (document.getElementById('app') || {}).className || '')).not.toMatch(/\ban\b/);
  await ctx.close();
});

test('[Mehrere Depots·Rot-Beweis] in einer Kopie, die nur den neuesten Record versucht, bleibt das ältere Depot verschlossen', async ({ browser }) => {
  test.setTimeout(120000);
  const quelle = fs.readFileSync(GEBACKENE_PRODUKT_PFADE['privat-de'], 'utf8');
  const a = quelle.indexOf('async function depotAusIdbLaden(');
  const alt = 'for (const record of liste) {';
  const i = quelle.indexOf(alt, a);
  expect(i > a && i - a < 4000, 'Vorbedingung: die Schleife steht in depotAusIdbLaden').toBe(true);
  const kopie = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mehrdepot-')), 'kern-nur-neuester.html');
  fs.writeFileSync(kopie, quelle.slice(0, i) + 'for (const record of liste.slice(0, 1)) {' + quelle.slice(i + alt.length));
  const url = 'file://' + kopie;

  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  await dreiDepotsAnlegen(page, url);
  expect(await anzahlRecords(page), 'auch hier liegen drei Depots im Speicher').toBe(3);
  // das neueste geht auf
  await sperrschirm(page, url);
  await entsperren(page, DEPOTS[2].pw);
  expect(await identitaetMarker(page)).toBe(DEPOTS[2].marker);
  // das älteste nicht — die Probe schlägt am alten Stand an
  await sperrschirm(page, url);
  await entsperren(page, DEPOTS[0].pw);
  await expect(page.locator('#crypto-fehler')).toHaveText('Das Passwort stimmt nicht.');
  await ctx.close();
});

test('[Mehrere Depots·Hinweis] der Satz auf dem Willkommensschirm steht auf Deutsch und auf Englisch da — und nur, wenn ein Depot da ist', async ({ browser }) => {
  test.setTimeout(90000);
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(KERN_URL);
  await page.waitForSelector('#w-anlass', { state: 'visible' });
  await page.waitForTimeout(500);
  expect(await page.locator('#w-intern-hinweis').count(), 'ohne Depot im Gerätespeicher steht kein Hinweis da').toBe(0);
  await depotAnlegen(page, { name: 'Anna Alt', pw: 'pw-anna-1111' });
  await oeffneSektor(page, 'identity');
  await setzeFeld(page, 'streetAddress', 'Annastraße 1');
  await page.waitForTimeout(2500);
  await sperrschirm(page, KERN_URL);
  await page.click('#co-neu');
  await page.waitForSelector('#w-intern-hinweis', { state: 'visible' });
  await expect(page.locator('#w-intern-hinweis')).toHaveText('Auf diesem Gerät liegt schon ein Depot. Ein neues lässt es unberührt: Beim Entsperren öffnet Ihr Passwort das Depot, zu dem es gehört.');
  await page.click('#vor-depot-sprache');
  await page.waitForSelector('#w-intern-hinweis', { state: 'visible' });
  await expect(page.locator('#w-intern-hinweis')).toHaveText('There is already a depot on this device. Starting a new one leaves it untouched: when you unlock, your password opens the depot it belongs to.');
  await ctx.close();
});
