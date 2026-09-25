'use strict';
/* E2E — Persistenz Stück 5 (U2-ADR-031-Nachtrag, 08.08.2026): ein erzwungener Speicherfehler
   muss in der Topbar-Statuspille sichtbar werden, nicht still verschwinden. Browser-Abnahme, weil
   der Node-Test-Harness `document.addEventListener` als No-Op stubbt (U2-ADR-091 Abschnitt 6) —
   der echte Knopf-Klickpfad läuft nur hier.

   ZWEI verschiedene Fehlerformen, ZWEI verschiedene Fälle (Nachtrag-Auftrag 08.08.2026, Zug 1):
   Fall A ist der DATEI-Weg (Download-Rückfall scheitert). Fall B ist der INTERNE Weg — IndexedDB
   ist VORHANDEN, der Schreibversuch selbst scheitert (`open()` läuft auf onerror). Das ist die
   Safari-förmige Form, und file://-basierte Tests können sie nicht stellen: `internerSpeicherModus()`
   ist unter file:// immer false (Datei-Modus), unabhängig von IndexedDB. Fall B braucht einen
   echten `http://`-Ursprung — dafür startet dieser Test einen eigenen, lokalen Server. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor, setzeFeld, starteLokalenServer } = require('./helpers');

test('Fall A (Datei-Weg): erzwungener Download-Fehlschlag beim Topbar-Knopf → Pille zeigt „Speichern fehlgeschlagen"', async ({ page }) => {
  await oeffneApp(page);
  // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): NACH oeffneApp() sabotieren, nicht per
  // addInitScript davor — oeffneApp() registriert selbst eine (funktionierende) FSA-Attrappe
  // beim Laden, und addInitScript-Skripte laufen in Registrierungsreihenfolge: ein davor
  // registriertes „FSA aus" würde vom später registrierten Default wieder überschrieben.
  // page.evaluate() wirkt sofort auf die schon geladene Seite, kein Timing-Wettlauf.
  // GEÄNDERT (Auftrag, 12.09.2026): internerSpeicherModus() ist unter file:// NICHT mehr
  // pauschal false (Kopfkommentar dieser Datei ist insofern veraltet) — der Datei-Weg-Fall
  // braucht seither eine explizit deaktivierte IndexedDB, sonst bleibt der Knopf verborgen
  // (Autosave übernimmt still). Derselbe Griff wie in Fall B (dort schon vorbildlich für den
  // internen Weg gelöst) — nur hier: keine Senke überhaupt, statt einer scheiternden.
  await page.evaluate(() => {
    try { Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }); } catch (_) {}
    delete window.showSaveFilePicker;                 // FSA aus → Download-Rückfall
    window.URL.createObjectURL = () => { throw new Error('E2E-Sabotage: Download-Blob scheitert'); };
  });
  await depotAnlegen(page, { name: 'Fehlschlag Testerin' });

  const pille = page.locator('#tb-save-status');
  const knopf = page.locator('#tb-save-knopf');
  await expect(knopf).toBeVisible();

  await knopf.click();
  // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): der Nicht-FSA-Namensdialog (#datei-name)
  // erscheint seither schon beim ANLEGEN (depotAnlegen() oben) und ist dort bereits bestätigt —
  // der Name gilt für die Sitzung (_dateiName bleibt gesetzt), dieser Klick fragt nicht erneut.

  await expect(pille).toHaveClass(/ist-fehlgeschlagen/);
  await expect(page.locator('#tb-save-status .tb-save-text'))
    .toHaveText('Speichern fehlgeschlagen — bitte speichern Sie noch einmal.');
  // Der Knopf bleibt aktiv (erneuter Versuch muss möglich sein, kein toter Zustand).
  await expect(knopf).toBeVisible();
});

test('Fall B (interner Weg): IndexedDB VORHANDEN, Schreibversuch scheitert (open()→onerror) → Pille zeigt „Speichern fehlgeschlagen"', async ({ page }) => {
  // WICHTIG (Nachtrag-Auftrag, ausdrücklich benannt): window.indexedDB LÖSCHEN ist NICHT der
  // gesuchte Fall — das setzt hatIndexedDB() auf false und kippt in den Datei-Modus (Fall A prüft
  // das bereits indirekt). Hier bleibt `indexedDB` ein echtes Objekt; nur jeder open()-Aufruf
  // scheitert — genau das, was hatIndexedDB()s reiner Existenz-Check nicht erkennen kann.
  //
  // Nachtrag WÄHREND des Gesamtumbaus (08.08.2026, Zug 2): die Boot-Funktionsprobe läuft jetzt
  // GEGEN EINE EIGENE Datenbank ('vivodepot-funktionsprobe'), getrennt von der echten Depot-DB
  // ('vivodepot') — s. Kommentar bei internSpeicherFunktionsprobe(). Sabotiert man JEDEN open()-
  // Aufruf pauschal, greift bereits die Boot-Probe ins Leere und kippt internerSpeicherModus()
  // schon VOR der Depot-Anlage korrekt auf false (Zug 2 tut genau das, was er soll) — dieser Test
  // will aber den unabhängigen Fall B von ZUG 1 stellen: die Probe war unauffällig, ERST der
  // spätere echte Schreibversuch scheitert. Darum nur die ECHTE Depot-DB sabotieren, die
  // Funktionsprobe-DB unangetastet lassen.
  // Zug 1 (Auftrag „Depot ist Datei", 08.08.2026): der Anlege-Weg holt jetzt IMMER ein Dateiziel
  // beim Anlegen, unabhängig vom späteren Speicher-Modus (Zug 3: der interne Modus entscheidet
  // erst beim DIRTY-„Sichern und schließen", nicht beim Anlegen selbst). FSA-Attrappe, damit
  // depotAnlegen() unten überhaupt durchläuft — mit der IndexedDB-Sabotage unten unverwandt.
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: async () => ({
        name: 'fall-b-anlegen.vivodepot',
        createWritable: async () => ({ write: async () => {}, close: async () => {} }),
      }),
    });
  });
  const srv = await starteLokalenServer();
  const port = srv.address().port;
  try {
    await page.goto(`http://localhost:${port}/vivodepot.html`);
    await page.waitForSelector('#w-anlass', { state: 'visible' });
    await depotAnlegen(page, { name: 'Interner Fehlschlag' });

    // Vorbedingung fürs Messziel: internerSpeicherModus() muss hier TRUE sein (http://, IndexedDB
    // als Objekt vorhanden) — sonst prüfte dieser Test versehentlich wieder nur die Modus-Weiche.
    const modus = await page.evaluate(() => window.__vdOeffentlich.internerSpeicherModus());
    expect(modus, 'Vorbedingung: interner Modus (http://, IndexedDB vorhanden)').toBe(true);

    // U2-ADR-237/244-Nachzug (04.09.2026): die IndexedDB-Sabotage läuft jetzt ERST NACH dem
    // Anlegen, nicht mehr per addInitScript VOR dem Laden — seit U2-ADR-237/244 speichert bereits
    // das Anlegen selbst still intern (nicht erst eine spätere Feld-Änderung), ein vorher aktives
    // addInitScript hätte darum schon DAS Anlegen sabotiert: GEMESSEN, die Pille zeigte „erneut
    // fehlgeschlagen" statt „fehlgeschlagen" — der erste Fehlschlag war schon beim Anlegen
    // passiert, dieser Test will aber genau DEN ersten Fehlschlag zeigen, ausgelöst durch die
    // nachfolgende Feld-Änderung. page.evaluate() wirkt sofort auf die schon geladene, bereits
    // erfolgreich angelegte Seite (dasselbe Muster wie Fall A oben in dieser Datei).
    await page.evaluate(() => {
      const echtesOpen = window.indexedDB.open.bind(window.indexedDB);
      window.indexedDB.open = function (name, version) {
        if (name !== 'vivodepot') return echtesOpen(name, version);   // Funktionsprobe-DB bleibt echt/funktionsfähig
        const req = {};
        Promise.resolve().then(() => {
          if (typeof req.onerror === 'function') { req.error = new Error('E2E-Sabotage: IndexedDB open() scheitert'); req.onerror({ target: req }); }
        });
        return req;
      };
    });

    await oeffneSektor(page, 'identity');
    await setzeFeld(page, 'givenName', 'Interner-Fehlschlag');

    const pille = page.locator('#tb-save-status');
    await expect(pille).toHaveClass(/ist-fehlgeschlagen/);
    await expect(page.locator('#tb-save-status .tb-save-text'))
      .toHaveText('Speichern fehlgeschlagen — bitte speichern Sie noch einmal.');
    // Die Sitzung wurde NICHT beendet (Fehlschlag → weiterFn() läuft nicht, s. U2-ADR-031 Stück 2).
    await expect(page.locator('#app')).toHaveClass(/\ban\b/);
  } finally {
    srv.close();
  }
});
