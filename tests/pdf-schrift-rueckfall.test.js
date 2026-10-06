'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Rückfallkette der PDF-Schrift (U2-ADR-473 W4, Linie der Gegenlesung 05.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Je Dokument neu, in dieser Reihenfolge: (1) die Schrift des Moduls (ein Profil mit eigener PDF-Schrift), wenn sie registriert
   ist und jedes Zeichen des Depots trägt · (2) die Ab-Werk-Inter, die jedes Erscheinungsbild trägt (Bau-Pflicht) · (3) keine —
   kein PDF, ein Hinweis mit Ausweg zum Herausgeben als Datei. Je Stufe ein Rot-Beweis; dazu die Inter-Pflicht in allen vier
   Produkten.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { erscheinungsbildSchriftenVorBacken } = require('../tools/lib/produkt-text-erzeugen.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const HEUTE = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'erscheinung', 'erscheinungsbild-heute-modul.json'), 'utf8'));
const INTER = HEUTE.schriften.find((s) => s.pdf && s.stil === 'normal');
const FX = (n) => fs.readFileSync(path.join(__dirname, 'fixtures', 'pdf-schrift', n)).toString('base64');
const ZUSATZ = ['_PDF_STUFEN', '_pdfSchriftWaehlen', '_pdfSchriftVerfuegbar', '_pdfOhneSchriftWarnen', 'ui', 'window'];

/* Ein Produkt mit einem Profil, das zusätzlich die PDF-Schrift „Probeschrift“ trägt (ttf: die Bytes dieser Schrift). `window` ist das
   Fenster des Sandkastens: dort setzt der Registrier-Block im Browser window.__vdPdfSchriftAusfall, hier der Test. */
function kernMitProfil(ttf) {
  const modul = Object.assign({}, HEUTE, { schriften: HEUTE.schriften.concat([Object.assign({}, INTER, { familie: 'Probeschrift', ttf })]) });
  return ladeKern({ erscheinungsbildModul: modul, zusatzBindungen: ZUSATZ }).V.__zusatz;
}

test('[PDF-Rückfall] Reihenfolge der Stufen: erst das Modul, dann die Ab-Werk-Inter', () => {
  const K = kernMitProfil(INTER.ttf);
  assert.deepEqual(K._PDF_STUFEN.map((s) => [s.familie, s.modul]), [['Probeschrift', true], ['Inter', false]]);
  assert.equal(K._pdfSchriftWaehlen('Maria Muster'), 'Probeschrift');
  assert.equal(K._pdfSchriftVerfuegbar(), true);
});

test('[PDF-Rückfall·Rot-Beweis Stufe 1] fehlt der Modulschrift ein Zeichen des Depots, gilt die Ab-Werk-Inter — für das ganze Dokument', () => {
  const K = kernMitProfil(FX('ohne-oe.ttf'));
  assert.equal(K._pdfSchriftWaehlen('Maria Muster'), 'Probeschrift', 'Gegenprobe: ohne das Zeichen bleibt die Modulschrift');
  assert.equal(K._pdfSchriftWaehlen('Ödön Erdős'), 'Inter');
  assert.equal(K._pdfSchriftVerfuegbar(), true);
});

test('[PDF-Rückfall·Rot-Beweis Stufe 1] fällt die Registrierung der Modulschrift aus, gilt die Ab-Werk-Inter', () => {
  const K = kernMitProfil(INTER.ttf);
  assert.equal(K._pdfSchriftWaehlen('Maria Muster'), 'Probeschrift', 'Gegenprobe: ohne Ausfall die Modulschrift');
  K.window.__vdPdfSchriftAusfall = { Probeschrift: true };
  assert.equal(K._pdfSchriftWaehlen('Maria Muster'), 'Inter');
});

test('[PDF-Rückfall·Rot-Beweis Stufe 2→3] fällt auch die Ab-Werk-Inter aus, gibt es keine Schrift und kein PDF', () => {
  const Z = ladeKern({ zusatzBindungen: ZUSATZ }).V.__zusatz;
  assert.equal(Z._pdfSchriftWaehlen('Maria Muster'), 'Inter', 'Gegenprobe: ab Werk gilt Inter');
  Z.window.__vdPdfSchriftAusfall = { Inter: true };
  assert.equal(Z._pdfSchriftWaehlen('Maria Muster'), null);
  assert.equal(Z._pdfSchriftVerfuegbar(), false);
  Z.window.__vdPdfSchriftAusfall = true;   // die alte Form „alle“ gilt weiter
  assert.equal(Z._pdfSchriftWaehlen('Maria Muster'), null);
});

test('[PDF-Rückfall·Rot-Beweis Stufe 3] ohne Erscheinungsbild keine Stufe; der Hinweis führt zum Herausgeben als Datei', () => {
  const { V } = ladeKern({ ohneErscheinungsbild: true, zusatzBindungen: ZUSATZ });
  const Z = V.__zusatz;
  assert.deepEqual(Z._PDF_STUFEN, []);
  assert.equal(Z._pdfSchriftWaehlen('Maria Muster'), null);
  let gezeigt = null;
  const vorher = Z.ui.modal;
  Z.ui.modal = (o) => { gezeigt = o; };
  try { Z._pdfOhneSchriftWarnen(); } finally { Z.ui.modal = vorher; }
  assert.ok(gezeigt, 'ein Hinweis erscheint');
  assert.ok(gezeigt.primaerLabel && gezeigt.primaerLabel.length > 0, 'mit einem Ausweg als Knopf');
  assert.ok(/<p>[^<]{20,}<\/p>/.test(gezeigt.koerperHTML), 'mit einem Satz, nicht leer');
  assert.equal(typeof gezeigt.onPrimaer, 'function');
  assert.notEqual(gezeigt.ohneAbbrechen, true, 'man kann ihn auch nur schließen');
});

test('[PDF-Rückfall·Rot-Beweis Bau] ein Erscheinungsbild mit Profilschrift, aber ohne Ab-Werk-Inter baut nicht', () => {
  const nurProfil = HEUTE.schriften.filter((s) => !s.pdf).concat(HEUTE.schriften.filter((s) => s.pdf).map((s) => Object.assign({}, s, { familie: 'Probeschrift' })));
  assert.throws(() => erscheinungsbildSchriftenVorBacken(KERN, [{ roh: Object.assign({}, HEUTE, { schriften: nurProfil }) }]), /pdf-inter-fehlt/);
  assert.doesNotThrow(() => erscheinungsbildSchriftenVorBacken(KERN, [{ roh: HEUTE }]), 'Gegenprobe: „heute“ baut');
});

test('[PDF-Rückfall·Inter-Wächter] jedes der vier Produkte trägt die Ab-Werk-Inter als PDF-Schrift', () => {
  assert.equal(PRODUKTE.length >= 4, true);
  for (const p of PRODUKTE) {
    const eb = modulDateienFuer(p).map((f) => JSON.parse(fs.readFileSync(f, 'utf8'))).find((m) => m.modulTyp === 'erscheinungsbild');
    assert.ok(eb, p.slug + ': kein Erscheinungsbild im Rezept');
    assert.ok((eb.schriften || []).some((s) => s.pdf === true && s.stil === 'normal' && s.familie === 'Inter'), p.slug + ': keine Ab-Werk-Inter');
    assert.doesNotThrow(() => erscheinungsbildSchriftenVorBacken(KERN, [{ roh: eb }]), p.slug);
  }
});
