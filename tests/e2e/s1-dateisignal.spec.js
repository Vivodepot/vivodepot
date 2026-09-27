'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Reise — „Das Datei-Signal" (10.08.2026), Zug 1/3.

   Drei Fälle, je real rot gesehen (Regel 18):
     1. Frisch angelegt + bestätigt (FSA-Picker) → Signal steht sofort.
     2. Frisch aus Datei geöffnet → Signal steht sofort, ohne jede Eingabe.
     3. Download ohne Quittung (kein FSA) → Signal steht NICHT (ehrlich
        „unbestätigt", nicht „nicht aktuell" UND nicht „gespeichert").

   `.tb-save-status` trägt genau eine der Klassen ist-gespeichert/ist-keine-
   datei/ist-ungespeichert/ist-unbestaetigt/ist-fehlgeschlagen (renderSaveStatus).
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, KERN_URL_PRIVAT_DE } = require('./helpers');

test('[S1] frisch angelegt + Picker bestätigt: der Anlege-Schreibversuch zählt NICHT als Signal (U2-ADR-222)', async ({ page }) => {
  // Bis U2-ADR-222 (02.09.2026) stand hier die ursprüngliche Auftrags-Erwartung: "Signal steht
  // sofort". Gemessen (U2-ADR-222-Anker): genau das war der Fehler — der Anlege-Schreibversuch
  // erzeugt eine strukturell LEERE Datei (nur Akteur/Namensfelder), und ein grünes Häkchen darauf
  // behauptete eine Sicherung, die es nicht gab. Die ehrliche Klasse nach dem Fix ist
  // ist-keine-datei ("Ihre Datei ist nicht aktuell") — nicht ist-gespeichert.
  // GEÄNDERT (Auftrag, 12.09.2026): das Datei-Signal ist per Definition ein Datei-Weg-
  // Konzept — unter internem Speicher (ADR-237) läuft der Anlege-Schreibversuch über IndexedDB,
  // die FSA-Attrappe sähe dann nie etwas. Datei-Modus erzwungen (Topf A des Sortierungs-Berichts).
  await page.addInitScript(() => {
    try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {}
  });
  await oeffneApp(page);   // fsaStandardAttrappeEinrichten — echter Schreibweg, Picker "bestätigt"
  await depotAnlegen(page);   // füllt Vorname/Nachname UND Passwort — genau der Auftrags-Fall

  await expect(page.locator('.tb-save-status')).toHaveClass(/ist-keine-datei/, { timeout: 5000 });
  await expect(page.locator('.tb-save-status')).not.toHaveClass(/ist-gespeichert/);
});

test('[S1] Download ohne FSA (kein Picker): Signal steht NICHT — ehrlich unbestätigt', async ({ page }) => {
  // GEÄNDERT (Auftrag, 12.09.2026): s. Test oben — Datei-Modus erzwungen.
  await page.addInitScript(() => {
    try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {}
  });
  // Klasse-B-Fund 19.09.2026 (e2e-37-rote-klassen-2026-09-19.md): gebackener privat-de statt
  // der rohen Datei, s. Kopf-Kommentar tests/e2e/helpers.js.
  await page.goto(KERN_URL_PRIVAT_DE);
  await page.waitForSelector('#w-anlass', { state: 'visible' });
  // Kein FSA — der Nicht-Picker-Weg (Namens-Dialog #datei-name, Download).
  await page.evaluate(() => { try { delete window.showSaveFilePicker; } catch (_) {} });

  await depotAnlegen(page);

  // Weder „gespeichert" (kein Handle, kein bestätigter Schreibvorgang) noch „keine-datei"
  // (das wäre die alte, falsche Aussage) — der ehrliche dritte Zustand.
  await expect(page.locator('.tb-save-status')).toHaveClass(/ist-unbestaetigt/, { timeout: 5000 });
  await expect(page.locator('.tb-save-status')).not.toHaveClass(/ist-gespeichert/);
  await expect(page.locator('.tb-save-status')).not.toHaveClass(/ist-keine-datei/);
});

test('[S1] frisch aus Datei geöffnet: Signal steht sofort, ohne jede Eingabe', async ({ page }) => {
  // Depot anlegen + Datei-Inhalt abgreifen (der FSA-Attrappe „schreibt" in einen Puffer).
  // addInitScript (nicht evaluate): muss VOR den Seiten-Skripten laufen und die Navigation
  // überleben — page.evaluate() auf der noch leeren Seite ginge beim folgenden goto() verloren.
  // GEÄNDERT (Auftrag, 12.09.2026): Datei-Modus erzwungen (Topf A) — WICHTIG auch für den
  // Reload weiter unten: addInitScript() überlebt die Navigation, ein einzelner page.evaluate()
  // hier würde beim folgenden page.goto() verlorengehen.
  await page.addInitScript(() => {
    try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {}
  });
  await page.addInitScript(() => {
    window.__s1Datei = null;
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({
        name: 's1-open-test.vivodepot',
        createWritable: async () => ({
          write: async (blob) => { window.__s1Datei = await blob.text(); },
          close: async () => {},
        }),
      }),
    });
  });
  // Klasse-B-Fund 19.09.2026 (e2e-37-rote-klassen-2026-09-19.md): gebackener privat-de statt
  // der rohen Datei, s. Kopf-Kommentar tests/e2e/helpers.js.
  await page.goto(KERN_URL_PRIVAT_DE);
  await page.waitForSelector('#w-anlass', { state: 'visible' });
  await depotAnlegen(page, { pw: 's1-open-pw-741' });

  const dateiText = await page.evaluate(() => window.__s1Datei);
  expect(dateiText, 'die Attrappe muss den echten Dateiinhalt abgefangen haben').toBeTruthy();

  // Frisch laden (neuer Tab-Zustand), die abgegriffene Datei über den Öffnen-Weg einlesen.
  await page.evaluate(() => { try { delete window.data; } catch (_) {} });
  await page.reload();
  await page.waitForSelector('#w-anlass', { state: 'visible' });
  await page.click('#w-datei');
  await page.waitForSelector('#co-pw', { state: 'visible' });
  await page.evaluate((inhalt) => {
    const datei = new File([inhalt], 's1-open-test.vivodepot', { type: 'application/octet-stream' });
    window.__s1FakeFile = datei;
  }, dateiText);
  // co-datei ist ein echtes <input type=file> — per DataTransfer eine Datei zuweisen (Playwright
  // hat kein natives file-content-inject für einen bereits im Speicher gehaltenen Blob ohne Pfad,
  // darum der DataTransfer-Umweg direkt im Seitenkontext).
  const gesetzt = await page.evaluate(() => {
    const inp = document.getElementById('co-datei');
    if (!inp) return false;
    const dt = new DataTransfer();
    dt.items.add(window.__s1FakeFile);
    inp.files = dt.files;
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  });
  expect(gesetzt, 'Datei-Input im Öffnen-Overlay muss existieren').toBe(true);
  await page.fill('#co-pw', 's1-open-pw-741');
  await page.click('#w-oeffnen');
  await page.waitForSelector('#app.an', { state: 'attached' });
  // Kein einmalDialogeSchliessen() hier — die eigentliche Probe ist die Klasse am Topbar-Element,
  // ein evtl. offenes Einmal-Angebot (Notfallblatt) überlagert sie visuell, ändert sie aber nicht.

  await expect(page.locator('.tb-save-status')).toHaveClass(/ist-gespeichert/, { timeout: 5000 });
  await expect(page.locator('.tb-save-status')).not.toHaveClass(/ist-keine-datei/);
});
