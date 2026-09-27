'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   EIN Ort für die GIT_*-Bereinigung (19.09.2026, Auftrag, Schweregrad HOCH).

   DER FUND: `tests/adr-praefix-ratsche-pruefen.test.js` legte für eine Probe ein
   Wegwerf-Repo unter `cwd: tmp` an, aber OHNE die Umgebung zu bereinigen. Während
   eines `pre-commit`-Hook-Laufs setzt git seinen Kindprozessen `GIT_DIR`,
   `GIT_WORK_TREE`, `GIT_INDEX_FILE` — und die gewinnen gegen `cwd`. Der `git
   commit -q -m "a"` der Probe landete darum nicht im frisch angelegten `tmp`,
   sondern im ECHTEN Repo, auf welchem Zweig auch immer der Hook gerade lief.
   Committer-Identität und Commit-Nachricht („a") stammen wörtlich aus derselben
   Probe — das ist der Fund, nicht eine Vermutung.

   DIESELBE BEREINIGUNG stand davor schon unabhängig kopiert in mindestens fünf
   Dateien (`tools/repo-adresse-pruefen.js`, `tools/interne-sitzungskuerzel-
   pruefen.js`, `tools/aussagen-abgleich-pruefen.js`,
   `tools/auslieferung-je-version-lauf.js`, mehrere `tests/*.test.js` inline) —
   jede Kopie ein weiterer Ort, an dem sie fehlen kann, wie hier geschehen. Diese
   Datei ist jetzt DER eine Ort; bestehende Kopien werden nach und nach hierher
   verwiesen, nicht neu erfunden.
   ════════════════════════════════════════════════════════════════════════════ */

function ohneGitUmgebung(basis = process.env) {
  const e = { ...basis };
  for (const k of Object.keys(e)) if (k.startsWith('GIT_')) delete e[k];
  return e;
}

module.exports = { ohneGitUmgebung };
