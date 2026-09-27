'use strict';
/* Rot-Beweis + Fix (Auftrag 04.09.2026, Befund aus dem Bau von
   Referenzdepot-Modul-Template-2026-09-04.vivodepot): `zeichneDokumentPdf` UND
   `dokSignaturHTML` kennen `dokAusgabe.unterschriftZeilen` nur als Bestandsform (feste
   JS-Literale wie PV_MODUL). `LOGIK_DOK_AUSGABE_SCHLUESSEL` (vivodepot.html ~13511) kennt
   dieses Feld für ein eingelassenes logikModul-Bundle GAR NICHT — nur `unterschrift`
   (boolean, Default true) und `unterschriftErsatzHinweis`. `logikModulPruefen` normalisiert
   JEDES Bundle entsprechend (geprüft: `unterschriftZeilen` fehlt danach immer, auch ohne
   `unterschrift:false` gesetzt). Damit bricht bislang JEDES eingelassene logikModul beim
   PDF-Erzeugen — nicht nur eines mit `unterschrift:false` (bisher nur Erbschein), sondern
   auch der Normalfall (unterschrift default true, kein Ersatzhinweis). Am HTML-Pfad
   (`dokSignaturHTML`) dieselbe Lücke, nur bisher nie gemessen, weil Erbschein als einziges
   reales Beispiel `unterschrift:false` setzt und darum den ANDEREN, bereits korrekten Zweig
   nimmt.

   Eigenständiges, MINIMALES Test-Bundle statt des echten Erbschein-Fixtures — dieser Fix ist
   generisch (jedes Modul), nicht Erbschein-spezifisch, und Erbscheins eigene Fixture-Datei
   (tests/fixtures/erbschein-vorbereitung-logikmodul.json) hat heute Nacht eine eigene,
   unabhängige Änderung in Arbeit (sensibelErlaubt) — dieser Commit bleibt bewusst davon
   getrennt. */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

const TEST_BUNDLE_OHNE_UNTERSCHRIFT = {
  modulTyp: 'logikModul', id: 'fix-test-ohne-unterschrift', titel: 'Testdokument ohne Unterschrift',
  sektor: 'advanceCare', moduleVersion: 1, herkunft: 'fix-dokument-pdf-unterschrift-false-test',
  datenSchema: {},
  abschnitte: [{ titel: 'Abschnitt', bloecke: [{ typ: 'immer', texte: ['Testzeile.'] }] }],
  dokAusgabe: {
    h1: 'Testdokument ohne Unterschrift', klasse: 'fix-test-dok', herkunftText: '',
    unterschrift: false, unterschriftErsatzHinweis: 'Dieses Testdokument wird nicht unterschrieben.',
    fussText: '', knopfAttr: 'fix-test-dokument', dateiBasis: 'Fix_Test',
  },
};

// Normalfall: KEIN unterschrift-Schlüssel gesetzt — logikModulPruefen defaultet auf
// unterschrift:true, OHNE unterschriftZeilen (das Feld existiert für logikModule gar nicht,
// s. LOGIK_DOK_AUSGABE_SCHLUESSEL). Erwartung: EIN generischer "Unterschrift"-Block, kein Wurf.
const TEST_BUNDLE_STANDARD_UNTERSCHRIFT = {
  modulTyp: 'logikModul', id: 'fix-test-standard-unterschrift', titel: 'Testdokument Standard',
  sektor: 'advanceCare', moduleVersion: 1, herkunft: 'fix-dokument-pdf-unterschrift-false-test',
  datenSchema: {},
  abschnitte: [{ titel: 'Abschnitt', bloecke: [{ typ: 'immer', texte: ['Testzeile.'] }] }],
  dokAusgabe: {
    h1: 'Testdokument Standard', klasse: 'fix-test-dok', herkunftText: '',
    fussText: '', knopfAttr: 'fix-test-dokument-2', dateiBasis: 'Fix_Test_2',
  },
};

async function bundleEinlassenUndPdfZeichnen(page, bundle) {
  return page.evaluate((b) => {
    const ergebnis = window.__vdOeffentlich.modulEinlassen(JSON.stringify(b));
    if (!ergebnis.angenommen) return { angenommen: false, grund: ergebnis.grund };
    try {
      const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
      const log = []; const _t = doc.text.bind(doc);
      doc.text = (t, ...rest) => { log.push(Array.isArray(t) ? t.join(' | ') : String(t)); return _t(t, ...rest); };
      window.__vdOeffentlich.zeichneDokumentPdf(doc, b.id, null);
      return { angenommen: true, geworfen: false, log };
    } catch (e) {
      return { angenommen: true, geworfen: true, fehler: e.message };
    }
  }, bundle);
}

test('[Fix·unterschrift:false] ein Modul mit dem Flag erzeugt ein PDF statt zu werfen, mit dem Ersatzhinweis statt der Unterschriftszeile', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.waitForFunction(() => typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF === 'function');

  const r = await bundleEinlassenUndPdfZeichnen(page, TEST_BUNDLE_OHNE_UNTERSCHRIFT);
  expect(r.angenommen, 'Vorbedingung: das Test-Bundle wird angenommen: ' + r.grund).toBe(true);
  expect(r.geworfen, 'zeichneDokumentPdf darf bei unterschrift:false NICHT werfen: ' + r.fehler).toBe(false);
  expect(r.log.join('\n')).toContain('Dieses Testdokument wird nicht unterschrieben.');
  expect(r.log.join('\n')).not.toContain('Ort, Datum');
});

test('[Fix·Normalfall] ein logikModul ohne unterschrift-Schlüssel bekommt einen generischen Unterschriften-Block, kein Wurf', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.waitForFunction(() => typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF === 'function');

  const r = await bundleEinlassenUndPdfZeichnen(page, TEST_BUNDLE_STANDARD_UNTERSCHRIFT);
  expect(r.angenommen, 'Vorbedingung: das Test-Bundle wird angenommen: ' + r.grund).toBe(true);
  expect(r.geworfen, 'der Normalfall (kein unterschrift-Schlüssel) darf nicht werfen: ' + r.fehler).toBe(false);
  expect(r.log.join('\n')).toContain('Ort, Datum');
  expect(r.log.join('\n')).toContain('Unterschrift');
});

test('[Fix·Bestandsschutz] ein eingebautes Modul mit echten unterschriftZeilen (Patientenverfügung) bleibt unverändert', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.waitForFunction(() => typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF === 'function');

  const r = await page.evaluate(() => {
    try {
      const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
      const log = []; const _t = doc.text.bind(doc);
      doc.text = (t, ...rest) => { log.push(Array.isArray(t) ? t.join(' | ') : String(t)); return _t(t, ...rest); };
      window.__vdOeffentlich.zeichneDokumentPdf(doc, 'patientenverfuegung', 'vi-pv');
      return { geworfen: false, log };
    } catch (e) { return { geworfen: true, fehler: e.message }; }
  });
  expect(r.geworfen, 'Bestandsmodul darf weiterhin nicht werfen: ' + r.fehler).toBe(false);
  expect(r.log.join('\n')).toContain('Ort, Datum');
  expect(r.log.join('\n')).toContain('Unterschrift');
});
