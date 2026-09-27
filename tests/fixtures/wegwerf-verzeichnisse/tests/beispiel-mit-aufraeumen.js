'use strict';
/* Fixture für tools/wegwerf-verzeichnisse-pruefen.js: legt ein Wegwerf-Verzeichnis an und räumt
   es im finally wieder ab — das GUTE Beispiel der Positivkontrolle. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function beispiel() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wegwerf-fixtur-gut-'));
  try {
    fs.writeFileSync(path.join(dir, 'a.txt'), 'x');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

module.exports = { beispiel };
