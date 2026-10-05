'use strict';
/* Altkern im Shop-Bau (v894, U2-ADR-473 Nachtrag) — der Shop baut mit dem jeweils neuen produktTextErzeugen auch aus
   hochgeladenen ALTEN Kernen. Diese Probe wandert mit der letzten Auslieferung mit (aus dem Fassungsregister, über
   tools/lib/altkern-referenz.js) und läuft mit der E2E im pre-push, also bei jeder Änderung am Kern.

   ZUERST byte-gleich: das heutige Werkzeug baut die zuletzt ausgelieferte Fassung aus ihrem kanonCommit und ihren Zutaten
   genau mit der Prüfsumme nach, die das Register trägt (tools/altkern-nachbau-pruefen.js). Eine Abweichung heißt: das
   Werkzeug verändert alte Fassungen still. Rot-Beweis: eine manipulierte Zutat.
   DANACH, als Zusatz, im Browser: die nachgebaute Fassung startet, ein Depot lässt sich anlegen, kein Seitenfehler.

   Der Pixelvergleich des Umzugs (ein einmaliger Lauf von tools/design-bildvergleich.js --basis) bleibt davon getrennt: er belegt, dass
   der Umzug nichts verschiebt, gegen die Basis davor — gegen eine mitwandernde Referenz würde sie jede gewollte
   Gestaltungsänderung bis zur nächsten Auslieferung sperren. */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { oeffneApp, depotAnlegen } = require('./helpers.js');

const REPO = path.join(__dirname, '..', '..');
const { pruefen } = require(path.join(REPO, 'tools', 'altkern-nachbau-pruefen.js'));

test('[Altkern·Shop-Bau] das heutige Werkzeug baut die zuletzt ausgelieferte Fassung byte-gleich nach', () => {
  test.setTimeout(180000);
  const r = pruefen({ produkt: 'privat-de' });
  expect(r.gebaut, r.produkt + ' ' + r.fassung + ' (' + r.kanonCommit + '): das Werkzeug verändert die ausgelieferte Fassung').toBe(r.erwartet);
});

test('[Altkern·Shop-Bau·Rot-Beweis] eine manipulierte Zutat ergibt eine andere Prüfsumme', () => {
  test.setTimeout(180000);
  const r = pruefen({ produkt: 'privat-de', manipuliere: true });
  expect(r.gleich).toBe(false);
});

test('[Altkern·Shop-Bau] die nachgebaute Fassung startet im Browser, ein Depot lässt sich anlegen, kein Seitenfehler', async ({ page }) => {
  test.setTimeout(240000);
  const ablage = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-altkern-'));
  try {
    const r = pruefen({ produkt: 'privat-de', ablage });
    expect(r.gleich, 'Vorbedingung: geöffnet wird genau die ausgelieferte Fassung').toBe(true);
    const fehler = [];
    page.on('pageerror', (e) => fehler.push(e.message));
    await oeffneApp(page, { url: 'file://' + path.join(ablage, 'vivodepot.html') });
    await depotAnlegen(page, { name: 'Maria Mustermann' });
    await expect(page.locator('#app')).toBeVisible();
    expect(fehler, 'unbehandelte Seitenfehler in ' + r.fassung).toEqual([]);
  } finally { fs.rmSync(ablage, { recursive: true, force: true }); }
});
