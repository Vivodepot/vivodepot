'use strict';
/* Test 1 — KLASSE-A (sicherheitskritisch, muss vor jedem Commit grün sein)
   Krypto-Runde: Roundtrip mit Originalpasswort restauriert den Klartext-Marker;
   Falschpasswort wirft; manipulierte ct wirft. (U2-ADR-004; vgl. C-A-01/02) */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const PW = 'korrekt-pferd-batterie-klammer';
const MARKER = 'blutgruppe-marker-0-negativ';

test('[Klasse-A] Krypto-Runde: Roundtrip restauriert den Klartext-Marker', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  const data = V.getData();
  data.sektoren.health = { bloodType: MARKER };
  const umschlag = await V.depotSerialisieren();
  const wieder = await V.depotLaden(umschlag, PW);
  assert.equal(wieder.sektoren.health.bloodType, MARKER, 'Marker nach Roundtrip restauriert');
});

test('[Klasse-A] Krypto-Runde: Falschpasswort wirft (GCM/AAD)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.getData().sektoren.health = { bloodType: MARKER };
  const umschlag = await V.depotSerialisieren();
  await assert.rejects(() => V.depotLaden(umschlag, PW + '-falsch'), 'Falschpasswort muss scheitern');
});

test('[Klasse-A] Krypto-Runde: manipulierte ct wirft (GCM)', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen(PW);
  V.getData().sektoren.health = { bloodType: MARKER };
  const umschlag = await V.depotSerialisieren();
  const manip = JSON.parse(JSON.stringify(umschlag));
  /* Seit dem Schnitt auf Generation 4 (A345) trägt der Umschlag kein einzelnes `ct`
     mehr, sondern viele Einheiten. Die Zusicherung ist unverändert — ein gekipptes Bit
     im Chiffrat muss scheitern —, sie zielt nur auf die Stelle, an der das Chiffrat
     heute liegt. Getroffen wird die ERSTE Einheit; welche es ist, ist gleichgültig:
     jede trägt ihren eigenen Auth-Tag. */
  const adresse = Object.keys(manip.einheiten)[0];
  assert.ok(adresse, 'Anker: der Umschlag trägt Einheiten — sonst prüft die Mutation nichts');
  const ct = Buffer.from(manip.einheiten[adresse].ct, 'base64');
  ct[0] ^= 0x01;
  manip.einheiten[adresse].ct = ct.toString('base64');
  await assert.rejects(() => V.depotLaden(manip, PW), 'Manipuliertes Chiffrat muss scheitern');
});
