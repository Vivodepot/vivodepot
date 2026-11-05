'use strict';
/* Ein Temp-Ordner, den ein Prozess für seine Laufzeit hält, wird beim Prozessende geräumt — auch wenn der Prozess per
   SIGTERM, SIGINT oder SIGHUP endet (02.11.2026). Bei diesen Signalen beendet Node den Prozess ohne 'exit', und ein
   finally läuft nicht; jeder abgebrochene Lauf (Zeitgrenze der Wagenstufe, Abbruch über suite-platz, abgebrochener
   Air-Lauf) ließ seinen Ordner im TMPDIR liegen.
   Nach dem Räumen gilt das Signal wie vorher: ist kein anderer Hörer da, wird es neu ausgelöst und beendet den Prozess.
   Hat der Prozess einen eigenen Hörer (oder den des Temp-Preloads), entscheidet der. SIGKILL lässt sich nicht abfangen.

   beimEndeRaeumen(ordner) merkt den Ordner vor und gibt eine Funktion zurück, die ihn wieder freigibt — für einen Ordner,
   den der Aufrufer selbst räumt oder bewusst behält. Probe: tests/temp-bei-signal-raeumen.test.js. */
const fs = require('node:fs');

const SIGNALE = Object.freeze(['SIGTERM', 'SIGINT', 'SIGHUP']);
const vorgemerkt = new Set();
let wacheAn = false;

function raeumen() {
  for (const d of vorgemerkt) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (_) { /* weiter mit dem nächsten */ } }
  vorgemerkt.clear();
}

function wacheEinrichten() {
  if (wacheAn) return;
  wacheAn = true;
  process.once('exit', raeumen);
  for (const signal of SIGNALE) {
    process.once(signal, () => {
      raeumen();
      if (process.listenerCount(signal) === 0) process.kill(process.pid, signal);
    });
  }
}

function beimEndeRaeumen(ordner) {
  vorgemerkt.add(ordner);
  wacheEinrichten();
  return () => { vorgemerkt.delete(ordner); };
}

module.exports = { beimEndeRaeumen, SIGNALE };
