'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Befund 1, Auftrag „Kern: Eingabe springt, Sub-Depot-Farbe, PDF-CI" (13.09.2026)
   — "Eingabe springt nach oben" (Beispiel im Auftrag: Datum des Ausweises).
   ────────────────────────────────────────────────────────────────────────────
   STICHPROBE (Freigabe, Suiten sparen), nicht Vollerhebung: je EIN Feld
   pro Feldtyp — text, datum, auswahl, ref, Listen-Unterfeld, Sub-Depot-Feld —
   statt jedes Feld aller Bereiche/Sektoren. Methodik + die Playwright-Auto-
   Scroll-Falle (Klick scrollt selbst) in tools/eingabe-scroll-messen.js.

   IN CHROMIUM NICHT REPRODUZIERT — BEFUND BLEIBT OFFEN, kein Fix hier (Nachtrag
   14.09.2026: die Produktverantwortung sieht das Springen weiterhin, gemeldet an
   Firefox/macOS; Chromium-Stichprobe allein schließt die Wurzel-Ursache nicht
   aus). U2-ADR-127 (09.08.2026, „renderContent() erhält Scroll und Fokus per
   Default") behebt genau diese Symptomklasse an der Wurzel — 46 vermessene
   Aufrufstellen, Default gedreht, Wächter `tools/w-scroll-erhalt-pruefen.js`
   hält die 16 echten Navigations-Stellen fest — trägt aber offenbar nicht jeden
   Fall, oder der Fall ist browserspezifisch. Das top-level Feld-Autosave
   (`bearbeitungSpeichern`/`_autoSaveWennFeld`) rendert laut Kern-Kommentar
   ohnehin nicht neu. Alle sechs Stichproben unten sind als POSITIVKONTROLLEN
   geschrieben (Delta 0 erwartet, in Chromium bestätigt) — mit einer ECHTEN
   Sprung-Positivkontrolle (renderContent(true) direkt aufgerufen), die beweist,
   dass die Messung selbst einen realen Sprung erkennen WÜRDE, wenn es einen gäbe.
   Offener Anschluss: Firefox-Reproduktion, s. Folgeauftrag/Bericht.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen, oeffneSektor } = require('./helpers');
const { scrollSprungMessen } = require('../../tools/eingabe-scroll-messen.js');

const PW = 'e2e-passwort-123';
// Duldung: ein "Sprung" von wenigen Pixeln (Layout-Rundung, ein neu eingeblendetes Fehler-
// Label) ist kein Symptom — der Auftrag beschreibt "an den Seitenanfang", nicht Subpixel-Rauschen.
const TOLERANZ_PX = 5;

test('[Befund-1·text] valuablesStorageLocations (finance) — Wert setzen + blur, kein Scroll-Sprung', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  const { delta } = await scrollSprungMessen(page, {
    vor: async (p) => {
      await oeffneSektor(p, 'finance');
      await p.click('[data-edit="valuablesStorageLocations"]');
    },
    aktion: async (p) => {
      await p.fill('[data-edit="valuablesStorageLocations"]', 'Uhr, Ring');
      await p.locator('[data-edit="valuablesStorageLocations"]').evaluate((el) => el.blur());
    },
  });
  expect(Math.abs(delta), 'text-Feld darf keinen Scroll-Sprung auslösen').toBeLessThanOrEqual(TOLERANZ_PX);
});

test('[Befund-1·datum] companyPensionAgreedStartDate (finance) — Wert setzen + blur, kein Scroll-Sprung', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  const { delta } = await scrollSprungMessen(page, {
    vor: async (p) => {
      await oeffneSektor(p, 'finance');
      await p.click('[data-edit="companyPensionAgreedStartDate"]');
    },
    aktion: async (p) => {
      await p.fill('[data-edit="companyPensionAgreedStartDate"]', '2030-01-01');
      await p.locator('[data-edit="companyPensionAgreedStartDate"]').evaluate((el) => el.blur());
    },
  });
  expect(Math.abs(delta), 'datum-Feld (genau das Beispiel aus dem Auftrag) darf keinen Scroll-Sprung auslösen').toBeLessThanOrEqual(TOLERANZ_PX);
});

test('[Befund-1·auswahl] companyPensionScheme (finance) — Option wählen, kein Scroll-Sprung', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  const { delta } = await scrollSprungMessen(page, {
    vor: async (p) => {
      await oeffneSektor(p, 'finance');
      await p.locator('[data-edit="companyPensionScheme"]').scrollIntoViewIfNeeded();
    },
    aktion: async (p) => {
      const werte = await p.locator('[data-edit="companyPensionScheme"] option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
      if (werte.length) await p.selectOption('[data-edit="companyPensionScheme"]', werte[0]);
    },
  });
  expect(Math.abs(delta), 'auswahl-Feld darf keinen Scroll-Sprung auslösen').toBeLessThanOrEqual(TOLERANZ_PX);
});

test('[Befund-1·ref] taxAdvisor (finance) — Freitext-Override setzen + blur, kein Scroll-Sprung', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  const { delta } = await scrollSprungMessen(page, {
    vor: async (p) => {
      await oeffneSektor(p, 'finance');
      await p.click('[data-edit-override="taxAdvisor"]');
    },
    aktion: async (p) => {
      await p.fill('[data-edit-override="taxAdvisor"]', 'Kanzlei Beispiel');
      await p.locator('[data-edit-override="taxAdvisor"]').evaluate((el) => el.blur());
    },
  });
  expect(Math.abs(delta), 'ref-Feld darf keinen Scroll-Sprung auslösen').toBeLessThanOrEqual(TOLERANZ_PX);
});

test('[Befund-1·Listen-Unterfeld] idDocuments.validUntil (identity, Modal) — genau das Auftrags-Beispiel, kein Scroll-Sprung', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  const { delta } = await scrollSprungMessen(page, {
    vor: async (p) => {
      await oeffneSektor(p, 'identity');
      await p.click('[data-eintrag-hinzufuegen="idDocuments"]');
      await p.waitForSelector('#modal-inhalt');
      await p.waitForSelector('#modal-inhalt [data-edit="validUntil"]');
    },
    aktion: async (p) => {
      await p.fill('#modal-inhalt [data-edit="validUntil"]', '2030-01-01');
      // KEIN waitForSelector(state:'detached') hier — gemessen (nicht angenommen): #modal-inhalt
      // ist ein wiederverwendetes Singleton-Element, das beim Schließen nur versteckt wird, nie
      // aus dem DOM entfernt. Ein Warten auf "detached" hängt bis zum Testtimeout (30s) und reisst
      // danach die ganze Seite über Playwrights eigenes Cleanup — sah wie ein App-Absturz aus, war
      // keiner (Fehldiagnose selbst gemessen und verworfen, s. Bericht).
      await p.click('#m-ok');
    },
  });
  expect(Math.abs(delta), 'Listen-Unterfeld-Modal (Ausweis/gültig — das Auftrags-Beispiel) darf keinen Scroll-Sprung auslösen').toBeLessThanOrEqual(TOLERANZ_PX);
});

test('[Befund-1·Sub-Depot-Feld] givenName im Sub-Kontext — Wert setzen + blur, kein Scroll-Sprung', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  await page.evaluate(async (pw) => {
    const e = await window.__vdOeffentlich.subDepotAnlegen(
      { bezeichnung: 'E2E-Sub-Scroll', inhaberin: 'Testperson', verwaltungsTyp: 'verwaltet', akzent: 'ton' }, pw);
    await window.__vdOeffentlich.subDepotVertrauenOeffnen(e.depotUUID, pw);
    window.__vdOeffentlich.subKontextBetreten(e.depotUUID);
  }, PW);
  const { delta } = await scrollSprungMessen(page, {
    vor: async (p) => {
      await oeffneSektor(p, 'identity');
      await p.click('[data-edit="givenName"]');
    },
    aktion: async (p) => {
      await p.fill('[data-edit="givenName"]', 'Sub-Testperson');
      await p.locator('[data-edit="givenName"]').evaluate((el) => el.blur());
    },
  });
  expect(Math.abs(delta), 'Feld im Sub-Depot-Kontext darf keinen Scroll-Sprung auslösen').toBeLessThanOrEqual(TOLERANZ_PX);
});

test('[Befund-1·Positivkontrolle] renderContent(true) erzeugt einen ECHTEN Sprung — die Messung selbst erkennt ihn', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  const { delta, vor, nach } = await scrollSprungMessen(page, {
    vor: async (p) => {
      await oeffneSektor(p, 'finance');
      // #content lang genug für einen messbaren Sprung — künstlich weit herunterscrollen ist HIER
      // legitim (kein Klick danach, der die Playwright-Auto-Scroll-Falle triggern könnte).
      await p.evaluate(() => { const c = document.getElementById('content'); if (c) c.scrollTop = Math.max(200, c.scrollHeight - c.clientHeight - 50); });
    },
    aktion: async (p) => { await p.evaluate(() => window.__vdOeffentlich.renderContent(true)); },
  });
  expect(vor, 'Testaufbau: vor der Positivkontrolle muss der Scroll messbar von 0 verschieden sein').toBeGreaterThan(50);
  expect(nach, 'renderContent(true) muss die Sicht an den Anfang setzen').toBeLessThanOrEqual(5);
  expect(delta, 'die Messung muss einen ECHTEN Sprung als deutliches negatives Delta zeigen — sonst bewiesen die sechs Proben oben nichts').toBeLessThan(-50);
});
