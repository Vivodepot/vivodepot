'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-263 — der PDF-Export verstümmelt Sonderzeichen lautlos
   ────────────────────────────────────────────────────────────────────────────
   Reine node --test-Proben decken `pdfZeichenOhneDeckung()` selbst ab
   (tests/adr-263-pdf-schriftdeckung.test.js) — echtes jsPDF läuft nur im Browser
   (U2-ADR-091 §6), darum hier die Integration: dieselbe Direktaufruf-Bauart wie
   tests/e2e/n2-zug3-notfallkarte-umbruch.spec.js (zeichne*Pdf() direkt mit
   synthetischen Daten, keine echte Feld-Eingabe über die UI nötig) für vier der
   fünf Zeichner, plus EINE echte Ende-zu-Ende-Probe über einen echten Flow:
   Warnung erscheint, KEIN Download läuft. KEIN `new Function`/`eval` — die App
   erzwingt script-src 'self'; Daten werden als serialisierbares Argument an
   page.evaluate() gereicht, nicht als Code-String.

   NACHTRAG 13.09.2026 (U2-ADR-263 Teil 2, PDF-CI): Inter eingebettet, Latein-Erweiterung
   A/B jetzt getragen — dieselbe Umkehr wie in tests/adr-263-pdf-schriftdeckung.test.js
   (dortiger Kommentar). Die VIER Sprachproben unten (Polnisch/Ungarisch/Türkisch/
   Tschechisch) sind nicht mehr Rot-Beweise, sondern Positivkontrollen: derselbe Text,
   umgekehrtes Vorzeichen. Jede trägt jetzt zusätzlich eine eigene CJK-Gegenprobe im
   selben Testkörper — belegt, dass _pdfSchriftLueckenBuendeln() nicht bloß kaputt immer
   [] liefert, sondern an einem echten, weiterhin unbedeckten Schriftsystem noch findet.
   Chinesisch bleibt der echte Rot-Beweis (Ende-zu-Ende-Test unten, unverändert). ══ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

test('[U2-ADR-263·Notfallkarte·Nachtrag] polnisches Sonderzeichen wird jetzt getragen, CJK weiterhin nicht', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.waitForFunction(() => typeof window.jspdf !== 'undefined');

  const funde = await page.evaluate(() => {
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    window.__vdOeffentlich._pdfSchriftPruefungInstallieren(doc);
    window.__vdOeffentlich.zeichneNotfallkarte(doc, [{ label: 'Name', wert: 'Żółć Kowalski' }], { name: 'Test', datum: '04.09.2026' }, null);
    return window.__vdOeffentlich._pdfSchriftLueckenBuendeln(doc);
  });
  expect(funde, 'Ż/ł/ć/ó waren bis 13.09.2026 offen, jetzt vollständig getragen').toEqual([]);

  const sauber = await page.evaluate(() => {
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    window.__vdOeffentlich._pdfSchriftPruefungInstallieren(doc);
    window.__vdOeffentlich.zeichneNotfallkarte(doc, [{ label: 'Name', wert: 'München Straße' }], { name: 'Test', datum: '04.09.2026' }, null);
    return window.__vdOeffentlich._pdfSchriftLueckenBuendeln(doc);
  });
  expect(sauber).toEqual([]);

  const cjkFund = await page.evaluate(() => {
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    window.__vdOeffentlich._pdfSchriftPruefungInstallieren(doc);
    window.__vdOeffentlich.zeichneNotfallkarte(doc, [{ label: 'Name', wert: '中文测试' }], { name: 'Test', datum: '04.09.2026' }, null);
    return window.__vdOeffentlich._pdfSchriftLueckenBuendeln(doc);
  });
  // Gegenprobe: die Erkennung selbst findet an CJK weiterhin etwas — sonst bewiese [] oben nichts.
  expect(cjkFund).toHaveLength(1);
  expect(cjkFund[0].zeichen.length).toBeGreaterThan(0);
});

test('[U2-ADR-263·Widerruf·Nachtrag] ungarisches Sonderzeichen wird jetzt getragen, CJK weiterhin nicht', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.waitForFunction(() => typeof window.jspdf !== 'undefined');

  const funde = await page.evaluate(() => {
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    window.__vdOeffentlich._pdfSchriftPruefungInstallieren(doc);
    const eintrag = { empfaenger: 'őz és tűz Kft.', zweck: 'Test', zeitpunkt: new Date().toISOString(), kennung: 'abc123de' };
    window.__vdOeffentlich.zeichneWiderrufPdf(doc, eintrag, { widerrufZeitpunkt: new Date().toISOString() }, null);
    return window.__vdOeffentlich._pdfSchriftLueckenBuendeln(doc);
  });
  const empfaengerFund = funde.find((f) => f.feld === 'Wer bekommt es?');   // STRINGS.uebergabeEmpfaengerLabel
  expect(empfaengerFund, 'ő/ű waren bis 13.09.2026 offen, jetzt vollständig getragen').toBeUndefined();

  const cjkFunde = await page.evaluate(() => {
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    window.__vdOeffentlich._pdfSchriftPruefungInstallieren(doc);
    const eintrag = { empfaenger: '中文测试 Kft.', zweck: 'Test', zeitpunkt: new Date().toISOString(), kennung: 'abc123de' };
    window.__vdOeffentlich.zeichneWiderrufPdf(doc, eintrag, { widerrufZeitpunkt: new Date().toISOString() }, null);
    return window.__vdOeffentlich._pdfSchriftLueckenBuendeln(doc);
  });
  const cjkFund = cjkFunde.find((f) => f.feld === 'Wer bekommt es?');
  expect(cjkFund, 'Gegenprobe: CJK muss weiterhin gefunden werden').toBeTruthy();
});

test('[U2-ADR-263·Situation·Nachtrag] türkisches Sonderzeichen wird jetzt getragen, CJK weiterhin nicht', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.waitForFunction(() => typeof window.jspdf !== 'undefined');

  const funde = await page.evaluate(() => {
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    window.__vdOeffentlich._pdfSchriftPruefungInstallieren(doc);
    const modell = { titel: 'Anlass', bloecke: [{ titel: 'Block', zeilen: [{ label: 'Ort', wert: 'dağ köyü' }] }] };
    const meta = { anlass: '', generierer: '', datum: '04.09.2026', copyright: '', unterVollmacht: false, inhaber: '' };
    window.__vdOeffentlich.zeichneSituationPdf(doc, modell, meta);
    return window.__vdOeffentlich._pdfSchriftLueckenBuendeln(doc);
  });
  const ortFund = funde.find((f) => f.feld === 'Ort');
  expect(ortFund, 'ğ war bis 13.09.2026 offen, jetzt vollständig getragen').toBeUndefined();

  const cjkFunde = await page.evaluate(() => {
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    window.__vdOeffentlich._pdfSchriftPruefungInstallieren(doc);
    const modell = { titel: 'Anlass', bloecke: [{ titel: 'Block', zeilen: [{ label: 'Ort', wert: '中文测试' }] }] };
    const meta = { anlass: '', generierer: '', datum: '04.09.2026', copyright: '', unterVollmacht: false, inhaber: '' };
    window.__vdOeffentlich.zeichneSituationPdf(doc, modell, meta);
    return window.__vdOeffentlich._pdfSchriftLueckenBuendeln(doc);
  });
  const cjkFund = cjkFunde.find((f) => f.feld === 'Ort');
  expect(cjkFund, 'Gegenprobe: CJK muss weiterhin gefunden werden').toBeTruthy();
});

test('[U2-ADR-263·VollDepot·Nachtrag] tschechisches Sonderzeichen wird jetzt getragen, CJK weiterhin nicht', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.waitForFunction(() => typeof window.jspdf !== 'undefined');

  const funde = await page.evaluate(() => {
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    window.__vdOeffentlich._pdfSchriftPruefungInstallieren(doc);
    const modell = { titel: 'Depot', untertitel: '', bereiche: [{ titel: 'Bereich', leer: false, sektionen: [{ titel: 'Sektion', zeilen: [{ label: 'Stadt', wert: 'Plzeň, řeka' }] }] }] };
    const meta = { anlass: '', generierer: '', datum: '04.09.2026', copyright: '', unterVollmacht: false, inhaber: '' };
    window.__vdOeffentlich.zeichneVollDepotPdf(doc, modell, meta);
    return window.__vdOeffentlich._pdfSchriftLueckenBuendeln(doc);
  });
  const stadtFund = funde.find((f) => f.feld === 'Stadt');
  // "Plzeň, řeka": ň(0x148)/ř(0x159) waren bis 13.09.2026 offen (kein ě in diesem Text).
  expect(stadtFund, 'ň/ř waren bis 13.09.2026 offen, jetzt vollständig getragen').toBeUndefined();

  const cjkFunde = await page.evaluate(() => {
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    window.__vdOeffentlich._pdfSchriftPruefungInstallieren(doc);
    const modell = { titel: 'Depot', untertitel: '', bereiche: [{ titel: 'Bereich', leer: false, sektionen: [{ titel: 'Sektion', zeilen: [{ label: 'Stadt', wert: '中文测试' }] }] }] };
    const meta = { anlass: '', generierer: '', datum: '04.09.2026', copyright: '', unterVollmacht: false, inhaber: '' };
    window.__vdOeffentlich.zeichneVollDepotPdf(doc, modell, meta);
    return window.__vdOeffentlich._pdfSchriftLueckenBuendeln(doc);
  });
  const cjkFund = cjkFunde.find((f) => f.feld === 'Stadt');
  expect(cjkFund, 'Gegenprobe: CJK muss weiterhin gefunden werden').toBeTruthy();
});

test('[U2-ADR-263·Ende-zu-Ende] chinesischer Text im Namen: Gesamt-PDF wird NICHT erzeugt, Warnung erscheint', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.evaluate(() => { window.__vdOeffentlich.sektorFeldSetzen('identity', 'givenName', '中文'); });

  let downloadKam = false;
  page.on('download', () => { downloadKam = true; });

  await page.evaluate(() => { window.__vdOeffentlich.flowVollDepotPdf({}); });
  await expect(page.locator('#modal-titel')).toHaveText('PDF nicht erstellt');
  await expect(page.locator('#modal-inhalt')).toContainText('中');
  await expect(page.locator('#modal-inhalt')).toContainText('文');
  // Kein „Trotzdem erstellen" — anders als die Unstimmigkeits-Warnung gibt es hier nur EINEN
  // Weg (Schließen), keinen zweiten, der doch noch generiert (s. Kommentar U2-ADR-263 im Kern).
  await expect(page.locator('#m-abbr')).toHaveCount(0);
  await expect(page.locator('#m-ok')).toHaveText('Schließen');

  await page.waitForTimeout(300);   // Download wäre synchron/schnell — kurze Wartezeit statt Race
  expect(downloadKam, 'kein Download darf ausgelöst worden sein').toBe(false);
});

test('[U2-ADR-263·Ende-zu-Ende·Gegenprobe] gewöhnlicher Name: Gesamt-PDF entsteht wie gehabt', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.evaluate(() => { window.__vdOeffentlich.sektorFeldSetzen('identity', 'givenName', 'Müller'); });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.evaluate(() => { window.__vdOeffentlich.flowVollDepotPdf({}); }),
  ]);
  expect(download.suggestedFilename()).toMatch(/Vivodepot_Alle-Daten.*\.pdf$/);
  await expect(page.locator('#modal-titel')).toHaveCount(0);
});
