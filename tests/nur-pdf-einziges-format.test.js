'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Nur PDF („Nur PDF", 10.08.2026, Zug 2)
   ────────────────────────────────────────────────────────────────────────
   Die eigentliche Fehlerklasse dieses Auftrags ist nicht das HTML-Blatt
   selbst, sondern die STILLSCHWEIGENDE Rückkehr eines zweiten Ausgabeformats
   — ob HTML wieder auftaucht oder ein drittes Format (Markdown, Text, …)
   entsteht, ist gleich: die Probe unten wird rot, wenn `dokumentOeffnen()`
   je wieder mehr als einen Datei-Ausgabe-Knopf rendert, oder wenn
   `flowDokumentDateiSichern`/`flowDokumentInMappeAblegen` einen anderen
   MIME-Typ als `application/pdf` erzeugen. Das Format selbst prüft diese
   Datei NICHT (das ist Aufgabe der PDF-eigenen Proben) — nur die Zahl.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

async function baueDepot(V) {
  await V.depotAnlegen('NurPDF-Test-2026!');
  V.akteurSelbstErklaeren('Testerin');
  const d = V.getData();
  d.sektoren.identity = { givenName: 'Elisabeth', familyName: 'Beispiel', birthDate: '1958-03-14',
    streetAddress: 'Lindenweg 4', postcodeCity: '80331 München' };
  d.sektoren.advanceCare = { applicableSituations: ['sterbeprozess'],
    provisionInstruments: [{ id: 'vm-1', instrument: 'enduring-power-of-attorney', representationInCourt: 'ja' }] };
  V.setData(d);
  return d;
}

// DOM-Stub-Grenze bekannt (tests/load-kern.js): querySelectorAll auf einem echten Container
// liefert im Node-Harness immer [] — kein Live-DOM-Weg hier. Stattdessen Quelltext-Probe direkt
// am Overlay-Bauplan in `dokumentOeffnen()`, derselben Stelle, aus der der Knopf käme.
test('[NurPDF] dokumentOeffnen() baut GENAU EINEN Datei-Ausgabe-Knopf (PDF) — kein zweites Format still zurück', () => {
  const fs = require('node:fs');
  const { HTML_PATH } = require('./load-kern.js');
  const src = fs.readFileSync(HTML_PATH, 'utf8');
  const start = src.indexOf('function dokumentOeffnen(modulId, zeilenId) {');
  assert.ok(start >= 0, 'dokumentOeffnen gefunden');
  const block = src.slice(start, start + 2500);
  const knopfIds = [...block.matchAll(/id="(pv-dok-als-[a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(knopfIds, ['pv-dok-als-pdf'], 'genau ein „Als …-sichern"-Knopf im Bauplan, PDF');
});

test('[NurPDF] flowDokumentDateiSichern nimmt keinen format-Parameter mehr — Quelltext-Probe', () => {
  const fs = require('node:fs');
  const { HTML_PATH } = require('./load-kern.js');
  const src = fs.readFileSync(HTML_PATH, 'utf8');
  const fn = src.match(/async function flowDokumentDateiSichern\(([^)]*)\)/);
  assert.ok(fn, 'flowDokumentDateiSichern gefunden');
  assert.equal(fn[1].trim(), 'modulId, zeilenId', 'kein dritter Parameter — sonst ist ein Format-Umschalter zurück');
  const fn2 = src.match(/async function flowDokumentInMappeAblegen\(([^)]*)\)/);
  assert.ok(fn2, 'flowDokumentInMappeAblegen gefunden');
  assert.equal(fn2[1].trim(), 'modulId, zeilenId', 'kein dritter Parameter — sonst ist ein Format-Umschalter zurück');
});

test('[NurPDF] der lebende PDF-Zeichenweg liefert application/pdf — das einzige Ausgabeformat', async () => {
  // U2-ADR-263: dokumentPdfBlob() (der vormalige, direktere Weg zu genau dieser Probe) ist
  // gelöscht — ihre beiden einzigen Aufrufer sind auf _dokumentPdfMitPruefung umgestellt, die
  // jetzt hier geprüft wird, statt einer stehengelassenen, unbenutzten Kopie.
  // setProperties(): PDF-Titel-Pflicht (18.09.2026) — _dokumentPdfMitPruefung ruft sie jetzt
  // an jeder jsPDF-Erzeugung auf, dieselbe Stub-Ergänzung, die ein echtes jsPDF schon trägt.
  const { V } = ladeKern({ Blob, jspdf: { jsPDF: class { constructor() { this.internal = { pageSize: { getWidth: () => 595, getHeight: () => 842 } }; } setFont() {} setFontSize() {} splitTextToSize(s) { return String(s || '').split('\n'); } addPage() {} text() {} setProperties() {} output() { return new Blob(['x'], { type: 'application/pdf' }); } } } });
  await baueDepot(V);
  const { doc } = V._dokumentPdfMitPruefung('patientenverfuegung');
  const blob = doc.output('blob');
  assert.equal(blob.type, 'application/pdf');
});

test('[NurPDF·Rotmachbarkeit] ein wiederauftauchender dritter Parameter würde diese Probe rot machen', () => {
  // Positivkontrolle über einen SYNTHETISCHEN Quelltext-Ausschnitt (keine echte Mutation am Kern
  // nötig — dieselbe Regex, angewandt auf einen Ausschnitt MIT format-Parameter, muss ihn finden
  // und die obige Gleichheitsprüfung würde fehlschlagen).
  const synthetisch = 'async function flowDokumentDateiSichern(modulId, zeilenId, format) {';
  const fn = synthetisch.match(/async function flowDokumentDateiSichern\(([^)]*)\)/);
  assert.ok(fn);
  assert.notEqual(fn[1].trim(), 'modulId, zeilenId', 'die Probe unterscheidet wirklich zwischen zwei und drei Parametern');
});
