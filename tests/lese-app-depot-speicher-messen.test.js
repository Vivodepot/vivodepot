'use strict';
/* Das Messwerkzeug tools/lese-app-depot-speicher-messen.js (Befund DATEI-BEREICH-AUSGEBLENDET): es zählt je Speicher eines Depots
   die Lesestellen im Code der Lese-App. Diese Probe hält, dass es Kommentare und Zeichenketten nicht mitzählt, beide Zugriffsformen
   findet und am echten Stand misst, was der Befund sagt: `institutionen` liest die Lese-App an genau einer Stelle. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const M = require('../tools/lese-app-depot-speicher-messen.js');

const LESE_HTML = fs.readFileSync(path.join(__dirname, '..', 'vivodepot-lesen.html'), 'utf8');

test('[Lese-App·Speicher·Messung] Kommentar und Zeichenkette sind keine Lesestelle; Punkt- und Klammerform zählen', () => {
  const quelle = [
    '/* data.stellen im Kommentar */',
    '// d.stellen im Zeilenkommentar',
    "const satz = 'hier steht data.stellen als Text';",
    'const a = data.stellen;',
    "const b = d['stellen'];",
    'const c = { stellen: 1 };',
  ].join('\n');
  const r = M.speicherMessen(quelle, ['stellen', 'fehlt']);
  assert.deepEqual(r[0], { schluessel: 'stellen', lesestellen: 2, zeilen: [4, 5] });
  assert.equal(r[1].lesestellen, 0);
});

test('[Lese-App·Speicher·Messung] am echten Stand: die Lese-App liest die Stellen des Depots an genau einer Stelle, die Personen an mehreren', () => {
  const [stellen, menschen] = M.speicherMessen(LESE_HTML, ['institutionen', 'menschen']);
  assert.equal(stellen.lesestellen, 1, 'die eine Stelle löst einen Verweis aus einem Feld auf; schließt der Befund, steigt diese Zahl und die Probe wird mit dem Fix nachgezogen');
  assert.ok(menschen.lesestellen >= 2);
});

test('[Lese-App·Speicher·Messung·Rot-Beweis] ohne das Bereinigen zählten Kommentar und Zeichenkette als Lesestelle', () => {
  const quelle = ['/* data.stellen im Kommentar */', "const satz = 'data.stellen als Text';", 'const a = data.stellen;'].join('\n');
  assert.deepEqual(M.lesestellen(quelle, M.nurCode(quelle), 'stellen'), [3], 'bereinigt: nur die eine echte Lesestelle');
  assert.deepEqual(M.lesestellen(quelle, quelle, 'stellen'), [1, 2, 3], 'unbereinigt zählten drei — genau das fängt die Probe oben');
  /* Die Bereinigung hält Länge und Zeilen, auch wenn eine Zeichenkette in ihrer Zeile nicht endet; sonst stimmten die Zeilennummern nicht. */
  const offen = "const r = /it's/;\nconst b = data.stellen;";
  assert.equal(M.nurCode(offen).length, offen.length);
  assert.deepEqual(M.lesestellen(offen, M.nurCode(offen), 'stellen'), [2]);
});
