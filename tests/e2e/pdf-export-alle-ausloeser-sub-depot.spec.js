'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   PDF-Export überall — auch im Sub-Depot (Auftrag 14.09.2026, Befund der
   Produktverantwortung: "beim Test wurde in einem Sub-Depot kein PDF erstellt,
   Anker offenbar ja").
   ────────────────────────────────────────────────────────────────────────────
   Inventur (tools/vd-messen, s. Bericht): sechs PDF-Erzeuger — flowVollDepotPdf,
   flowBereichPdf, flowNotfallkartePdf, flowSituationPdf, uebergabeWiderrufPdfErzeugen,
   flowDokumentDateiSichern (über _dokumentPdfMitPruefung). Jeder wird hier einmal je
   Kontext (Anker als Positivkontrolle, Sub-Depot als eigentliche Probe) gefahren:
   Klick-Äquivalent (derselbe Aufruf, den der jeweilige Knopf auslöst) → Download-
   Ereignis abgewartet → Konsole-Fehler mitgeschnitten (Lehre aus 58fc323f: ein
   jsPDF-interner Fehler wird nie geworfen, sichtbar nur als ausbleibender Download).

   ERGEBNIS DIESES AUFTRAGS (13./14.09.2026): gegen origin/u2-kanon (aktueller Stand)
   UND gegen 7a's damals ungepushten PDF-CI-Commit 58fc323f ist der gemeldete Bug NICHT
   reproduzierbar — alle sechs Erzeuger liefern in beiden Kontexten, Chromium und
   Firefox, einen gültigen Download. Naheliegendste Erklärung (s. Bericht): der Test der
   Produktverantwortung traf 7a's damals noch unfertige Inter-Font-Einbettung, bei der
   ein leeres TTF-'name'-Feld jsPDFs Parser intern brechen ließ (exakt derselbe
   Symptom-Typ: Anker unbeeinträchtigt sichtbar, ein bestimmter Erzeuger lautlos ohne
   Download) — von 7a im selben Commit bereits gefunden und behoben. Diese Datei bleibt
   als dauerhafter Regressionswächter stehen, unabhängig davon, welche Ursache es war.
   ════════════════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');

const PW = 'e2e-passwort-123';

async function erwarteDownload(page, aufruf, ...args) {
  const konsoleFehler = [];
  const onErr = (msg) => { if (msg.type() === 'error') konsoleFehler.push(msg.text()); };
  const onPageErr = (err) => konsoleFehler.push('pageerror: ' + err.message);
  page.on('console', onErr);
  page.on('pageerror', onPageErr);
  const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
  await page.evaluate(aufruf, args.length === 1 ? args[0] : args);
  const download = await downloadPromise;
  page.off('console', onErr);
  page.off('pageerror', onPageErr);
  expect(konsoleFehler, 'keine Konsole-Fehler während des PDF-Aufrufs').toEqual([]);
  return download;
}

async function subDepotBetreten(page, pw) {
  const fehler = await page.evaluate(async (subPw) => {
    try {
      const e = await window.__vdOeffentlich.subDepotAnlegen(
        { bezeichnung: 'E2E-Sub-PDF', inhaberin: 'Testperson', verwaltungsTyp: 'verwaltet', akzent: 'flieder' }, subPw);
      await window.__vdOeffentlich.subDepotVertrauenOeffnen(e.depotUUID, subPw);
      window.__vdOeffentlich.subKontextBetreten(e.depotUUID);
      return null;
    } catch (err) { return String(err && err.stack || err); }
  }, pw);
  expect(fehler, 'Sub-Depot-Setup darf nicht werfen').toBeNull();
  // Notfallkarte braucht mindestens ein gefülltes Kernfeld, sonst bricht der Erzeuger
  // ABSICHTLICH früh ab (leere Notfall-Allowlist, eigener Toast, kein Download) — das ist
  // korrektes Verhalten bei einem leeren Depot, keine Einbahnstraße für diese Probe.
  await page.evaluate(() => {
    window.__vdOeffentlich.sektorFeldSetzen('identity', 'givenName', 'Sub');
    window.__vdOeffentlich.sektorFeldSetzen('identity', 'familyName', 'Person');
  });
}

const TEST_BUNDLE = Object.freeze({
  modulTyp: 'logikModul', id: 'pdf-ausloeser-sub-depot-test-dokument', titel: 'Regressionsprobe',
  sektor: 'advanceCare', moduleVersion: 1, herkunft: 'pdf-export-alle-ausloeser-sub-depot-test',
  datenSchema: {},
  abschnitte: [{ titel: 'Abschnitt', bloecke: [{ typ: 'immer', texte: ['Testzeile.'] }] }],
  dokAusgabe: {
    h1: 'Regressionsprobe', klasse: 'pdf-repro-dok', herkunftText: '', fussText: '',
    knopfAttr: 'pdf-repro-test', dateiBasis: 'PDF_Repro_Test',
  },
});

// KEIN `for`-Loop über die zwei Kontexte: `tests/a423-e2e-zahl.test.js` erkennt schleifenerzeugte
// `test(`-Aufrufe strukturell (an genau diesem Muster) und zählt ihren Zuwachs eigens — zwei
// ausgeschriebene Tests sind hier klarer als ein zweiter Eintrag in dessen Sonderfall-Liste.
async function alleSechsErzeuger(page, kontext) {
  await oeffneApp(page);
  await depotAnlegen(page, { pw: PW });
  if (kontext === 'Sub-Depot') await subDepotBetreten(page, PW);

  await erwarteDownload(page, () => window.__vdOeffentlich.flowVollDepotPdf({}));
  await erwarteDownload(page, () => window.__vdOeffentlich.flowBereichPdf('identity', {}));
  await erwarteDownload(page, () => window.__vdOeffentlich.flowNotfallkartePdf());

  const sitId = await page.evaluate(() => Object.keys(window.__vdOeffentlich.SITUATION_BY_ID || {})[0] || null);
  expect(sitId, 'mindestens eine eingebaute Situation muss existieren').toBeTruthy();
  await erwarteDownload(page, (id) => window.__vdOeffentlich.flowSituationPdf(id), sitId);

  const eintrag = { kennung: 'e2e-widerruf-abc123', empfaenger: 'Test-Empfaenger', zweck: 'Test-Zweck', zeitpunkt: new Date().toISOString() };
  await erwarteDownload(page, (e) => window.__vdOeffentlich.uebergabeWiderrufPdfErzeugen(e), eintrag);

  const bundleId = TEST_BUNDLE.id + '-' + kontext;
  const einlass = await page.evaluate((b) => window.__vdOeffentlich.modulEinlassen(JSON.stringify(b)), Object.assign({}, TEST_BUNDLE, { id: bundleId }));
  expect(einlass.angenommen, 'Test-Bundle muss angenommen werden: ' + einlass.grund).toBe(true);
  await erwarteDownload(page, (id) => window.__vdOeffentlich.flowDokumentDateiSichern(id, null), bundleId);
}

test.describe('[PDF-Export·alle Ausloeser] Anker (Positivkontrolle) und Sub-Depot', () => {
  test('Anker: alle sechs PDF-Erzeuger liefern einen Download', async ({ page }) => {
    await alleSechsErzeuger(page, 'Anker');
  });
  test('Sub-Depot: alle sechs PDF-Erzeuger liefern einen Download', async ({ page }) => {
    await alleSechsErzeuger(page, 'Sub-Depot');
  });
});
