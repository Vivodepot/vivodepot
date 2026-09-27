'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Sektorenliste — vom Kern gelesen, nicht von Hand gepflegt
   ────────────────────────────────────────────────────────────────────────
   T11 (31.07.2026). `tools/kampagne.js` führte eine von Hand gepflegte
   SEKTOREN-Konstante mit zehn Einträgen; der Kern führt seit U2-ADR-041
   (Bereich „Persönliches") elf. `persoenliches` fehlte in Ebene 4 und
   Ebene 4b, lautlos — keine der beiden Stellen wirft, wenn ein Sektor
   fehlt, sie messen nur, was in der Kopie steht. `tools/axe-lauf.js` hatte
   denselben Fehler und trug bereits eine eigene `echteSektorenListe()`
   (B6, Zug 3, 30.07.2026). Zwei Kopien derselben Funktion wären dieselbe
   Art Drift gewesen, die hier behoben wird — darum steht sie jetzt hier,
   einmal, und beide Aufrufer lesen von hier. */
const { ladeKern } = require('../../tests/load-kern.js');

/* Zug 0 (09.09.2026) — `bereicheAlle()` statt `V.SEKTOREN`, und das ist der Anlass, aus dem
   diese Datei ueberhaupt existiert, ein zweites Mal.

   `V.SEKTOREN` ist die Buendel-Liste. Sobald ein Bereich AB WERK gesaet wird, lebt er in der
   Registry und steht dort nicht mehr — `V.SEKTOREN` liefert dann einen weniger. Siebzehn
   Stellen lesen diese Bibliothek, darunter `build-bereiche.js`, das die Bereichsliste in die
   uebrigen Anwendungen traegt: sie alle haetten still einen Bereich weniger bekommen.

   `bereicheAlle()` ist die eine Lesestelle, die Buendel und Registry zusammenfuehrt. Sie ist
   damit DIE MENGE — gemessen am 09.09.2026: von den zweiundvierzig Werkzeugen in `tools/`,
   die `V.SEKTOREN` an dieser Bibliothek vorbei lesen, brauchen neunundzwanzig die VOLLEN
   Sektor-Objekte (sektionen/felder), die hier gar nicht herausgegeben werden. Diese Datei
   ist darum der richtige Ort fuer ihre zwei schmalen Formen, aber NICHT der Sammelpunkt fuer
   die uebrigen einundvierzig; die lesen `bereicheAlle()` direkt. */


function echteSektorenListe() {
  const { V } = ladeKern();
  return V.bereicheAlle().map((s) => s.id);
}

/* Dieselbe Quelle, mit der Beschriftung daneben — für `tools/build-bereiche.js`,
   das die Bereichsliste in die drei übrigen Anwendungen trägt (Zug 1, 17.08.2026).
   Eine eigene Leseart im Bau-Werkzeug wäre die zweite Kopie gewesen, gegen die
   dieser Auftrag gebaut ist; darum steht sie hier, neben der ersten.
   REIHENFOLGE IST BEDEUTUNG: sie ist die Bereichsreihenfolge, nicht nur eine
   Aufzählung (U2-ADR-041 legt beide Enden fest). */
function echteBereicheMitLabel() {
  const { V } = ladeKern();
  return V.bereicheAlle().map((s) => ({ id: s.id, label: s.label }));
}

module.exports = { echteSektorenListe, echteBereicheMitLabel };
