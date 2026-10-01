'use strict';
/* Jeder Name der ATC-Liste ist der amtliche der ATC-GM 2026 (28.09.2026). Werkzeug und Herkunft des Auszugs:
   tools/atc-gm-auszug-pruefen.js (gegen das amtliche PDF: --dokument <pdf>). */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const W = require('../tools/atc-gm-auszug-pruefen.js');
const LISTE = require(path.join(__dirname, '..', 'code-listen', 'atc.json'));

test('[ATC-GM·amtlich] jeder Eintrag der Liste trägt wörtlich den Namen der amtlichen Fassung 2026', () => {
  assert.equal(LISTE.version, 'ATC-GM-2026-amtlich');
  assert.ok(LISTE.daten.length >= 10, 'Vorbedingung: die Liste trägt Codes');
  assert.deepEqual(W.abweichungen(LISTE.daten, W.AUSZUG), []);
  for (const c of ['L01XA02', 'L01CD01', 'A04AA01']) assert.ok(LISTE.daten.some((e) => e.code === c), c + ' (Vorführung Patientin) steht in der Liste');
});

test('[ATC-GM·amtlich·Rot-Beweis] ein geänderter Name und ein Code außerhalb des Belegs fallen; der PDF-Leser findet Code und Namen', () => {
  assert.deepEqual(W.abweichungen([{ code: 'L01XA02', anzeigeName: 'Carboplatin (Zytostatikum)' }], W.AUSZUG),
    ['L01XA02: „Carboplatin (Zytostatikum)" statt amtlich „Carboplatin"']);
  assert.deepEqual(W.abweichungen([{ code: 'L01XA01', anzeigeName: 'Cisplatin' }], W.AUSZUG), ['L01XA01: nicht im amtlichen Beleg']);
  const text = 'A04AA01    Ondansetron                                                     16 mg O,P,R\n'
    + '6804:L01XA02 nicht am Zeilenanfang\nL01CD01    Paclitaxel                                           15 mg P';
  assert.deepEqual(W.namenAusPdfText(text), { A04AA01: 'Ondansetron', L01CD01: 'Paclitaxel' });
});
