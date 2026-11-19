'use strict';
/* Fremdblöcke ausschneiden (17.11.2026): Kern-Scanner messen den eigenen Code. Ausgeschnitten wird nur der Inhalt eines Skriptblocks,
   der eine gelistete Fremdbibliothek ist (tools/lib/fremdbibliotheken.js: erkannt UND genau ihre Prüfsumme). Ein Block mit derselben
   Kennung oder demselben Lizenzkopf, aber anderem Inhalt, bleibt stehen und wird gemessen wie eigener Code. Die Liste und ihr Deckel
   stehen unter dem Netz-Code-Verbot in tests/csp-hashes-vertrauensregel.test.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ohneFremdbloecke } = require('../tools/lib/html-senken.js');
const { FREMDBIBLIOTHEKEN, fremdbibliothek } = require('../tools/lib/fremdbibliotheken.js');

const REPO = path.join(__dirname, '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const BLOECKE = [...KERN.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi)];

/* Welche Prüfer mit diesem Ausschnitt messen, hält eine eigene Probe fest. */

test('[Fremdblöcke] jede gelistete Bibliothek steht genau einmal im Kern und wird ausgeschnitten; Zeilen bleiben gleich', () => {
  const ohne = ohneFremdbloecke(KERN);
  assert.equal(ohne.split('\n').length, KERN.split('\n').length, 'Zeilennummern bleiben gleich');
  for (const f of FREMDBIBLIOTHEKEN) {
    const treffer = BLOECKE.filter((m) => fremdbibliothek(m[1], m[2]) === f);
    assert.equal(treffer.length, 1, f.name + ': genau ein Block mit passender Prüfsumme im Kern');
    const probe = treffer[0][2].replace(/\s+/g, ' ').trim().slice(0, 200);
    assert.equal(ohne.includes(probe), false, f.name + ': der Inhalt ist ausgeschnitten');
  }
  // Eigener Code bleibt: der große Kern-Block und die Vertrauensregel stehen unverändert.
  assert.match(ohne, /function mappePdfSeitenZeichnen\(/);
  assert.match(ohne, /<script id="vertrauensregel">\n\(function vertrauensregelEinrichten\(\)/);
});

test('[Fremdblöcke·Rot-Beweis] eigener Code in einem nicht gelisteten Block wird weiter gemessen', () => {
  const pdf = BLOECKE.find((m) => /id="pdfjs_VivodepotInline"/.test(m[1]));
  assert.ok(pdf, 'Vorbedingung: der pdf.js-Block steht im Kern');
  const gepflanzt = 'setTimeout(() => heimlich(), 5000);';
  // (1) derselbe Block, ein Satz eigener Code dazu: die Prüfsumme passt nicht mehr, der ganze Block bleibt stehen.
  const geaendert = KERN.replace(pdf[0], () => '<script' + pdf[1] + '>' + pdf[2] + gepflanzt + '</script>');
  assert.ok(ohneFremdbloecke(geaendert).includes(gepflanzt), 'geänderte pdf.js bleibt sichtbar');
  // (2) ein Block, der sich nur die Kennung borgt.
  const geborgt = '<script type="module" id="pdfjs_VivodepotInline">' + gepflanzt + '</script>';
  assert.equal(ohneFremdbloecke(geborgt), geborgt);
  // (3) ein Block mit Lizenzkopf wie jsPDF, aber anderem Inhalt.
  const lizenz = '<script>/** @license jsPDF */\n' + gepflanzt + '</script>';
  assert.equal(ohneFremdbloecke(lizenz), lizenz);
  // (4) ein gewöhnlicher eigener Block.
  const eigen = '<script>' + gepflanzt + '</script>';
  assert.equal(ohneFremdbloecke(eigen), eigen);
  // Gegenprobe: der unveränderte Block wird ausgeschnitten.
  assert.equal(ohneFremdbloecke(pdf[0]).includes('vdPdfjs'), false);
});
