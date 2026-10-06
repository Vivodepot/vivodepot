'use strict';
/* Offline-Garantie für PDF-Schriften, statisch (U2-ADR-097, Nachtrag v896) — Prüfung: tests/helfer/pdf-schrift-tueren.js.
   Läuft in der Suite; tests/konformitaet/offline-garantie.mjs nutzt denselben Helfer im Browserlauf. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const LK = require('./load-kern.js');
const { pdfSchriftTuerenPruefen, BLOCK_ANFANG } = require('./helfer/pdf-schrift-tueren.js');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
/* Die Diskriminante der Klausel (U2-ADR-097 Nachtrag W4): liefert die Funde, leer heißt „Türen zu“. Als eigene Funktion, damit der
   Prüfstand der Bindungen sie instrumentieren kann (PROBEN unten). */
function tuerenFunde(h) { return pdfSchriftTuerenPruefen(h, LK.extrahiereScripts); }
const pruefen = tuerenFunde;
const KLAUSEL = { PROBEN: [ { fuer: 'der Kern hält die Türen zu: keine Tür im eigenen Code, genau ein Registrier-Block, VFS vor addFont', diskriminante: tuerenFunde } ] };
void KLAUSEL;

test('der Kern hält die Türen zu: keine Tür im eigenen Code, genau ein Registrier-Block, VFS vor addFont', () => {
  assert.deepEqual(tuerenFunde(HTML), []);
});

test('[Negativprobe] Rot-Beweis: addFont außerhalb des Blocks (im eigenen Code) ist rot', () => {
  const t = HTML.replace('function _pdfOhneSchriftWarnen() {', 'function _pdfOhneSchriftWarnen() { doc.addFont("x.ttf", "X", "normal");');
  assert.notEqual(t, HTML);
  assert.ok(pruefen(t).some((m) => /eigener Code nennt addFont/.test(m)), pruefen(t).join('\n'));
});

test('Rot-Beweis: loadFile im Registrier-Block ist rot', () => {
  const t = HTML.replace(BLOCK_ANFANG + '\n', BLOCK_ANFANG + '\nvar __x = jsPDFAPI.loadFile;\n');
  assert.ok(pruefen(t).includes('Registrier-Block nennt loadFile'), pruefen(t).join('\n'));
});

test('Rot-Beweis: addFont ohne vorangehendes addFileToVFS derselben Datei ist rot', () => {
  const t = HTML.replace('this.addFileToVFS(schriften[j].datei, schriften[j].ttf);', 'this.addFileToVFS(schriften[j].andere, schriften[j].ttf);');
  assert.notEqual(t, HTML);
  assert.ok(pruefen(t).some((m) => /ohne vorangehendes addFileToVFS/.test(m)), pruefen(t).join('\n'));
});

test('Rot-Beweis: ein zweiter Registrier-Block, oder keiner, ist rot', () => {
  const zwei = HTML.replace(BLOCK_ANFANG, BLOCK_ANFANG + '</script>\n' + BLOCK_ANFANG);
  assert.ok(pruefen(zwei).some((m) => /2× statt genau einmal/.test(m)));
  const keiner = HTML.replace(BLOCK_ANFANG, '<script id="anderer-block">');
  assert.ok(pruefen(keiner).some((m) => /0× statt genau einmal/.test(m)));
});

test('Rot-Beweis: _PDF_MARKE_SCHRIFT als Literal statt aus dem Erscheinungsbild ist rot', () => {
  const t = HTML.replace(/let _PDF_MARKE_SCHRIFT = [^;]+;/, "let _PDF_MARKE_SCHRIFT = 'Inter';");
  assert.notEqual(t, HTML, 'Vorbedingung: die Deklaration ist gefunden');
  const t2 = HTML.replace('_PDF_MARKE_SCHRIFT = st ? st.familie : null;', "_PDF_MARKE_SCHRIFT = 'Inter';");
  assert.notEqual(t2, HTML, 'Vorbedingung: die Wahl je Dokument ist gefunden');
  assert.ok(pruefen(t2).some((m) => /ist ein Literal/.test(m)), 'auch eine Zuweisung in der Wahl je Dokument ist rot');
  assert.notEqual(t, HTML);
  assert.ok(pruefen(t).some((m) => /ist ein Literal/.test(m)));
});
