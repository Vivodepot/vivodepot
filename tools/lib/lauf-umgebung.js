'use strict';
/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   lauf-umgebung.js — Variablen eines äußeren Laufs gehören nicht in die Testdateien (26.10.2026)
   ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Ein äußerer Lauf (Zugkopf, Hook, die Wache vor `npm test`) setzt Variablen für SEINEN Testläufer und dessen Reporter:
   wohin das erste Rot, die roten Dateien und die Zeiten je Datei geschrieben werden, welche Wackel-Liste gilt, welcher
   Suite-Platz gehalten ist. Die Testdateien erben sie. Startet eine Probe selbst `node --test` oder einen Hook, schreibt
   deren Reporter das künstliche Rot ihrer Fixture in die echte Datei des äußeren Laufs, oder die Probe hält ihren
   Platz nicht selbst, weil er als geerbt gilt. Zweimal ist ein Zugkopf daran rot geworden.

   Darum: `laufVariablenAblegen()` nimmt diese Variablen aus der Umgebung einer TESTDATEI (NODE_TEST_CONTEXT=child…).
   Die Vorlade-Datei jedes Testlaufs ruft es auf; den Testläufer selbst lässt sie unberührt, denn sein Reporter braucht
   sie. `kindUmgebung()` gibt eine Kopie ohne sie, für Werkzeuge, die selbst Kinder starten.
   Bewusst NICHT in der Liste: VD_NACHWEIS_DIR (wer den Nachweis behalten will, setzt ihn für die Proben), CI.
   Die Platz-Isolation der Testdateien (eigenes VD_SUITE_PLATZ_DIR) bleibt; ohne geerbten Platz hält eine Probe in
   ihrem eigenen Verzeichnis. Wächter: die Liste deckt jede VD_-Variable, die ein Reporter des Testlaufs liest.
   ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

const LAUF_VARIABLEN = Object.freeze([
  'VD_ERSTES_ROT',            // Frührot des Zugkopfs (Reporter)
  'VD_ROTE_DATEIEN',          // rote Dateien für den Wiederholungslauf (Reporter, Wache)
  'VD_DATEI_ZEITEN',          // Zeiten je Testdatei (Reporter)
  'VD_DATEI_WANDZEIT',        // Wanduhrzeit je Testdatei (Reporter)
  'VD_LV_ZEITEN',             // Zeiten je Schritt der Landungsvorbereitung
  'VD_WACKEL_QUARANTAENE',    // Wackel-Liste des äußeren Laufs (Wache)
  'VD_SUITE_PLATZ_GEHALTEN',  // gehaltener voller Platz des äußeren Laufs
  'VD_KLEIN_GEHALTEN',        // gehaltener Klein-Platz des äußeren Laufs
]);

function istTestdatei(env = process.env) { return /^child/.test(String(env.NODE_TEST_CONTEXT || '')); }

function kindUmgebung(env = process.env) {
  const e = { ...env };
  for (const k of LAUF_VARIABLEN) delete e[k];
  return e;
}

/* Nimmt die Lauf-Variablen aus `env` heraus und gibt zurück, was dort stand (zum Zurücksetzen). */
function laufVariablenAblegen(env = process.env) {
  const vorher = {};
  for (const k of LAUF_VARIABLEN) if (k in env) { vorher[k] = env[k]; delete env[k]; }
  return vorher;
}

module.exports = { LAUF_VARIABLEN, istTestdatei, kindUmgebung, laufVariablenAblegen };
