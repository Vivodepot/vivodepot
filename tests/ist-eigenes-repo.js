'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Ist dieses Verzeichnis die WURZEL eines Git-Arbeitsbaums?
   ────────────────────────────────────────────────────────────────────────
   Zwei Wächter messen nicht das Produkt, sondern das REPO: der Hooks-Wächter
   (`core.hooksPath` zeigt hierher) und die Lockstep-Positivkontrolle (ein
   flacher Klon dieses Repos wird als flach erkannt). Beide brauchen ein Repo,
   um überhaupt etwas messen zu können.

   Seit `tools/ausgehenden-stand-messen.js` gibt es einen dritten Ort, an dem
   die Suite läuft: den über `git archive` ausgepackten Stand. Dort gibt es
   kein `.git` — es kann keins geben, ein Archiv trägt keine Historie. Beide
   Wächter meldeten dort eine Verletzung, wo es nichts zu verletzen gab:
   VAKUUM-ROT, und ein dauerhaft rotes Gate ist ein abgeschaltetes.

   WARUM ABGELEITET UND NICHT GESETZT. Eine Umgebungsvariable
   (`VD_OHNE_GIT=1`) wäre die kürzere Antwort und die schlechtere: sie ist von
   Hand setzbar, und dann schweigt ein Push-Gate, weil jemand eine Variable
   exportiert hat. Die Frage „liegt hier ein Repo?" ist dagegen nicht zu
   behaupten, sondern nur zu beantworten.

   WARUM `--show-toplevel` UND NICHT `existsSync('.git')`. Wird ein Archiv
   versehentlich INNERHALB eines Repos ausgepackt, findet git die Wurzel
   weiter oben — und die Wächter mäßen dann das umgebende Repo statt des
   ausgepackten Standes. Ein Vergleich der Wurzel mit dem eigenen Verzeichnis
   schließt das aus.

   Der Aufrufer schweigt NICHT, wenn dies `false` liefert: er schreibt eine
   UNGEMESSEN-Zeile (U2-ADR-106). „Lief nicht" und „war grün" bleiben
   unterscheidbar.
   ════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

/**
 * @param {string} verzeichnis  absoluter Pfad, dessen Repo-Wurzel er sein soll
 * @returns {boolean}           true nur, wenn git-Wurzel und Verzeichnis dasselbe sind
 */
function istEigenesRepo(verzeichnis) {
  /* DIE SAUBERE UMGEBUNG (gefunden von den Negativkontrollen unten, im
     pre-commit-Lauf am 28.07.). Git setzt seinen Hooks `GIT_DIR` — und mit
     gesetztem `GIT_DIR`, aber ohne `GIT_WORK_TREE`, hält git das AKTUELLE
     Verzeichnis für den Arbeitsbaum. `--show-toplevel` gab dann jedes
     beliebige Verzeichnis als seine eigene Wurzel zurück, und der Erkenner
     sagte überall „ja".

     Direkt aufgerufen war er grün, im Hook rot: die Klasse von Fehler, die
     eine Positivkontrolle allein nie findet. Dieselbe Säuberung steht in
     build-datum-lockstep.test.js und aus demselben Grund. */
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (k.startsWith('GIT_')) delete env[k];
  try {
    const oben = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: verzeichnis, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env,
    }).trim();
    if (!oben) return false;
    return fs.realpathSync(oben) === fs.realpathSync(verzeichnis);
  } catch {
    return false;                      // kein git, kein Repo, keine Messung
  }
}

module.exports = { istEigenesRepo };
