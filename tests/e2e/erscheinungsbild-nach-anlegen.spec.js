'use strict';
/* Das Erscheinungsbild bleibt nach dem Anlegen eines Depots an (Befund 17.11.2026), im echten Browser.
   Seit der Enge-Stufe tb-eng-s drückte die Kopfleiste beim Ordnen nach dem Anlegen die Sicherungsanzeige bei 768 und 1100 px auf 0 px
   Breite. Die Probe des Erscheinungsbilds las „ohne Fläche“ und schaltete das Modul ab: die Anwendung stand ohne ihre Gestaltung da.
   Belegt bei 768 und 1100 px: nach dem Anlegen kein Rückfall, die Sicherungsanzeige hat Fläche.
   Rot-Beweis: ohne die Mindestbreite der Sicherungsanzeige fällt das Erscheinungsbild bei 768 px zurück. */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { oeffneApp, depotAnlegen, KERN_URL } = require('./helpers');

const MINDESTBREITE = '@media (min-width: 761px) { .tb-save-status:not([hidden]) { min-width: 20px !important; } }';

async function nachAnlegen(page, breite, url) {
  await page.setViewportSize({ width: breite, height: 900 });
  await oeffneApp(page, url ? { url } : undefined);
  await depotAnlegen(page);
  await page.waitForTimeout(800);
  return page.evaluate(() => ({
    rueckfall: typeof ERSCHEINUNGSBILD_RUECKFALL === 'undefined' ? 'unbekannt' : ERSCHEINUNGSBILD_RUECKFALL,
    marke: document.documentElement.getAttribute('data-erscheinungsbild'),
    anzeige: Math.round(document.getElementById('tb-save-status').getBoundingClientRect().width),
  }));
}

for (const breite of [768, 1100]) {
  test(`Erscheinungsbild ${breite}: nach dem Anlegen kein Rückfall, die Sicherungsanzeige hat Fläche`, async ({ page }) => {
    const r = await nachAnlegen(page, breite);
    expect(r.rueckfall, `${breite}: kein Rückfall des Erscheinungsbilds`).toBe(null);
    expect(r.marke, `${breite}: die Wurzel trägt keine Rückfall-Marke`).not.toBe('rueckfall');
    expect(r.anzeige, `${breite}: die Sicherungsanzeige hat Fläche`).toBeGreaterThanOrEqual(1);
  });
}

test('Erscheinungsbild 768 Rot-Beweis: ohne die Mindestbreite der Sicherungsanzeige fällt es nach dem Anlegen zurück', async ({ page }) => {
  // Eine Kopie des gebackenen Produkts im selben Ordner (relative Nachbardateien bleiben erreichbar), ohne die Mindestbreite.
  const original = decodeURIComponent(KERN_URL.replace(/^file:\/\//, ''));
  const text = fs.readFileSync(original, 'utf8');
  expect(text.split(MINDESTBREITE).length, 'die Mindestbreite steht genau einmal im gebackenen Produkt').toBe(2);
  const kopie = path.join(path.dirname(original), 'rot-beweis-anzeige-' + process.pid + '-' + path.basename(original));
  fs.writeFileSync(kopie, text.replace(MINDESTBREITE, ''));
  try {
    const r = await nachAnlegen(page, 768, 'file://' + kopie);
    expect(Array.isArray(r.rueckfall) && r.rueckfall.length > 0, 'Rot-Beweis: ohne Mindestbreite fällt das Erscheinungsbild zurück').toBe(true);
  } finally { fs.rmSync(kopie, { force: true }); }
});
