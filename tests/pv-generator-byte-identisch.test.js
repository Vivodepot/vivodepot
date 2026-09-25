'use strict';
/* ════════════════════════════════════════════════════════════════════════
   PV-GATE — Byte-Identität der Patientenverfügungs-Ausgabe nach der Extraktion
   in den geteilten Generator (U2-ADR-068, Teil 2).
   ────────────────────────────────────────────────────────────────────────
   Der frühere PV-Inline-Assembler ist in PV_MODUL + modulDokumentAbschnitte
   überführt. Dieser Test beweist, dass die Ausgabe dadurch BYTE-IDENTISCH
   bleibt — gegen die vor dem Umbau eingefrorene Golden-Fixture, über 42
   Zweig-Fälle. Grün = die Extraktion lässt die (freigabe-pendente) PV-Ausgabe
   unverändert. Rot = Wortlaut hat sich verschoben → anhalten, nicht blessen.

   Cross-Realm: die Generator-Ausgabe stammt aus dem vm-Sandkasten (fremde
   Prototypen) — verglichen wird über JSON (Struktur) + reine Strings (HTML),
   nie über deepStrictEqual auf vm-Objekten.
   ════════════════════════════════════════════════════════════════════════ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ladeKern } = require('./load-kern.js');
const { PV_MATRIX } = require('./pv-golden-matrix.js');

const GOLDEN = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'pv-golden.json'), 'utf8'));
const GOLDEN_BY_NAME = new Map(GOLDEN.map(e => [e.name, e]));

test('Golden-Fixture und Matrix decken sich (kein Fall verloren/verwaist)', () => {
  assert.equal(GOLDEN.length, PV_MATRIX.length, 'Fixture- und Matrix-Länge müssen gleich sein');
  for (const fall of PV_MATRIX) {
    assert.ok(GOLDEN_BY_NAME.has(fall.name), 'Golden fehlt für Fall: ' + fall.name);
  }
  // Abdeckungs-Untergrenze: die Fixture muss echten Inhalt tragen (nicht versehentlich leer erfasst).
  const zeilenGesamt = GOLDEN.reduce((n, e) => n + e.abschnitte.reduce((m, a) => m + a.zeilen.length, 0), 0);
  assert.ok(zeilenGesamt >= 300, 'Golden trägt zu wenig Zeilen (' + zeilenGesamt + ') — Erfassung fehlerhaft?');
});

test('PV-Gate: pvDokumentAbschnitte byte-identisch zur Golden-Fixture (42 Fälle)', () => {
  const { V } = ladeKern();
  for (const fall of PV_MATRIX) {
    V.setData(fall.data);
    const ist = V.pvDokumentAbschnitte();
    const golden = GOLDEN_BY_NAME.get(fall.name).abschnitte;
    assert.equal(
      JSON.stringify(ist),
      JSON.stringify(golden),
      'Abschnitte weichen ab bei Fall: ' + fall.name,
    );
  }
});

test('PV-Gate: pvDokumentHTML byte-identisch zur Golden-Fixture (42 Fälle)', () => {
  const { V } = ladeKern();
  for (const fall of PV_MATRIX) {
    V.setData(fall.data);
    const ist = V.pvDokumentHTML();
    const golden = GOLDEN_BY_NAME.get(fall.name).html;
    assert.equal(typeof ist, 'string');
    assert.equal(ist, golden, 'HTML-Bytes weichen ab bei Fall: ' + fall.name);
  }
});

test('PV_MODUL + Engine sind exportiert und liefern dieselbe Ausgabe wie pvDokumentAbschnitte', () => {
  const { V } = ladeKern();
  assert.ok(V.PV_MODUL, 'PV_MODUL exportiert');
  assert.equal(typeof V.modulDokumentAbschnitte, 'function', 'Engine exportiert');
  V.setData(PV_MATRIX.find(f => f.name === 'voll').data);
  // Der Generator geht über PV_MODUL — direkte Engine-Anwendung muss identisch sein.
  assert.equal(
    JSON.stringify(V.modulDokumentAbschnitte(V.PV_MODUL)),
    JSON.stringify(V.pvDokumentAbschnitte()),
    'Direkte Engine-Anwendung weicht von pvDokumentAbschnitte ab',
  );
});
