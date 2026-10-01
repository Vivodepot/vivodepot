'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Validator-Sammelaufruf: jedes Urteil gehört genau seiner Datei (28.09.2026)
   ────────────────────────────────────────────────────────────────────────
   Die HL7-Registry (tests/konformitaet/externe-validatoren.mjs) legt dem Validator alle Artefakte in EINEM
   JVM-Aufruf vor, damit das pre-push-Gate unter seiner 240-s-Grenze bleibt. Dann hängt jedes Urteil an der
   Zuordnung: über den Pfad aus operationoutcome-file, nie über die Reihenfolge.
   ROT-BEWEIS: ein kaputtes Artefakt unter vielen macht genau dieses rot; eine Zuordnung nach Reihenfolge
   gäbe bei vertauschter Ausgabe das Urteil der falschen Datei.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { urteilsZuordnung, OO_DATEI } = require('../tools/lib/fhir-urteil-zuordnung.js');

const oo = (pfad, fehler) => ({
  resourceType: 'OperationOutcome',
  extension: [{ url: OO_DATEI, valueString: pfad }],
  issue: fehler ? [{ severity: 'error', expression: ['Bundle.entry[0]'], details: { text: 'Composition.status: min=1' } }]
    : [{ severity: 'information', details: { text: 'All OK' } }],
});
const pfade = ['/t/a.json', '/t/b.json', '/t/c.json', '/t/d.json', '/t/e.json'];

test('[Sammelurteil] ein kaputtes Artefakt unter fünf ist genau das eine ungültige, auch bei vertauschter Ausgabe', () => {
  // Die Ausgabe in anderer Reihenfolge als die Eingabe — kaputt ist c.
  const bundle = { resourceType: 'Bundle', entry: ['/t/e.json', '/t/c.json', '/t/a.json', '/t/d.json', '/t/b.json']
    .map((p) => ({ resource: oo(p, p === '/t/c.json') })) };
  const u = urteilsZuordnung(bundle, pfade);
  assert.deepEqual(pfade.filter((p) => !u.get(p).gueltig), ['/t/c.json']);
  assert.ok(pfade.every((p) => u.get(p).gelesen));
});

test('[Sammelurteil] eine Datei ohne eigenes OperationOutcome gilt als ungelesen, nie als gültig', () => {
  const bundle = { resourceType: 'Bundle', entry: pfade.slice(1).map((p) => ({ resource: oo(p, false) })) };
  const u = urteilsZuordnung(bundle, pfade);
  assert.equal(u.get('/t/a.json').gelesen, false);
  assert.equal(u.get('/t/a.json').gueltig, undefined);
});

test('[Sammelurteil] eine einzelne Datei liefert ein einzelnes OperationOutcome, auch ohne Datei-Extension', () => {
  const einzeln = { resourceType: 'OperationOutcome', issue: [{ severity: 'fatal', details: { text: 'kaputt' } }] };
  assert.equal(urteilsZuordnung(einzeln, ['/t/x.json']).get('/t/x.json').gueltig, false);
});

test('[Sammelurteil·Rot-Beweis] eine Zuordnung nach Reihenfolge nähme bei vertauschter Ausgabe das falsche Urteil', () => {
  const bundle = { resourceType: 'Bundle', entry: ['/t/e.json', '/t/c.json', '/t/a.json', '/t/d.json', '/t/b.json']
    .map((p) => ({ resource: oo(p, p === '/t/c.json') })) };
  const nachReihenfolge = new Map(pfade.map((p, i) => [p, !(bundle.entry[i].resource.issue || []).some((x) => x.severity === 'error')]));
  assert.notDeepEqual(pfade.filter((p) => !nachReihenfolge.get(p)), ['/t/c.json'], 'die Reihenfolge trifft die falsche Datei');
  assert.deepEqual(pfade.filter((p) => !urteilsZuordnung(bundle, pfade).get(p).gueltig), ['/t/c.json']);
});
