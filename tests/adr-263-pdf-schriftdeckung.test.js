'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   U2-ADR-263 — der PDF-Export verstümmelt Sonderzeichen lautlos
   ────────────────────────────────────────────────────────────────────────────
   Reine Proben für `pdfZeichenOhneDeckung()`/`pdfZeichenUnterstuetzt()` — beide
   ohne window.jspdf lauffähig (reine Codepunkt-Arithmetik). Die Integration in
   die sechs PDF-Erzeuger UND das echte gebündelte jsPDF selbst laufen nur im
   Browser (U2-ADR-091 §6) — dort: tests/e2e/u2-adr-263-pdf-schriftdeckung.spec.js.

   Die Deckungsmenge (PDF_WINANSI_ZUSATZ, s. Kommentar dort im Kern) ist
   empirisch gegen das echte jsPDF gescannt, nicht angenommen — dieselben
   Codepunkte hier als Positivproben, damit eine künftige Änderung der Menge
   eine dieser Proben rot macht, nicht nur die im Kern dokumentierte Messung.

   NACHTRAG 13.09.2026 (U2-ADR-263 Teil 2): Inter eingebettet (PDF_INTER_BEREICHE/
   PDF_INTER_LUECKEN/PDF_INTER_EINZELN im Kern, s. dortiger Kommentar) — dieselbe
   Disziplin, jetzt gegen die eingebetteten Schrift-Dateien statt gegen die
   WinAnsi-Standardschriften gescannt. PDF_WINANSI_ZUSATZ bleibt als historische
   Konstante stehen (kein Rückschritt-Beweis unten braucht sie weiterhin).
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const k = ladeKern();
const { pdfZeichenOhneDeckung: _pdfZeichenOhneDeckungKern, pdfZeichenUnterstuetzt: _pdfZeichenUnterstuetztKern } = k.V;
// Namentliche Wrapper statt der rohen Destrukturierung — pruefstand-bindung.js' Aufruf-Nachweis
// erkennt nur `function NAME(...)`/`const NAME = (...) => {...}`, die Diskriminante liegt im
// geteilten Kern-Modul (nicht dateieigen). Ohne diese zwei Zeilen zaehlen beide ADR-gebundenen
// Proben unten als „außerhalb der Reichweite" (gemessen: pruefstand-klassen-werden-bei-jedem-
// lauf-gerechnet schlug genau dort an, +3 statt der erwarteten 0 — die dritte, unvermeidbare
// Zaehlung ist die E2E-Probe in einer *.spec.js-Datei, s. STAND.ausserReichweite-Kommentar).
function pdfZeichenOhneDeckung(text) { return _pdfZeichenOhneDeckungKern(text); }
function pdfZeichenUnterstuetzt(cp) { return _pdfZeichenUnterstuetztKern(cp); }

test('[U2-ADR-263] pdfZeichenOhneDeckung ist im Kern exportiert und aufrufbar', () => {
  assert.equal(typeof pdfZeichenOhneDeckung, 'function');
  assert.equal(typeof pdfZeichenUnterstuetzt, 'function');
});

test('[U2-ADR-263·Positivkontrolle] Deutsch — Umlaute/ß werden getragen', () => {
  assert.deepEqual(pdfZeichenOhneDeckung('Müller, Straße, Größe, Öffnungszeiten'), []);
});

test('[U2-ADR-263·Positivkontrolle] Französisch — Akzente/Ligatur werden getragen', () => {
  assert.deepEqual(pdfZeichenOhneDeckung('Ça va très bien, à côté, œuf, garçon'), []);
});

test('[U2-ADR-263·Positivkontrolle] Spanisch/Portugiesisch — ñ/Akzente/ç werden getragen', () => {
  assert.deepEqual(pdfZeichenOhneDeckung('Señor Muñoz, São Paulo, ação'), []);
});

test('[U2-ADR-263·Positivkontrolle] Leerer/fehlender Text meldet nichts', () => {
  assert.deepEqual(pdfZeichenOhneDeckung(''), []);
  assert.deepEqual(pdfZeichenOhneDeckung(null), []);
  assert.deepEqual(pdfZeichenOhneDeckung(undefined), []);
  assert.deepEqual(pdfZeichenOhneDeckung('   '), []);
});

/* ══ Nachtrag 13.09.2026 (U2-ADR-263 Teil 2, Auftrag „Kern: Eingabe springt, Sub-Depot-Farbe,
   PDF-CI") — Inter eingebettet, Latein-Erweiterung A/B jetzt getragen. Die VIER Sprachen unten
   waren der wörtliche Befund, an dem die alte WinAnsi-Lücke gemessen wurde (s. Git-Historie
   dieser Datei) — sie sind jetzt POSITIVKONTROLLEN, nicht mehr Rot-Beweise: derselbe Befund,
   umgekehrtes Vorzeichen, weil die Lücke, die er beschrieb, geschlossen ist. Chinesisch bleibt
   der echte Rot-Beweis (Inter deckt kein CJK — außerhalb der zugeschnittenen Bereiche, s.
   PDF_INTER_BEREICHE im Kern), sonst bewiese diese Datei nur noch Positives. ══ */

test('[U2-ADR-263·Nachtrag] Polnisch — żółć wird jetzt vollständig getragen (Befund wörtlich: żółć → |óB, war bis 13.09.2026 offen)', () => {
  // Nicht-leer-Wache: belegt, dass die Erkennung selbst noch etwas melden KANN (an einem völlig
  // fremden Schriftsystem) — sonst bewiese das leere Ergebnis unten nichts, weil pdfZeichenOhneDeckung
  // ja auch kaputt IMMER [] liefern könnte.
  const kontrollFund = pdfZeichenOhneDeckung('中');
  assert.ok(kontrollFund.length > 0, 'Testaufbau: die Erkennung muss an CJK weiterhin etwas melden');
  assert.deepEqual(pdfZeichenOhneDeckung('żółć'), []);
});

test('[U2-ADR-263·Nachtrag] Ungarisch — őz és tűz wird jetzt vollständig getragen', () => {
  assert.deepEqual(pdfZeichenOhneDeckung('őz és tűz'), []);
  assert.deepEqual(pdfZeichenOhneDeckung('áéíóöúü'), []);
});

test('[U2-ADR-263·Nachtrag] Türkisch — dağ/şıİ werden jetzt vollständig getragen (Befund wörtlich: dağ → da, war bis 13.09.2026 offen)', () => {
  assert.deepEqual(pdfZeichenOhneDeckung('dağ'), []);
  assert.deepEqual(pdfZeichenOhneDeckung('şıİ'), []);
  assert.deepEqual(pdfZeichenOhneDeckung('çöü'), []);
});

test('[U2-ADR-263·Nachtrag] Tschechisch — čřšžě wird jetzt vollständig getragen (vorher nur š/ž per cp1252-Zufall)', () => {
  assert.deepEqual(pdfZeichenOhneDeckung('čřšžě'), []);
});

test('[U2-ADR-263·Rot-Beweis] Chinesisch — jedes Zeichen wird weiterhin gemeldet, keins ist Latein (Inter-Zuschnitt deckt kein CJK)', () => {
  assert.deepEqual(pdfZeichenOhneDeckung('中文测试'), ['中', '文', '测', '试']);
});

test('[U2-ADR-263·Nachtrag·Rot-Beweis] die im Zuschnitt bewusst ausgesparten Lücken bleiben Lücken (zwei veraltete Ligaturen, Bidi-Steuerzeichen)', () => {
  // ŉ (U+0149) und Ǆ (U+01C4, Großbuchstabe DZ mit Caron) liegen INNERHALB der zugeschnittenen
  // Bereiche, aber im Zuschnitt selbst nicht enthalten (PDF_INTER_LUECKEN im Kern) — anders als
  // Chinesisch also kein Bereichs-, sondern ein Feinschliff-Fund, eigens gemessen und nicht
  // angenommen. Die Kleinbuchstabe-Variante ǆ (U+01C6) IST getragen — kein Muster, reiner
  // Zuschnitt-Zufall wie schon bei čšžě/PDF_WINANSI_ZUSATZ (s. Kommentar im Kern).
  assert.deepEqual(pdfZeichenOhneDeckung('ŉǄ'), ['ŉ', 'Ǆ']);
  assert.deepEqual(pdfZeichenOhneDeckung('ǆ'), [], 'die Kleinbuchstabe-Variante ist getragen');
});

test('[U2-ADR-263] Distinkte Zeichen — Wiederholungen erscheinen nur einmal', () => {
  assert.deepEqual(pdfZeichenOhneDeckung('中中中文文测'), ['中', '文', '测']);
});

test('[U2-ADR-263] Gemischter Text — nur die tatsächlich betroffenen Zeichen, in Auftrittsreihenfolge', () => {
  assert.deepEqual(pdfZeichenOhneDeckung('München, 中文, żółć, Berlin'), ['中', '文']);
});

test('[U2-ADR-263] Zeichen jenseits der Basic Multilingual Plane zählen als EIN Fund, nicht zwei', () => {
  // Ein Emoji (z. B. 😀, U+1F600) liegt jenseits 0xFFFF und besteht in UTF-16 aus einem Ersatzpaar
  // (zwei 16-Bit-Einheiten) — [...text] zerlegt nach Codepunkten, nicht nach UTF-16-Einheiten.
  const funde = pdfZeichenOhneDeckung('😀');
  assert.equal(funde.length, 1, 'ein Emoji darf nicht als zwei falsche Ersatzpaar-Treffer zählen');
});

test('[U2-ADR-263] Regression: das vollständige cp1252-Typografie-Sonderzeichen-Set wird getragen (nicht nur die Latein-Erweiterung)', () => {
  // Fund vom Bau selbst (04.09.2026): ein erster Scan prüfte nur Codepunkte 0x20-0x17F und verwechselte
  // damit cp1252-BYTE-Positionen mit UNICODE-Codepunkten — der Gedankenstrich „—" (U+2014) fiel durch
  // einen live von der App gezeichneten Fuß-Text, nicht durch eigene Testdaten. Diese Probe hält die
  // ganze empirisch bestätigte Zusatzmenge (s. PDF_WINANSI_ZUSATZ-Kommentar im Kern) als Regressionsnetz.
  const zusatz = 'ƒˆ˜–—‘’‚“”„†‡•…‰‹›€™ŒœŠšŸŽž';
  assert.ok(zusatz.length > 0, 'Testaufbau: die Zusatzmenge selbst darf nicht leer sein — sonst bewiese das deepEqual([]) unten nichts');
  assert.deepEqual(pdfZeichenOhneDeckung(zusatz), []);
});

test('[U2-ADR-263·Nachtrag] pdfZeichenUnterstuetzt — Grenzen des jetzt größeren Bereichs (0x1F/0x20/0xFF/0x100/0x24F/0x250)', () => {
  assert.equal(pdfZeichenUnterstuetzt(0x1F), false, 'Steuerzeichen unterhalb 0x20 ist nicht getragen');
  assert.equal(pdfZeichenUnterstuetzt(0x20), true, 'Leerzeichen (0x20) ist die untere Grenze, getragen');
  assert.equal(pdfZeichenUnterstuetzt(0xFF), true, 'ÿ (0xFF) ist die obere Grenze des Basisbereichs, getragen');
  assert.equal(pdfZeichenUnterstuetzt(0x100), true, 'Ā (0x100), Latein-Erweiterung-A, seit dem Inter-Zuschnitt getragen');
  assert.equal(pdfZeichenUnterstuetzt(0x24F), true, 'ɏ (0x24F), obere Grenze Latein-Erweiterung-B, getragen');
  assert.equal(pdfZeichenUnterstuetzt(0x250), false, 'ɐ (0x250), erstes Zeichen NACH Latein-Erweiterung-B (IPA-Erweiterungen), nicht mehr getragen');
});

test('[U2-ADR-263] pdfZeichenUnterstuetzt — jeder einzelne, historische PDF_WINANSI_ZUSATZ-Codepunkt gilt WEITERHIN als getragen (kein Rückschritt durch den Font-Wechsel)', () => {
  for (const cp of k.V.PDF_WINANSI_ZUSATZ) {
    assert.equal(pdfZeichenUnterstuetzt(cp), true, 'Codepunkt 0x' + cp.toString(16) + ' muss weiterhin getragen sein');
  }
});

/* ── Fund Vorlauf, 23.09.2026 (Durchklick-Abnahme P7/P10 gegen 608f6d6bb) ────────────
   `flowNotfallkartePdf()` erzeugte für JEDE Persona mit negativer Blutgruppe (0-/A-/B-/AB-)
   KEIN PDF — `_pdfSchriftDeckungPruefenUndFortfahren` bricht ab, weil das Textsatz-Modul die
   Blutgruppen-Option ausdrücklich mit dem typografischen Minuszeichen „−" (U+2212, MINUS
   SIGN) beschriftet (tools/textsatz-de-modul.json: `.texte.health.bloodType/A-.label` u. a.
   = „A −"; tools/textsatz-en-modul.json ebenso, ohne Leerzeichen: „A−") — derselbe Wert läuft
   über notfallKernModell()/feldWertText() unverändert in `doc.text(...)` der Notfallkarte.
   PDF_INTER_BEREICHE ([0x20,0x24F], [0x2000,0x2057], [0x20A0,0x20BF]) deckt 0x2212
   (Mathematical Operators, 0x2200–0x22FF) NICHT — eine Lücke ZWISCHEN den letzten beiden
   Bereichen, weder in PDF_INTER_LUECKEN dokumentiert noch in PDF_INTER_EINZELN nachgezogen.
   Die WEB-Schrift (Inter-WOFF2, tests/font-coverage.test.js#KRITISCH) TRÄGT „−" ausdrücklich
   als Pflicht-Glyph — die Lücke besteht NUR zwischen Textsatz-Modul und PDF-Schriftzuschnitt,
   nicht am Bildschirm. Betroffen: alle sechs PDF-Erzeuger (gemeinsamer Torwächter), nicht nur
   die Notfallkarte — hier stellvertretend an der Notfallkarten-Kernzeile gemessen, weil das
   die Zeile ist, die den Fund auslöste. Behoben durch den erweiterten Zuschnitt (Entscheidung 23.09.2026: Schrift erweitern, Label bleibt). */
test('[U2-ADR-263·Fund 23.09.2026·Rot-Beweis] Blutgruppen-Optionslabels mit typografischem Minus (U+2212) sind vom PDF-Schriftzuschnitt gedeckt — die Notfallkarte entsteht für jede Blutgruppe (vorher: für keine Rh-negative)', () => {
  const textsatzDe = require('../tools/textsatz-de-modul.json');
  const textsatzEn = require('../tools/textsatz-en-modul.json');
  // `texte` ist FLACH — der Schlüssel selbst trägt den Pfad samt Options-Wert
  // ("health.bloodType/A-.label"), kein verschachteltes Objekt.
  const negativeLabelsDe = ['0-', 'A-', 'B-', 'AB-'].map((k2) => textsatzDe.texte['health.bloodType/' + k2 + '.label']);
  const negativeLabelsEn = ['0-', 'A-', 'B-', 'AB-'].map((k2) => textsatzEn.texte['health.bloodType/' + k2 + '.label']);
  assert.deepEqual(negativeLabelsDe, ['0 −', 'A −', 'B −', 'AB −'], 'Testaufbau: DE-Labels wie beim Fund gemessen — sonst prüft dieser Test nichts mehr');
  assert.deepEqual(negativeLabelsEn, ['O−', 'A−', 'B−', 'AB−'], 'Testaufbau: EN-Labels wie beim Fund gemessen — sonst prüft dieser Test nichts mehr');
  for (const label of [...negativeLabelsDe, ...negativeLabelsEn]) {
    const funde = pdfZeichenOhneDeckung(label);
    assert.deepEqual(funde, [], 'Label „' + label + '" müsste vollständig PDF-schriftgedeckt sein, fehlt aber: '
      + funde.map((z) => 'U+' + z.codePointAt(0).toString(16).toUpperCase()).join(','));
  }
});
