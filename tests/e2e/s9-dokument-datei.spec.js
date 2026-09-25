'use strict';
/* ════════════════════════════════════════════════════════════════════════
   E2E — S9: Das Dokument wird eine Datei (Auftrag K8/S9, 09.08.2026,
   Zug 2)
   ────────────────────────────────────────────────────────────────────────
   Auftrag: „Browser-Abnahme für Zug 2 — eine Datei, die nur in Node
   entsteht, ist keine." Node-Proben (tests/s9-dokument-datei.test.js)
   prüfen Inhalt/Logik über einen jsPDF-Stub; hier läuft echtes jsPDF im
   Browser, ein echter Blob-Download, eine echte Mappe-Ablage.

   Setup über page.evaluate() direkt an der Kern-Variable `data` statt durch
   den PV-Wizard zu klicken — der Wizard-Weg ist bereits an anderer Stelle
   geprüft (wizard-pvwiz.test.js), hier geht es um die drei NEUEN Wege ab
   einem bereits geöffneten Dokument-Overlay.
   ════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

// Bekannt-folgenlose Browser-Hinweise (dasselbe Muster wie 00-smoke.spec.js): die Meta-CSP-
// Direktive 'frame-ancestors' wirkt nur als echter HTTP-Header, file:// hat keine Header — kein
// App-Fehler, aus der Konsolen-Schranke unten herausgefiltert.
const KONSOLE_HARMLOS = [
  /Content Security Policy directive '(frame-ancestors|report-uri|sandbox)' is ignored when delivered via/i,
];
const istHarmloseKonsole = (t) => KONSOLE_HARMLOS.some((re) => re.test(String(t)));

async function bauePvBereitesDepot(page) {
  await page.evaluate(() => {
    window.__vdOeffentlich.ankerDaten().sektoren.identity = Object.assign({}, window.__vdOeffentlich.ankerDaten().sektoren.identity, {
      givenName: 'Elisabeth', familyName: 'Beispiel', birthDate: '1958-03-14',
      streetAddress: 'Lindenweg 4', postcodeCity: '80331 München',
    });
    window.__vdOeffentlich.ankerDaten().sektoren.advanceCare = Object.assign({}, window.__vdOeffentlich.ankerDaten().sektoren.advanceCare, { applicableSituations: ['sterbeprozess'] });
  });
}

test('S9: Als PDF sichern erzeugt einen echten Download mit PDF-Inhalt', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await bauePvBereitesDepot(page);
  await page.evaluate(() => window.__vdOeffentlich.dokumentOeffnen('patientenverfuegung'));
  await expect(page.locator('#pv-dok-overlay')).toBeVisible();
  await expect(page.locator('#pv-dok-als-pdf')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#pv-dok-als-pdf'),
  ]);
  expect(download.suggestedFilename()).toMatch(/^Vivodepot_Patientenverfuegung_\d{4}-\d{2}-\d{2}\.pdf$/);
  const pfad = await download.path();
  const fs = require('node:fs');
  const bytes = fs.readFileSync(pfad);
  expect(bytes.slice(0, 5).toString('latin1')).toBe('%PDF-');   // echte PDF-Magic-Bytes, kein Platzhalter
});

// „Nur PDF" (10.08.2026): der Test „Als HTML sichern erzeugt ein eigenständiges,
// für sich lauffähiges Blatt" ist entfernt — der Knopf #pv-dok-als-html existiert nicht mehr.

test('S9: In Mappe ablegen legt einen echten Eintrag an, Bereich vorsorge, öffnenbar', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await bauePvBereitesDepot(page);
  await page.evaluate(() => window.__vdOeffentlich.dokumentOeffnen('patientenverfuegung'));
  await expect(page.locator('#pv-dok-overlay')).toBeVisible();

  await page.click('#pv-dok-in-mappe');
  await page.waitForFunction(() => (window.__vdOeffentlich.ankerDaten().mappe || []).length > 0);
  const eintrag = await page.evaluate(() => window.__vdOeffentlich.ankerDaten().mappe[0]);
  expect(eintrag.bereich).toBe('advanceCare');
  expect(eintrag.beschriftung).toBe('Patientenverfügung');
  expect(eintrag.mime).toBe('application/pdf');
  expect(eintrag.groesse).toBeGreaterThan(0);
  expect(eintrag.inhalt).toMatch(/^data:application\/pdf;base64,/);
});

test('S9: kein Konsolenfehler beim Öffnen und Nutzen beider Wege (PDF/Mappe — HTML entfallen, „Nur PDF" 10.08.2026)', async ({ page }) => {
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !istHarmloseKonsole(m.text())) fehler.push(m.text()); });

  await oeffneApp(page);
  await depotAnlegen(page);
  await bauePvBereitesDepot(page);
  await page.evaluate(() => window.__vdOeffentlich.dokumentOeffnen('patientenverfuegung'));
  await expect(page.locator('#pv-dok-overlay')).toBeVisible();

  await Promise.all([page.waitForEvent('download'), page.click('#pv-dok-als-pdf')]);
  await page.click('#pv-dok-in-mappe');
  await page.waitForFunction(() => (window.__vdOeffentlich.ankerDaten().mappe || []).length > 0);

  expect(fehler, 'keine Konsolenfehler über beide Wege: ' + fehler.join(' | ')).toEqual([]);
});
