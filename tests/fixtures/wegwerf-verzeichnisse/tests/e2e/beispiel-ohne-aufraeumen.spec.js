'use strict';
/* Fixture für die Stellen-Achse (tools/wegwerf-verzeichnisse-pruefen.js): eine Spec legt ein Wegwerf-Verzeichnis an
   und räumt es nie — das SCHLECHTE Beispiel. Liegt außerhalb jedes testDir, wird nie ausgeführt. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function beispiel() {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'wegwerf-fixtur-spec-schlecht-'));
  fs.writeFileSync(path.join(ordner, 'a.txt'), 'x');
  return ordner;
}

module.exports = { beispiel };
