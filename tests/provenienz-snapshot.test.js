'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Provenienz-Snapshot eingabeDurchName (Teil 5, Schnitt 5.1)
   ────────────────────────────────────────────────────────────────────────
   Der Urheberschafts-Stempel (ADR-005) trägt zusätzlich den NAMEN der eintragenden
   Person als Snapshot zum Stempel-Zeitpunkt. Ein späterer Namens-/Anker-Wechsel
   ändert historische Stempel NICHT. Schema-Bump 19 → 20 (additiv, rückwärtskompatibel).
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

test('1) Schema-Bump: leeresDepot trägt schemaVersion 31', async () => {
  const { V } = ladeKern();
  assert.equal(V.leeresDepot().schemaVersion, V.SCHEMA_VERSION_AKTUELL);
});

test('2) Stempel trägt eingabeDurchName (Name der eintragenden Person)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria Mustermann');
  V.sektorFeldSetzen('identity', 'givenName', 'X');
  const s = V.liesUrheberschaft('identity', 'givenName')[0];
  assert.equal(s.eingabeDurchName, 'Maria Mustermann');
  assert.equal(s.eigenschaft, 'selbst', 'Rolle Anker = selbst');
  assert.ok(s.akteur, 'Person-Verweis bleibt erhalten');
});

test('3) Snapshot bleibt bei späterem Anker-/Namens-Wechsel STEHEN', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const akteur = V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'X');
  // Die Person wird später umbenannt (z. B. Anker-Wechsel / Korrektur).
  V.getData().menschen.find(m => m.id === akteur.personId).name = 'Maria-NEU';
  const s = V.liesUrheberschaft('identity', 'givenName')[0];
  assert.equal(s.eingabeDurchName, 'Maria', 'historischer Snapshot unverändert');
  assert.equal(V.akteurName(akteur.personId), 'Maria-NEU', 'aktueller Name hat sich geändert');
});

test('4) unter-vollmacht: Stempel trägt Namens-Snapshot UND Grundlage', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const pid = V.personSicherstellen('Hans Vertreter');
  V.setzeSitzungsAkteur({ personId: pid, eigenschaft: 'unter-vollmacht', vollmachtsGrundlage: 'vorsorge' });
  V.sektorFeldSetzen('identity', 'givenName', 'Y');
  const s = V.liesUrheberschaft('identity', 'givenName')[0];
  assert.equal(s.eingabeDurchName, 'Hans Vertreter');
  assert.equal(s.eigenschaft, 'unter-vollmacht', 'Rolle Bevollmächtigte');
  assert.equal(s.vollmachtsGrundlage, 'vorsorge');
});

test('5) Stempel bleibt eingefroren (append-only, unveränderlich)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  const stempel = V.sektorFeldSetzen('identity', 'givenName', 'X');
  assert.ok(Object.isFrozen(stempel), 'Stempel eingefroren');
});

test('6) Roundtrip: der Snapshot überlebt Speichern/Laden (im Ciphertext)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'X');
  const u = await V.depotSerialisieren();
  const wieder = await V.depotLaden(u, PW);
  assert.equal(wieder.urheberschaft.identity.givenName[0].eingabeDurchName, 'Maria');
  // … und NICHT im Klartext-Umschlag (nur die Notfall-Allowlist liegt offen).
  assert.ok(!JSON.stringify({ ...u, ct: '' }).includes('"eingabeDurchName"'), 'Provenienz bleibt verschlüsselt');
});
