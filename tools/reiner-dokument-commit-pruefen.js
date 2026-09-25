#!/usr/bin/env node
'use strict';
/* ════════════════════════════════════════════════════════════════════════
   reiner-dokument-commit-pruefen.js — darf dieser Commit die Behavior-Suite
   überspringen?
   ────────────────────────────────────────────────────────────────────────
   ANLASS: die Produktentscheidung, 07.09.2026, Ressourcen-/Token-Grund — reine
   Dokument-Commits (ADRs, Berichte, READMEs) sollen nicht dieselbe volle
   Suite kosten wie ein Code-Commit. Auflage, im selben Zug: „Eine
   Absprache, die jede Sitzung erinnern muss, trägt nicht — ein Werkzeug
   trägt." Details, Zuschnitt und Begründung in U2-ADR-356.

   DIE REGEL, KONSERVATIV: ein Commit ist „rein Dokument", wenn JEDE
   geänderte Datei unter `docs/` liegt, auf `.md` endet, UND kein erzeugter
   Träger ist. Ein einziger Nicht-Dokument-Pfad im selben Commit reicht, um
   die volle Suite zu erzwingen — im Zweifel läuft mehr, nie weniger.

   ERZEUGTE TRÄGER SEHEN AUS WIE DOKUMENTE, SIND ABER CODE-GEBUNDEN.
   `docs/faktenbasis.md` wird aus dem laufenden Kern erzeugt — eine
   Abweichung dort ist ein Befund über den KERN, nicht über eine Formulierung.
   `STANDARDS.md` und jede `*.sha256`-Datei tragen dieselbe Eigenschaft.
   Diese drei Formen sind darum ausdrücklich AUSGESCHLOSSEN, obwohl sie wie
   `.md`/Text aussehen — das ist der Rot-Beweis-Fall „sieht aus wie ein
   Dokument, ist keins" aus U2-ADR-356.

   WAS DIESES WERKZEUG NICHT ENTSCHEIDET: ob die „billigen" ADR-Prüfer
   (ADR-Namen-Wächter, Konformitäts-Prüfer, README-Übereinstimmung) laufen —
   die laufen in `hooks/pre-commit` IMMER, auch im Dokument-Fall. Dieses
   Werkzeug entscheidet nur über die TEURE Behavior-Suite.

   Aufruf:
     node tools/reiner-dokument-commit-pruefen.js
       → prüft den ECHTEN staged Diff (`git diff --cached --name-only`),
         Exit 0 = reiner Dokument-Commit, Exit 1 = nicht (oder leer)
     node tools/reiner-dokument-commit-pruefen.js --dateien a.md,b.js
       → prüft eine EXPLIZITE Liste statt des echten Diffs (für Proben)
   ════════════════════════════════════════════════════════════════════════ */
const { execFileSync } = require('node:child_process');

const GENERIERTE_TRAEGER_EXAKT = Object.freeze(['docs/faktenbasis.md', 'STANDARDS.md']);

function istGenerierterTraeger(datei) {
  return GENERIERTE_TRAEGER_EXAKT.indexOf(datei) >= 0 || datei.endsWith('.sha256');
}

function istDokument(datei) {
  return typeof datei === 'string' && datei.startsWith('docs/') && datei.endsWith('.md')
    && !istGenerierterTraeger(datei);
}

/* Leer gilt NICHT als "rein Dokument" — ein Commit ohne geänderte Dateien ist kein
   Dokument-Commit, er ist ein leerer Aufruf, und der soll die normale (volle) Behandlung
   durchlaufen, statt über eine Sonderregel für einen Fall zu entscheiden, den es so nicht
   geben sollte. */
function reinerDokumentCommit(dateien) {
  return Array.isArray(dateien) && dateien.length > 0 && dateien.every(istDokument);
}

function echterStagedDiff() {
  const roh = execFileSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8' });
  return roh.split('\n').map((z) => z.trim()).filter(Boolean);
}

function main() {
  const arg = process.argv.find((a) => a.startsWith('--dateien='));
  const dateien = arg ? arg.slice('--dateien='.length).split(',').filter(Boolean) : echterStagedDiff();
  const rein = reinerDokumentCommit(dateien);
  console.log(dateien.join('\n'));
  console.log(rein
    ? 'reiner-dokument-commit-pruefen: reiner Dokument-Commit — Behavior-Suite darf entfallen (U2-ADR-356).'
    : 'reiner-dokument-commit-pruefen: kein reiner Dokument-Commit — volle Behavior-Suite läuft.');
  process.exit(rein ? 0 : 1);
}

if (require.main === module) main();
module.exports = { istDokument, istGenerierterTraeger, reinerDokumentCommit, echterStagedDiff, GENERIERTE_TRAEGER_EXAKT };
