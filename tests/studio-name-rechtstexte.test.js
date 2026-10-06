'use strict';
/* Das Werkzeug heißt „Vivodepot Studio“ (Entscheidung vom 29.09.2026). In den freigegebenen Rechtstexten und im Seitentitel
   steht darum kein alter Name mehr — weder „Vorlagen-Generator“ noch „Template-Generator“, und auch nicht die Kurzform
   „Generator“, die in denselben Texten dieselbe Sache meinte. Geändert wurde nur der Name, nicht der Inhalt.
   Dateiname und ausgelieferter Pfad bleiben, damit Links halten; sie sind kein sichtbarer Name. Die Datei wird über den Lader
   gelesen (GEN_PATH), nicht beim Namen genannt. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { ladeGenerator, GEN_PATH } = require('./load-generator.js');

const ALT = /Vorlagen-Generator|Template-Generator|template generator|\bGenerator\b|\bgenerator\b/i;

function funde(rechtstexte) {
  const raus = [];
  for (const [schluessel, r] of Object.entries(rechtstexte)) {
    const text = JSON.stringify(r);
    const m = text.match(new RegExp(ALT.source, 'gi'));
    if (m) raus.push(schluessel + ': ' + Array.from(new Set(m)).join(', '));
  }
  return raus;
}

test('[Studio·Name] kein alter Name in den Rechtstexten (DE und EN) und im Seitentitel', () => {
  const V = ladeGenerator().V;
  assert.deepEqual(funde(V.RECHTSTEXTE), []);
  const titel = (fs.readFileSync(GEN_PATH, 'utf8').match(/<title>([^<]*)<\/title>/) || [])[1];
  assert.equal(titel, 'Vivodepot Studio');
});

test('[Studio·Name·Rot-Beweis] ein alter Name in einem Rechtstext wird gefunden, in jeder Schreibweise', () => {
  for (const alt of ['Der Vorlagen-Generator ist', 'The template generator is', 'Sie dürfen den Generator', 'the Template-Generator']) {
    assert.equal(funde({ probe: { text: [[alt]] } }).length, 1, alt);
  }
  assert.deepEqual(funde({ probe: { text: [['Das Studio ist ein Werkzeug']] } }), [], 'Gegenprobe');
});
