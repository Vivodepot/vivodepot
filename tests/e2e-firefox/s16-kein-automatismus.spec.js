'use strict';
/* ════════════════════════════════════════════════════════════════════════
   S16 („S16 und S18", 09.08.2026) — Firefox-Abnahme.
   Auflage U2-ADR-125 (Browser-Abnahme für alles am Speicher- und Statusweg).

   Auftragsgrenze 1/3, unverhandelbar: „Ohne Picker — Firefox, Safari, Touch
   — bleibt es beim bewussten Sichern." Firefox hat kein File System Access
   API — `_dateiHandle` wird darum NIE gesetzt, die Weiche
   (`_autoDateiSchreibenAnstossen`) bleibt von selbst geschlossen. Dieser
   Spec belegt das über ECHTE Feld-Blur-Events, nicht nur durch Code-Lesen.

   KEIN FSA-Mock hier — Firefox hat ohnehin keinen (s.
   tests/e2e-firefox/zug7-firefox-abnahme.spec.js), das ist der Messgegenstand.
   ════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { depotAnlegen, oeffneSektor } = require('../e2e/helpers');

const { KERN_URL } = require('../e2e/helpers');   // das gebackene Produkt, nicht das Gerüst der rohen Datei
const PW = 's16-firefox-abnahme-741';

async function oeffneAppOhneFsa(page) {
  await page.goto(KERN_URL);
  await page.waitForSelector('#w-anlass', { state: 'visible' });
}

async function feldSetzenMitEchtemBlur(page, feldId, wert) {
  const feld = page.locator(`[data-edit="${feldId}"]`);
  await feld.fill(wert);
  await feld.blur();
}

/* Heute (U2-ADR-237): das Depot liegt im Gerätespeicher, das Anlegen lädt NICHTS herunter. Der Beleg bleibt der alte, in der neuen Fassung:
   ein Feld-Blur löst keinen automatischen Datei-Download und keine Ansage aus — der einzige Datei-Weg ist das bewusste
   „Sicherungskopie erstellen“. Die Kopfzeile zeigt nur den Gerätespeicher-Stand. */
test('[S16·Firefox] echtes Feld-Blur löst KEINEN automatischen Datei-Download aus — kein Ansage-Modal', async ({ page }) => {
  test.setTimeout(20000);
  const downloads = [];
  page.on('download', (dl) => downloads.push(dl.suggestedFilename()));

  await oeffneAppOhneFsa(page);
  const hatPicker = await page.evaluate(() => 'showSaveFilePicker' in window);
  expect(hatPicker, 'Vorbedingung: Firefox hat kein FSA — sonst testet dieser Lauf den falschen Weg').toBe(false);

  await depotAnlegen(page, { pw: PW });
  expect(downloads, 'Vorbedingung: das Anlegen lädt nichts herunter (Gerätespeicher)').toEqual([]);

  await oeffneSektor(page, 'identity');
  await feldSetzenMitEchtemBlur(page, 'givenName', 'Testperson');
  // Entprellung real abwarten (Produktkonstante 2000 ms) + Sicherheitsspanne — lange genug,
  // dass ein fälschlich ausgelöster Automatismus sich gezeigt hätte.
  await page.waitForTimeout(2500);

  expect(downloads, 'kein automatischer Download nach dem Feld-Blur').toEqual([]);
  const modalText = await page.evaluate(() => (document.getElementById('modal-inhalt') || {}).innerText || '');
  expect(modalText.trim(), 'keine S11-Ansage — es gab nie ein Ziel, das verloren gehen könnte').toBe('');
  const status = await page.evaluate(() => {
    const el = document.getElementById('tb-save-status');
    return el ? [...el.classList] : [];
  });
  expect(status, 'die Kopfzeile zeigt den Gerätespeicher-Stand, keinen Datei-Stand („unbestätigt“ gibt es nur nach einer Sicherungskopie)')
    .not.toContain('ist-unbestaetigt');
});
