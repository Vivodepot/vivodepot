'use strict';
/* Findet Testdateien, die KERN_HTML_PATH setzen (einen umgelenkten Kern laden), OHNE zu sagen, welchen
   Kern sie meinen. `ladeKern()` backt bei umgelenktem Pfad nichts — wer ein volles Produkt braucht,
   sagt `{ backen: true }`, wer das nackte Gerüst meint, `{ blank: true }` (tests/load-kern.js).
   Stillschweigen ist die Lücke: die Probe bekommt das nackte Gerüst und ist entweder rot mit einer
   Folgefehler-Meldung (null.zeilen) oder grün ohne Gegenstand. */
const fs = require('node:fs');
const path = require('node:path');

const ABSICHT = /\b(backen|blank)\s*:/;

function ohneAbsicht(dateien) {
  return Object.keys(dateien).filter((d) => /KERN_HTML_PATH/.test(dateien[d]) && !ABSICHT.test(dateien[d])).sort();
}

function testDateien(repo) {
  const aus = {};
  const gehe = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'fixtures' || e.name === 'e2e') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) gehe(p);
      else if (e.name.endsWith('.test.js')) aus[path.relative(repo, p)] = fs.readFileSync(p, 'utf8');
    }
  };
  gehe(path.join(repo, 'tests'));
  return aus;
}

module.exports = { ohneAbsicht, testDateien, ABSICHT };
