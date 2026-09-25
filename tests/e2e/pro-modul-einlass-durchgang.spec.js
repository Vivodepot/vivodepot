'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Der automatische Durchgang für den Modul-Einlass (Auftrag „Ein Pro-Modul zum
   Ansehen, Einlassen und Ausprobieren", Zug 1 — 23.08.2026)
   ────────────────────────────────────────────────────────────────────────────
   Ein Browser-Durchgang über den GANZEN Weg, über den einzig gangbaren Einlassweg
   ohne Signatur (U2-ADR-145): Datei einlassen · Bereich erscheint in der Sidebar ·
   der Ungeprüft-Hinweis steht in den Einstellungen · Depot sichern und schließen ·
   die gesicherte Datei wieder öffnen, der Bereich steht noch da · dieselbe Datei
   ein zweites Mal einlassen (kein zweiter Bereich, keine stille Verdopplung).

   VORAB GEMESSEN, GEGEN DEN AUFTRAG (nicht übernommen): der Auftrag verlangt „ein
   Feld ausfüllen und speichern". Ein `modulTyp:'bereich'`-Modul (der einzig
   gangbare, unsignierte Weg) trägt NUR den Bereichs-CONTAINER (Label/Icon) — keine
   Feld-Definitionen. Feld-Definitionen entstehen ausschließlich über die SIGNIERTE
   Feld-Vorlage (Erzeuger + Zertifikator), die der Auftrag selbst als heute nicht
   gangbar ausschließt (`bereichsModulPruefen`/`BEREICH_MODUL_SCHLUESSEL` kennen
   keinen Feld-Schlüssel). Geprüft wird darum die PERSISTENZ DES BEREICHS SELBST
   über einen echten Sichern-und-wieder-öffnen-Zyklus — dieselbe Klasse Beleg wie
   „ein Feld steht noch da", nur am tatsächlich verfügbaren Gegenstand.

   ECHTER FILE-UPLOAD, kein `page.evaluate(() => window.__vdOeffentlich.ankerDaten().bereichsModule = ...)` —
   der Auftrag verlangt den Weg, den eine Bürgerin tatsächlich geht.

   Dieser Durchgang bleibt stehen: er ist ab jetzt der Wächter dafür, dass der
   Einlassweg nicht still kaputtgeht.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { oeffneApp, depotAnlegen, einstellungenAbschnittOeffnen } = require('./helpers');

const PW = 'pro-modul-e2e-passwort-123';
const BEREICH_ID = 'e2e-betriebsuebergabe';
const MODUL_DATEI_INHALT = JSON.stringify({
  modulTyp: 'bereich', sprache: 'de', moduleVersion: 1, herkunft: 'e2e-pro-modul-durchgang',
  bereiche: { [BEREICH_ID]: { label: 'Betriebsübergabe (Test)', icon: 'landmark' } },
});

function tempModulDatei() {
  const tmp = path.join(os.tmpdir(), 'pro-modul-e2e-' + process.pid + '-' + Date.now() + '.json');
  fs.writeFileSync(tmp, MODUL_DATEI_INHALT, 'utf8');
  return tmp;
}

// Dieselbe FSA-Attrappe wie tests/e2e/zug5-persistenz-rauchtest.spec.js — NACH oeffneApp()
// registriert (überschreibt dessen Default-Attrappe, sonst Registrierungsreihenfolge-Falle).
async function fsaAttrappeEinrichten(page) {
  await page.evaluate(() => {
    window.__proModulBytes = null;
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({
        name: 'pro-modul-e2e-test.vivodepot',
        createWritable: async () => {
          let stueck = '';
          return {
            write: async (chunk) => {
              if (typeof chunk === 'string') { stueck += chunk; }
              else if (chunk && typeof chunk.text === 'function') { stueck += await chunk.text(); }
            },
            close: async () => { window.__proModulBytes = stueck; },
          };
        },
      }),
    });
  });
}

async function sichernUndSchliessen(page) {
  await page.click('#tb-marke');
  await page.locator('#m-ok').waitFor({ state: 'visible' });
  await page.click('#m-ok');
  await page.waitForSelector('#w-anlass', { state: 'visible', timeout: 10000 });
}

async function oeffneEinstellungen(page) {
  await page.locator('#tb-einstellungen').click();
  // D.4 (Rest-Sichten, 26.08.2026): „Eingelassene Erweiterungen" liegt jetzt hinter <details>,
  // kollabiert per Default — erst aufklappen, dann ist der Einlass-Knopf sichtbar.
  await einstellungenAbschnittOeffnen(page, '#einst-modul-einlassen');
  await expect(page.locator('#einst-modul-einlassen')).toBeVisible();
}

async function moduleDateiEinlassen(page, dateipfad) {
  await oeffneEinstellungen(page);
  await page.locator('#einst-modul-datei').setInputFiles(dateipfad);
}

test('[Pro-Modul·1] Datei einlassen — der Bereich erscheint in der Sidebar', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  await moduleDateiEinlassen(page, tempModulDatei());
  await page.locator('#m-ok').click();   // Einstellungen-Modal schließen, um die Sidebar zu sehen
  await expect(page.locator('[data-sektor="' + BEREICH_ID + '"]')).toContainText('Betriebsübergabe (Test)');
});

test('[Pro-Modul·2] der Ungeprüft-Hinweis steht in den Einstellungen, mit Typ und Wortlaut für Menschen', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  await moduleDateiEinlassen(page, tempModulDatei());
  await expect(page.locator('.einst-modulliste')).toContainText('bereich');
  // Der Wortlaut, den eine Bürgerin tatsächlich liest — nicht der interne Schlüsselname
  // "ungeprueft". Zug 3, erste Frage vorweggenommen: der Hinweis steht HIER, in den
  // Einstellungen — nicht an der Stelle, an der der Bereich selbst zu sehen ist (s. Bericht).
  await expect(page.locator('#modal-inhalt')).toContainText('Niemand hat sie geprüft');
});

test('[Pro-Modul·3] Depot sichern und schließen, die gesicherte Datei wieder öffnen — der eingelassene Bereich steht noch da', async ({ page }) => {
  await oeffneApp(page);
  await fsaAttrappeEinrichten(page);
  await depotAnlegen(page, { pw: PW });
  await moduleDateiEinlassen(page, tempModulDatei());
  await page.locator('#m-ok').click();
  await expect(page.locator('[data-sektor="' + BEREICH_ID + '"]')).toHaveCount(1, 'Vorbedingung: der Bereich ist da, bevor gesichert wird');

  await sichernUndSchliessen(page);
  const bytes = await page.evaluate(() => window.__proModulBytes);
  expect(bytes, 'die FSA-Attrappe muss Bytes aufgefangen haben (close() lief) — sonst prüft der Test nichts').toBeTruthy();

  const dateiPfad = path.join(os.tmpdir(), 'pro-modul-e2e-depot-' + Date.now() + '.vivodepot');
  fs.writeFileSync(dateiPfad, bytes, 'utf8');
  try {
    await page.click('#w-datei');
    await page.setInputFiles('#co-datei', dateiPfad);
    await page.fill('#co-pw', PW);
    await page.click('#w-oeffnen');
    await page.waitForSelector('#app.an', { state: 'attached' });
    await expect(page.locator('[data-sektor="' + BEREICH_ID + '"]')).toContainText('Betriebsübergabe (Test)');
  } finally {
    fs.rmSync(dateiPfad, { force: true });
  }
});

test('[Pro-Modul·4] dieselbe Datei ein zweites Mal einlassen — kein zweiter, kein Fehler, keine stille Meldung', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  const dateipfad = tempModulDatei();
  await moduleDateiEinlassen(page, dateipfad);
  await page.locator('#m-ok').click();
  await expect(page.locator('[data-sektor="' + BEREICH_ID + '"]')).toHaveCount(1);

  // Zweiter Einlass derselben Datei, ohne das Depot zu schließen.
  await moduleDateiEinlassen(page, dateipfad);
  await page.locator('#m-ok').click();
  // DER BEFUND (Zug 3, dritte Frage): der Bereich bleibt einfach, wie er war — kein
  // Fehler, keine sichtbare Meldung „schon da". `_bereichsModuleAusDepotAnmelden`
  // entdoppelt über die ID; der zweite Einlass-VORGANG selbst wird nicht zurückgewiesen
  // (zwei Einträge könnten in `data.bereichsModule[]` stehen), aber die SICHTBARE
  // Wirkung bleibt EIN Bereich.
  await expect(page.locator('[data-sektor="' + BEREICH_ID + '"]')).toHaveCount(1);
});
