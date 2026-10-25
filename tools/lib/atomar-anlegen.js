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

module.exports = { atomarAnlegen };
