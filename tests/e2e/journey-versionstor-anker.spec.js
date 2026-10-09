'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Journey (b), Durchklick-Abnahme 23.09.2026 (Auftrag): das Versionstor
   (Befund VERSIONSSCHRAEGE, tests/versionsschraege-tor.test.js im Kern) im echten Browser, für den
   ANKER. Eine Datei mit schemaVersion = AKTUELL + 1 wird über die Oberfläche geöffnet:
   der Hinweis ist sichtbar, ein Bearbeitungsversuch ändert nichts, und es wird NICHTS
   geschrieben (kein Autosave, kein Speichern-Klick) — die Datei bleibt byte-gleich.
   SUB: hier NICHT abgedeckt — der bare Kanal führt keinen Zugriff auf die Daten eines betretenen
   Subs (ankerDaten() liefert im Sub den Anker), die neuere Sub-Datei ist darum von der
   Oberfläche aus nicht herstellbar. Der Sub-Fall bleibt bei tests/versionsschraege-tor.test.js.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  KERN_URL_PRIVAT_DE, KERN_URL_PRIVAT_EN, oeffneApp, depotAnlegen, oeffneSektor,
} = require('./helpers.js');

const PW = 'versionstor-anker-pw-2026';

async function zaehlendeAttrappe(page) {
  await page.evaluate(() => {
    window.__bwBytes = null; window.__schreibvorgaenge = 0;
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({
        name: 'versionstor.vivodepot',
        createWritable: async () => {
          let s = '';
          return {
            write: async (c) => { s += typeof c === 'string' ? c : await c.text(); },
            close: async () => { window.__schreibvorgaenge += 1; window.__bwBytes = s; },
          };
        },
      }),
    });
  });
}

async function journey(page, url) {
  test.setTimeout(180000);
  const fehler = [];
  page.on('pageerror', (e) => fehler.push('pageerror: ' + e.message));
  await page.addInitScript(() => { try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {} });
  await oeffneApp(page, { url });
  await zaehlendeAttrappe(page);
  await depotAnlegen(page, { pw: PW });

  const neuer = await page.evaluate(() => {
    const V = window.__vdOeffentlich;
    V.personHinzufuegen({ name: 'Nora Neu', tel: '0301234567', beziehung: 'Freund' });
    V.sektorFeldSetzen('identity', 'givenName', 'Vorher');
    V.bearbeitungSpeichern();
    const d = V.ankerDaten();
    d.schemaVersion = d.schemaVersion + 1;
    return d.schemaVersion;
  });
  // Das Anlegen schreibt schon eine Datei in dieselbe Attrappe (Zug 1 „Depot ist Datei“). Ohne Zurücksetzen nahm die Abfrage
  // unten unter Last diese Anlege-Bytes (aktuelle Fassung, Vorname „Maria“ statt „Vorher“) statt der neueren Datei — dann gab es
  // nichts zu sperren und keinen Hinweis (Befund VERSIONSTOR-HINWEIS-AIR-ROT, 08.10.2026 zweimal im pre-push: „kein Dialog offen“).
  await page.evaluate(() => { window.__bwBytes = null; });
  await page.click('#tb-save-status .tb-save-knopf');
  await expect.poll(() => page.evaluate(() => window.__bwBytes !== null), { timeout: 8000 }).toBe(true);
  const bytes = await page.evaluate(() => window.__bwBytes);
  const datei = path.join(os.tmpdir(), 'journey-b-' + process.pid + '-' + Date.now() + '.vivodepot');
  fs.writeFileSync(datei, bytes, 'utf8');
  const vorher = fs.readFileSync(datei);

  // schließen und die neuere Datei über die Oberfläche öffnen
  if (await page.locator('#m-ok').isVisible().catch(() => false)) await page.click('#m-ok');
  await page.click('#tb-marke');
  if (await page.locator('#m-ok').isVisible().catch(() => false)) await page.click('#m-ok');
  await page.waitForSelector('#w-anlass', { state: 'visible', timeout: 10000 });
  await zaehlendeAttrappe(page);
  await page.click('#w-datei');
  await page.setInputFiles('#co-datei', datei);
  await page.fill('#co-pw', PW);
  await page.click('#w-oeffnen');
  await page.waitForSelector('#app.an', { state: 'attached', timeout: 20000 });

  // Fehlt der Hinweis, nennt die Meldung den offenen Dialog und die letzten Dialogtitel (Befund VERSIONSTOR-HINWEIS-AIR-ROT:
  // am 05.10.2026 auf dem Prüfrechner rot, ohne dass zu sehen war, was den Platz hielt).
  const hinweisDa = await page.locator('#neuere-fassung-hinweis').waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
  if (!hinweisDa) {
    const lage = await page.evaluate(() => ({
      offen: document.getElementById('modal-rueck').classList.contains('an') ? (document.getElementById('modal-titel') || {}).textContent : '(kein Dialog offen)',
      spur: window.__vdOeffentlich._dialogSpur(),
    }));
    expect(hinweisDa, 'der sichtbare Hinweis „nur lesen" fehlt — offen: ' + lage.offen + ' · Spur: ' + JSON.stringify(lage.spur)).toBe(true);
  }
  expect(await page.evaluate(() => window.__vdOeffentlich.ankerDaten().schemaVersion)).toBe(neuer);
  await page.click('#m-ok');

  // Bearbeitungsversuch über die Oberfläche
  await oeffneSektor(page, 'identity');
  const feld = page.locator('[data-edit="givenName"]').first();
  await feld.fill('Veraendert');
  await feld.blur();
  await page.waitForTimeout(2500);   // länger als jeder Autosave-Verzug

  expect(await page.evaluate(() => window.__vdOeffentlich.istUngespeichert()), 'die Änderung ist als „zu speichern" markiert').toBe(false);
  const gespeichert = page.locator('#tb-save-status .tb-save-knopf');
  if (await gespeichert.isVisible().catch(() => false)) await gespeichert.click().catch(() => {});
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__schreibvorgaenge), 'die neuere Datei wurde neu geschrieben').toBe(0);
  // Bekannte Lücke, NICHT hier hart geprüft: die Oberfläche nimmt die Eingabe im Arbeitsspeicher an
  // (kernAPI.schreibBereich läuft nicht durch das Tor) — Befund VERSIONSTOR-UI-SCHREIBWEG, Probe
  // tests/versionstor-ui-schreibweg.test.js (todo). Auf der Platte hält das Tor, das ist der Gegenstand hier.
  expect(fs.readFileSync(datei).equals(vorher), 'die Datei ist nicht byte-gleich').toBe(true);
  // Zweite Facette desselben Befunds: nach dem Arbeitsspeicher-Schreiben wirft urheberschaftAnhaengen den
  // Tor-Fehler UNGEFANGEN aus dem Feld-Handler (pageerror mit dem Hinweistext). Nur dieser eine ist bekannt.
  const unbekannt = fehler.filter((f) => !/neueren Vivodepot-Fassung|newer version of Vivodepot/i.test(f));
  expect(unbekannt).toEqual([]);
  fs.rmSync(datei, { force: true });
}

test('[Journey b·Anker·privat-de] Datei mit AKTUELL+1: Hinweis sichtbar, Bearbeiten ändert nichts, nichts wird geschrieben', async ({ page }) => { await journey(page, KERN_URL_PRIVAT_DE); });
test('[Journey b·Anker·privat-en] Datei mit AKTUELL+1: Hinweis sichtbar, Bearbeiten ändert nichts, nichts wird geschrieben', async ({ page }) => { await journey(page, KERN_URL_PRIVAT_EN); });
