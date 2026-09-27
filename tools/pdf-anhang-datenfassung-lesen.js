#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   pdf-anhang-datenfassung-lesen.js — Auftrag „Die Datenfassung im PDF bauen"
   ────────────────────────────────────────────────────────────────────────────
   Liest die eingebettete Datenfassung aus einem fertigen PDF zurück — am
   Byte-Strom selbst, nicht an einer Zwischenstufe des Erzeugers. Sucht das
   erste Objekt mit `/Type /EmbeddedFile`, liest dessen `/Length`, findet den
   `stream`-Beginn (CRLF oder LF danach, beide nach PDF-Regel zulässig) und
   schneidet genau `/Length` Bytes heraus. Kein PDF-Parser im Vollsinn —
   genug, um die eine Struktur zu lesen, die `pdfDatenfassungEinbetten` in
   vivodepot.html schreibt (s. dortigen Blockkommentar vor `flowVollDepotPdf`).

   Dient sowohl als Prüfwerkzeug (`--dokument <pfad>`, gegen jedes echte PDF)
   als auch als Bibliothek — `tests/e2e/pdf-datenfassung-anhang.spec.js` ruft
   `datenfassungAusPdfLesen` direkt mit den Bytes eines in Playwright (echtes
   jsPDF) erzeugten PDFs auf.

   `--dokument <pfad>`   Pfad zu einer PDF-Datei.
   Ohne Argument: läuft gegen eine SELBST GEBAUTE Fixture (unten,
                  `_selbsttestPdfBytes`) — eine minimale, von Hand
                  zusammengesetzte PDF/A-3-Anhangsstruktur mit bekanntem
                  Inhalt, damit die Suite dieses Werkzeug auch ohne ein
                  echtes, per Browser erzeugtes PDF mitprüft.
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const path = require('node:path');

// Liefert den Text der eingebetteten Datenfassung (UTF-8) aus `bytes` (Buffer/Uint8Array).
// Wirft, wenn kein `/Type /EmbeddedFile`-Objekt, kein `/Length` darin oder kein `stream`-
// Schlüsselwort danach gefunden wird — ein leerer/undefinierter Rückgabewert wäre hier
// gefährlicher als ein Wurf (ein „Anhang fehlt"-Befund darf nicht wie „Anhang ist leer" aussehen).
function datenfassungAusPdfLesen(bytes) {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  // latin1: verlustfreie 1:1-Abbildung Byte↔Zeichen — Index im String == Byte-Offset im Buffer,
  // sicher nutzbar, um denselben Offset später aus `buf` (den echten Bytes) zu schneiden.
  const text = buf.toString('latin1');

  const typIdx = text.indexOf('/Type /EmbeddedFile');
  if (typIdx < 0) throw new Error('Kein eingebetteter Anhang (/Type /EmbeddedFile) im PDF gefunden.');

  const laengeMatch = /\/Length\s+(\d+)/.exec(text.slice(typIdx, typIdx + 500));
  if (!laengeMatch) throw new Error('EmbeddedFile-Objekt gefunden, aber kein /Length darin.');
  const laenge = parseInt(laengeMatch[1], 10);

  const streamKeywordIdx = text.indexOf('stream', typIdx);
  if (streamKeywordIdx < 0) throw new Error('EmbeddedFile-Objekt gefunden, aber kein stream-Schlüsselwort danach.');
  let datenStart = streamKeywordIdx + 'stream'.length;
  // PDF-Regel (§7.3.8): auf „stream" folgt CRLF, ODER (verbreitete Praxis) allein LF — CR allein
  // zählt NICHT als Trenner und wäre ein erstes Datenbyte.
  if (text[datenStart] === '\r' && text[datenStart + 1] === '\n') datenStart += 2;
  else if (text[datenStart] === '\n') datenStart += 1;

  if (datenStart + laenge > buf.length) throw new Error('/Length reicht über das Dateiende hinaus — Datei beschädigt oder Offset falsch bestimmt.');
  return buf.slice(datenStart, datenStart + laenge).toString('utf8');
}

// Wie datenfassungAusPdfLesen, nur direkt geparst (JSON.parse) — die eingebettete Datenfassung
// ist nach Konvention (pdfDatenfassungEinbetten/formatSerialisieren) immer JSON-Text.
function datenfassungAusPdfLesenAlsJson(bytes) {
  return JSON.parse(datenfassungAusPdfLesen(bytes));
}

function formatiereBericht(pfad, daten) {
  const z = [];
  z.push('PDF-Anhang-Lesung: ' + pfad);
  z.push('  Anhang gefunden, ' + JSON.stringify(daten).length + ' Zeichen JSON (geparst).');
  const schluessel = daten && typeof daten === 'object' ? Object.keys(daten) : [];
  z.push('  Oberste Schlüssel: ' + (schluessel.length ? schluessel.join(', ') : '(keine — kein Objekt an der Wurzel)'));
  return z.join('\n');
}

// ── Selbsttest-Fixture ─────────────────────────────────────────────────────
// Baut von Hand ein minimales PDF-Fragment mit genau der Struktur, die
// pdfDatenfassungEinbetten schreibt (Dictionary, /Length, stream/endstream) —
// kein echtes vollständiges PDF (keine Seiten, kein xref nötig für DIESES
// Werkzeug, das nur den EmbeddedFile-Stream sucht), aber dieselbe Bytefolge
// an der Stelle, die datenfassungAusPdfLesen liest.
function _selbsttestPdfBytes() {
  const inhalt = JSON.stringify({ beispiel: 'Selbsttest', zahl: 42 }, null, 2);
  const inhaltBytes = Buffer.from(inhalt, 'utf8');
  const kopf = '%PDF-1.7\n1 0 obj\n<<\n/Type /EmbeddedFile\n/Subtype /application#2Fjson\n/Length '
    + inhaltBytes.length + '\n>>\nstream\n';
  const fuss = '\nendstream\nendobj\n%%EOF\n';
  return { bytes: Buffer.concat([Buffer.from(kopf, 'latin1'), inhaltBytes, Buffer.from(fuss, 'latin1')]), erwartet: JSON.parse(inhalt) };
}

function selbsttest() {
  const { bytes, erwartet } = _selbsttestPdfBytes();
  const gelesen = datenfassungAusPdfLesenAlsJson(bytes);
  const ok = JSON.stringify(gelesen) === JSON.stringify(erwartet);
  return { ok, gelesen, erwartet };
}

function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--dokument');
  const dokPfad = (i >= 0 && argv[i + 1]) ? argv[i + 1] : null;

  if (dokPfad) {
    let bytes;
    try { bytes = fs.readFileSync(path.resolve(dokPfad)); }
    catch (e) { process.stderr.write('Datei nicht lesbar: ' + e.message + '\n'); process.exit(1); return; }
    try {
      const daten = datenfassungAusPdfLesenAlsJson(bytes);
      process.stdout.write(formatiereBericht(dokPfad, daten) + '\n');
      process.exit(0);
    } catch (e) {
      process.stderr.write('Kein lesbarer Anhang in ' + dokPfad + ': ' + e.message + '\n');
      process.exit(1);
    }
    return;
  }

  // Ohne Argument: Selbsttest gegen die eingebaute Fixture, fuer die Suite.
  const r = selbsttest();
  if (r.ok) {
    process.stdout.write('Selbsttest gruen: eingebettete Fixture-Datenfassung korrekt zurückgewonnen.\n');
    process.exit(0);
  } else {
    process.stderr.write('Selbsttest ROT: ' + JSON.stringify(r.gelesen) + ' != ' + JSON.stringify(r.erwartet) + '\n');
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { datenfassungAusPdfLesen, datenfassungAusPdfLesenAlsJson, selbsttest, _selbsttestPdfBytes };
