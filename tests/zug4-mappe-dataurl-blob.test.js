'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Auftrag „Erfolg ohne Wirkung" (08.08.2026), Zug 4b — dataUrlZuBlob()
   ────────────────────────────────────────────────────────────────────────
   Der Baustein hinter der PDF-Vorschau (Blob-URL statt Data-URL, gegen den
   von Chrome/Edge/Firefox blockierten iframe-Data-URL-Rahmen) UND dem neuen
   Herunterladen-Knopf für EIGENE Mappen-Uploads. Bewusst OHNE `fetch()` —
   im eigenen Kern verboten (U2-ADR-009, G11-Netzcode-Wächter tests/konformitaet/
   offline-garantie.mjs) — reiner String-/Byte-Umbau wie `base64ToBytes`.
   Browser-only Nachbarfunktionen (FileReader, canvas Image, `<iframe>`-
   Rendering) sind hier NICHT prüfbar — dafür der Browser-Rauchtest (Zug 5)
   und tests/e2e/zug4-mappe-groesse-vorschau.spec.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Capturing-Blob wie tests/d43-etappe5-konflikt.test.js (CapBlob) — echtes `Blob` ist im
// Sandkasten standardmäßig ein No-Op (load-kern.js opts.Blob), wir spiegeln Parts+Optionen.
function mitCapturingBlob() {
  let letzterAufruf = null;
  function CapBlob(parts, options) { letzterAufruf = { parts, options }; this.type = (options && options.type) || ''; }
  const { V } = ladeKern({ Blob: CapBlob });
  return { V, letzterAufruf: () => letzterAufruf };
}

test('[Zug 4b] dataUrlZuBlob: base64-Data-URL → Blob mit korrektem MIME + korrekt dekodierten Bytes', () => {
  const { V, letzterAufruf } = mitCapturingBlob();
  const roh = 'Servus, das ist kein echtes PDF, nur Testinhalt.';
  const b64 = Buffer.from(roh, 'utf8').toString('base64');
  const dataUrl = 'data:application/pdf;base64,' + b64;
  const blob = V.dataUrlZuBlob(dataUrl);
  assert.ok(blob, 'liefert ein Blob-Objekt');
  assert.equal(blob.type, 'application/pdf', 'MIME aus der Data-URL übernommen');
  const { parts } = letzterAufruf();
  assert.equal(parts.length, 1, 'genau EIN Byte-Chunk an den Blob-Konstruktor');
  const bytes = parts[0];
  assert.equal(Buffer.from(bytes).toString('utf8'), roh, 'die dekodierten Bytes entsprechen dem Original — kein Zeichenverlust');
});

test('[Zug 4b] dataUrlZuBlob: Default-MIME, wenn die Data-URL keinen Typ nennt', () => {
  const { V } = mitCapturingBlob();
  const b64 = Buffer.from('x', 'utf8').toString('base64');
  const blob = V.dataUrlZuBlob('data:;base64,' + b64);
  assert.equal(blob.type, 'application/octet-stream');
});

test('[Zug 4b] dataUrlZuBlob: nicht-base64 (URL-kodierte) Data-URL wird ebenfalls dekodiert', () => {
  const { V, letzterAufruf } = mitCapturingBlob();
  const blob = V.dataUrlZuBlob('data:text/plain,Hallo%20Welt');
  assert.ok(blob);
  assert.equal(blob.type, 'text/plain');
  const bytes = letzterAufruf().parts[0];
  assert.equal(Buffer.from(bytes).toString('utf8'), 'Hallo Welt');
});

test('[Zug 4b] dataUrlZuBlob: unlesbare Form liefert null, wirft NICHT', () => {
  const { V } = mitCapturingBlob();
  assert.equal(V.dataUrlZuBlob('kein-data-url'), null);
  assert.equal(V.dataUrlZuBlob(''), null);
  assert.equal(V.dataUrlZuBlob(null), null);
  assert.equal(V.dataUrlZuBlob(undefined), null);
});

test('[Zug 4a] MAPPE_MAX_BYTES ist gesetzt und positiv (Byte-Obergrenze existiert)', () => {
  const { V } = ladeKern();
  assert.ok(typeof V.MAPPE_MAX_BYTES === 'number' && V.MAPPE_MAX_BYTES > 0);
});
