'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Zwei-Türen-Startseite („Startseite Zwei Türen", 12.08.2026) —
   Zug 0: die eine Probe, die vor dem Löschen von w-subselbst rot sein muss.
   ────────────────────────────────────────────────────────────────────────
   umschlagEntpacken (:9138) hebt eine Blackbox-Export-Datei im GEWÖHNLICHEN
   Datei-Einstieg (#w-datei) bereits auf die reguläre Hülle — bevor geprüft
   wird. Das beweist nur, dass die Entschlüsselung startet. Ob der
   entschlüsselte Inhalt danach in einer BENUTZBAREN Anwendung landet (echte
   Sektoren, echtes Speichern, echter Export) — das ist hier real gemessen,
   kein Gedankengang: Sub-Depot anlegen, als Blackbox exportieren, Anwendung
   NEU LADEN, Datei über #w-datei mit dem Sub-Passwort öffnen, durch die
   Oberfläche gehen.

   Fällt dieser Test durch, wird w-subselbst NICHT entfernt — das ist ein
   eigener Befund, der laut Auftrag vorgelegt wird, kein Behelfsbau.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');

const ANKER_PW = 'zwei-tueren-anker-789';
const SUB_PW = 'zwei-tueren-sub-321';
const SUB_VORNAME = 'Margarete';
const SUB_FELD_WERT = 'Margarete Zwei-Tueren-Test';

// Sub-Depot über die echte UI anlegen, entsiegeln, betreten — wie T-CROSS-02
// (tests/e2e-cross/T-CROSS-02-sub-depot-blackbox.spec.js), hier gegen die
// Bürger-App selbst statt gegen die Lese-App.
async function subDepotAnlegenUndBetreten(page) {
  await page.click('#tb-depot-pille');
  await page.waitForSelector('#tb-depot-menue-verwaltung', { state: 'visible' });
  await page.click('#tb-depot-menue-verwaltung');
  await page.waitForSelector('#sub-neu', { state: 'visible' });
  await page.click('#sub-neu');
  await page.waitForSelector('#id-vorname', { state: 'visible' });
  await page.fill('#id-vorname', SUB_VORNAME);
  await page.fill('#id-pw', SUB_PW);
  await page.fill('#id-pw2', SUB_PW);
  await page.click('#m-ok');
  await page.waitForSelector('#id-vorname', { state: 'detached' });
  await page.waitForSelector('[data-sub]');

  const uuid = await page.evaluate(() => (window.getData ? window.getData() : window.__vdOeffentlich.ankerDaten()).verwalteteDepots.slice(-1)[0].depotUUID);
  await page.click(`[data-entsiegeln="${uuid}"]`);
  await page.waitForSelector('#sub-auf', { state: 'visible' });
  await page.fill('#sub-auf', SUB_PW);
  await page.click('#m-ok');
  await page.waitForSelector('#sub-auf', { state: 'detached' });
  await page.click(`[data-betreten="${uuid}"]`);
  await page.waitForSelector('#app.modus-vollmacht', { state: 'attached' });
  return uuid;
}

test('[Zug0] Blackbox-Export öffnet über den gewöhnlichen Datei-Einstieg in einer benutzbaren Anwendung', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: ANKER_PW });

  const uuid = await subDepotAnlegenUndBetreten(page);

  // Sub-Feld setzen, dann kontextrichtig versiegeln + exportieren (Test-Helfer über die
  // App-eigenen Top-Level-Funktionen, wie T-CROSS-02 — kontextrichtig heißt: subKontextVerlassen
  // MUSS awaited werden, es re-versiegelt selbst; danach ist wieder der Anker-Kontext aktiv, aus
  // dem subDepotBlackboxExportieren aufgerufen werden muss).
  const blackboxJson = await page.evaluate(async ({ uuid, wert }) => {
    window.__vdOeffentlich.sektorFeldSetzen('identity', 'givenName', wert);
    await window.__vdOeffentlich.subKontextVerlassen();
    const datei = window.__vdOeffentlich.subDepotBlackboxExportieren(uuid);
    return JSON.stringify(datei, null, 2);
  }, { uuid, wert: SUB_FELD_WERT });

  const tmp = path.join(os.tmpdir(), 'zwei-tueren-blackbox-' + Date.now() + '.json');
  fs.writeFileSync(tmp, blackboxJson, 'utf8');

  try {
    // Anwendung NEU LADEN — keine laufende Sitzung, kein interner Zustand aus dem Anlegen-Weg.
    // GEÄNDERT (Auftrag, 12.09.2026): seit internerSpeicherModus() unter file:// echt
    // greift, hat der Anker-Anlegen-Schritt (Zeile 59) den Stand bereits still gesichert
    // (ADR-237) — der Reload zeigt darum den Wiedereinstieg-Bildschirm statt der leeren Landung
    // #w-anlass, auf die diese Probe wartet (derselbe Fund wie tests/konformitaet/offline-
    // garantie.mjs Schritt 8, Commit 8fd58ac3). Der Kommentar oben sagt selbst, was gewollt ist
    // — „kein interner Zustand" — darum für GENAU diese Navigation erzwungen, nicht angenommen.
    await page.addInitScript(() => {
      try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {}
    });
    await page.reload();
    await page.waitForSelector('#w-anlass', { state: 'visible' });

    // Gewöhnlicher Datei-Einstieg — derselbe Weg, den eine Anker-Datei nimmt.
    await page.click('#w-datei');
    await page.setInputFiles('#co-datei', tmp);
    await page.fill('#co-pw', SUB_PW);
    await page.click('#w-oeffnen');

    // Landet die Anwendung in einem benutzbaren Zustand? (nicht nur: wirft sie keinen Fehler)
    await page.waitForSelector('#app.an', { state: 'attached', timeout: 10000 });

    // Sektoren erreichbar, mit dem tatsächlich gesetzten Sub-Wert.
    await oeffneSektor(page, 'identity');
    await expect(page.locator('[data-edit="givenName"]')).toHaveValue(SUB_FELD_WERT);

    // Speichern-Weg vorhanden und bedienbar (nicht nur Lesen — ein „benutzbares" Depot muss auch
    // schreiben können, sonst ist es eine Betrachtungs-App, keine Verwaltung).
    const speichernSichtbar = await page.locator('#tb-marke, #tb-schliessen').count();
    expect(speichernSichtbar, 'ein Speicher-/Schließen-Weg muss im geöffneten Sub-Depot existieren').toBeGreaterThan(0);

    // Entscheidende Zusatzfrage (Auftragsprämisse selbst geprüft, nicht übernommen): der Auftrag
    // behauptet, passwortWechselDurchfuehren (:9587/:19012) sei "im Produkt vorhanden, ohne
    // eigenen Starteinstieg" — der Knopf ist aber laut Quelltext (:22449) NUR sichtbar, wenn
    // WEDER imVorschau() NOCH imSubKontext() gilt. Direkt geprüft, ob das nach dem Öffnen über
    // #w-datei (ohne Anker-vermittelten "betreten"-Weg) tatsächlich zutrifft.
    const kontext = await page.evaluate(() => ({
      imSubKontext: typeof window.__vdOeffentlich.imSubKontext === 'function' ? window.__vdOeffentlich.imSubKontext() : null,
      imVorschau: typeof window.__vdOeffentlich.imVorschau === 'function' ? window.__vdOeffentlich.imVorschau() : null,
      modus: typeof window.__vdOeffentlich.Modus !== 'undefined' ? window.__vdOeffentlich.Modus.aktuell() : null,
    }));
    expect(kontext.imSubKontext, 'nach Öffnen über #w-datei darf kein Anker-vermittelter Sub-Kontext aktiv sein').toBe(false);
    expect(kontext.imVorschau, 'ein echt geöffnetes Depot ist keine Vorschau').toBe(false);

    // Und der Knopf selbst — nicht nur die Vorbedingungen, sondern das tatsächliche Element im
    // gerenderten Einstellungen-Bereich (einstellungenHTML(), :22403).
    const hatEinstellungenPfad = await page.evaluate(() => typeof window.__vdOeffentlich.einstellungenHTML === 'function');
    expect(hatEinstellungenPfad, 'Aufbau: einstellungenHTML muss existieren, um den Knopf zu prüfen').toBe(true);
    const pwKnopfHtml = await page.evaluate(() => (typeof window.__vdOeffentlich.einstellungenHTML === 'function' ? window.__vdOeffentlich.einstellungenHTML() : '').includes('id="einst-pw-wechseln"'));
    expect(pwKnopfHtml, 'Passwort-ändern-Knopf muss im geöffneten, direkt geladenen Sub-Depot erreichbar sein — sonst verliert die volljährig-Situationsblatt-Aussage ihre Grundlage').toBe(true);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});

// Zug 0, zweiter Teil: gibt es außerhalb des Passwortwechsels noch etwas, das NUR über
// flowSubDepotSelbstbedienung erreichbar ist? Der zweite Weg dort ist „Datei unverändert
// erneut sichern" — geht das auch im offenen (Anker-vermittelten) Sub-Depot-Kontext?
test('[Zug0] "Datei unverändert erneut sichern" — geht das auch außerhalb von flowSubDepotSelbstbedienung?', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: ANKER_PW });
  await subDepotAnlegenUndBetreten(page);

  // Im betretenen Sub-Kontext (Anker-vermittelt, NICHT über w-subselbst): existiert ein Weg, die
  // Datei unverändert erneut zu sichern (kein Passwortwechsel, keine Inhaltsänderung)?
  const wegVorhanden = await page.evaluate(() => {
    return typeof window.__vdOeffentlich.subDepotNeuVersiegeln === 'function'
      || typeof window.__vdOeffentlich.subDepotBlackboxExportieren === 'function';
  });
  expect(wegVorhanden, 'die zugrundeliegenden Funktionen sind global erreichbar, unabhängig von w-subselbst').toBe(true);

  // Ob dafür auch eine UI-Bedienstelle im Anker-vermittelten Kontext existiert (nicht nur die
  // Funktion), ist Teil des Befunds im Bericht — hier nur der Funktions-Nachweis, kein UI-Zwang.
});
