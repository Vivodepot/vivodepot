'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Papier-Notfallkarte (Teil 4, Schnitt 4.2)
   ────────────────────────────────────────────────────────────────────────
   PDF-Karte über die T3-Export-Schicht (jsPDF) mit Kern-Akut-Daten + QR. Gleiche
   Allowlist wie Cache/QR. Datenebene rein/testbar; das Zeichnen ist headless
   abgesichert (kein Wurf ohne jsPDF), genau wie der Situationsblatt-PDF-Pfad.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';
async function frischMitDepot() {
  const k = ladeKern();
  await k.V.depotAnlegen(PW);
  k.V.akteurSelbstErklaeren('Tester');
  return k;
}

// Minimaler jsPDF-Doppelgänger, der die Zeichen-Aufrufe protokolliert.
// N2 Zug 3 („Drei Verdrahtungen", 08.08.2026): zeichneNotfallkarte bricht jetzt um
// (wie zeichneSituationPdf) — addPage/getNumberOfPages/setPage nachgezogen, sonst simuliert der
// Doppelgänger eine jsPDF-Fassung, die es nicht gibt.
function fakeDoc() {
  const calls = [];
  let seiten = 1;
  return {
    calls,
    internal: { pageSize: { getWidth: () => 105, getHeight: () => 148 }, getNumberOfPages: () => seiten },
    setFont() {}, setFontSize() {}, setTextColor() {}, setDrawColor() {}, setLineWidth() {},
    line() {}, splitTextToSize: (t) => [String(t)],
    text(t) { calls.push('TXT:' + String(t)); },
    addImage() { calls.push('IMG'); },
    addPage() { seiten += 1; calls.push('PAGE:' + seiten); },
    setPage() {},
  };
}

test('1) notfallKartenMeta: Name + Datum', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('identity', 'familyName', 'Mustermann');
  const meta = V.notfallKartenMeta();
  assert.equal(meta.name, 'Maria Mustermann');
  assert.match(meta.datum, /^\d{2}\.\d{2}\.\d{4}$/);
});

test('2) zeichneNotfallkarte schreibt die Akut-Zeilen ins Dokument', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  const doc = fakeDoc();
  V.zeichneNotfallkarte(doc, V.notfallKernModell(), V.notfallKartenMeta(), null);
  const txt = doc.calls.join('|');
  assert.ok(txt.includes('NOTFALL'), 'Titel');
  assert.ok(txt.includes('Maria'), 'Wert');
  assert.ok(txt.includes('A +'), 'Blutgruppe');
});

test('3) QR wird eingebettet, wenn eine DataURL übergeben wird', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  const ohne = fakeDoc();
  V.zeichneNotfallkarte(ohne, V.notfallKernModell(), V.notfallKartenMeta(), null);
  assert.ok(!ohne.calls.includes('IMG'), 'ohne DataURL kein Bild');
  const mit = fakeDoc();
  V.zeichneNotfallkarte(mit, V.notfallKernModell(), V.notfallKartenMeta(), 'data:image/png;base64,AAAA');
  assert.ok(mit.calls.includes('IMG'), 'mit DataURL ein QR-Bild');
});

test('4) flowNotfallkartePdf wirft nicht — ohne Daten Hinweis, ohne jsPDF Hinweis', async () => {
  const { V } = await frischMitDepot();
  assert.doesNotThrow(() => V.flowNotfallkartePdf());        // leer → Toast
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  assert.doesNotThrow(() => V.flowNotfallkartePdf());        // Daten, aber keine jsPDF im Harness → Toast
});

test('5) Karte nutzt dieselbe Akut-Allowlist wie Cache/QR (gemeinsame Quelle)', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  // Die Karte zeichnet exakt notfallKernModell — keine eigene Feldliste.
  const doc = fakeDoc();
  V.zeichneNotfallkarte(doc, V.notfallKernModell(), V.notfallKartenMeta(), null);
  const modell = V.notfallKernModell();
  for (const z of modell) assert.ok(doc.calls.join('|').includes(z.wert), 'Allowlist-Wert auf der Karte: ' + z.wert);
});

test('6) read-only: Kartenbau verändert die Laufzeitdaten nicht', async () => {
  const { V } = await frischMitDepot();
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  const vorher = JSON.stringify(V.getData());
  V.notfallKartenMeta(); V.flowNotfallkartePdf();
  assert.equal(JSON.stringify(V.getData()), vorher);
});
