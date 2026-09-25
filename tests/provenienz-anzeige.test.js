'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Test — Provenienz-Anzeige-Regeln (Teil 5, Schnitt 5.2)
   ────────────────────────────────────────────────────────────────────────
   „von [Name]" erscheint NUR, wenn die eintragende Person vom aktuellen Anker
   abweicht (oder unter Vollmacht handelte). aktuellerAnkerName + stempelName sind
   die reinen Helfer; alte Stempel ohne Snapshot fallen auf akteurName zurück.
   U2-ADR-017: auf den EIGENEN Identitäts-Namensfeldern (vorname/nachname, Selbst-Stempel)
   bleibt die Zeile zusätzlich IMMER still — siehe tests/provenienz-name-bruecke.test.js.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'pw';

test('1) aktuellerAnkerName: der/die selbst-Akteur*in im Anker-Modus', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  assert.equal(V.aktuellerAnkerName(), 'Maria');
});

test('2) stempelName: Snapshot bevorzugt; Fallback akteurName bei altem Stempel', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const akteur = V.akteurSelbstErklaeren('Maria');
  // moderner Stempel (mit Snapshot)
  assert.equal(V.stempelName({ akteur: akteur.personId, eingabeDurchName: 'Maria' }), 'Maria');
  // alter Stempel OHNE Snapshot → über akteur aufgelöst
  assert.equal(V.stempelName({ akteur: akteur.personId }), 'Maria', 'Fallback auf akteurName');
  // unbekannt
  assert.equal(V.stempelName({ akteur: 'gibtsnicht' }), '');
});

test('3) Anzeige still, solange der Anker selbst einträgt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.akteurSelbstErklaeren('Maria');
  V.sektorFeldSetzen('identity', 'givenName', 'Maria');
  V.sektorFeldSetzen('health', 'bloodType', 'A+');
  assert.equal(V.urheberschaftZeileHTML('identity', 'givenName'), '');
  assert.equal(V.urheberschaftZeileHTML('health', 'bloodType'), '');
});

test('4) Anzeige erscheint, sobald der Snapshot vom aktuellen Anker abweicht', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const akteur = V.akteurSelbstErklaeren('Maria');
  // Nicht-Namens-Feld: die U2-ADR-017-Stille gilt nur für identitaet vorname/nachname,
  // nicht für telefon — die „Divergenz-zeigt"-Logik bleibt hier prüfbar.
  V.sektorFeldSetzen('identity', 'telephone', '0151');
  // Anker umbenennen → Snapshot „Maria" weicht jetzt ab.
  V.getData().menschen.find(m => m.id === akteur.personId).name = 'Maria Neu';
  const html = V.urheberschaftZeileHTML('identity', 'telephone');
  assert.ok(html.includes('von Maria'), 'zeigt den Snapshot-Namen');
  assert.ok(!html.includes('Neu'), 'nicht der aktuelle Anker-Name');
});

test('5) ohne jeden Stempel → leere Zeile (kein Rauschen)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  assert.equal(V.urheberschaftZeileHTML('identity', 'givenName'), '');
});
