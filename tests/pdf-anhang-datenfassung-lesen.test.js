'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — pdf-anhang-datenfassung-lesen.js (schnell, ohne echtes jsPDF)
   ────────────────────────────────────────────────────────────────────────
   Deckt den EXTRAKTIONSWEG selbst ab: gegeben eine korrekte EmbeddedFile-
   Objektstruktur (von Hand gebaut, dieselbe Form wie pdfDatenfassungEinbetten
   in vivodepot.html schreibt), gewinnt datenfassungAusPdfLesen den Inhalt
   byte-genau zurück — inklusive der zwei nach PDF-Regel zulässigen
   Zeilenenden nach „stream" (CRLF und alleiniges LF) und inklusive Fehlern,
   wenn kein Anhang vorhanden ist. Das eigentliche „am fertigen, per echtem
   jsPDF erzeugten PDF messen" deckt tests/e2e/pdf-datenfassung-anhang.spec.js
   (Playwright, echtes jsPDF läuft nur im Browser) — diese Datei prüft nur
   den Leseweg selbst, schnell und ohne Browser.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { datenfassungAusPdfLesen, datenfassungAusPdfLesenAlsJson, selbsttest } = require('../tools/pdf-anhang-datenfassung-lesen.js');

test('[Selbsttest] die eingebaute Fixture rundet verlustfrei', () => {
  const r = selbsttest();
  assert.equal(r.ok, true, 'Fixture-Rundweg muss glatt aufgehen: ' + JSON.stringify(r.gelesen));
});

test('CRLF nach "stream" wird korrekt übersprungen', () => {
  const inhalt = JSON.stringify({ a: 1 });
  const bytes = Buffer.concat([
    Buffer.from('1 0 obj\n<<\n/Type /EmbeddedFile\n/Length ' + Buffer.byteLength(inhalt) + '\n>>\nstream\r\n', 'latin1'),
    Buffer.from(inhalt, 'utf8'),
    Buffer.from('\nendstream\nendobj\n', 'latin1'),
  ]);
  assert.deepEqual(datenfassungAusPdfLesenAlsJson(bytes), { a: 1 });
});

test('bloßes LF nach "stream" wird korrekt übersprungen', () => {
  const inhalt = JSON.stringify({ b: 2 });
  const bytes = Buffer.concat([
    Buffer.from('1 0 obj\n<<\n/Type /EmbeddedFile\n/Length ' + Buffer.byteLength(inhalt) + '\n>>\nstream\n', 'latin1'),
    Buffer.from(inhalt, 'utf8'),
    Buffer.from('\nendstream\nendobj\n', 'latin1'),
  ]);
  assert.deepEqual(datenfassungAusPdfLesenAlsJson(bytes), { b: 2 });
});

test('UTF-8-Mehrbyte-Zeichen (Umlaute) im Anhang rundet verlustfrei', () => {
  const inhalt = JSON.stringify({ ort: 'Köln, Straße 1', bemerkung: 'geprüft — größer' });
  const inhaltBytes = Buffer.from(inhalt, 'utf8');
  const bytes = Buffer.concat([
    Buffer.from('1 0 obj\n<<\n/Type /EmbeddedFile\n/Length ' + inhaltBytes.length + '\n>>\nstream\n', 'latin1'),
    inhaltBytes,
    Buffer.from('\nendstream\nendobj\n', 'latin1'),
  ]);
  assert.deepEqual(datenfassungAusPdfLesenAlsJson(bytes), JSON.parse(inhalt));
});

test('[Rot-Beweis] ohne /Type /EmbeddedFile wirft die Funktion, statt still nichts zu liefern', () => {
  const bytes = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n', 'latin1');
  assert.throws(() => datenfassungAusPdfLesen(bytes), /EmbeddedFile/);
});

test('[Rot-Beweis] /Length über das Dateiende hinaus wirft, statt abgeschnittene Daten zu liefern', () => {
  const bytes = Buffer.from('1 0 obj\n<<\n/Type /EmbeddedFile\n/Length 999999\n>>\nstream\nzu kurz\nendstream\nendobj\n', 'latin1');
  assert.throws(() => datenfassungAusPdfLesen(bytes), /Dateiende/);
});
