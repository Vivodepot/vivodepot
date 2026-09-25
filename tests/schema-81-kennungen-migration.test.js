'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Schema 80 → 81 — Kennungs-/Bereichs-Umbenennung in depotNormalisieren
   ────────────────────────────────────────────────────────────────────────
   U2-ADR-XXX (Entwurf), Umbauplan „Englisch vor v1", Plan-Commit 3. Prüft
   die INTEGRATION (nicht nur die reine Umschreib-Funktion, s.
   kennungen-umschreiben-kern.test.js): läuft die Stufe über den echten
   `depotNormalisieren()`-Weg, hebt sie schemaVersion, legt sie die
   Sicherungskopie an, ist sie idempotent.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

// Seit Stufe 82 (16.09.2026, MyTerms v1-Schnitt) steht die aktuelle Version darüber; diese Proben halten
// fest, dass die 81er-Stufe gelaufen ist, nicht, dass sie die letzte ist.
test('[Schema-81] SCHEMA_VERSION_AKTUELL ist mindestens 81', () => {
  const { V } = ladeKern();
  assert.ok(V.SCHEMA_VERSION_AKTUELL >= 81);
});

test('[Schema-81] ein Alt-Depot (Schema 79) wird auf 81 gehoben, Kennungen umgeschrieben', () => {
  const { V } = ladeKern();
  const alt = { schemaVersion: 79, sektoren: { identitaet: { vorname: 'Elisabeth', nachname: 'Musterfrau' } } };
  const neu = V.depotNormalisieren(alt);
  assert.ok(neu.schemaVersion >= 81);
  assert.deepEqual(neu.sektoren.identity, { givenName: 'Elisabeth', familyName: 'Musterfrau' });
  assert.equal('identitaet' in neu.sektoren, false, 'der alte Bereichs-Schlüssel darf nicht mehr da sein (hart umschreiben, Freigabe Punkt 3)');
});

test('[Schema-81] Sicherungskopie im ALTEN Format wird angelegt, bevor umgeschrieben wird', () => {
  const { V } = ladeKern();
  const alt = { schemaVersion: 80, sektoren: { identitaet: { vorname: 'Elisabeth' } } };
  const neu = V.depotNormalisieren(alt);
  assert.ok(neu._migrationSicherung81, 'die Sicherungskopie muss existieren');
  assert.equal(neu._migrationSicherung81.schemaVersion, 80);
  assert.deepEqual(neu._migrationSicherung81.sektoren, { identitaet: { vorname: 'Elisabeth' } },
    'die Sicherungskopie muss das ALTE Format tragen, nicht das umgeschriebene');
});

test('[Schema-81] idempotent -- ein zweiter Lauf auf dem migrierten Depot ändert nichts mehr', () => {
  const { V } = ladeKern();
  const alt = { schemaVersion: 79, sektoren: { identitaet: { vorname: 'Elisabeth' } } };
  const einmal = V.depotNormalisieren(alt);
  const nochEinmal = V.depotNormalisieren(JSON.parse(JSON.stringify(einmal)));
  assert.deepEqual(nochEinmal.sektoren, einmal.sektoren);
  assert.equal(nochEinmal.schemaVersion, einmal.schemaVersion);
});

test('[Schema-81] ein Depot, das schon auf Schema 81 steht, durchläuft die Stufe gar nicht erst', () => {
  const { V } = ladeKern();
  const schon81 = { schemaVersion: 81, sektoren: { identity: { givenName: 'Elisabeth' } } };
  const ergebnis = V.depotNormalisieren(JSON.parse(JSON.stringify(schon81)));
  assert.equal('_migrationSicherung81' in ergebnis, false,
    'ein bereits migriertes Depot darf keine neue Sicherungskopie bekommen -- die Stufe lief nicht erneut');
});

test('[Schema-81·Rot-Beweis] ein Feld ohne Mapping-Zeile geht bei der Migration nicht verloren', () => {
  const { V } = ladeKern();
  const alt = { schemaVersion: 79, sektoren: { identitaet: { einZukuenftigesFeldOhneMapping: 'bleibt' } } };
  const neu = V.depotNormalisieren(alt);
  assert.equal(neu.sektoren.identity.einZukuenftigesFeldOhneMapping, 'bleibt');
});
