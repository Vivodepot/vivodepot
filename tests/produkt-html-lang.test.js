'use strict';
/* Befund LANG-STATISCH (interner Befund vom 23.09.2026): das Gerüst trägt ein <html lang>, das
   für die Hälfte der Produkte falsch ist, bis das erste Skript läuft (WCAG 3.1.1). Der Bauschritt schreibt
   darum je Produkt die Sprachkennung, die auch die Laufzeit setzt: regeln.sprachkennung, sonst sprache. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { konfektionieren } = require('../tools/produkt-konfektionieren.js');
const { PRODUKTE, modulDateienFuer } = require('../tools/lib/vier-produkte.js');
const { produktTextErzeugen } = require('../tools/lib/produkt-text-erzeugen.js');

const KERN = fs.readFileSync(path.join(__dirname, '..', 'vivodepot.html'), 'utf8');
const ERWARTET = { 'privat-de': 'de', 'pro-de': 'de', 'privat-en': 'en', 'pro-en': 'en' };
const htmlLang = (text) => { const m = /<html\b[^>]*\blang="([^"]*)"/.exec(text); return m ? m[1] : null; };

function sprachmodulVon(p) {
  const pfad = modulDateienFuer(p).find((f) => JSON.parse(fs.readFileSync(f, 'utf8')).modulTyp === 'textsatz');
  return JSON.parse(fs.readFileSync(pfad, 'utf8'));
}

for (const p of PRODUKTE) {
  test(`[Produkt-lang·Rot-Beweis] ${p.slug}: das ausgelieferte Produkt trägt statisch die Sprache seines Sprachmoduls`, () => {
    const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'produkt-html-lang-'));
    try {
      const gebaut = konfektionieren({
        ziel: ordner, slug: p.slug, modulauswahl: [],
        vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
        unsignierteModulDateien: modulDateienFuer(p),
      });
      const lang = htmlLang(fs.readFileSync(path.join(gebaut.ordner, 'vivodepot.html'), 'utf8'));
      assert.equal(lang && lang.split('-')[0], ERWARTET[p.slug], p.slug + ' trägt <html lang="' + lang + '">');
      const m = sprachmodulVon(p);
      assert.equal(lang, (m.regeln && m.regeln.sprachkennung) || m.sprache, 'derselbe Wert, den die Laufzeit setzt (textsatzRegeln)');
    } finally { fs.rmSync(ordner, { recursive: true, force: true }); }
  });
}

function bauenMit(sprachmodul) {
  return produktTextErzeugen(KERN, {
    modulauswahl: [],
    vorDepotKonfigurationInhaltFn: () => 'window.__vorDepotKonfiguration = [];\n',
    unsignierteModule: sprachmodul ? [{ roh: sprachmodul, basisname: 'textsatz-probe-modul.json' }] : [],
  }).text;
}

test('[Produkt-lang·Positivkontrolle] ohne Sprachmodul bleibt das lang des Gerüsts stehen', () => {
  assert.equal(htmlLang(bauenMit(null)), htmlLang(KERN));
});

test('[Produkt-lang·Rot-Beweis] eine Sprachkennung, die kein Sprach-Tag ist, bricht den Bau ab statt ins Markup zu gelangen', () => {
  const m = sprachmodulVon(PRODUKTE.find((p) => p.slug === 'privat-de'));
  const boese = Object.assign({}, m, { regeln: Object.assign({}, m.regeln, { sprachkennung: 'de" onload="x' }) });
  assert.throws(() => bauenMit(boese), /Sprachkennung/);
});
