'use strict';
/* Wächter „KERN_HTML_PATH ohne Absicht" (19.09.2026). Der Fund: mit dem Standard-Produkt als
   Vorgabe von `ladeKern()` bekamen Proben, die den Kern über KERN_HTML_PATH umlenken (Rot-Beweis
   an einer Kopie), plötzlich das nackte Gerüst — kette-01 (null.zeilen), U2-ADR-279 (klickFeld
   null), zug0 (Bereiche fehlen). Jede zeigte einen Folgefehler, keine Ursache. Neue Nutzer müssen
   sagen, welchen Kern sie meinen; die bekannten stehen in der Grundlinie und dürfen nur sinken. */
const test = require('./helfer/nur-privat.js').testMitPrivat(__filename);   // nur-privat: s. tests/helfer/nur-privat.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ohneAbsicht, testDateien } = require('../tools/lib/kern-html-path-absicht.js');

const REPO = path.join(__dirname, '..');
const GRUND = JSON.parse(fs.readFileSync(path.join(REPO, 'tools', 'kern-html-path-absicht-grundlinie.json'), 'utf8'));

test('[Absicht] kein NEUER Test lenkt den Kern um, ohne { backen: true } oder { blank: true } zu sagen', () => {
  const heute = ohneAbsicht(testDateien(REPO));
  const neu = heute.filter((d) => !GRUND.dateien.includes(d));
  assert.deepEqual(neu, [], 'Diese Tests setzen KERN_HTML_PATH ohne Absicht: ' + neu.join(', ')
    + '\nladeKern({ backen: true }) für ein volles Produkt, ladeKern({ blank: true }) für das nackte Gerüst.');
});

test('[Absicht·Ratsche] die Grundlinie führt nur Dateien, die es noch gibt und die weiter ohne Absicht sind — Abgänge werden gestrichen', () => {
  const heute = new Set(ohneAbsicht(testDateien(REPO)));
  const veraltet = GRUND.dateien.filter((d) => !heute.has(d));
  assert.deepEqual(veraltet, [], 'Aus der Grundlinie streichen (sie darf nur sinken): ' + veraltet.join(', '));
  assert.ok(GRUND.dateien.length >= 1, 'Ausbeute: die Grundlinie ist nicht leer');
});

test('[Absicht·Rot-Beweis] eine gepflanzte Datei mit umgelenktem Kern und ohne Absicht wird gefunden, mit Absicht nicht', () => {
  /* Der Umlenk-Name wird aus Teilen gefügt: eine Zuweisung im Wortlaut wäre in DIESER Datei selbst
     eine rohe Kern-Ladung, die tests/klasse-b-node-kern.test.js als Drift meldet. */
  const umlenken = ['process.env.', 'KERN_HTML', '_PATH', ' = x;'].join('');
  const gepflanzt = {
    'tests/a.test.js': umlenken + ' ladeKern();',
    'tests/b.test.js': umlenken + ' ladeKern({ backen: true });',
    'tests/c.test.js': umlenken + ' ladeKern({ blank: true });',
    'tests/d.test.js': 'ladeKern();',
  };
  assert.deepEqual(ohneAbsicht(gepflanzt), ['tests/a.test.js']);
});
