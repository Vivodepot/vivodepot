'use strict';
/* Benannte Ersetzungen EIGENER Fragen gegenüber festen alten Ständen (v872). Proben, die den Kern mit einem alten Beleg
   vergleichen (Vor-Umzug-Achse a3, Rundlauf des Dokument-Umzugs), sammeln auch Vivodepots eigene Fragen, nicht nur
   amtlichen Wortlaut. Wird eine eigene Frage berichtigt, steht sie hier — je Schritt und Feld, alter und neuer
   Wortlaut wörtlich, kein Muster. Ein amtlicher Wortlaut gehört nie in diese Liste.
   Gedeckt ist nur: der alte Wortlaut fehlt UND genau der neue steht an genau diesem Schritt. Eine Streichung ohne Ersatz und
   jeder dritte Wortlaut bleiben rot (Rot-Beweise in beiden Proben). */
const EIGENE_FRAGEN_ERSETZT = Object.freeze([
  Object.freeze({
    schritt: 'healthCareMedicalProcedures',
    feld: 'frage',
    art: 'eigene Frage',
    fundstelle: '§ 1829 Abs. 1 BGB',
    freigegeben: 'v850',
    alt: 'Darf sie in ärztliche Eingriffe einwilligen, auch bei Lebensgefahr? (§ 1829 BGB)',
    neu: 'Darf sie in ärztliche Eingriffe einwilligen, auch bei Lebensgefahr oder Gefahr eines schweren, länger dauernden Gesundheitsschadens? (§ 1829 BGB)',
  }),
]);
// Ratsche: die Liste wächst nicht still. Eine neue Ersetzung zieht diese Zahl bewusst nach, mit dem Wort der Gegenlesung.
require('node:assert/strict').equal(EIGENE_FRAGEN_ERSETZT.length, 1, 'neue Ersetzung? bewusst nachziehen, mit Wort');

function schrittId(st) { return st && st.feld && st.feld.id; }

/* Für den Vergleich ganzer Schritte: der ALTE Stand wird an genau diesem Schritt und Feld auf den neuen Wortlaut gesetzt.
   Steht im neuen Stand etwas anderes, bricht der folgende deepEqual weiter. */
function alteSchritteNachgefuehrt(steps, liste) {
  liste = liste || EIGENE_FRAGEN_ERSETZT;
  return (steps || []).map((st) => {
    const e = liste.find((x) => x.schritt === schrittId(st) && st[x.feld] === x.alt);
    return e ? Object.assign({}, st, { [e.feld]: e.neu }) : st;
  });
}

/* Für flache Wertlisten: ein verlorener Wert ist gedeckt, wenn er der alte Wortlaut einer Ersetzung ist und der Schritt im
   neuen Stand genau den neuen trägt. */
function verloreneOhneErsetzte(verloren, neueSteps, liste) {
  liste = liste || EIGENE_FRAGEN_ERSETZT;
  return verloren.filter((w) => !liste.some((e) => e.alt === w
    && (neueSteps || []).some((st) => schrittId(st) === e.schritt && st[e.feld] === e.neu)));
}

module.exports = { EIGENE_FRAGEN_ERSETZT, alteSchritteNachgefuehrt, verloreneOhneErsetzte };
