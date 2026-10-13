'use strict';
/* Fixture für die Startweg-Achse (tools/wegwerf-verzeichnisse-pruefen.js): startet den Test-Runner OHNE den
   Lauf-Helfer — das SCHLECHTE Beispiel. Wird nie ausgeführt, nur gelesen. */
const { execFileSync } = require('node:child_process');

function zaehlen(dateien) {
  return execFileSync('node', ['--no-sparkplug', '--test', ...dateien], { encoding: 'utf8' });
}

module.exports = { zaehlen };
