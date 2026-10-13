'use strict';
/* Fixture für die Startweg-Achse (tools/wegwerf-verzeichnisse-pruefen.js): startet den Test-Runner über den
   Lauf-Helfer — das GUTE Beispiel, ein Aufruf und eine Definition. Wird nie ausgeführt, nur gelesen. */
const { execFileSync } = require('node:child_process');
const { mitTestLauf } = require('../../../../tools/lib/test-lauf.js');

const PROBE_ARGE = ['--no-sparkplug', '--test', 'x.test.js'];

function zaehlen(dateien) {
  return mitTestLauf((env) => execFileSync('node', ['--no-sparkplug', '--test', ...dateien], { encoding: 'utf8', env }));
}

function probe() {
  return mitTestLauf((env) => execFileSync('node', PROBE_ARGE, { encoding: 'utf8', env }));
}

module.exports = { zaehlen, probe };
