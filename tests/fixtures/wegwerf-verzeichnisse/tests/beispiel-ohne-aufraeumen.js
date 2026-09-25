'use strict';
/* Fixture für tools/wegwerf-verzeichnisse-pruefen.js: legt ein Wegwerf-Verzeichnis an und räumt
   es NIE wieder ab — das SCHLECHTE Beispiel der Positivkontrolle. Absichtlich, das ist der
   Gegenstand dieser Datei, kein echter Verstoß im Bestand (s. SELBSTBEZUG im Prüfer). */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function beispiel() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wegwerf-fixtur-schlecht-'));
  fs.writeFileSync(path.join(dir, 'a.txt'), 'x');
  return dir; // absichtlich nicht wieder entfernt
}

module.exports = { beispiel };
