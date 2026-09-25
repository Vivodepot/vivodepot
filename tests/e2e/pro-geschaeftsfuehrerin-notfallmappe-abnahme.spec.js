'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — Geschäftsführerin-Notfallmappe (U2-ADR-295) als echtes Fremdmodul
   ────────────────────────────────────────────────────────────────────────
   Auftrag (05.09.2026), Auflage „Erreichbarkeit beweisen, nicht nur
   Gültigkeit" — an diesem Tag traten drei Fälle auf, in denen etwas korrekt
   gebaut war und die Nutzerin es nie sah (der Erbschein-Vorbereitungsauszug,
   U2-ADR-288, war einer davon). Diese Datei prüft darum nicht nur, dass das
   Bundle über den Node-Kern angenommen wird (das prüft bereits tests/pro-
   geschaeftsfuehrerin-notfallmappe-u2-adr-295.test.js), sondern den ECHTEN
   Klickweg im Browser: Datei-Upload · Regal-Karte · Öffnen · Inhalt.

   GEMESSEN, NICHT VERMUTET (vor dem Bau dieser Datei, per Node-Skript gegen
   den echten Kern): eine `logikModul`-Karte erscheint IMMER auf der
   `vorsorge`-Seite (der einzige Aufrufer von `vorsorgeRegalHTML`), unabhängig
   vom eigenen `sektor`-Feld des Bundles — ein docked Pro-Bereich trägt kein
   `merkmale`-Feld (nicht Teil von `BEREICH_MODUL_SCHLUESSEL`) und zeigt darum
   selbst kein Regal. Der Weg unten geht darum über `vorsorge`, nicht über
   `pro-vertretung-vollmachten` — das ist der Weg, den eine echte Pro-Nutzerin
   heute tatsächlich gehen müsste, kein Test-Kompromiss.

   ECHTER FILE-UPLOAD für BEIDE Dateien (das Bereichs-Modul UND das
   logikModul), kein `page.evaluate(() => window.__vdOeffentlich.ankerDaten().logikModule = ...)` — Vorbild:
   tests/e2e/erbschein-vorbereitungsauszug-abnahme.spec.js,
   tests/e2e/pro-modul-einlass-durchgang.spec.js.

   U2-ADR-379 (08.09.2026): das Bereichs-Modul stand vorher INLINE in genau
   dieser Datei UND (mit abweichendem herkunft-Wert, sechs statt vier
   Sektoren) in tests/pro-geschaeftsfuehrerin-notfallmappe-u2-adr-295.test.js
   — zwei Orte für dieselbe Sache, dieselbe Nacht dreimal passiert. Lädt jetzt
   das eine ausgelieferte Artefakt (tests/fixtures/…-bereich.json), das
   `tools/lib/vier-produkte.js` für pro-de/pro-en ebenfalls referenziert.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { oeffneApp, depotAnlegen, oeffneSektor, einstellungenAbschnittOeffnen } = require('./helpers');

const GF_BUNDLE_DATEI = path.join(__dirname, '..', '..', 'tools', 'templates', 'vivodepot-pro-geschaeftsfuehrerin-notfallmappe-logikmodul.json');
const PRO_BEREICHE_DATEI = path.join(__dirname, '..', '..', 'tools', 'templates', 'vivodepot-pro-geschaeftsfuehrerin-notfallmappe-bereich.json');

async function moduleDateiEinlassen(page, dateipfad) {
  await page.locator('#tb-einstellungen').click();
  // D.4 (Rest-Sichten, 26.08.2026): „Eingelassene Erweiterungen" liegt hinter <details>,
  // kollabiert per Default — erst aufklappen, dann ist der Einlass-Knopf sichtbar.
  await einstellungenAbschnittOeffnen(page, '#einst-modul-einlassen');
  await expect(page.locator('#einst-modul-einlassen')).toBeVisible();
  await page.locator('#einst-modul-datei').setInputFiles(dateipfad);
  await page.locator('#m-ok').click();   // Einstellungen-Modal schließen
}

async function proUndGfEinlassen(page) {
  await moduleDateiEinlassen(page, PRO_BEREICHE_DATEI);
  await moduleDateiEinlassen(page, GF_BUNDLE_DATEI);
}

test('Regal-Karte erscheint erst NACH beiden Einlässen (Bereiche + Bundle), öffnet den Auszug — leeres Depot zeigt nur Lücken', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');
  await expect(page.locator('[data-modul-karte="pro-geschaeftsfuehrerin-notfallmappe"]')).toHaveCount(0,
    'vor dem Einlass darf keine Karte erscheinen — sonst wäre das Bundle fest verdrahtet statt echter Fremdmodul-Einlass');

  await proUndGfEinlassen(page);
  await oeffneSektor(page, 'advanceCare');

  const karte = page.locator('[data-modul-karte="pro-geschaeftsfuehrerin-notfallmappe"]');
  await expect(karte).toBeVisible();
  await karte.click();

  await expect(page.locator('#pv-dok-overlay')).toBeVisible();
  const blatt = page.locator('#pv-dok-overlay .pv-dok-blatt');
  await expect(blatt).toContainText('Geschäftsführerin — Vertretung, Nachfolge, Notfall');
  await expect(blatt).toContainText('Teil A — Vertretung');
  await expect(blatt).toContainText('Teil B — Nachfolge');
  await expect(blatt).toContainText('Teil C — Notfall');
  await expect(blatt).toContainText('— nicht erfasst —');
});

test('volles Depot: Prokura, Gesellschafterliste und Vertretungsplan erscheinen im Auszug in Klartext', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await proUndGfEinlassen(page);

  // Setup über die echten Kern-Funktionen, dasselbe Muster wie erbschein-vorbereitungsauszug-
  // abnahme.spec.js: window.__vdOeffentlich.renderContent() am Ende ist Pflicht (U2-ADR-011 Auto-Save liest
  // sonst den veralteten DOM-Stand zurück und überschreibt die eben gesetzten Werte wieder).
  await page.evaluate(() => {
    window.__vdOeffentlich.ankerDaten().sektoren['pro-vertretung-vollmachten'] = Object.assign({}, window.__vdOeffentlich.ankerDaten().sektoren['pro-vertretung-vollmachten'], {
      tpl_vertretungsregelung: 'Einzelvertretungsberechtigt, befreit von §181 BGB',
      tpl_prokura: [{ tpl_wer: 'Prokuristin Beispiel' }],
    });
    window.__vdOeffentlich.ankerDaten().sektoren['pro-gesellschaft-nachfolge'] = Object.assign({}, window.__vdOeffentlich.ankerDaten().sektoren['pro-gesellschaft-nachfolge'], {
      tpl_gesellschafterliste: [{ tpl_fassung_vom: '2025-03-01' }],
    });
    window.__vdOeffentlich.ankerDaten().sektoren['pro-kontakte-vertretungsplan'] = Object.assign({}, window.__vdOeffentlich.ankerDaten().sektoren['pro-kontakte-vertretungsplan'], {
      tpl_wer_uebernimmt_welche_aufgabe: [{ tpl_aufgabe: 'Zahlungsverkehr freigeben', tpl_person: 'Vertriebsleiter Muster' }],
    });
    window.__vdOeffentlich.renderContent();
  });

  await oeffneSektor(page, 'advanceCare');
  await page.evaluate(() => window.__vdOeffentlich.dokumentOeffnen('pro-geschaeftsfuehrerin-notfallmappe'));

  const blatt = page.locator('#pv-dok-overlay .pv-dok-blatt');
  await expect(blatt).toBeVisible();
  await expect(blatt).toContainText('Einzelvertretungsberechtigt, befreit von §181 BGB');
  await expect(blatt).toContainText('Prokuristin Beispiel');
  await expect(blatt).toContainText('2025-03-01');
  await expect(blatt).toContainText('Zahlungsverkehr freigeben');
  await expect(blatt).toContainText('Vertriebsleiter Muster');
});
