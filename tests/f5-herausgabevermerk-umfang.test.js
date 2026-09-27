'use strict';
/* ════════════════════════════════════════════════════════════════════════
   F5 Posten 4 („F4 und F5", 09.08.2026, Zug 1) — Umfang beim
   Herausgabevermerk. `uebergabeProtokollEintragen` setzt `zeitpunkt`
   automatisch, die Maske erfasste bisher nur Empfänger und Zweck (wofür).
   Was tatsächlich herausgegeben wurde — der Umfang — fehlte als eigenes
   Feld (das bisherige `uebergabeZweckLabel` sagte sogar irreführend
   „Wofür (Umfang)?", als wären beide dasselbe Feld). Additiv, neues
   Pflichtfeld `umfang`, dieselbe Struktur wie Empfänger/Zweck.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

test('[F5] uebergabeProtokollEintragen: umfang ist Pflicht, wird gespeichert', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  assert.throws(() => V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Meier', zweck: 'Behandlung' }),
    /Umfang/, 'Umfang fehlt — muss geworfen werden');
  const eintrag = V.uebergabeProtokollEintragen({ empfaenger: 'Dr. Meier', zweck: 'Behandlung', umfang: 'Kopie der Patientenverfügung' });
  assert.equal(eintrag.umfang, 'Kopie der Patientenverfügung');
  assert.equal(V.getData().uebergabeProtokoll[0].umfang, 'Kopie der Patientenverfügung');
});

test('[F5] _uebergabeFelderPruefen: Umfang-Feld wird gelesen und ist Pflicht', async () => {
  const { V, document } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.flowUebergabeProtokollManuellErfassen();
  document.getElementById('up-empfaenger').value = 'Hausarztpraxis';
  document.getElementById('up-zweck').value = 'für die Akte';
  document.getElementById('up-umfang').value = 'Kopie des Impfausweises';
  await document.getElementById('m-ok').onclick();
  const eintrag = V.getData().uebergabeProtokoll[0];
  assert.equal(eintrag.umfang, 'Kopie des Impfausweises');
});
