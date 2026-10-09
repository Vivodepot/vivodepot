'use strict';
/* Das JSON-Schema des Erscheinungsbild-Moduls (U2-ADR-473 Nachtrag v894)
   gegen das Modul „heute" und gegen die Regeln des Kerns. Eigene Datei unter tests/mit-modul/, weil sie ajv braucht
   (tests/schicht-1-ohne-lieferkette.test.js); die Prüfung in Kern und Bauweg steht in tests/erscheinungsbild-pruefung.test.js. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Ajv = require('ajv/dist/2020');
const P = require('../../tools/lib/produkt-text-erzeugen.js');
const { ZIEL_HEUTE } = require('../../tools/erscheinungsbild-modul.js');
const GRAMMATIK = require('../helfer/erscheinungsbild-grammatik-faelle.js');

const REPO = path.join(__dirname, '..', '..');
const KERN = fs.readFileSync(path.join(REPO, 'vivodepot.html'), 'utf8');
const HEUTE = JSON.parse(fs.readFileSync(ZIEL_HEUTE, 'utf8'));
const R = P.erscheinungsbildRegelnLesen(KERN);
const SCHEMA = JSON.parse(fs.readFileSync(path.join(REPO, 'docs', 'design-modul', 'erscheinungsbild-modul-schema.json'), 'utf8'));
const pruefe = new Ajv({ allErrors: true }).compile(SCHEMA);
const mit = (ebene, token, wert) => { const m = JSON.parse(JSON.stringify(HEUTE)); m[ebene][token] = wert; return m; };

test('[Erscheinungsbild·Schema] „heute" ist gültig, und die Schlüssel des Schemas sind die Schlüssel der Regeln im Kern', () => {
  assert.equal(pruefe(HEUTE), true, JSON.stringify(pruefe.errors));
  assert.deepEqual(Object.keys(SCHEMA.properties).sort(), [...R.schluessel].sort());
});

test('[Erscheinungsbild·Schema·Rot-Beweis] jeder Grammatikfall wird vom Schema abgewiesen — und auch von der Prüfung im Bauweg', () => {
  assert.ok(GRAMMATIK.length >= 6, 'die Fälle werden gefunden');
  for (const [name, ebene, token, wert] of GRAMMATIK) {
    const modul = mit(ebene, token, wert);
    assert.equal(pruefe(modul), false, name + ': das Schema nimmt den Wert an');
    assert.equal(P._erscheinungsbildPruefen(modul, R).gueltig, false, name + ': der Bauweg nimmt den Wert an');
  }
});

test('[Erscheinungsbild·Schema·Layout] die Beschreibungen der Fixtures sind gültig; Fächer und Parameter des Schemas sind die der Regeln im Kern', () => {
  const layouts = require('../helfer/layout-beschreibungen.js');
  for (const name of ['navigation-a', 'zonen']) {
    const m = JSON.parse(JSON.stringify(HEUTE)); m.layout = layouts[name];
    assert.equal(pruefe(m), true, name + ': ' + JSON.stringify(pruefe.errors));
  }
  const L = SCHEMA.properties.layout.properties;
  assert.deepEqual(Object.keys(L.faecher.properties).sort(), [...R.layout.faecher].sort());
  for (const p of Object.keys(R.layout.parameter)) assert.deepEqual(L[p].enum, R.layout.parameter[p], p);
  assert.deepEqual(Object.keys(L).filter((k) => k !== 'faecher').sort(), Object.keys(R.layout.parameter).sort());
});

test('[Erscheinungsbild·Schema·Layout·Rot-Beweis] ein Eintrag mit fremdem Schlüssel und ein unbekanntes Fach weist das Schema ab', () => {
  const layouts = require('../helfer/layout-beschreibungen.js');
  const a = JSON.parse(JSON.stringify(HEUTE)); a.layout = JSON.parse(JSON.stringify(layouts['navigation-a'])); a.layout.faecher.kopf[0].html = '<b>';
  const b = JSON.parse(JSON.stringify(HEUTE)); b.layout = JSON.parse(JSON.stringify(layouts['navigation-a'])); b.layout.faecher.oben = [];
  assert.equal(pruefe(a), false);
  assert.equal(pruefe(b), false);
});
