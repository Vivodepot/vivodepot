'use strict';
/* EIN EIGENER SUITE-PLATZ FÜR JEDEN TEST, DER HOOK-AUSSCHNITTE FÄHRT (02.10.2026, Befund PLATZ-LECK-HOOK-TESTS, HOCH).
   Ein Hook-Ausschnitt holt sich einen Suite-Platz. Erbt er die Umgebung des Tests und ist kein Platz geerbt (Einzellauf
   außerhalb der Suite), stand er in der ECHTEN Schlange unter ~/.cache/vivodepot-suite-platz und blockierte echte Pushes.
   `platzIsolieren()` richtet VD_SUITE_PLATZ_DIR dieses Testprozesses auf ein eigenes Temp-Verzeichnis; jedes Kind (sh, git,
   node) erbt es. Ein schon gesetztes Verzeichnis bleibt (die Suite setzt es im Preload, tests/hook-sperre-testumgebung.js).
   tools/lib/suite-platz.js verweigert den echten Pfad unter einem Testläufer ohnehin; dieser Aufruf lässt den Test grün
   laufen, statt an der Sperre zu scheitern. Ein Wächter verlangt ihn in jeder Testdatei mit Hook-Bezug und Prozessstart. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function platzIsolieren(env = process.env) {
  if (env.VD_SUITE_PLATZ_DIR) return env.VD_SUITE_PLATZ_DIR;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'platz-isoliert-'));
  env.VD_SUITE_PLATZ_DIR = dir;
  process.once('exit', () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { /* schon weg */ } });
  return dir;
}

module.exports = { platzIsolieren };
