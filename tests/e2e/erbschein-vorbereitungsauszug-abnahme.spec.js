'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — Erbschein-Vorbereitungsauszug als echtes Fremdmodul
   (Siebtes-Register-Auftrag, Zug 2 — Rot-Beleg, 27.08.2026)
   ────────────────────────────────────────────────────────────────────────
   Nachtrag zum ursprünglichen Auftrag 27.08.2026: Erbschein war hier
   zunächst fest in VORSORGE_MODULE verdrahtet (immer da, ohne Einlass).
   Der Siebtes-Register-Auftrag hat diese Verdrahtung ENTFERNT — Erbschein
   ist seither ein echtes Fremdmodul, geladen über den regulären
   Fremdmodul-Einlass (dasselbe siebte EINLASS_REGISTER, das jedes künftige
   Logik-Modul nimmt), genau wie ein Sprachmodul. Kein `page.evaluate(() =>
   window.__vdOeffentlich.ankerDaten().logikModule = ...)` — ECHTER FILE-UPLOAD über `setInputFiles`, der
   Weg, den eine Bürgerin tatsächlich geht (Vorbild:
   tests/e2e/pro-modul-einlass-durchgang.spec.js).

   Der echte Klickweg NACH dem Einlass, unverändert: Regal-Karte antippen
   (kein onclick, ein <a href="#…">) → die Sektion mit dem Öffnen-Knopf →
   Knopf antippen → das Overlay trägt den echten Auszug, ohne Unterschriften-
   Block.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { oeffneApp, depotAnlegen, oeffneSektor, einstellungenAbschnittOeffnen } = require('./helpers');

const BUNDLE_DATEI = path.join(__dirname, '..', 'fixtures', 'erbschein-vorbereitung-logikmodul.json');

async function erbscheinEinlassen(page) {
  await page.locator('#tb-einstellungen').click();
  // D.4 (Rest-Sichten, 26.08.2026): „Eingelassene Erweiterungen" liegt hinter <details>,
  // kollabiert per Default — erst aufklappen, dann ist der Einlass-Knopf sichtbar.
  await einstellungenAbschnittOeffnen(page, '#einst-modul-einlassen');
  await expect(page.locator('#einst-modul-einlassen')).toBeVisible();
  await page.locator('#einst-modul-datei').setInputFiles(BUNDLE_DATEI);
  await page.locator('#m-ok').click();   // Einstellungen-Modal schließen
}

/* U2-ADR-288 (05.09.2026): bis zu diesem Auftrag erreichte der Erbschein-Vorbereitungsauszug
   seit dem Siebtes-Register-Umbau (27.08.2026) kein reales Depot mehr — der Fremdmodul-Einlass
   war bewiesen (Byte-Gleichheit, s. tests/siebtes-register-erbschein-byte-gleichheit.test.js),
   der WEG dorthin fehlte: keine echte Bürgerin hätte je eine Bundle-Datei zum Hochladen gehabt.
   Dieser Test war früher der Beleg für „ohne Einlass keine Karte" (fest verdrahtet wäre falsch) —
   das gilt architektonisch unverändert (s. die Gegenprobe in tests/erbschein-modul-mechanik.
   test.js, die eine echte Entfernung simuliert). Was sich geändert hat: eine frisch angelegte
   Bürgerin bekommt das Modul jetzt AB WERK selbst eingelassen (depotAnlegen()), ganz ohne
   Datei-Upload — das ist jetzt der Rot-Beweis, der seit dem 27.08. gefehlt hat, hier erstmals im
   echten Browser bewiesen, nicht nur im Node-Kern. */
test('Erbschein liegt ab Werk vor: die Regal-Karte erscheint bei einer frisch angelegten Bürgerin OHNE jeden manuellen Einlass', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await oeffneSektor(page, 'advanceCare');
  await expect(page.locator('[data-modul-karte="erbschein-vorbereitung"]')).toHaveCount(1,
    'die Karte muss ab Werk erscheinen — ganz ohne Datei-Upload. Genau das war seit dem 27.08. '
    + 'ausgeliefert kaputt (U2-ADR-288)');
  await expect(page.locator('[data-erbschein-dokument]')).toBeVisible();
});

test('Regal-Karte springt zur Sektion, der Knopf öffnet den Auszug — leeres Depot zeigt nur Lücken', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await erbscheinEinlassen(page);
  await oeffneSektor(page, 'advanceCare');

  const knopf = page.locator('[data-erbschein-dokument]');
  await expect(knopf).toBeVisible();
  await knopf.click();

  await expect(page.locator('#pv-dok-overlay')).toBeVisible();
  const blatt = page.locator('#pv-dok-overlay .pv-dok-blatt');
  await expect(blatt).toContainText('Erbschein — Vorbereitungsauszug');
  await expect(blatt).toContainText('— nicht erfasst —');
  // Auftrag „Paragraphen raus" (22.09.2026, Nr. 26, bestätigt): der Hinweis
  // nannte § 2356 BGB als Fundstelle für die eidesstattliche Versicherung; neu ohne
  // Fundstelle, dieselbe Aussage (der Auszug ersetzt weder die eidesstattliche Versicherung
  // noch den amtlichen Erbschein-Wegweiser).
  await expect(blatt).toContainText('ersetzt weder die eidesstattliche Versicherung noch den amtlichen Erbschein-Wegweiser');
  await expect(blatt).not.toContainText('2356');
  await expect(blatt).not.toContainText('Ort, Datum, Unterschrift');
});

test('volles Depot: Testament, Familienstand und Kind erscheinen im Auszug in Klartext', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await erbscheinEinlassen(page);

  // Setup über die echten Kern-Funktionen, dasselbe Muster wie ereignis-achse-abnahme.spec.js:
  // window.__vdOeffentlich.renderContent() am Ende ist Pflicht — ohne ihn bleibt das DOM auf dem Stand vor der
  // Mutation, und der Auto-Save beim nächsten Bereichs-Wechsel (U2-ADR-011) liest diesen
  // veralteten DOM-Stand zurück und überschreibt die eben gesetzten Werte wieder.
  await page.evaluate(() => {
    const kindId = window.__vdOeffentlich.personHinzufuegen({ name: 'Tochter Beispiel' });
    window.__vdOeffentlich.sektorFeldSetzen('identity', 'nationality', 'deutsch');
    window.__vdOeffentlich.sektorFeldSetzen('identity', 'maritalStatus', 'verh');
    window.__vdOeffentlich.ankerDaten().sektoren['people'] = Object.assign({}, window.__vdOeffentlich.ankerDaten().sektoren['people'], {
      childrenAndDependants: [{ id: 'k1', person: { ref: kindId }, type: 'leiblich' }],
    });
    window.__vdOeffentlich.ankerDaten().sektoren.advanceCare = Object.assign({}, window.__vdOeffentlich.ankerDaten().sektoren.advanceCare, {
      provisionInstruments: [{ id: 'e2e-testament-1', instrument: 'will', form: 'beurkundet' }],
    });
    window.__vdOeffentlich.renderContent();
  });

  await oeffneSektor(page, 'advanceCare');
  await page.evaluate(() => window.__vdOeffentlich.dokumentOeffnen('erbschein-vorbereitung'));

  const blatt = page.locator('#pv-dok-overlay .pv-dok-blatt');
  await expect(blatt).toBeVisible();
  await expect(blatt).toContainText('deutsch');
  await expect(blatt).toContainText('notariell beurkundet');
  await expect(blatt).toContainText('verheiratet');
  await expect(blatt).toContainText('Tochter Beispiel');
});

test('Zug 1b: "Als XML sichern" läuft über den echten Klickweg durch, ohne Absturz — NACH Einlass', async ({ page }) => {
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(String(e)));

  await oeffneApp(page);
  await depotAnlegen(page);
  await erbscheinEinlassen(page);
  await oeffneSektor(page, 'advanceCare');

  const xmlKnopf = page.locator('[data-erbschein-xml]');
  await expect(xmlKnopf).toBeVisible();
  await xmlKnopf.click();
  await page.waitForTimeout(300);

  expect(fehler, 'kein unbehandelter Fehler beim XML-Sichern').toEqual([]);
});
