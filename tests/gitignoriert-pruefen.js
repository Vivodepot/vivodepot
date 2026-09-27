'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Gemeinsame Diskriminante für zwei Wächter — "nicht vorhanden" ist nicht
   dasselbe wie "gelöscht" (gefunden 01.09.2026, Auftrag)
   ────────────────────────────────────────────────────────────────────────────
   `u2-106-kein-kommentar-behauptet-eine-datei-die-es-nicht-gibt`
   (tests/zusagen-in-kommentaren.test.js) und
   `[Fixture-Felder] keine Ausnahme zeigt auf eine Datei, die es nicht gibt`
   (tests/fixture-felder-im-modell.test.js) prüften beide dieselbe Frage — "gibt
   es diesen Pfad?" — mit `fs.existsSync`. Für einen Pfad, der per `.gitignore`
   absichtlich vom Tracking ausgenommen ist, ist das die falsche Frage: er BLEIBT
   lokal liegen und existiert dort, aber in einem frischen Klon/Arbeitsbaum wurde
   er nie angelegt — `existsSync` kann die beiden Fälle nicht unterscheiden.

   DREI ZUSTÄNDE, nicht zwei: vorhanden, absichtlich ausgeschlossen (gitignored),
   oder wirklich verschwunden. `git check-ignore` beantwortet genau das, weil es
   das MUSTER in der `.gitignore` liest, nicht die Platte — dieselbe Antwort, ob
   die Datei lokal existiert oder nicht.

   VIERTER, TECHNISCHER ZUSTAND: antwortet `git` selbst nicht (kein Git-Repo, kein
   `git` im PATH), ist das kein Fall für eine Vermutung in irgendeine Richtung —
   das wäre entweder ein blinder Wächter (stumm als "ignoriert" gewertet) oder ein
   grundlos roter (stumm als "nicht ignoriert" gewertet). Es ist ein eigener,
   sichtbarer Fehlschlag.

   GEMESSENE FALLE (01.09.2026): `git check-ignore` matcht ein Verzeichnis-Muster
   (`.gitignore`-Zeile mit abschließendem `/`, z. B. `tests/fixtures/kette-beispiel/`)
   NICHT gegen den blossen Namen ohne Schrägstrich, wenn kein Verzeichnis dieses
   Namens auf der Platte liegt — git kann sonst nicht wissen, ob der Aufrufer eine
   Datei oder einen Ordner meint. In einem frischen Arbeitsbaum, wo der Ordner nie
   angelegt wurde, schlägt der Aufruf darum OHNE zweiten Versuch fehl, genau im
   Fall, den dieses Modul lösen soll. Deshalb: erst der Pfad wie übergeben, dann —
   nur wenn das NICHT ignoriert ergab — derselbe Pfad MIT angehängtem `/`. */
const { execFileSync } = require('node:child_process');
const { ohneGitUmgebung } = require('../tools/lib/ohne-git-umgebung.js');

function checkIgnoreAufruf(relativerPfad, repoWurzel) {
  try {
    execFileSync('git', ['check-ignore', '--quiet', relativerPfad],
      { cwd: repoWurzel, env: ohneGitUmgebung(), stdio: ['ignore', 'ignore', 'ignore'] });
    return true;
  } catch (fehler) {
    // Exit 1 ist git check-ignores VERTRAGLICHE Antwort für "nicht ignoriert" —
    // kein Fehler, sondern das negative Ergebnis der Prüfung selbst.
    if (typeof fehler.status === 'number' && fehler.status === 1) return false;
    const grund = fehler.code === 'ENOENT' ? 'git nicht im PATH gefunden' : 'git check-ignore Exit ' + fehler.status;
    const weiter = new Error(
      'Konnte nicht bestimmen, ob "' + relativerPfad + '" absichtlich ausgeschlossen ist (' + grund + '). '
      + 'Weder als ignoriert noch als nicht-ignoriert werten — der Zustand ist unbekannt, nicht negativ.');
    weiter.cause = fehler;
    throw weiter;
  }
}

function istAbsichtlichAusgeschlossen(relativerPfad, repoWurzel) {
  if (checkIgnoreAufruf(relativerPfad, repoWurzel)) return true;
  if (relativerPfad.endsWith('/')) return false;
  // Zweiter Versuch NUR fuers Verzeichnis-Muster (s. o.) — ein echter Fehlschlag
  // im ersten Aufruf hat oben bereits geworfen und kommt hier nie an.
  return checkIgnoreAufruf(relativerPfad + '/', repoWurzel);
}

module.exports = { istAbsichtlichAusgeschlossen };
