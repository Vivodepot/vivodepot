'use strict';
/* Browser-Probe der Umbau-Verzeichnisse (Erreichbarkeits-Probe U-E, Bau Div RbB 13.11.2026).
   Je Eintrag und je Breite (375, 1280): Lage herstellen, den Weg Schritt für Schritt klicken, Erwartung prüfen, kein Seitenfehler.
   Quellen: tests/fixtures/umbau-verzeichnis-*.json (echte Verzeichnisse, heute keine im Baum) und die beiden Fälle unten.
   ROT-BEWEIS: VD_UMBAU_ROTBEWEIS=1 fährt den gepflanzten Fall, der mit Absicht ins Leere zeigt; test.fail macht ihn grün, wenn er rot wird. */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers.js');

const BREITEN = [375, 1280];
const STUDIO_URL = 'file://' + (process.env.STUDIO_DATEI || path.join(__dirname, '..', '..', 'vivodepot-studio.html'));
const ROTBEWEIS = process.env.VD_UMBAU_ROTBEWEIS === '1';

/* Die Fälle im Baum: ein Positivfall (muss grün sein) und der gepflanzte Rot-Beweis (nur mit VD_UMBAU_ROTBEWEIS=1). */
const FAELLE_EIGEN = [
  { quelle: 'inline', kennung: 'gutStart', lage: 'start', weg: { alle: ['#w-anlegen'] }, erwartung: '#id-vorname' },
  { quelle: 'inline', kennung: 'gutStudio', lage: 'studio', weg: { alle: ['#start-leer'] }, erwartung: '#raum-bau' },
];

/* Echte Verzeichnisse einlesen; nur „neu platziert“ mit Weg zählt. */
function faelleAusVerzeichnissen() {
  const ziel = path.join(__dirname, '..', 'fixtures');
  const out = [];
  for (const n of fs.readdirSync(ziel).filter((x) => /^umbau-verzeichnis-.*\.json$/.test(x))) {
    const verz = JSON.parse(fs.readFileSync(path.join(ziel, n), 'utf8'));
    for (const e of verz.eintraege || []) {
      if (e.zustand !== 'neu platziert' || !e.neuer_platz) continue;
      out.push({ quelle: n, kennung: e.kennung, lage: e.neuer_platz.lage, weg: e.neuer_platz.weg, erwartung: e.neuer_platz.erwartung });
    }
  }
  return out;
}

/* Die Lage herstellen, die der Eintrag verlangt. */
async function lageHerstellen(page, lage) {
  if (lage === 'studio') {
    await page.goto(STUDIO_URL);
    await page.waitForSelector('#raum-start', { state: 'visible' });
    return;
  }
  if (lage === 'start') {
    await oeffneApp(page);
    return;
  }
  await oeffneApp(page);
  await depotAnlegen(page);
  if (lage === 'depot') return;
  if (lage === 'sub-kontext') {
    /* Über die Oberfläche: Pille → Verwaltung → Sub-Depot neu → entsiegeln → betreten. */
    const pw = 'e2e-sub-pw-123';
    await page.click('#tb-depot-pille');
    await page.waitForSelector('#tb-depot-menue-verwaltung', { state: 'visible' });
    await page.click('#tb-depot-menue-verwaltung');
    await page.waitForSelector('#sub-neu', { state: 'visible' });
    await page.click('#sub-neu');
    await page.waitForSelector('#id-vorname', { state: 'visible' });
    await page.fill('#id-vorname', 'Mama');
    if (await page.isVisible('#id-pw-eigen-weg')) await page.click('#id-pw-eigen-weg');
    await page.fill('#id-pw', pw);
    await page.fill('#id-pw2', pw);
    await page.click('#m-ok');
    await page.waitForSelector('#id-vorname', { state: 'detached' });
    await page.waitForSelector('[data-entsiegeln]', { state: 'attached' });
    const uuid = await page.getAttribute('[data-entsiegeln]', 'data-entsiegeln');
    await page.click(`[data-entsiegeln="${uuid}"]`);
    await page.waitForSelector('#sub-auf', { state: 'visible' });
    await page.fill('#sub-auf', pw);
    await page.click('#m-ok');
    await page.waitForSelector('#sub-auf', { state: 'detached' });
    // „Mit Passwort öffnen“ führt seit 30.10.2026 selbst hinein (UX-SUBDEPOT-RUECKWEG); kein Klick auf „Dieses Depot ansehen“ mehr.
    await page.waitForSelector('html.sub-kontext', { state: 'attached' });
    return;
  }
  if (lage.startsWith('bereich:')) {
    await oeffneSektor(page, lage.slice('bereich:'.length));
    return;
  }
  throw new Error('lage unbekannt oder nicht gebaut: ' + lage);
}

/* Den Weg gehen: jeder Schritt sichtbar und bedienbar, dann die Erwartung. */
async function wegGehen(page, fall, breite) {
  const schritte = (fall.weg && (fall.weg[String(breite)] || fall.weg.alle)) || [];
  if (!schritte.length) throw new Error('kein Weg für Breite ' + breite);
  for (const sel of schritte) {
    const ort = page.locator(sel).first();
    await expect(ort, 'Schritt nicht sichtbar: ' + sel).toBeVisible({ timeout: 8000 });
    await ort.click({ timeout: 8000 });
  }
  if (fall.erwartung) await expect(page.locator(fall.erwartung).first(), 'Erwartung fehlt: ' + fall.erwartung).toBeVisible({ timeout: 8000 });
}

/* Rot-Beweis: die gepflanzten Einträge aus tests/fixtures/umbau-verzeichnis-rotbeweis/ (Datei, nicht Inline). */
function faelleAusRotbeweis() {
  const datei = path.join(__dirname, '..', 'fixtures', 'umbau-verzeichnis-rotbeweis', 'umbau-verzeichnis-rotbeweis.json');
  const verz = JSON.parse(fs.readFileSync(datei, 'utf8'));
  return verz.eintraege.map((e) => ({ quelle: 'rotbeweis', kennung: e.kennung, lage: e.neuer_platz.lage, weg: e.neuer_platz.weg }));
}

const FAELLE = ROTBEWEIS ? faelleAusRotbeweis() : [...FAELLE_EIGEN, ...faelleAusVerzeichnissen()];

for (const breite of BREITEN) {
  for (const fall of FAELLE) {
    /* Der Rot-Beweis erwartet Rot: test.fail macht ihn grün, solange der Weg ins Leere zeigt. */
    const laufen = ROTBEWEIS && fall.quelle === 'rotbeweis' ? test.fail : test;
    laufen(`[Umbau-Erreichbarkeit] ${fall.quelle} ${fall.kennung} bei ${breite}`, async ({ page }) => {
      await page.setViewportSize({ width: breite, height: 900 });
      const fehler = [];
      page.on('pageerror', (e) => fehler.push(String(e && e.message)));
      await lageHerstellen(page, fall.lage);
      await wegGehen(page, fall, breite);
      expect(fehler, 'Seitenfehler').toEqual([]);
    });
  }
}
