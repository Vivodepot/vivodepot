'use strict';
/* S8 (U2-ADR-428): keine Datei außer dem Leser nennt die alte Konstante `AB_WERK_TEXTSATZ_DE`.
   Bis S8 stand der deutsche Satz als Konstante im Kern; rund dreißig Werkzeuge und ebenso viele Tests lasen ihn von dort, und keine Liste kannte alle. Seit S8 ist Deutsch ein Sprachmodul
   (QUELLE: tools/textsatz-de-modul.json), Werkzeuge lesen es über tools/lib/textsatz-de-quelle.js, Tests über `V.TEXTSATZ_DE_QUELLE`. Dieser Wächter ersetzt die Zahl („dreißig“)
   durch eine Struktur: ob es 30 oder 32 waren, ist gleichgültig — jede Nennung in Code, Zeichenketten und Quelltext-Mustern von tools/, tests/ und dem Kern selbst ist rot.
   Erlaubt bleibt der Name in Kommentaren und in Erklärtexten (Zeichenketten ohne Zugriffsform). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ohneKommentareUndStrings } = require('../tools/g11-js-code-ohne-kommentare-strings.js');

const REPO = path.join(__dirname, '..');
const SELBST = path.relative(REPO, __filename).split(path.sep).join('/');
const NAME = 'AB_WERK_TEXTSATZ_DE';
// Zugriffsformen, die auch innerhalb einer Zeichenkette (Quelltext-Anker, Regex-Muster, Fehlermeldung mit Ausdruck) ein Vorkommen bedeuten.
const ZUGRIFF = /const AB_WERK_TEXTSATZ_DE\b|\bAB_WERK_TEXTSATZ_DE\.texte\b|\.AB_WERK_TEXTSATZ_DE\b|\bAB_WERK_TEXTSATZ_DE\s*[:=]|\bAB_WERK_TEXTSATZ_DE\\\./;

function dateien(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/[\\/]tests[\\/]fixtures$/.test(p) || false) dateien(p, out); } else if (/\.js$/.test(e.name)) out.push(p);
  }
  return out;
}
function ohneKommentare(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n').filter((z) => !/^\s*\/\//.test(z)).join('\n');
}
function verstoesse(rel, text) {
  const funde = [];
  if (ohneKommentareUndStrings(text).includes(NAME)) funde.push('Code');
  if (ZUGRIFF.test(ohneKommentare(text))) funde.push('Zugriffsform');
  return funde.length ? [rel + ' (' + funde.join(', ') + ')'] : [];
}
function alle() {
  const liste = [];
  for (const wurzel of ['tools', 'tests']) for (const p of dateien(path.join(REPO, wurzel), [])) {
    const rel = path.relative(REPO, p).split(path.sep).join('/');
    if (rel === SELBST) continue;
    liste.push([rel, fs.readFileSync(p, 'utf8')]);
  }
  return liste;
}

test('[S8·Ein Leser] keine Datei in tools/ und tests/ nennt die alte Konstante in Code oder Zugriffsform', () => {
  const funde = [];
  for (const [rel, text] of alle()) funde.push(...verstoesse(rel, text));
  assert.deepEqual(funde, [], 'Deutsch lesen: tools/lib/textsatz-de-quelle.js (Werkzeuge) oder V.TEXTSATZ_DE_QUELLE (Tests) — nicht die alte Konstante');
});

test('[S8·Ein Leser·Positivkontrolle] der Wächter sieht Dateien, und der Leser selbst steht da', () => {
  const liste = alle();
  assert.ok(liste.length > 500, 'der Suchraum ist besetzt: ' + liste.length);
  assert.ok(liste.some(([rel]) => rel === 'tools/lib/textsatz-de-quelle.js'));
});

test('[S8·Ein Leser·Rot-Beweis] ein Vorkommen im Code, in einer Zugriffsform und als Quelltext-Anker wird gefunden; Erklärtext und Kommentar nicht', () => {
  assert.equal(verstoesse('x.js', 'const t = V.AB_WERK_TEXTSATZ_DE.texte;').length, 1);
  assert.equal(verstoesse('x.js', "const anker = 'const AB_WERK_TEXTSATZ_DE = Object.freeze({';").length, 1);
  assert.equal(verstoesse('x.js', "const m = /hasOwnProperty\\.call\\(AB_WERK_TEXTSATZ_DE\\.texte, kennung\\)/;").length, 1);
  assert.equal(verstoesse('x.js', "// AB_WERK_TEXTSATZ_DE war die Konstante\n/* AB_WERK_TEXTSATZ_DE.texte */\nconst t = 1;").length, 0);
  assert.equal(verstoesse('x.js', "test('[EN-Modul] deckt alle Kennungen aus AB_WERK_TEXTSATZ_DE ab', () => {});").length, 0, 'Erklärtext in einem Testtitel');
});
