'use strict';
/* ════════════════════════════════════════════════════════════════════════
   4. Fund (Erhebung 22.07.2026) — fremder Ausstieg aus einem laufenden Wizard
   sichert den offenen Schritt, statt ihn fallenzulassen.
   ────────────────────────────────────────────────────────────────────────
   Der 1b-Guard verhinderte den Falsch-Write (Wizard-Feld → Startsektor), aber
   kein FREMDER Ausstieg (Sidebar, „Jetzt sichern", Schließen, Notfall, Modus)
   rief den wizard-eigenen Speicherpfad: `wizardSchrittSpeichern` läuft nur aus
   Weiter/Zurück/Abbrechen. 1b tauschte damit einen Falsch-Write gegen einen
   Nicht-Write — der getippte Wert des OFFENEN Schritts ging verloren.

   Fix: `bearbeitungSpeichern` DELEGIERT im Wizard an `_wizardSchrittFalten()`,
   statt nur `false` zurückzugeben. Der Guard bleibt.

   Muss im Browser laufen — der Pfad liegt in der Event-Blindzone.
   Prüfung über den ENTSCHLÜSSELTEN Datensatz, beim schwersten Fall über den
   entschlüsselten DATEI-Inhalt (nicht über `data` im Speicher).

   VEHIKEL-WECHSEL 23.07. (U2-ADR-096): Der Spec fuhr auf erbwiz, der ersatzlos
   entfallen ist. Neues Vehikel: pvwiz (Start-Ziel vorsorge) —
     #1 pv_beistand_kirche (text)    → der gültige Fall
     #2 pv_m_lebenserhalt  (auswahl) → der ungültige Fall

   ZUM UNGÜLTIGEN FALL, ausdrücklich: Der alte Test benutzte ein Datum (Jahr 1200 ist
   unplausibel). Nach dem Umbau trägt KEIN Wizard-Schritt mehr ein `datum`, und kein
   Schritt-Feld trägt eine Längen-, Min- oder Max-Regel. Damit ist der Zweig
   „verwerfen, ABER SAGEN" durch normale Bedienung derzeit gar nicht mehr erreichbar —
   nur der stumme Pflicht-/Leer-Zweig ist es. Der Test erzeugt den ungültigen Zustand
   deshalb künstlich: Er hängt dem Auswahl-Feld eine Option an, die die Registry nicht
   kennt. Das ist eine Attrappe, und sie steht hier nur, weil der Zweig NICHT
   aufgegeben werden soll — Datumsfelder kehren mit der Instrument-Liste zurück, und
   bis dahin wäre er sonst ungeprüfter Code. Als Befund vorgemerkt, nicht versteckt.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

const PW = 'e2e-passwort-123';   // == helpers.js Default-PW
const WERT = 'Seelsorge der Gemeinde St. Anna';

// Wizard starten und auf einem bestimmten Schritt einen Wert tippen — OHNE „Weiter".
async function wizardSchrittTippen(page, feldId, wert) {
  await page.evaluate(() => { window.__vdOeffentlich.wizardLauf('pvwiz'); });
  await expect(page.locator('.wizard-frage')).toBeVisible();
  await page.evaluate((fid) => {
    const def = window.__vdOeffentlich.WIZARD_BY_ID.pvwiz;
    window.__vdOeffentlich.wizardSchrittIndex = def.schritte.findIndex(s => s.feld && s.feld.id === fid);
    window.__vdOeffentlich.renderContent();
  }, feldId);
  await expect(page.locator(`#content [data-edit="${feldId}"]`)).toBeVisible();
  if (wert != null) await page.fill(`#content [data-edit="${feldId}"]`, wert);
}

// Der entschlüsselte Datensatz aus dem SPEICHER.
async function ausSpeicher(page) {
  return page.evaluate(async () => {
    const u = await window.__vdOeffentlich.depotSerialisieren();
    const f = await window.__vdOeffentlich.depotLaden(u, 'e2e-passwort-123');
    return {
      ort: (f.sektoren.advanceCare || {}).supportFromChurchOrCommunity || null,
      auswahl: (f.sektoren.advanceCare || {}).lifeSustainingMeasures || null,
      stempel: (((f.urheberschaft || {}).advanceCare || {}).supportFromChurchOrCommunity || []).length,
    };
  });
}

// Sichtbarer Hinweis (Toast) — der Host wird nach 3200 ms geleert, also SOFORT nach der Aktion lesen.
// GEÄNDERT (Auftrag, 12.09.2026): das stille Autosave (ADR-237) erzeugt eigene
// Hintergrund-Toasts ("Gespeichert…", der Wiedereinstiegs-Reminder), die mit JEDER Feld-
// Interaktion auftreten können — unabhängig vom hier geprüften Wizard-Verhalten. „Kein
// Hinweis" heißt gemeint „kein WIZARD-Hinweis", nicht „null DOM-Knoten im Toast-Host".
async function toastTexte(page) {
  return page.$$eval('#toast-host .toast', els => els
    .map(e => e.textContent)
    .filter(t => !/^Gespeichert\./.test(t) && !/internen Speicher/.test(t)));
}

test.beforeEach(async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');
});

test('Fremder Ausstieg 1 — Sidebar-Wechsel sichert den offenen Schritt', async ({ page }) => {
  await wizardSchrittTippen(page, 'supportFromChurchOrCommunity', WERT);
  await oeffneSektor(page, 'finance');            // fremder Ausstieg, echter Klick
  const r = await ausSpeicher(page);
  expect(r.ort).toBe(WERT);
  expect(r.stempel).toBe(1);                                // genau EIN Write, kein Doppel-Stempel
});

test('Fremder Ausstieg 2 — „Jetzt sichern": die DATEI enthält den Wert (der schwerste Fall)', async ({ page }) => {
  await wizardSchrittTippen(page, 'supportFromChurchOrCommunity', WERT);

  /* FSA-Attrappe wie in tests/e2e-cross/support/helpers.js: showSaveFilePicker bleibt PRÄSENT (sonst
     fragt der Save-Handler ein Nicht-FSA-Namens-Modal ab), wirft aber — der reale Fallback-Pfad
     (_depotBlobSpeichern → dateiAusgeben) erzeugt dann einen Blob-Download, den Playwright fängt.
     Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): depotAnlegen() oben hat bereits ein FSA-Handle
     etabliert (Default-Attrappe aus oeffneApp()) — _depotBlobSpeichern fragt den Picker nur, wenn
     KEIN Handle vorliegt. Ohne dateiBindungZuruecksetzen() bliebe das alte Handle gültig, die hier
     überschriebene Attrappe würde nie erneut aufgerufen, und der erwartete Download bliebe aus. */
  await page.evaluate(() => {
    try {
      Object.defineProperty(window, 'showSaveFilePicker', {
        configurable: true,
        value: () => Promise.reject(new Error('headless: kein OS-Datei-Picker')),
      });
    } catch (_) {}
    if (typeof window.__vdOeffentlich.dateiBindungZuruecksetzen === 'function') window.__vdOeffentlich.dateiBindungZuruecksetzen();
  });

  /* GEÄNDERT (Auftrag, 12.09.2026): dieser Test will nur den DATEIINHALT prüfen (der
     offene Wizard-Schritt muss im Export landen), nicht den Sichern-Knopf-Mechanismus selbst —
     Topf B des Sortierungs-Berichts. Der Knopf (#tb-save-knopf) bleibt seit ADR-237 verborgen,
     sobald intern gespeichert wird (kein „ungespeichert"-Zustand mehr). Umgestellt auf den
     ADR-237-Weg für einen erzwungenen Export: „Sicherungskopie erstellen" — derselbe Griff wie
     tests/e2e-cross/support/helpers.js speichernNachTmp(). */
  await page.click('#tb-depot-pille');
  await page.waitForSelector('#tb-depot-menue-sicherungskopie', { state: 'visible' });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#tb-depot-menue-sicherungskopie'),
  ]);
  const pfad = await download.path();
  const roh = fs.readFileSync(pfad, 'utf8');
  // Die .vivodepot-Datei trägt die Kennung `VIVODEPOT` + Versions-Byte vor dem JSON. Wir packen sie
  // mit dem APP-EIGENEN Leser aus (magicStrippen) statt mit einer Nachbildung — so prüft der Test
  // zugleich, dass der geschriebene Datei-Vertrag zum Lese-Pfad passt.
  const ausDatei = await page.evaluate(async ({ text, pw }) => {
    const { json, magic } = window.__vdOeffentlich.magicStrippen(text);
    const f = await window.__vdOeffentlich.depotLaden(JSON.parse(json), pw);
    return { magic, ort: (f.sektoren.advanceCare || {}).supportFromChurchOrCommunity || null };
  }, { text: roh, pw: PW });
  expect(ausDatei.magic).toBe(true);            // es ist wirklich eine v1-Depot-Datei
  expect(ausDatei.ort).toBe(WERT);
});

test('Gegenprobe wizard-eigen — „Weiter" sichert weiterhin, und genau einmal', async ({ page }) => {
  await wizardSchrittTippen(page, 'supportFromChurchOrCommunity', WERT);
  await page.click('#wiz-weiter');
  const r = await ausSpeicher(page);
  expect(r.ort).toBe(WERT);
  expect(r.stempel).toBe(1);        // die Delegation darf hier NICHT zusätzlich schreiben
});

test('Ungültige Eingabe + fremder Ausstieg — kein Write, aber ein Hinweis', async ({ page }) => {
  // Attrappe, s. Kopf: dem Auswahl-Feld eine Option anhängen, die die Registry nicht kennt.
  // feldValidieren liefert dafür grund 'auswahl' — also den NICHT-stummen Zweig.
  await wizardSchrittTippen(page, 'lifeSustainingMeasures', null);
  await page.evaluate(() => {
    const sel = document.querySelector('#content [data-edit="lifeSustainingMeasures"]');
    const o = document.createElement('option');
    o.value = 'gibt-es-nicht'; o.textContent = 'Attrappe';
    sel.appendChild(o); sel.value = 'gibt-es-nicht';
  });
  await oeffneSektor(page, 'finance');
  const r = await ausSpeicher(page);
  expect(r.auswahl).toBeNull();                                      // nicht gesichert …
  expect((await toastTexte(page)).join(' | ')).toMatch(/\S/);        // … aber gesagt
});

test('Leere Eingabe + fremder Ausstieg — kein Eintrag, KEIN Hinweis, kein Fehler', async ({ page }) => {
  const fehler = [];
  page.on('pageerror', e => fehler.push(String(e)));
  await wizardSchrittTippen(page, 'supportFromChurchOrCommunity', null);            // nichts tippen
  await oeffneSektor(page, 'finance');
  const r = await ausSpeicher(page);
  expect(r.ort).toBeNull();
  expect(r.stempel).toBe(0);
  expect(await toastTexte(page)).toEqual([]);                        // ausdrücklich stumm
  expect(fehler).toEqual([]);
});
