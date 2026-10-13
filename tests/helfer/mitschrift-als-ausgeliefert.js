'use strict';
/* Nur für Proben. Seit 11.10.2026 (Befund MITSCHRIFT-AB-WERK-NACH-POSITION) sät der Kern aus der Mitschrift einer Datei nur eine
   Bereichsdefinition, deren Inhalt beim Öffnen als ausgeliefert festgestellt wurde. Proben, die mit einem ERFUNDENEN Bereich die
   Rangfolge, die Reihenfolge oder die Sicherheitsgrenze der Saat halten (nicht die Herkunft), stellen ihre Definitionen hiermit
   ausdrücklich so, als hätte die Inhaltsprüfung sie erkannt. Das steht für das ERGEBNIS der Prüfung; die Prüfung selbst und der
   Fall „nicht ausgeliefert“ stehen in tests/mitschrift-bereich-nach-inhalt.test.js. Was eine Probe danach zeigt, gilt darum für
   eine ausgelieferte Definition — genau der Fall, in dem die Mitschrift weiter greifen soll. */
function mitschriftAlsAusgeliefert(V, d) {
  const ms = d && d.abWerkMitschrift;
  if (!ms || typeof ms !== 'object') return d;
  for (const m of (Array.isArray(ms.bereich) ? ms.bereich : [])) for (const id of Object.keys((m && m.bereiche) || {})) V._alsAusgeliefertFestgestellt(m.bereiche[id]);
  const e = ms.bereichsErsatz;
  if (e && e.neu && typeof e.neu === 'object') for (const id of Object.keys(e.neu)) V._alsAusgeliefertFestgestellt(e.neu[id]);
  return d;
}
module.exports = { mitschriftAlsAusgeliefert };
