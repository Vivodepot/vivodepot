'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Schriften im Erscheinungsbild (v896, U2-ADR-473)
   ────────────────────────────────────────────────────────────────────────────
   Das Gerüst trägt keine Schrift mehr; das Erscheinungsbild bringt sie als Dateien in `schriften[]` mit. Geprüft wird
   genau einmal im Kern (Form im Kopf-Skript, Leser und Tiefe im Hauptskript), der Bau fährt dieselben Funktionen aus dem
   Kerntext (tools/lib/schriften-pruefen.js). Dazu die Bau-Pflicht: JEDE Erscheinungsbild-Zutat trägt eine PDF-Schrift —
   TTF, fsType ohne Bit 1/8/9, Deckung der PDF-Pflichtmenge —, sonst baut das Produkt nicht.
   Rot-Beweise: Erscheinung ohne PDF-Schrift · PDF-Schrift mit fsType-Bit 1/8/9 · PDF-Schrift ohne Deckung · WOFF2 mit
   falschem Längenfeld · fremde Lizenz · TTF als Bildschirm-Schrift.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { erscheinungsbildSchriftenVorBacken } = require('../tools/lib/produkt-text-erzeugen.js');
const { schriftenPrueferAusKern } = require('../tools/lib/schriften-pruefen.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const HEUTE = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'erscheinung', 'erscheinungsbild-heute-modul.json'), 'utf8'));
const FX = (n) => fs.readFileSync(path.join(__dirname, 'fixtures', 'pdf-schrift', n)).toString('base64');
const mit = (schriften) => [{ roh: Object.assign({}, HEUTE, { schriften }) }];
const backen = (schriften) => () => erscheinungsbildSchriftenVorBacken(KERN, mit(schriften));
const pdfInter = () => HEUTE.schriften.filter((s) => s.pdf);
const bild = () => HEUTE.schriften.filter((s) => !s.pdf);

test('das Gerüst trägt keine Schrift; das Erscheinungsbild „heute“ trägt 4 Bildschirm- und 3 PDF-Schnitte und besteht', () => {
  assert.equal(/@font-face|data:font\//.test(KERN), false);
  assert.equal(bild().length, 4);
  assert.equal(pdfInter().length, 3);
  assert.doesNotThrow(backen(HEUTE.schriften));
});

test('Bildschirm-Schnitte im Modul sind byte-gleich mit den Dateien (ab Werk dieselbe Schrift)', () => {
  for (const s of bild()) {
    const datei = path.join(REPO, 'tools', 'erscheinung', 'schriften', 'Inter-' + s.gewicht + '.woff2');
    assert.equal(s.woff2, fs.readFileSync(datei).toString('base64'), s.gewicht);
  }
});

test('Rot-Beweis Bau-Pflicht: eine Erscheinung ohne PDF-Schrift baut nicht', () => {
  assert.throws(backen(bild()), /pdf-schrift-fehlt/);
  assert.throws(() => erscheinungsbildSchriftenVorBacken(KERN, [{ roh: Object.assign({}, HEUTE, { schriften: undefined }) }]), /pdf-schrift-fehlt/);
});

test('Rot-Beweis fsType: Bit 1, Bit 8 und Bit 9 lassen den Bau scheitern', () => {
  for (const datei of ['fstype-bit1.ttf', 'fstype-bit8.ttf', 'fstype-bit9.ttf']) {
    const s = Object.assign({}, pdfInter()[0], { ttf: FX(datei) });
    assert.throws(backen(bild().concat([s])), /schrift-fstype/, datei);
  }
});

test('Rot-Beweis Deckung: eine PDF-Schrift ohne die Pflichtzeichen (nur Latein-1) baut nicht', () => {
  const s = Object.assign({}, pdfInter()[0], { ttf: FX('gut.ttf') });
  assert.throws(backen(bild().concat([s])), /pdf-deckung/);
});

test('Rot-Beweise Form und Bytes: WOFF2 mit falschem Längenfeld · fremde Lizenz · TTF als Bildschirm-Schrift', () => {
  const w = Buffer.from(bild()[0].woff2, 'base64');
  w.writeUInt32BE(w.readUInt32BE(8) + 1, 8);
  assert.throws(backen([Object.assign({}, bild()[0], { woff2: w.toString('base64') })].concat(pdfInter())), /schrift-kein-woff2/);
  assert.throws(backen([Object.assign({}, bild()[0], { lizenz: 'MIT' })].concat(pdfInter())), /schrift-lizenz/);
  assert.throws(backen([Object.assign({}, bild()[0], { woff2: pdfInter()[0].ttf })].concat(pdfInter())), /schrift-kein-woff2/);
});

test('die Prüfung im Bau ist die des Kerns: Form aus dem Kopf-Skript, Tiefe aus dem Hauptskript (kein Spiegel)', () => {
  const p = schriftenPrueferAusKern(KERN);
  assert.equal(typeof p._ebSchriftenFormPruefen, 'function');
  assert.equal(typeof p._ebSchriftenTiefePruefen, 'function');
  assert.throws(() => schriftenPrueferAusKern(KERN.replace('const _EB_SCHRIFT_FELDER = ', 'const _X = ')), /Anker/);
});

test('Rot-Beweis TTF-Anfang exakt: die echte Inter-TTF besteht; eine Nicht-TTF gleicher Größe und ein klein geschriebener Anfang nicht', () => {
  const p = schriftenPrueferAusKern(KERN);
  const R = require('../tools/lib/produkt-text-erzeugen.js').erscheinungsbildRegelnLesen(KERN);
  const echt = pdfInter()[0];
  const j = (x) => JSON.parse(JSON.stringify(x));   // Ergebnis aus dem vm-Kontext — andere Prototypen
  assert.deepEqual(j(p._ebSchriftenFormPruefen([echt], R)), []);
  const gleichGross = Buffer.alloc(Buffer.from(echt.ttf, 'base64').length, 0x41).toString('base64');
  assert.deepEqual(j(p._ebSchriftenFormPruefen([Object.assign({}, echt, { ttf: gleichGross })], R).map((f) => f.grund)), ["schrift-kein-ttf"]);
  const klein = 'aaeaaa' + echt.ttf.slice(6);
  assert.deepEqual(j(p._ebSchriftenFormPruefen([Object.assign({}, echt, { ttf: klein })], R).map((f) => f.grund)), ["schrift-kein-ttf"]);
  // Dieselbe Regel im Registrier-Block nach jsPDF (exakt, mit Größengrenze aus den Regeln).
  assert.match(KERN, /var tauglich = \/\^AAEAAA\/\.test\(s\.ttf\) && grenze > 0 && s\.ttf\.length \/ 4 \* 3 <= grenze;/);
});
