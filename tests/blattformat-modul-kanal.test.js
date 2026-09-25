'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Blattformat — Auftrag (07.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Fünf Zeichenfunktionen erzeugten ihr jsPDF-Dokument bislang mit fest
   `format:'a4'`. Gemessen (nicht angenommen, s. Kopfkommentar an
   `blattformatModulPruefen` in vivodepot.html): alle fünf lasen Breite/Höhe
   schon vorher laufend aus `doc.internal.pageSize` — der Kanal muss nur den
   EINEN Erzeugungs-Parameter tragen.

   ABGRENZUNG: die Notfallkarte (`flowNotfallkartePdf`, festes `format:'a6'`)
   ist eine KARTE, kein BLATT — sie hängt an diesem Kanal nicht und wird hier
   nicht geprüft (eigener Gegenstand, s. Kopfkommentar am Register).

   DER ROT-BEWEIS, DEN DIE KOORDINATION VERLANGT HAT: ein Modul setzt ein schmaleres
   Format, und ausgerechnet die Widerrufs-Empfangsbestätigung — das Dokument,
   bei dem ein Layoutbruch am teuersten ist — hält QR-Code UND Textspalte
   innerhalb des Blatts. Vor dieser Achse waren dort drei Werte hartkodiert
   auf A4s ~210mm Breite (s. Korrektur in `zeichneWiderrufPdf`).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'blattformat-kanal-2026!';

// Fake jsPDF-Dokument, parametrisiert nach Breite/Höhe — Bauart wie `fakeDoc()` in
// tests/uebergabe-protokoll.test.js, hier aber mit einstellbarer Seitengröße (für den
// Rot-Beweis) und aufgezeichneten addImage-Koordinaten (dort nicht gebraucht, hier zentral).
function fakeDoc(breite, hoehe) {
  const texte = [];
  const bilder = [];
  let seiten = 1;
  return {
    _texte: texte, _bilder: bilder,
    internal: { pageSize: { getWidth: () => breite, getHeight: () => hoehe }, getNumberOfPages: () => seiten },
    setFont() {}, setFontSize() {}, setTextColor() {}, setDrawColor() {}, setLineWidth() {}, line() {},
    text(t, x, y) { texte.push({ text: Array.isArray(t) ? t.join(' ') : String(t), x, y }); },
    splitTextToSize(t, w) {
      // reicht für diese Proben: KEIN echter Umbruch, aber die verlangte Breite wird erfasst —
      // der Rot-Beweis prüft die BREITE, mit der gezeichnet würde, nicht das Umbruchverhalten.
      splitBreiten.push(w);
      return [String(t)];
    },
    addImage(dataUrl, format, x, y, w, h) { bilder.push({ x, y, w, h }); },
    addPage() { seiten += 1; },
    output() { return 'stub-blob'; },
  };
}
let splitBreiten = [];

function blattformatEinlassen(V, d, format, herkunft) {
  const modul = { modulTyp: 'blattformat', moduleVersion: 1, herkunft: herkunft || 'test-anbieter', format };
  const ergebnis = V.modulEinlassen(modul, d, null, null);
  V._blattformatModuleAusDepotAnmelden(d);
  return ergebnis;
}

/* ── 1. Der Prüfer selbst ─────────────────────────────────────────────────── */

test('[blattformat·Pruefer] gueltiges Modul wird angenommen', () => {
  const { V } = ladeKern();
  const r = V.blattformatModulPruefen({ modulTyp: 'blattformat', moduleVersion: 1, herkunft: 'kanzlei-x', format: 'letter' });
  assert.equal(r.gueltig, true);
  assert.equal(r.blattformat.format, 'letter');
  assert.equal(r.blattformat.herkunft, 'kanzlei-x');
});

test('[blattformat·Pruefer] ohne herkunft wird verworfen', () => {
  const { V } = ladeKern();
  const r = V.blattformatModulPruefen({ modulTyp: 'blattformat', moduleVersion: 1, format: 'letter' });
  assert.equal(r.gueltig, false);
  assert.equal(r.grund, 'herkunft');
});

test('[blattformat·Pruefer] ohne moduleVersion wird verworfen', () => {
  const { V } = ladeKern();
  const r = V.blattformatModulPruefen({ modulTyp: 'blattformat', herkunft: 'kanzlei-x', format: 'letter' });
  assert.equal(r.gueltig, false);
  assert.equal(r.grund, 'moduleVersion');
});

test('[blattformat·Pruefer] ein nicht in der Allowlist stehender Formatname wird verworfen', () => {
  const { V } = ladeKern();
  const r = V.blattformatModulPruefen({ modulTyp: 'blattformat', moduleVersion: 1, herkunft: 'kanzlei-x', format: 'din-lang' });
  assert.equal(r.gueltig, false);
  assert.equal(r.grund, 'format');
});

test('[blattformat·Pruefer] Großschreibung wird toleriert (Allowlist-Vergleich klein geschrieben)', () => {
  const { V } = ladeKern();
  const r = V.blattformatModulPruefen({ modulTyp: 'blattformat', moduleVersion: 1, herkunft: 'kanzlei-x', format: 'LETTER' });
  assert.equal(r.gueltig, true);
  assert.equal(r.blattformat.format, 'letter');
});

/* ── 2. Der echte Einlassweg — keine zweite Tür ─────────────────────────────── */

test('[blattformat·Einlass] ueber modulEinlassen() angenommen, blattformat() liest es zurueck', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const d = V.getData();
  const ergebnis = blattformatEinlassen(V, d, 'letter');
  assert.equal(ergebnis.angenommen, true);
  assert.equal(ergebnis.typ, 'blattformat');
  assert.equal(V.blattformat(), 'letter');
});

test('[blattformat·Gegenprobe] ohne jedes Modul bleibt es bei a4 — kein erfundener Wert', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  assert.equal(V.blattformat(), 'a4');
});

test('[blattformat·Fassung] eine hoehere moduleVersion derselben Herkunft ersetzt die alte', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const d = V.getData();
  blattformatEinlassen(V, d, 'letter', 'kanzlei-x');
  const modulV2 = { modulTyp: 'blattformat', moduleVersion: 2, herkunft: 'kanzlei-x', format: 'legal' };
  const ergebnis = V.modulEinlassen(modulV2, d, null, null);
  V._blattformatModuleAusDepotAnmelden(d);
  assert.equal(ergebnis.fassung, 'aktualisiert');
  assert.equal(V.blattformat(), 'legal');
  assert.equal(d.blattformatModule.length, 1, 'keine zweite Zeile fuer dieselbe Herkunft');
});

/* ── 3. Notfallkarte bleibt unberuehrt — 'Karte' ist kein 'Blatt' ───────────── */

test('[blattformat·Abgrenzung] die Notfallkarte-Konstante a6 steht unveraendert im Quelltext', () => {
  const fs = require('fs');
  const html = fs.readFileSync(require.resolve('../vivodepot.html'), 'utf8');
  assert.match(html, /format: 'a6'/, 'flowNotfallkartePdf haengt bewusst NICHT an blattformat() — eine Karte ist ueberall eine Karte');
});

/* ── 4. Rot-Beweis: die Widerrufs-PDF haelt QR und Textspalte im Blatt ──────── */

test('[blattformat·Rot-Beweis] schmales Format gesetzt — QR und Textspalte bleiben im Blatt (Widerrufs-PDF)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Müller', zweck: 'Behandlung', umfang: 'Kopie Patientenverfügung' });
  const nutzlast = V.uebergabeWiderrufNutzlast(e);
  splitBreiten = [];
  const SCHMAL = 100;   // deutlich unter A4 (210), aber gross genug fuer die 40mm-QR-Box
  const doc = fakeDoc(SCHMAL, 150);
  V.zeichneWiderrufPdf(doc, e, nutzlast, 'data:image/png;base64,FAKE');
  const img = doc._bilder[0];
  assert.ok(img, 'QR wurde gezeichnet');
  assert.ok(img.x + img.w <= SCHMAL,
    'QR-rechter-Rand (' + (img.x + img.w) + ') muss innerhalb der Blattbreite (' + SCHMAL + ') liegen — vor der Korrektur war x=150 fest, hier waere er weit ueber das Blatt hinausgeragt');
  assert.ok(splitBreiten.every((w) => w <= SCHMAL),
    'keine Textspalte darf breiter angefordert werden als das Blatt selbst: ' + JSON.stringify(splitBreiten));
});

test('[blattformat·Gegenprobe] bei A4 (210mm) bleiben QR-Position und Textbreiten wie vor der Korrektur', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const e = V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Müller', zweck: 'Behandlung', umfang: 'Kopie Patientenverfügung' });
  const nutzlast = V.uebergabeWiderrufNutzlast(e);
  splitBreiten = [];
  const doc = fakeDoc(210, 297);
  V.zeichneWiderrufPdf(doc, e, nutzlast, 'data:image/png;base64,FAKE');
  const img = doc._bilder[0];
  assert.equal(img.x, 150, 'bei A4 unveraendert x=150, wie vor der Korrektur hartkodiert');
  assert.ok(splitBreiten.includes(120), 'Textbreite mit QR bleibt bei A4 120, wie vorher hartkodiert');
});
