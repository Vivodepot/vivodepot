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

/* KEINE ECHTE PLATTE IN PROBEN (05.11.2026, Befund PROBEN-MESSEN-ECHTE-PLATTE, MITTEL): suite-platz misst den freien Platz
   des Rechners. Auf einem Rechner unter der Grenze wurden Proben rot, gleich welcher Commit geprüft wurde. Jeder Testprozess
   und jedes Kind bekommt darum einen festen Wert über der Grenze, auch wenn draußen einer gesetzt ist. Wer die Sperre selbst
   prüft, setzt den Wert im Kind. Die Proben dazu laufen mit den übrigen Platz-Proben. */
const PLATTE_IN_PROBEN_GB = '1000';

function platzIsolieren(env = process.env) {
  env.VD_PLATTE_FREI_GB = PLATTE_IN_PROBEN_GB;
  if (env.VD_SUITE_PLATZ_DIR) return env.VD_SUITE_PLATZ_DIR;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'platz-isoliert-'));
  env.VD_SUITE_PLATZ_DIR = dir;
  process.once('exit', () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { /* schon weg */ } });
  return dir;
}

module.exports = { platzIsolieren };
