'use strict';
/* ════════════════════════════════════════════════════════════════════════
   suite-dateien-kern.js — die eine Quelle für „welche Dateien sind die Suite"
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-228. Vorher ließen `tools/faktenbasis-erzeugen.js` und
   `tools/build-standzahlen.js --mit-suite` je ein nacktes `node --test` bzw.
   `npm test` ohne Dateiliste laufen — Nodes eigene Dateisuche sammelt nach
   Dateisystem-Muster, nicht nach Git-Index. Eine gitignorierte, nie
   committete Testdatei im Arbeitsbaum wird mitgezählt; ein frischer
   Checkout kennt sie nicht — dieselbe Zahl wird je nach Baum verschieden.

   Diese Datei liefert stattdessen die Liste der von GIT GETRACKTEN
   Testdateien. `node --test <Datei> <Datei> …` mit expliziten Pfaden führt
   NUR diese Dateien aus — Nodes eigene Muster-Suche greift dann gar nicht
   erst, unabhängig davon, was sonst noch im Arbeitsbaum liegt.

   Absichtlich abhängigkeitslos wie `ausgeliefertes-dateiset.js`: trägt nur
   die Ermittlung, sonst nichts.

   GIT_*-Umgebung wird gestrippt (`tools/lib/ohne-git-umgebung.js`, ehemals
   eigenständig kopiert von `scripts/build-datum-kern.js`s `ohneGitUmgebung()`):
   während eines echten Hook-Laufs setzt git `GIT_DIR`/`GIT_INDEX_FILE`, und
   die gewinnen gegen `cwd` — ein `git ls-files` gegen EIN Repo würde sonst
   für ein ANDERES antworten (hier real getroffen: der throwaway-Git-Fixture
   in `tests/suite-dateien-kern.test.js` lief am Terminal grün und im
   `pre-commit`-Hook gegen das eigentliche Repo — dieselbe Fehlerklasse traf
   19.09.2026 `tests/adr-praefix-ratsche-pruefen.test.js`, Fund). */
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

function suiteDateien(repo) {
  const roh = execFileSync('git', ['ls-files', 'tests'], { cwd: repo, encoding: 'utf8', env: ohneGitUmgebung() });
  return roh.split('\n')
    .filter(Boolean)
    .filter((datei) => /\.test\.(js|cjs|mjs)$/.test(datei));
}

module.exports = { suiteDateien };
