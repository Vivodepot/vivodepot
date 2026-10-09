'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Bau-Pflicht der PDF-Schrift: volle Deckung nur für die Ab-Werk-Inter (Befund PDF-PROFILSCHRIFT-BAUPFLICHT-ZU-STRENG, 05.10.2026)
   ────────────────────────────────────────────────────────────────────────────
   Gemessen: erscheinungsbildSchriftenVorBacken verlangte von JEDER PDF-Schrift die volle Deckung von pdfPflicht (634 Zeichen);
   einer reinen Latein-Hausschrift (Barlow) fehlen 276 davon. Damit kam keine Profilschrift ins PDF, obwohl die Rückfallkette
   zur Laufzeit (_pdfSchriftWaehlen) genau dafür da ist.
   Jetzt:
     · die Ab-Werk-Inter (familie „Inter“) trägt weiter die volle pdfPflicht — sie ist Stufe 2, der feste Rückfall;
     · eine Profilschrift braucht TTF, fsType ohne Bit 1/8/9 und die Latein-Grunddeckung (Basic Latin und Latin-1 Supplement,
       PDF_PROFIL_LATEIN in tools/lib/produkt-text-erzeugen.js).
   Auflage der Gegenlesung: im PDF verschwindet KEIN Zeichen. Die Stufe 1 prüft darum gegen den Depot-Text UND die festen Texte,
   die ins PDF gehen (Textsatz der aktiven Sprache, Rechtsraum-Wortlaute, Standardvorlagen, Bündel, Markenname) —
   _pdfDruckProbe. Trägt die Profilschrift ein Zeichen nicht, gilt Inter für das ganze Dokument; fehlt auch Inter ein Zeichen,
   hält der Torwächter die Ausgabe an.
   ════════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { erscheinungsbildSchriftenVorBacken } = require('../tools/lib/produkt-text-erzeugen.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const HEUTE = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'erscheinung', 'erscheinungsbild-heute-modul.json'), 'utf8'));
const INTER = HEUTE.schriften.find((s) => s.pdf && s.stil === 'normal');
const FX = (n) => fs.readFileSync(path.join(__dirname, 'fixtures', 'pdf-schrift', n)).toString('base64');
const ZUSATZ = ['_pdfSchriftWaehlen', '_pdfDruckProbe', '_pdfFesteTexte', '_pdfSchriftPruefungInstallieren', '_pdfSchriftLueckenBuendeln', 'pdfSchriftPruefen', 'STRINGS', 'window'];

/* Ein Erscheinungsbild „heute“ plus eine PDF-Profilschrift „Probeschrift“ (ttf: die Bytes). */
const mitProfil = (ttf, familie = 'Probeschrift') => Object.assign({}, HEUTE, { schriften: HEUTE.schriften.concat([Object.assign({}, INTER, { familie, ttf })]) });
const bauen = (modul) => erscheinungsbildSchriftenVorBacken(KERN, [{ roh: modul }]);

/* ── Bau-Pflicht ── */

test('[PDF-Profilschrift·Bau·Rot-Beweis] eine Latein-Profilschrift ohne volle pdfPflicht (ohne-oe: kein ő, kein „, kein €) baut', () => {
  assert.doesNotThrow(() => bauen(mitProfil(FX('ohne-oe.ttf'))));
});

test('[PDF-Profilschrift·Bau·Rot-Beweis] eine Profilschrift ohne Latein-Grunddeckung (ohne ä ö ü ß) baut nicht', () => {
  assert.throws(() => bauen(mitProfil(FX('ohne-umlaute.ttf'))), /Probeschrift 400: pdf-latein-deckung \(7 Zeichen/);
});

test('[PDF-Profilschrift·Bau·Rot-Beweis] eine Profilschrift mit fsType Bit 1 baut nicht', () => {
  assert.throws(() => bauen(mitProfil(FX('fstype-bit1.ttf'))), /schrift-fstype/);
});

test('[PDF-Profilschrift·Bau·Rot-Beweis] die Ab-Werk-Inter ohne volle pdfPflicht baut weiter nicht', () => {
  const schriften = HEUTE.schriften.map((s) => (s.pdf && s.stil === 'normal' ? Object.assign({}, s, { ttf: FX('ohne-oe.ttf') }) : s));
  assert.throws(() => bauen(Object.assign({}, HEUTE, { schriften })), /Inter 400: pdf-deckung/);
  assert.doesNotThrow(() => bauen(HEUTE), 'Gegenprobe: „heute“ baut');
});

/* ── Laufzeit: kein Zeichen verschwindet ── */

let _K;
const kernMitLateinProfil = () => (_K = _K || ladeKern({ erscheinungsbildModul: mitProfil(FX('ohne-oe.ttf')), zusatzBindungen: ZUSATZ }).V.__zusatz);

test('[PDF-Profilschrift·Rot-Beweis „Zeichen fehlt“] Namen mit ł, ő, Ő im Depot: das ganze Dokument setzt in Inter', () => {
  const K = kernMitLateinProfil();
  assert.equal(K._pdfSchriftWaehlen('Maria Groß, Jürgen Müller'), 'Probeschrift', 'Gegenprobe: ß und Umlaute trägt die Profilschrift');
  for (const name of ['Łukasz Groß', 'Ödön Erdős', 'ŐRSÉG Kft.']) assert.equal(K._pdfSchriftWaehlen(name), 'Inter', name);
});

test('[PDF-Profilschrift] die Druckprobe trägt die festen Texte: Textsatz, Schutztexte, Markenname', () => {
  const K = kernMitLateinProfil();
  const probe = K._pdfDruckProbe();
  const fest = K._pdfFesteTexte();
  for (const text of [K.STRINGS.pdfOhneSchriftHinweis, K.STRINGS.pdfSchriftDeckungHinweis, K.STRINGS.notfallKarteTitel]) {
    for (const ch of String(text)) assert.ok(fest.includes(ch), 'Zeichen ' + ch + ' aus „' + text + '“ fehlt in den festen Texten');
  }
  for (const ch of fest) assert.ok(probe.includes(ch), 'die Druckprobe enthält die festen Texte');
});

test('[PDF-Profilschrift·Rot-Beweis „Zeichen fehlt“] ein festes Zeichen außerhalb der Profilschrift (etwa „ oder –) führt zu Inter, auch bei leerem Depot', () => {
  const K = kernMitLateinProfil();
  const fest = K._pdfFesteTexte();
  const fehlt = K.pdfSchriftPruefen(FX('ohne-oe.ttf'), fest);
  assert.equal(fehlt.grund, 'deckung', 'Vorbedingung: die deutschen festen Texte tragen Zeichen jenseits der Latein-Grundmenge');
  assert.equal(K._pdfSchriftWaehlen(''), 'Probeschrift', 'nur Depot (leer): die Profilschrift genügte scheinbar');
  assert.equal(K._pdfSchriftWaehlen(K._pdfDruckProbe()), 'Inter', 'Depot und feste Texte: Inter');
});

test('[PDF-Profilschrift·Rot-Beweis „Zeichen fehlt“] jedes Dokument wählt mit der Druckprobe: ein fester Text mit „ – € wird ohne Lücke gesetzt', () => {
  const K = kernMitLateinProfil();
  const doc = { text() {}, splitTextToSize: (t) => [t], getTextWidth: () => 1 };
  K._pdfSchriftPruefungInstallieren(doc);
  doc.text('„Vollmacht“ – Preis in €', 10, 10);
  assert.deepEqual(K._pdfSchriftLueckenBuendeln(doc), [], 'gewählt ist Inter, nicht die Profilschrift ohne „ – €');
});

test('[PDF-Profilschrift·Rot-Beweis] fehlt auch Inter ein Zeichen, hält der Torwächter die Ausgabe an und nennt es', () => {
  const K = kernMitLateinProfil();
  const doc = { text() {}, splitTextToSize: (t) => [t], getTextWidth: () => 1 };
  K._pdfSchriftPruefungInstallieren(doc);
  doc.text('Herr 漢 Groß', 10, 10);
  const funde = K._pdfSchriftLueckenBuendeln(doc);
  assert.equal(funde.length, 1);
  assert.deepEqual(funde[0].zeichen, ['漢']);
});
