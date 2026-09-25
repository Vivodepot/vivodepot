'use strict';
/* ════════════════════════════════════════════════════════════════════════
   F4 Zug 2/4 („F4 und F5", 09.08.2026) — Migrationsprobe
   `gdb_merkmale`: text → mehrfachauswahl
   ────────────────────────────────────────────────────────────────────────
   `gdb_merkmale` trug bis Zug 2 `typ:'text'` mit `beispiel: 'G, RF'` — ein
   Komma-getrennter Mehrfachwert ALS EINZELNER STRING war das vorgesehene
   Format. Reale Alt-Depots können also genau so einen String tragen. Der
   generische mehrfachauswahl-Renderer (F4 Zug 2, `vivodepot.html`, case
   'mehrfachauswahl') wickelt einen Alt-Skalar nur als EIN Element in ein
   Array — "G, RF" würde als EIN nicht-passendes Element landen, keine
   Checkbox zeigte etwas an, und ein nachfolgendes Speichern hätte den
   ursprünglichen Wert überschrieben (stille Verwaisung).

   Schema 48 → 49 löst das über `_wertAusText` — DIESELBE Komma-Split- und
   Options-Aufloesungs-Logik, die der Import-Zweig bereits nutzt (kein
   zweiter Algorithmus, keine zweite Fehlerquelle).

   `unterhalt.richtung` (text → auswahl) braucht KEINE Migration: `auswahl`
   ist Einzelwert, der bestehende Renderer-Fallback (`o.wert === roh`)
   vergleicht den Alt-String direkt gegen die Optionen — kein Komma-Fall,
   kein Verlust möglich. Eigener Beweis-Test unten, ohne Mutation.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

function altDepot(gdbMerkmaleRoh) {
  return {
    schemaVersion: 48,
    sektoren: { sozialversicherung: { gdb_merkmale: gdbMerkmaleRoh } },
  };
}

test('[F4] gdb_merkmale: Komma-String aus zwei bekannten Merkzeichen wird zum Array (verlustfrei)', () => {
  const { V } = ladeKern();
  const d = altDepot('G, RF');
  V.depotNormalisieren(d);
  assert.deepEqual(d.sektoren.socialInsurance.markers, ['G', 'RF']);
  assert.equal(d.schemaVersion, V.SCHEMA_VERSION_AKTUELL);
});

test('[F4] gdb_merkmale: einzelnes Merkzeichen ohne Komma wird zum Ein-Element-Array', () => {
  const { V } = ladeKern();
  const d = altDepot('G');
  V.depotNormalisieren(d);
  assert.deepEqual(d.sektoren.socialInsurance.markers, ['G']);
});

test('[F4·unzugeordneter Fall] ein nicht auf ein bekanntes Merkzeichen passender Alt-Text bleibt VERLUSTFREI erhalten', () => {
  const { V } = ladeKern();
  const d = altDepot('G, Sonderfall laut Bescheid');
  V.depotNormalisieren(d);
  assert.deepEqual(d.sektoren.socialInsurance.markers, ['G', 'Sonderfall laut Bescheid'],
    'das bekannte Merkzeichen wird aufgelöst, der unbekannte Rest bleibt als eigener Freitext-Eintrag stehen — nicht verworfen');
});

test('[F4] gdb_merkmale: leerer String wird zum leeren Array, nicht zu [""]', () => {
  const { V } = ladeKern();
  const d = altDepot('');
  V.depotNormalisieren(d);
  assert.deepEqual(d.sektoren.socialInsurance.markers, []);
});

test('[F4] gdb_merkmale: bereits migriertes Array bleibt unangetastet (idempotent)', () => {
  const { V } = ladeKern();
  const d = altDepot(['G', 'RF']);
  V.depotNormalisieren(d);
  assert.deepEqual(d.sektoren.socialInsurance.markers, ['G', 'RF']);
});

test('[F4] gdb_merkmale: fehlendes Feld übersteht die Migration ohne Phantom-Eintrag', () => {
  const { V } = ladeKern();
  const d = { schemaVersion: 48, sektoren: { sozialversicherung: {} } };
  V.depotNormalisieren(d);
  assert.equal('markers' in d.sektoren.socialInsurance, false);
});

test('[F4] unterhalt.richtung: Alt-String "zahle" braucht keine Migration — der auswahl-Renderer-Fallback trifft ihn direkt', () => {
  const { V } = ladeKern();
  const feld = V.feldDefFuer.length // Zugriff nur zur Existenzprobe unten über _listenUnterfeldDef
    ? V._listenUnterfeldDef('people', 'maintenanceObligationsAnd', 'direction')
    : null;
  assert.ok(feld, 'richtung-Unterfelddefinition muss auflösbar sein');
  assert.equal(feld.typ, 'auswahl');
  const opt = feld.optionen.find((o) => o.wert === 'zahle');
  assert.ok(opt, 'Alt-Wert "zahle" ist unverändert ein gültiger Options-Wert — kein Komma, kein Mehrwert, keine Migration nötig');
});
