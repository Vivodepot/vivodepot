'use strict';
/* ═════════════════════════════════════════════════════════════════
   Schema 90 (28.09.2026): gespeicherte Code-System-URIs werden auf die kanonische umgeschrieben —
   ICD-10-GM von der erfundenen `…/sid/icd-10-gm`, ATC-GM von der WHO-URI der internationalen Fassung, beide
   auf die BfArM-URI des Basisprofils DE. Welche URI welche ersetzt, steht in den Listen (aliasUris).

   Geprüft: die Stufe schreibt Chip-Codes wo immer sie liegen und die URI mitgereister Code-Listen um, lässt
   Unbekanntes und die Migrationssicherungen stehen, trägt keine Fassung nach (unbekannt, nicht geraten), und
   ein Depot, das schon auf 90 steht, wird nicht angefasst (Rot-Beweis: ohne die Stufe bleibt die alte URI).
   Die Wege danach (Export, Import, Vorlagen) hält tests/codesystem-kanonisch.test.js.
   ═════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const ICD_ALT = 'http://hl7.org/fhir/sid/icd-10-gm';
const ICD = 'http://fhir.de/CodeSystem/bfarm/icd-10-gm';
const ATC_ALT = 'http://www.whocc.no/atc';
const ATC = 'http://fhir.de/CodeSystem/bfarm/atc';

const altDepot = (schemaVersion) => ({
  schemaVersion,
  sektoren: {
    health: {
      chronicConditionsDiagnoses: [{ text: 'Hypertonie', code: { system: ICD_ALT, code: 'I10.90' } }, { text: 'frei' }],
      medicationOngoing: [{ text: 'Ramipril', code: { system: ATC_ALT, code: 'C09AA05' } }],
      allergiesMedicationFoodOther: [{ text: 'Penicillin', code: { system: 'http://snomed.info/sct', code: '91936005' } }],
    },
  },
  situationen: { pflege: { tief: { liste: [{ text: 'x', code: { system: ICD_ALT, code: 'E11.90' } }] } } },
  codeListen: [{ systemId: 'tpl_x_icd', uri: ICD_ALT, eintraege: [{ code: 'E11.90', anzeigeName: 'Diabetes' }] }],
  _migrationSicherung88: { menschen: [{ id: 'm1', alt: { system: ICD_ALT, code: 'Z00' } }] },
  menschen: [],
});

test('[Stufe 90] Chip-Codes überall und mitgereiste Code-Listen tragen danach die kanonische URI; Fassung wird nicht nachgetragen', () => {
  const { V } = ladeKern({ blank: true });
  const d = altDepot(89);
  V.depotNormalisieren(d);
  assert.ok(d.schemaVersion >= 90);
  const h = d.sektoren.health;
  assert.deepEqual(h.chronicConditionsDiagnoses[0].code, { system: ICD, code: 'I10.90' }, 'keine version: in welcher Fassung eingegeben wurde, ist unbekannt');
  assert.deepEqual(h.chronicConditionsDiagnoses[1], { text: 'frei' });
  assert.deepEqual(h.medicationOngoing[0].code, { system: ATC, code: 'C09AA05' });
  assert.equal(h.allergiesMedicationFoodOther[0].code.system, 'http://snomed.info/sct', 'eine URI ohne Alias bleibt');
  assert.equal(d.situationen.pflege.tief.liste[0].code.system, ICD, 'auch tief verschachtelt');
  assert.equal(d.codeListen[0].uri, ICD, 'die URI einer mitgereisten Liste');
  assert.equal(d._migrationSicherung88.menschen[0].alt.system, ICD_ALT, 'die Migrationssicherung hält den alten Stand absichtlich');
  // Verwaisungsregel: die ersetzte Kennung verschwindet nicht, sie steht mit Anzahl in der Sicherung der Stufe.
  assert.deepEqual(d._migrationSicherung90, { schemaVersion: 89, umgeschrieben: [
    { von: ICD_ALT, nach: ICD, anzahl: 3 }, { von: ATC_ALT, nach: ATC, anzahl: 1 }] });
});

test('[Stufe 90·Sicherung] die Sicherung verlässt das Depot nicht über den Export', () => {
  const { V } = ladeKern({ blank: true });
  const d = altDepot(89);
  V.depotNormalisieren(d);
  V.setData(d);
  const export_ = V.vollExportJSON({ sensibel: true });
  assert.ok(V.getData()._migrationSicherung90, 'Vorbedingung: die Sicherung steht im Depot');
  assert.equal(String(export_).includes('_migrationSicherung90'), false);
});

test('[Stufe 90·Rot-Beweis] ein Depot, das schon auf 90 steht, durchläuft die Stufe nicht — die alte URI bliebe', () => {
  const { V } = ladeKern({ blank: true });
  const d = altDepot(90);
  V.depotNormalisieren(d);
  assert.equal(d.sektoren.health.chronicConditionsDiagnoses[0].code.system, ICD_ALT,
    'bliebe sie nicht stehen, wäre die Umschreibung nicht der Stufe zu verdanken und die Probe oben belegte nichts');
});

test('[Stufe 90] zweimal normalisiert ist wie einmal', () => {
  const { V } = ladeKern({ blank: true });
  const a = altDepot(89); V.depotNormalisieren(a);
  const b = JSON.parse(JSON.stringify(a)); V.depotNormalisieren(b);
  assert.deepEqual(b.sektoren, a.sektoren);
  assert.deepEqual(b.codeListen, a.codeListen);
});
