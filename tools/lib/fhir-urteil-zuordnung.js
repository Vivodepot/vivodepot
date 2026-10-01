'use strict';
/* ════════════════════════════════════════════════════════════════════════
   fhir-urteil-zuordnung.js — ein Validator-Ergebnis den Dateien zuordnen (28.09.2026)
   ────────────────────────────────────────────────────────────────────────
   tests/konformitaet/externe-validatoren.mjs legt dem HL7-Validator alle Artefakte in EINEM Aufruf vor.
   Das Ergebnis ist ein Bundle aus OperationOutcomes (mehrere Dateien) oder ein einzelnes OperationOutcome
   (eine Datei). Schlüssel ist allein der Pfad aus der Extension operationoutcome-file, NIE die Reihenfolge;
   eine Datei ohne eigenes OperationOutcome gilt als ungelesen, nie als gültig.
   Gehalten von tests/fhir-urteil-zuordnung.test.js.
   ════════════════════════════════════════════════════════════════════════ */
const path = require('node:path');

const OO_DATEI = 'http://hl7.org/fhir/StructureDefinition/operationoutcome-file';

function urteilsZuordnung(ergebnis, dateiPfade) {
  const oos = ergebnis && ergebnis.resourceType === 'Bundle'
    ? (ergebnis.entry || []).map((e) => e && e.resource).filter(Boolean)
    : (ergebnis ? [ergebnis] : []);
  const jePfad = new Map();
  for (const oo of oos) {
    const ext = (oo.extension || []).find((x) => x.url === OO_DATEI);
    const pfad = ext ? ext.valueString : (oos.length === 1 && dateiPfade.length === 1 ? dateiPfade[0] : null);
    if (pfad) jePfad.set(path.resolve(pfad), oo);
  }
  return new Map(dateiPfade.map((p) => {
    const oo = jePfad.get(path.resolve(p));
    if (!oo) return [p, { gelesen: false, fehler: ['kein OperationOutcome für diese Datei'] }];
    const fehler = (oo.issue || []).filter((i) => i.severity === 'fatal' || i.severity === 'error');
    return [p, {
      gelesen: true,
      gueltig: fehler.length === 0,
      fehler: fehler.map((i) => ((i.expression && i.expression[0]) || '?') + ': '
        + String((i.details && i.details.text) || '').replace(/\s+/g, ' ').slice(0, 180)),
    }];
  }));
}

module.exports = { urteilsZuordnung, OO_DATEI };
