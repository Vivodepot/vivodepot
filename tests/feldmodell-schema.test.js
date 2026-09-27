'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Feld-Modell Stufe 2 / Block 1: Schema 22 -> 23 + data.feldDefinitionen[]
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-037: die selbst-beschreibenden Feld-Definitionen leben additiv in
   data.feldDefinitionen[]. Schema-Sprung 22 -> 23, rueckwaerts-tolerant:
   - leeresDepot traegt 23 + leere Liste,
   - ein altes 22er-Depot wird via depotNormalisieren additiv migriert (leere
     Liste angelegt, schemaVersion gehoben) OHNE Datenverlust,
   - bestehende feldDefinitionen werden nicht ueberschrieben (idempotent).
   Nur der Schema-Knoten — Empfang/Uebersetzer/Render kommen in spaeteren Bloecken.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('B1: leeresDepot traegt schemaVersion 31 + leere feldDefinitionen[]', () => {
  const { V } = ladeKern();
  const d = V.leeresDepot();
  assert.equal(d.schemaVersion, V.SCHEMA_VERSION_AKTUELL, 'Schema-Bump 25 -> 31 (U2-ADR-051, data.codeListen[])');
  assert.ok(Array.isArray(d.feldDefinitionen) && d.feldDefinitionen.length === 0, 'leere Definitionen-Liste');
});

test('B1: altes 22er-Depot (ohne feldDefinitionen) wird additiv migriert — verlustfrei', () => {
  const { V } = ladeKern();
  const alt = {
    schemaVersion: 22,
    sektoren: { gesundheit: { blutgruppe: 'A+' }, wohnen: { wohnflaeche: '85' } },
    menschen: [{ id: 'p1', name: 'Anna' }],
    urheberschaft: { gesundheit: { blutgruppe: [{ akteur: 'p1', eigenschaft: 'selbst' }] } },
  };
  V.depotNormalisieren(alt);
  // additive Liste angelegt
  assert.ok(Array.isArray(alt.feldDefinitionen) && alt.feldDefinitionen.length === 0, 'feldDefinitionen[] additiv angelegt');
  // schemaVersion gehoben
  assert.equal(alt.schemaVersion, V.SCHEMA_VERSION_AKTUELL, 'schemaVersion 22 -> 31 (Migration hebt Alt-Depots auf aktuell)');
  // KEIN Datenverlust
  assert.equal(alt.sektoren.health.bloodType, 'A+', 'Sektor-Wert erhalten');
  assert.equal(alt.sektoren.housing.wohnflaeche, '85', 'zweiter Sektor-Wert erhalten');
  assert.equal(alt.menschen[0].name, 'Anna', 'Register erhalten');
  assert.equal(alt.urheberschaft.health.bloodType.length, 1, 'Provenienz-Kette erhalten (Eingabe Schema 22, Ausgabe nach dem Kennungs-Umbau)');
});

test('B1: depotNormalisieren ist idempotent und ueberschreibt bestehende feldDefinitionen nicht', () => {
  const { V } = ladeKern();
  const def = {
    schemaVersion: 31, sektoren: {},
    feldDefinitionen: [{ sektorId: 'wohnen', feldId: 'energie_zaehlpunkt', abschnitt: 'Energie & Erzeugung', typ: 'text', label: 'Zaehlpunkt', schemaVersion: 23 }],
  };
  V.depotNormalisieren(def);
  assert.equal(def.feldDefinitionen.length, 1, 'bestehende Definition unangetastet');
  assert.equal(def.feldDefinitionen[0].feldId, 'energie_zaehlpunkt');
  assert.equal(def.schemaVersion, V.SCHEMA_VERSION_AKTUELL, 'kein erneuter Bump — bereits aktuell (31)');
});
