'use strict';
/* ════════════════════════════════════════════════════════════════════════
   T-CROSS-02 — Reise 2: Datenkette Bürger-App → Lese-App (Sub-Depot-Blackbox)
   ────────────────────────────────────────────────────────────────────────
   Szenario: Eine Anker-Person verwaltet ein Sub-Depot der verstorbenen Mutter
   und übergibt es per Blackbox-Export an die nächste Vertrauensperson. Die
   Lese-App erkennt das Sub-Format, öffnet es mit dem Sub-Passwort und zeigt es
   im Sub-Modus mit Schieferblau-Färbung (#3d5878).

   CROSS-COMPONENT: Bürger-App erzeugt den versiegelten Blackbox-Umschlag,
   Lese-App entsiegelt ihn mit dem gesonderten Sub-Passwort. Beweist die
   Sub-Schlüssel-Ableitung (HKDF pro Sub-Depot) über die Komponentengrenze.

   Die Sub-Anlage läuft über die echte UI (#sub-neu-Modal). Das Eintragen von
   Sub-Daten + Versiegeln + Blackbox-Export wird über einen TEST-HELFER
   (page.evaluate in die un­veränderte App: deren eigene Top-Level-Funktionen)
   ausgeführt — die Sub-Kontext-Edit-Strecke ist eine eigene Operations-Strecke
   (vgl. Spec „mit Test-Helper umgehen“). Der genaue interne Aufruf wird beim
   ersten Mac-Lauf bestätigt; Struktur und Selektoren der Verifikation sind real.

   Läuft am Mac / in CI. HTMLs unverändert. ⚠ nur Test-Passwörter.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const H = require('./support/helpers');

const FIX = require('./fixtures/reise-2-sub-depot.json');

test.describe('T-CROSS-02 Sub-Depot-Blackbox-Datenkette', () => {
  let tmp;
  test.beforeAll(() => { tmp = H.frischerTmp('r2'); });
  test.afterAll(() => H.tmpAufraeumen(tmp));

  test('Blackbox-Export öffnet in der Lese-App im Sub-Modus (Schieferblau)', async ({ browser }) => {
    /* ── Kontext A: Anker legt Sub-Depot an + erzeugt Blackbox ─────────────── */
    const ctxA = await browser.newContext({ acceptDownloads: true });
    const a = await ctxA.newPage();
    await H.kern.oeffnen(a);
    await H.kern.depotAnlegen(a, { name: FIX.ankerName, pw: FIX.ankerPasswort });

    // Verwaltung öffnen (Klick auf die Depot-Pille → Menü → „Depots, die ich aufbewahre") →
    // „Sub-Depot anlegen“. Zug 5 (Auftrag „Speicherweg ohne Datei-Picker", 09.08.2026): die Pille
    // öffnet jetzt ein Menü statt direkt zu navigieren.
    await a.click('#tb-depot-pille');
    await a.waitForSelector('#tb-depot-menue-verwaltung', { state: 'visible' });
    await a.click('#tb-depot-menue-verwaltung');
    await a.waitForSelector('#sub-neu', { state: 'visible' });
    await a.click('#sub-neu');
    // D36: Sub-Anlage läuft heute über den Identitäts-Dialog (#id-vorname/#id-nachname/
    // #sub-grundlage/#id-pw/#id-pw2), nicht mehr über #sub-bez/#sub-inh/#sub-pw. Inhaberin →
    // Vorname; Bezeichnung entfällt (das Sub wird über den Namen identifiziert). Vorbild: das
    // grüne T-CROSS-13. #sub-grundlage hat einen Default und muss nicht gesetzt werden.
    await a.waitForSelector('#id-vorname', { state: 'visible' });
    await a.fill('#id-vorname', FIX.subInhaberin);
    await a.fill('#id-pw', FIX.subPasswort);
    await a.fill('#id-pw2', FIX.subPasswort);
    await a.click('#m-ok');
    await a.waitForSelector('#id-vorname', { state: 'detached' });   // Dialog schließt
    await a.waitForSelector('[data-sub]');   // Sub-Eintrag erscheint in der Verwaltung.

    // Sub öffnen wie ein echter Nutzer: ein frisch angelegtes Sub ist VERSIEGELT und trägt
    // [data-entsiegeln]; [data-betreten] erscheint erst NACH dem Entsiegeln mit dem Sub-Passwort
    // (flowSubDepotEntsiegeln → subDepotVertrauenOeffnen). uuid VOR dem Entsiegeln im Anker-Kontext lesen.
    const uuid = await a.evaluate(() => window.__vdOeffentlich.ankerDaten().verwalteteDepots.slice(-1)[0].depotUUID);
    await a.click(`[data-entsiegeln="${uuid}"]`);
    await a.waitForSelector('#sub-auf', { state: 'visible' });
    await a.fill('#sub-auf', FIX.subPasswort);
    await a.click('#m-ok');                                   // „Öffnen" → entsiegelt
    await a.waitForSelector('#sub-auf', { state: 'detached' });
    await a.click(`[data-betreten="${uuid}"]`);              // entsiegeltes Sub als aktiven Kontext betreten
    // Auf den AKTIVEN Sub-Kontext warten, BEVOR sektorFeldSetzen läuft: der Betreten-Flow schaltet
    // auf Modus 'vollmacht' (data → Sub-Inhalt). Ohne diese Wartebedingung liefe sektorFeldSetzen
    // evtl. vor dem Kontext-Wechsel → der Wert landet nicht im Sub („nicht hinterlegt").
    await a.waitForSelector('#app.modus-vollmacht', { state: 'attached' });

    // Test-Helfer (eigene Top-Level-Funktionen der App, window-global): Sub-Feld setzen, dann
    // KONTEXTRICHTIG versiegeln — subDepotNeuVersiegeln/-BlackboxExportieren brauchen den ANKER-
    // Kontext (data = Anker mit verwalteteDepots). Also: im Sub setzen → Sub-Kontext verlassen →
    // im Anker neu versiegeln → versiegelten Umschlag exportieren. HTML bleibt unverändert.
    const blackboxJson = await a.evaluate(async ({ subDaten, uuid }) => {
      window.__vdOeffentlich.sektorFeldSetzen(subDaten.sektor, subDaten.feld, subDaten.wert);   // im Sub-Kontext
      // subKontextVerlassen ist async und re-versiegelt selbst (await subDepotNeuVersiegeln) — MUSS
      // awaited werden, sonst exportiert subDepotBlackboxExportieren den Umschlag, bevor die Sub-Edits
      // versiegelt sind (Race → „nicht hinterlegt"). Kein zweiter, redundanter Neu-Versiegel-Aufruf.
      await window.__vdOeffentlich.subKontextVerlassen();                                       // re-versiegelt + zurück in den Anker
      const datei = window.__vdOeffentlich.subDepotBlackboxExportieren(uuid);                   // Umschlag exportieren
      return JSON.stringify(datei, null, 2);
    }, { subDaten: FIX.subDaten, uuid });

    const dateiPfad = path.join(tmp, 'vivodepot-blackbox-test.json');
    fs.writeFileSync(dateiPfad, blackboxJson, 'utf8');
    await ctxA.close();

    /* ── Kontext B: Lese-App erkennt Sub-Format, öffnet mit Sub-Passwort ───── */
    const ctxB = await browser.newContext();
    const b = await ctxB.newPage();
    await H.lesen.oeffnen(b);
    await H.lesen.dateiOeffnen(b, dateiPfad, FIX.subPasswort);

    // Sub-Modus + Schieferblau-Banner (#3d5878) sichtbar.
    await expect(b.locator('.sub-banner')).toBeVisible();
    const bg = await b.locator('.sub-banner').evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    // #3d5878 == rgb(61, 88, 120).
    expect(bg.replace(/\s/g, '')).toBe('rgb(61,88,120)');

    // Sub-Daten feldweise.
    await b.click('[data-sektor="identity"]');
    await expect(b.locator('#content')).toContainText(FIX.subDaten.wert);

    await ctxB.close();
  });
});
