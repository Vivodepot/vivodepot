'use strict';
/* ══════════════════════════════════════════════════════════════════════════════
   pflichtdateien-oeffentliches-repo.js — EINE Quelle für „was ein öffentliches
   Repo tragen MUSS" (16.09.2026)
   ──────────────────────────────────────────────────────────────────────────────
   WARUM DIESE DATEI ÜBERHAUPT EXISTIERT: Die Liste stand bis heute nur in
   `tools/veroeffentlichung-zuschnitt.js` (Achse 4), und die Publikationswächter
   führten daneben eine ZWEITE, von Hand gepflegte Namensliste. Am 16.09.2026
   fiel beim Einspielen von `publiccode.yml` auf, dass die beiden auseinander
   gelaufen waren: zwei Dateien, die es wirklich gibt — `publiccode.yml` und
   `CODE_OF_CONDUCT.md` — standen in der Pflicht-Liste und wurden von keinem der
   beiden Ausschlusswächter gelesen. Gemessen, nicht geschätzt:
     node -e "const z=require('./tools/veroeffentlichung-zuschnitt.js'), \
       a=require('./tools/veroeffentlichung-ausschlussliste-pruefen.js'); \
       console.log(z.KONVENTION_PFLICHT.filter(f=>!a.PUBLIKATIONS_DOKUMENTE.includes(f)))"

   WAS DAS SCHLIMM MACHT, IST NICHT DIE LÜCKE, SONDERN IHRE UNSICHTBARKEIT: die
   Wächter waren grün, die Datei lag im Repo, und jede Leserin hätte sie für
   bewacht gehalten. Gefangen wurde der Fehler an jenem Tag nur, weil
   `tools/repo-adresse-pruefen.js` den GANZEN Baum scannt statt eine Liste zu
   lesen — das ist das Argument für Baum-Scan gegenüber Namensliste, und es ist
   der Grund für diese Datei: wo eine Liste unvermeidlich ist, hat sie genau
   EINEN Ort und alle anderen leiten davon ab.

   ZWEI EINTRÄGE, DIE ES NICHT GIBT, SIND ABSICHT: `LICENSE.md` steht neben
   `LICENSE`, weil beide Schreibweisen üblich sind und das Werkzeug prüft, ob
   EINE davon da ist. Wer davon ableitet, filtert darum gegen den Arbeitsbaum —
   ein Wächter, der über eine nicht vorhandene Datei wacht, liest nichts und ist
   still grün, also genau der stumme Prüfer, gegen den das hier gebaut ist.
   ════════════════════════════════════════════════════════════════════════════ */

// openCode verlangt publiccode.yml und eine OSI-Lizenz; REUSE wird empfohlen.
// Der Rest ist die übliche Ausstattung, die eine Leserin erwartet.
const KONVENTION_PFLICHT = Object.freeze([
  'LICENSE', 'LICENSE.md', 'LICENSING.md', 'NOTICE.md', 'README.md',
  'SECURITY.md', 'CITATION.cff', 'publiccode.yml', 'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md', 'CHANGELOG.md',
]);

module.exports = { KONVENTION_PFLICHT };
