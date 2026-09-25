'use strict';
/* ═════════════════════════════════════════════════════════════════
   herkunftsort-angaben.js — der Block HERKUNFTSORT_ANGABEN: erzeugen, lesen, einsetzen, Rezepte prüfen
   ─────────────────────────────────────────────────────────────────
   Die unersetzbaren Angaben am Herkunftsort (Name der Urheberin, Lizenzkennung) stehen in EINER Quelle
   (tools/herkunftsort-angaben.json) und in jedem Träger als derselbe, ERZEUGTE Block — dieselbe Lage wie der
   Krypto-Kern, der in allen Trägern byte-gleich sein MUSS (Spezifikation 34.7 „Eine Quelle“, 22, 34.9).
   Der Block ist eine DAUERHAFTE Marker-Region (`HERKUNFTSORT-ANGABEN:BEGIN — DAUERHAFT`): Text, den wir führen MÜSSEN, weil das
   Weglassen falsch wäre — dieselbe Sorte wie die Lizenzhinweise der Codelisten (tools/geruest-waechter-grundlinie.json,
   `regionen.dauerhaft`, Probe: tests/herkunftsort-angaben-gleich.test.js). Kein Schnitt nimmt die Urheberin mit: die Prüfung
   tools/herkunftsort-pruefen.js schneidet dauerhafte Regionen nicht heraus.

   DREI LESER, EINE QUELLE: der Kern (zur Laufzeit), der Konfektionierer (beim Erzeugen: `rezeptPruefen`) und
   tools/herkunftsort-pruefen.js (Invariante 34.7) lesen den Block aus dem Träger-Text, keiner eine zweite Liste.
   ═════════════════════════════════════════════════════════════════ */
// Lesen und Prüfen des Blocks (blockFinden, angabenLesen, rezeptPruefen) liegen in EINER Umsetzung, im kopierten Abschnitt von tools/lib/produkt-text-erzeugen.js (selbstenthalten, der Worker
// bekommt sie mit der Kopie); hier stehen sie unter ihren Namen für den Erzeuger, die Prüfung und die Tests.
const PTE = require('./produkt-text-erzeugen.js');
const QUELLE_PFAD = ['..', 'herkunftsort-angaben.json'];
const ANFANG = PTE.HERKUNFTSORT_BLOCK_ANFANG;
const ENDE = PTE.HERKUNFTSORT_BLOCK_ENDE;
const blockFinden = PTE.herkunftsortBlockFinden;
const angabenLesen = PTE.herkunftsortAngabenLesen;
const rezeptPruefen = PTE.herkunftsortRezeptPruefen;

function quelleLesen(pfad) {
  const fs = require('node:fs');
  const path = require('node:path');
  return JSON.parse(fs.readFileSync(pfad || path.join(__dirname, ...QUELLE_PFAD), 'utf8'));
}

function blockErzeugen(q) {
  const liste = (a) => 'Object.freeze([' + a.map((p) => "'" + p + "'").join(', ') + '])';
  const schluessel = Object.keys(q.schluessel).map((k) => k + ': ' + liste(q.schluessel[k])).join(', ');
  return [
    ANFANG + ', ERZEUGT aus tools/herkunftsort-angaben.json (node tools/herkunftsort-angaben-schreiben.js), in jedem Träger byte-gleich, nicht von Hand ändern */',
    '/* tests/herkunftsort-angaben-gleich.test.js vergleicht. Die Angaben, die am Herkunftsort UNERSETZBAR sind (Spezifikation 34.7): der Name der Urheberin und die',
    '   Lizenzkennung. `schluessel` = die Textsatz-Schlüssel des Herkunftsorts und die Platzhalter, die ihr Text tragen MUSS; `{urheberin}` und `{lizenz}` lösen aus',
    '   DIESER Konstante auf, nie aus dem Branding; `{marke}` ist in diesen Schlüsseln nicht zulässig. DAUERHAFT: Text, den wir führen müssen (tools/geruest-waechter-',
    '   grundlinie.json, regionen.dauerhaft); kein Schnitt nimmt die Urheberin mit. */',
    "const HERKUNFTSORT_ANGABEN = Object.freeze({ urheberin: Object.freeze({ name: '" + q.urheberin.name + "', marke: '" + q.urheberin.marke + "', ort: '" + q.urheberin.ort + "' }), lizenz: '" + q.lizenz + "', schluessel: Object.freeze({ " + schluessel + ' }) });',
    ENDE,
  ].join('\n');
}

/* Setzt den Block in einen Träger-Text: ersetzt einen vorhandenen, sonst hinter (`nach`) oder vor (`vor`) die Zeile mit `anker`. */
function einsetzen(text, block, anker, position) {
  const b = blockFinden(text);
  if (b) return text.slice(0, b.start) + block + text.slice(b.ende);
  const i = text.indexOf(anker);
  if (i < 0) throw new Error('Anker nicht gefunden: ' + anker);
  if (position === 'vor') {
    const zeilenAnfang = text.lastIndexOf('\n', i) + 1;
    return text.slice(0, zeilenAnfang) + block + '\n\n' + text.slice(zeilenAnfang);
  }
  const zeilenEnde = text.indexOf('\n', i);
  return text.slice(0, zeilenEnde + 1) + '\n' + block + '\n' + text.slice(zeilenEnde + 1);
}

module.exports = { ANFANG, ENDE, quelleLesen, blockErzeugen, blockFinden, angabenLesen, einsetzen, rezeptPruefen };
