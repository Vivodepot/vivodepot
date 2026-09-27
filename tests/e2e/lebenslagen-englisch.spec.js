'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Die englische Ausgabe zeigt die Lebenslagen englisch (26.09.2026, Befund
   LEBENSLAGEN-EN-DEUTSCH-LECK)
   ────────────────────────────────────────────────────────────────────────
   privat-en v803 zeigte unter „What belongs here“ alle 22 Lebenslagen mit
   deutschem Namen und deutscher Unterlagenliste, und im Lage-Blatt deutsche
   Hinweise: der Katalog ist deutsch, und die Lesestellen lasen ihn roh. Seit
   dem Fix lesen die Katalogeinträge über den Sprachsatz.
   Probe: im gebackenen privat-en steht in der Bestandsauswahl KEIN Name und
   KEINE Unterlagenliste des deutschen Katalogs, und das Lage-Blatt
   „Separation or divorce“ zeigt keinen deutschen Hinweis.
   ROT-BEWEIS: eine Kopie desselben Produkts, deren Katalog-Getter wieder roh
   lesen (der Stand v803), zeigt die deutschen Texte — die Probe fände sie.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { GEBACKENE_PRODUKT_PFADE } = require('./global-setup.js');
const { oeffneApp, depotAnlegen } = require('./helpers.js');

const KATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'tools', 'lebenslagen-katalog-modul.json'), 'utf8')).bausteine;
const DEUTSCH = new Set(KATALOG.flatMap((b) => [b.name, b.unterlagen, ...(b.hinweise || [])]).filter(Boolean));

async function deutscheLagetexte(seite) {
  await seite.evaluate(() => { const V = window.__vdOeffentlich; V.aktiveAnsicht = 'bestand-auswahl'; V.renderContent(); });
  const auswahl = await seite.$$eval('.lage-name, .lage-unterlagen', (els) => els.map((e) => e.textContent.trim()));
  expect(auswahl.length, 'Vorbedingung: die Bestandsauswahl zeigt Lebenslagen').toBeGreaterThan(20);
  // Das Lage-Blatt öffnet der Kern selbst (oeffneLebenslage, öffentliche Fläche): „Trennung oder Scheidung“ ist ein
  // Ereignis und steht nicht in der Bestandsauswahl, trägt aber fünf der sechzehn Hinweise.
  await seite.evaluate(() => window.__vdOeffentlich.oeffneLebenslage('trennung-scheidung'));
  await expect(seite.locator('.hinweis-box').first()).toBeVisible();
  const titel = await seite.$$eval('h1, h2', (els) => els.map((e) => e.textContent.trim()));
  const hinweise = await seite.$$eval('.hinweis-box', (els) => els.map((e) => e.textContent.trim()));
  return [...auswahl, ...titel, ...hinweise].filter((t) => DEUTSCH.has(t));
}

test('[Lebenslagen·EN] privat-en zeigt in der Bestandsauswahl und im Lage-Blatt keinen deutschen Lagetext', async ({ page }) => {
  await oeffneApp(page, { url: 'file://' + GEBACKENE_PRODUKT_PFADE['privat-en'] });
  await depotAnlegen(page);
  expect(await deutscheLagetexte(page)).toEqual([]);
});

test('[Lebenslagen·EN·Rot-Beweis] liest der Katalog wieder roh (Stand v803), findet die Probe die deutschen Texte', async ({ page }) => {
  const text = fs.readFileSync(GEBACKENE_PRODUKT_PFADE['privat-en'], 'utf8');
  const roh = text
    .replace("_lebenslageText(roh.id, 'label', roh.name)", 'roh.name')
    .replace("_lebenslageText(roh.id, 'unterlagen', roh.unterlagen)", 'roh.unterlagen')
    .replace("_lebenslageText(roh.id, 'hinweis.' + i, h)", 'h');
  expect(roh, 'Vorbedingung: die drei Getter ließen sich zurückdrehen').not.toBe(text);
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'lebenslagen-en-'));
  try {
    const datei = path.join(ordner, 'vivodepot.html');
    fs.writeFileSync(datei, roh, 'utf8');
    await oeffneApp(page, { url: 'file://' + datei });
    await depotAnlegen(page);
    const deutsch = await deutscheLagetexte(page);
    expect(deutsch).toContain('Trennung oder Scheidung');
    expect(deutsch.length).toBeGreaterThan(20);
  } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
});
