'use strict';
/* ════════════════════════════════════════════════════════════════════════════
   Wackel-Quarantäne — ein wackelnder TEST hält keinen fremden Commit an, ein echter Fehler schon (30.09.2026)
   ────────────────────────────────────────────────────────────────────────────
   Frage des Testbetriebs: wer repariert Rot bis wann? Ein Test, der mal rot und mal grün ist, bekommt einen
   Eigentümer, eine Frist von höchstens drei Tagen und eine Zeile in der Befund-Ratsche.

   DIE REGEL (Bedingungen der Gegenlesung, weil die Quarantäne das Push-Tor berührt):
     · Je TEST (Datei plus voller Testname), nie je Datei — sonst verdeckte ein Wackler jede echte Regression
       in derselben Datei.
     · Ein Rot in der Quarantäne wird nicht einfach grün: die betroffenen Dateien laufen EINMAL allein neu.
       Grün im zweiten Lauf → HINWEIS „wackelt", der Lauf gilt als grün. Rot im zweiten Lauf → rot, auch in
       der Quarantäne. So fängt sie Wackler ab, aber keine echten Fehler.
     · Ist die Frist abgelaufen oder ist irgendein roter Test NICHT in der Quarantäne → rot wie immer.
   Die Liste nennt Sitzungen und liegt darum nicht im öffentlichen Teil; ihren Pfad setzen die Hooks in
   VD_WACKEL_QUARANTAENE. Ohne die Variable gibt es keine Quarantäne. Die roten Tests eines Laufs meldet
   tools/lib/datei-zeiten-reporter.mjs in VD_ROTE_DATEIEN, eine Zeile je Test: „datei<TAB>testpfad".
   ════════════════════════════════════════════════════════════════════════════ */
const fs = require('node:fs');

const HOECHSTFRIST_TAGE = 3;
const TRENNER = ' > ';

function lesen(pfad) {
  if (!pfad) return null;
  try { const j = JSON.parse(fs.readFileSync(pfad, 'utf8')); return Array.isArray(j.eintraege) ? j : null; } catch (_) { return null; }
}

/** Rote Tests aus der Reporter-Datei: [{ datei, test }] */
function roteLesen(pfad) {
  try {
    return fs.readFileSync(pfad, 'utf8').split('\n').filter(Boolean).map((z) => { const i = z.indexOf('\t'); return { datei: z.slice(0, i), test: z.slice(i + 1) }; });
  } catch (_) { return []; }
}

const schluessel = (x) => x.datei + '\t' + x.test;

/** Erste Entscheidung für einen roten Lauf. */
function beurteilen(rote, liste, heute = new Date().toISOString().slice(0, 10)) {
  if (!liste || !rote || !rote.length) return { kandidat: false, fremd: rote || [], abgelaufen: [], inFrist: [] };
  const je = new Map(liste.eintraege.map((e) => [schluessel(e), e]));
  const fremd = rote.filter((r) => !je.has(schluessel(r)));
  const abgelaufen = rote.filter((r) => je.has(schluessel(r)) && je.get(schluessel(r)).frist < heute).map((r) => je.get(schluessel(r)));
  const inFrist = rote.filter((r) => je.has(schluessel(r)) && je.get(schluessel(r)).frist >= heute).map((r) => je.get(schluessel(r)));
  return { kandidat: fremd.length === 0 && abgelaufen.length === 0 && inFrist.length > 0, fremd, abgelaufen, inFrist };
}

/** Der Befehl für den Wiederholungslauf: dieselben Optionen, statt der Muster/Dateien nur die genannten Dateien. */
function nurDateien(befehl, dateien) {
  const raus = [];
  for (let i = 0; i < befehl.length; i++) {
    const a = befehl[i];
    if (i < 2 || a.startsWith('-')) { raus.push(a); if ((a === '--require' || a === '-r' || a === '--import') && befehl[i + 1]) raus.push(befehl[++i]); continue; }
    // alles andere ist ein Muster oder eine Testdatei → fällt weg
  }
  return [...raus, ...dateien];
}

module.exports = { HOECHSTFRIST_TAGE, TRENNER, lesen, roteLesen, beurteilen, nurDateien };
