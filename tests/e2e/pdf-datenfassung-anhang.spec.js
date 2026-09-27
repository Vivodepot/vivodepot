'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   pdf-datenfassung-anhang.spec.js — Auftrag „Die Datenfassung im PDF bauen"
   ────────────────────────────────────────────────────────────────────────────
   Misst AM FERTIGEN PDF, nicht an einer Zwischenstufe: echtes jsPDF (der
   inline 3. Skript-Block, läuft nur im Browser — dieselbe Bauart wie
   tests/e2e/u2-adr-263-pdf-schriftdeckung.spec.js) zeichnet, `doc.output(
   'arraybuffer')` liefert die tatsächlichen Bytes, `tools/pdf-anhang-
   datenfassung-lesen.js` gewinnt daraus die eingebettete Datenfassung
   zurück — derselbe Weg, den eine externe Empfängerin auch ginge.

   DIE WICHTIGSTE PROBE HIER (erste unten): ein Teilauszug mit einem
   WIRKLICH zurückgehaltenen Feld — über den echten Weg
   (exportUebersichtModell → exportAuswahlEphemerAnwenden → vollDepotModell
   (opt), nicht synthetisch zusammengebaut). Der zurückgehaltene Wert darf
   im aus den PDF-Bytes zurückgewonnenen Anhang NICHT vorkommen. Würde der
   Anhang später auf `vollExportJSON()` umgestellt (liest global frisch,
   ohne die ephemere Sensibel-Markierung zu respektieren), müsste diese
   Probe ROT werden — sie prüft aktiv, nicht nur behauptend.
   ════════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { oeffneApp, depotAnlegen } = require('./helpers');
const { datenfassungAusPdfLesenAlsJson } = require('../../tools/pdf-anhang-datenfassung-lesen.js');

// page.evaluate() liefert nur serialisierbare Werte zurück — die PDF-Bytes reisen als
// Base64-Text (btoa auf einem char-per-byte-Binärstring, dieselbe Konvention wie die
// eingebettete Datenfassung selbst) und werden hier zu einem echten Buffer zurückgewandelt.
function alsBuffer(base64) {
  return Buffer.from(base64, 'base64');
}

test('[PDF-Datenfassung · Teilauszug] ein zurückgehaltenes Feld erscheint NICHT im eingebetteten Anhang', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.evaluate(() => {
    window.__vdOeffentlich.sektorFeldSetzen('identity', 'givenName', 'Maria');
    window.__vdOeffentlich.sektorFeldSetzen('identity', 'familyName', 'GeheimNachname');
  });
  await page.waitForFunction(() => typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF === 'function');

  const b64 = await page.evaluate(async () => {
    // Der echte Weg: Kandidaten holen, GENAU EINEN abwählen (nachname bleibt draußen),
    // exportAuswahlEphemerAnwenden wendet die ephemere Sensibel-Markierung an und ruft
    // aufFortfahren(opt) MIT ihr aktiv — exakt der Moment, in dem vollDepotModell(opt)
    // aufgerufen werden muss, damit das Modell die Zurückhaltung wirklich zeigt.
    const uebersicht = window.__vdOeffentlich.exportUebersichtModell('identity');
    const kandidaten = uebersicht.enthalten.concat(uebersicht.zurueckgehalten);
    const gewaehlt = new Set(kandidaten.filter((k) => k.feld !== 'familyName').map((k) => k.sektor + '/' + k.feld));

    let modell = null;
    await window.__vdOeffentlich.exportAuswahlEphemerAnwenden(kandidaten, gewaehlt, (opt) => {
      modell = window.__vdOeffentlich.vollDepotModell(opt);
    });

    const meta = window.__vdOeffentlich.vollDepotPdfMeta();
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    window.__vdOeffentlich.zeichneVollDepotPdf(doc, modell, meta);
    window.__vdOeffentlich.pdfDatenfassungEinbetten(doc, modell, 'Teilauszug.json');

    const bytes = new Uint8Array(doc.output('arraybuffer'));
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  });

  const daten = datenfassungAusPdfLesenAlsJson(alsBuffer(b64));
  const alleWerte = JSON.stringify(daten);
  expect(alleWerte, 'Positivkontrolle: das ENTHALTENE Feld muss im Anhang stehen — sonst prüft die nachfolgende Abwesenheits-Probe nichts').toContain('Maria');
  expect(alleWerte, 'ROT ERWARTET, wenn falsch: das zurückgehaltene Feld darf im Anhang NICHT vorkommen').not.toContain('GeheimNachname');
});

test('[PDF-Datenfassung · Voll-Depot] Anhang enthält dasselbe Feld, das auf der Seite steht (kein Teilauszug)', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  // Umlaut-Wert MIT gesetzt: die node-Tests von tools/pdf-anhang-datenfassung-lesen.js decken
  // UTF-8-Mehrbyte-Zeichen nur auf dem LESE-Weg ab (vorgefertigte Bytes). Ob der SCHREIB-Weg
  // (_pdfUtf8AlsBinaerstring über echtes jsPDF) Umlaute verlustfrei in den Stream bringt, prüft
  // erst dieser Rundweg — mit echtem Browser-jsPDF, nicht mit einer von Hand gebauten Fixture.
  await page.evaluate(() => {
    window.__vdOeffentlich.sektorFeldSetzen('identity', 'givenName', 'Cassandra');
    window.__vdOeffentlich.sektorFeldSetzen('identity', 'familyName', 'Müller-Straße');
  });
  await page.waitForFunction(() => typeof window.jspdf !== 'undefined');

  const b64 = await page.evaluate(() => {
    const modell = window.__vdOeffentlich.vollDepotModell();
    const meta = window.__vdOeffentlich.vollDepotPdfMeta();
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    window.__vdOeffentlich.zeichneVollDepotPdf(doc, modell, meta);
    window.__vdOeffentlich.pdfDatenfassungEinbetten(doc, modell, 'Alle-Daten.json');
    const bytes = new Uint8Array(doc.output('arraybuffer'));
    let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  });

  const daten = datenfassungAusPdfLesenAlsJson(alsBuffer(b64));
  const ident = daten.bereiche.find((b) => b.id === 'identity');
  const werte = ident.sektionen.flatMap((s) => s.zeilen).map((z) => z.wert);
  expect(werte).toContain('Cassandra');
  expect(werte, 'Umlaute/ß müssen den echten Schreib-Weg (_pdfUtf8AlsBinaerstring) verlustfrei überstehen').toContain('Müller-Straße');
});

test('[PDF-Datenfassung · Situation] Anhang enthält dasselbe Feld, das auf der Seite steht', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.waitForFunction(() => typeof window.jspdf !== 'undefined');

  const b64 = await page.evaluate(() => {
    const modell = { titel: 'Testanlass', bloecke: [{ titel: 'Block', zeilen: [{ label: 'Ort', wert: 'Berlin' }] }] };
    const meta = { anlass: '', generierer: '', datum: '11.09.2026', copyright: '', unterVollmacht: false, inhaber: '' };
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    window.__vdOeffentlich.zeichneSituationPdf(doc, modell, meta);
    window.__vdOeffentlich.pdfDatenfassungEinbetten(doc, modell, 'Anlass.json');
    const bytes = new Uint8Array(doc.output('arraybuffer'));
    let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  });

  const daten = datenfassungAusPdfLesenAlsJson(alsBuffer(b64));
  expect(daten.titel).toBe('Testanlass');
  expect(daten.bloecke[0].zeilen[0].wert).toBe('Berlin');
});

test('[PDF-Datenfassung · Dokument] Anhang trägt die ROHEN Feldwerte hinter dem Dokument, nicht dessen Fließtext', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.waitForFunction(() => typeof window.jspdf !== 'undefined');

  const ergebnis = await page.evaluate(() => {
    // 'patientenverfuegung'/'vi-pv': derselbe Direktaufruf-Weg wie
    // tests/e2e/fix-dokument-pdf-unterschrift-false.spec.js — kein UI-Ausfüllschritt nötig.
    const { doc } = window.__vdOeffentlich._dokumentPdfMitPruefung('patientenverfuegung', 'vi-pv');
    const bytes = new Uint8Array(doc.output('arraybuffer'));
    let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const reg = window.__vdOeffentlich._modulOderVorlage('patientenverfuegung');
    const rohdatenUnabhaengigErneutGelesen = reg.generator.datenLesen('vi-pv');
    return { b64: btoa(bin), rohdatenJson: JSON.stringify(rohdatenUnabhaengigErneutGelesen) };
  });

  const daten = datenfassungAusPdfLesenAlsJson(alsBuffer(ergebnis.b64));
  // Unabhängig gegengelesen: derselbe datenLesen()-Aufruf, NICHT dieselbe Referenz wie im
  // Kern-Code, der den Anhang gebaut hat — ein Rundweg-Vergleich, kein Selbstgespräch.
  expect(JSON.stringify(daten)).toBe(ergebnis.rohdatenJson);
});

test('[PDF-Datenfassung · Notfallkarte] trägt bewusst KEINEN Anhang', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.waitForFunction(() => typeof window.jspdf !== 'undefined');

  const b64 = await page.evaluate(() => {
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    window.__vdOeffentlich.zeichneNotfallkarte(doc, [{ label: 'Name', wert: 'Maria' }], { name: 'Maria', datum: '11.09.2026' }, null);
    const bytes = new Uint8Array(doc.output('arraybuffer'));
    let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  });

  expect(() => datenfassungAusPdfLesenAlsJson(alsBuffer(b64))).toThrow();
});

test('[PDF-Datenfassung · Widerruf] trägt bewusst KEINEN Anhang', async ({ page }) => {
  await oeffneApp(page);
  await depotAnlegen(page);
  await page.waitForFunction(() => typeof window.jspdf !== 'undefined');

  const b64 = await page.evaluate(() => {
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    const eintrag = { empfaenger: 'Test GmbH', zweck: 'Test', zeitpunkt: new Date().toISOString(), kennung: 'abc123de' };
    window.__vdOeffentlich.zeichneWiderrufPdf(doc, eintrag, { widerrufZeitpunkt: new Date().toISOString() }, null);
    const bytes = new Uint8Array(doc.output('arraybuffer'));
    let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  });

  expect(() => datenfassungAusPdfLesenAlsJson(alsBuffer(b64))).toThrow();
});
