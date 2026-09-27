'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Fundament-Selbsttest — die gemeinsame Bindungsprüfung (U2-ADR-098-Nachtrag)
   bindet sich selbst über sich selbst und belegt Punkt 1/2/4.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const path = require('node:path');
const { bindungPruefen, adrDateiFuer, bindungenOhneFundament } = require('./bindung-pruefen.js');

const ADR = 'U2-ADR-098-nachtrag';
const HERKUNFT = 'invariante';
const PRUEFUNGEN = ['bindung-098-nachtrag-gemeinsame-pruefung'];

test('[Klausel] Bindung an ' + ADR + ' über das Fundament', () => {
  bindungPruefen(ADR, HERKUNFT, PRUEFUNGEN, __filename);
});

test('bindung-098-nachtrag-gemeinsame-pruefung: Fundament löst Punkt 1/2/4 ein und jede Bindung nutzt es', () => {
  // Punkt 4 — eindeutige Auflösung: U2-ADR-077 hat einen Nachtrag; Haupt vs. Nachtrag getrennt.
  assert.match(path.basename(adrDateiFuer('U2-ADR-077')), /notfall-qr-kontakte-vcard/, 'Haupt-ADR, nicht der Nachtrag');
  assert.match(path.basename(adrDateiFuer('U2-ADR-077-nachtrag')), /nachtrag/, 'Nachtrag getrennt auflösbar');
  // Punkt 1 — ein Name, der kein ausgeführter Test ist, muss auffliegen (nicht still grün).
  assert.throws(() => bindungPruefen(ADR, HERKUNFT, ['gibt-es-nicht-als-test'], __filename),
    /Punkt 1/, 'ein nicht-ausgeführter PRUEFUNGEN-Name muss abgelehnt werden');
  // Punkt 4 universell — keine gebundene Datei umgeht das Fundament (Legacy-096 ausgenommen, §8-Angleich).
  const verstoesse = bindungenOhneFundament();
  assert.deepEqual(verstoesse, [], 'diese gebundenen Dateien umgehen das Fundament: ' + verstoesse.join(', '));
});
