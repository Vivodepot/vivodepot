'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Eine Datei atomar anlegen: fertig beschrieben oder gar nicht (23.10.2026, Befund HOLER-PROBE-LASTWACKLER).

   DER FUND: Ticket, Suite-Platz und Arbeitsbaum-Sperre entstanden mit `fs.openSync(pfad, 'wx')` und wurden erst danach
   beschrieben. Wer dazwischen las, fand eine leere Datei, hielt sie für verwaist und löschte sie. Dann verschwand das
   Ticket eines Wartenden, oder ein zweiter Holer nahm denselben Platz, während der erste in die gelöschte Datei schrieb.
   Unter Last wird das Fenster breit; eine Probe der Warteschlange fiel daran im pre-commit.

   DER WEG: Der Inhalt entsteht in einer Nebendatei im selben Ordner, `fs.linkSync` legt ihn unter dem Namen an. Ein Link
   ist atomar und scheitert mit EEXIST wie `wx`; ein Leser sieht die Datei nur vollständig.
   Probe: [Suite-Platz·Atomar].

   ERSETZEN (28.10.2026, Befund KLEIN-PLATZ-EINTRAG-NICHT-ATOMAR): dieselbe Klasse beim NEU-Schreiben einer bestehenden Datei.
   Der Eintrag eines gehaltenen Klein-Platzes wurde mit writeFileSync ersetzt (kürzen, dann schreiben); ein Antrag, der dazwischen
   las, räumte den lebenden Platz als tot. atomarErsetzen schreibt die Nebendatei und benennt sie über den Namen um (rename ist
   atomar): ein Leser sieht den alten oder den neuen Inhalt. Probe: [Atomar·Ersetzen]; Wächter: [Klein·Atomar·Klasse].
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');

let zaehler = 0;
/** Legt `pfad` mit `inhalt` an. true: angelegt; false: es gab ihn schon (EEXIST). Andere Fehler werfen. */
function atomarAnlegen(pfad, inhalt) {
  const neben = pfad + '.' + process.pid + '-' + (zaehler++) + '.neu';
  fs.writeFileSync(neben, inhalt);
  try {
    fs.linkSync(neben, pfad);
    return true;
  } catch (e) {
    if (e.code === 'EEXIST') return false;
    throw e;
  } finally { try { fs.unlinkSync(neben); } catch (_) { /* schon weg */ } }
}

/** Ersetzt `pfad` atomar durch `inhalt` (legt ihn an, wenn es ihn nicht gibt). Fehler werfen; die Nebendatei bleibt nie liegen. */
function atomarErsetzen(pfad, inhalt) {
  const neben = pfad + '.' + process.pid + '-' + (zaehler++) + '.neu';
  try {
    fs.writeFileSync(neben, inhalt);
    fs.renameSync(neben, pfad);
  } catch (e) {
    try { fs.unlinkSync(neben); } catch (_) { /* schon weg */ }
    throw e;
  }
}

module.exports = { atomarAnlegen, atomarErsetzen };
