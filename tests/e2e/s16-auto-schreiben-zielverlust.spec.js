'use strict';
/* ════════════════════════════════════════════════════════════════════════
   S16 („S16 und S18", 09.08.2026) — Browser-Abnahme, Auflage
   U2-ADR-125 (Browser-Abnahme für alles am Speicher- und Statusweg).

   Der Fall, der zählt (Auftragswortlaut): eine Datei auf einem Ziel, das
   ZWISCHEN zwei automatischen Schreibversuchen verschwindet. Ansage einmal,
   danach Ruhe, und der Zähler steht ehrlich auf ungespeichert.

   Node-Tests (tests/s16-auto-datei-schreiben.test.js) belegen die Logik
   bereits synchron gegen den Kern (inkl. der echten 2000-ms-Entprellung).
   Dieser Spec belegt sie über ECHTE Feld-Blur-Events im Browser — der Weg,
   den Node NICHT prüfen kann (`document.addEventListener` ist im
   Node-Test-Stub ein No-Op, Event-Blindzone U2-ADR-091). `setzeFeld()` aus
   helpers.js ruft `bearbeitungSpeichern()` direkt auf und umgeht damit genau
   den Blur-Listener, den dieser Spec prüfen soll — darum ein eigener,
   schlanker Helfer hier, der wirklich `page.fill()` + echtes Blur nutzt.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

const PW = 's16-e2e-passwort-963';

// Ein Handle mit einer echten Permissions-Oberfläche — von AUSSEN (window.__s16Zustand)
// umschaltbar, simuliert den Stick, der zwischen zwei automatischen Schreibversuchen
// verschwindet. Dieselbe Attrappen-Form wie s11-zielwechsel-sichtbar.spec.js.
async function fsaAttrappeEinrichten(page) {
  await page.evaluate(() => {
    window.__s16Zustand = { berechtigung: 'granted', schreibversuche: 0 };
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({
        name: 's16-e2e-test.vivodepot',
        queryPermission: async () => window.__s16Zustand.berechtigung,
        requestPermission: async () => window.__s16Zustand.berechtigung,
        createWritable: async () => {
          if (window.__s16Zustand.berechtigung !== 'granted') {
            throw new DOMException('simuliert', 'NotAllowedError');
          }
          window.__s16Zustand.schreibversuche++;
          return { write: async () => {}, close: async () => {} };
        },
      }),
    });
  });
}

// Echtes Feld-Blur — NICHT setzeFeld() aus helpers.js (ruft bearbeitungSpeichern() direkt
// auf, umgeht den Blur-Listener, den dieser Spec gerade prüfen soll).
async function feldSetzenMitEchtemBlur(page, feldId, wert) {
  const feld = page.locator(`[data-edit="${feldId}"]`);
  await feld.fill(wert);
  await feld.blur();
}

async function wiedereinstiegHinweisSchliessenFallsDa(page) {
  if (await page.locator('#wiedereinstieg-hinweis').isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.click('#m-ok');
    await page.locator('#wiedereinstieg-hinweis').waitFor({ state: 'hidden' });
  }
}

test('[S16·Chromium] echtes Feld-Blur schreibt automatisch — Ziel verliert Berechtigung zwischen zwei Versuchen: Ansage einmal, danach Ruhe, Zähler ehrlich ungespeichert', async ({ page }) => {
  test.setTimeout(30000);
  // GEÄNDERT (Auftrag, 12.09.2026): dieser Test zählt FSA-Schreibversuche
  // (`schreibversuche`) — reine Datei-Weg-Instrumentierung. Unter internem Speicher (ADR-237)
  // läuft der automatische Schreibversuch über IndexedDB, die FSA-Attrappe zählt nie mit.
  // Datei-Modus erzwungen (Topf A).
  await page.addInitScript(() => {
    try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {}
  });
  await oeffneApp(page);
  await fsaAttrappeEinrichten(page);
  await depotAnlegen(page, { pw: PW });
  await wiedereinstiegHinweisSchliessenFallsDa(page);

  // depotAnlegen() selbst holt bereits ein Dateiziel VOR dem Anlegen und schreibt es
  // (Zug 1, „Depot ist Datei") — das ist der erste Schreibversuch, nicht Teil dieses Belegs.
  const versucheNachAnlegen = await page.evaluate(() => window.__s16Zustand.schreibversuche);
  expect(versucheNachAnlegen, 'Vorbedingung: das Anlegen selbst hat bereits einmal geschrieben').toBe(1);

  await oeffneSektor(page, 'identity');
  await feldSetzenMitEchtemBlur(page, 'givenName', 'Erste Eingabe');
  // Entprellung real abwarten (Produktkonstante 2000 ms) + Sicherheitsspanne.
  await page.waitForTimeout(2500);
  const versucheNachErstem = await page.evaluate(() => window.__s16Zustand.schreibversuche);
  expect(versucheNachErstem, 'der erste automatische Schreibversuch (nach dem Anlegen) muss wirklich gelaufen sein').toBe(2);
  await expect(page.locator('.tb-save-status')).toHaveClass(/ist-gespeichert/, { timeout: 5000 });

  // Der Stick verschwindet — Berechtigung geht zwischen zwei automatischen Versuchen verloren.
  await page.evaluate(() => { window.__s16Zustand.berechtigung = 'denied'; });
  await feldSetzenMitEchtemBlur(page, 'familyName', 'Zweite Eingabe nach Zielverlust');
  await page.waitForTimeout(2500);

  // Die S11-Ansage muss sichtbar sein — ein Modal, kein flüchtiger Toast.
  const modalText = await page.evaluate(() => (document.getElementById('modal-inhalt') || {}).innerText || '');
  expect(modalText.length, 'die Bürgerin bekommt eine Ansage, kein stilles Nichts').toBeGreaterThan(0);
  expect(modalText).toMatch(/nicht mehr aktuell|nicht aktuell/i);

  // Zähler bleibt ehrlich: die zweite Änderung ist NICHT als gesichert markiert.
  await expect(page.locator('.tb-save-status')).not.toHaveClass(/ist-gespeichert/);

  // Ruhe danach: Modal schließen, eine WEITERE Änderung darf die Ansage NICHT erneut zeigen
  // (Automatismus ist aus — kein Handle mehr, s. Kern-Test „Automatismus pausiert"). Zugleich
  // darf kein dritter, stiller Schreibversuch mehr gezählt werden.
  await page.click('#m-ok');
  await page.locator('#modal-rueck').waitFor({ state: 'hidden' }).catch(() => {});
  await feldSetzenMitEchtemBlur(page, 'givenName', 'Dritte Eingabe, Automatismus sollte still bleiben');
  await page.waitForTimeout(2500);
  const versucheAmEnde = await page.evaluate(() => window.__s16Zustand.schreibversuche);
  expect(versucheAmEnde, 'nach dem Zielverlust darf kein weiterer automatischer Schreibversuch laufen (bleibt bei 2)').toBe(2);
  const modalTextDanach = await page.evaluate(() => (document.getElementById('modal-inhalt') || {}).innerText || '');
  expect(modalTextDanach.trim(), 'Ruhe nach der einen Ansage — kein wiederholtes Nerven').toBe('');
});

test('[S16·Chromium] ohne je ein Dateiziel gewählt zu haben: kein automatischer Schreibversuch (bewusstes Sichern bleibt der Weg)', async ({ page }) => {
  // KEINE FSA-Attrappe — simuliert Firefox/Safari/Touch (kein Picker, s. Auftragsgrenze 1/3).
  await page.evaluate(() => {
    try { delete window.showSaveFilePicker; } catch (_) {}
  });
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  await oeffneSektor(page, 'identity');
  await feldSetzenMitEchtemBlur(page, 'givenName', 'Ohne Dateiziel');
  await page.waitForTimeout(2500);
  await expect(page.locator('.tb-save-status')).not.toHaveClass(/ist-gespeichert/,
    { timeout: 1000 }).catch(() => {});
  const modalText = await page.evaluate(() => (document.getElementById('modal-inhalt') || {}).innerText || '');
  expect(modalText.trim(), 'ohne Dateiziel darf keine S11-Ansage erscheinen').toBe('');
});
