'use strict';
/* ════════════════════════════════════════════════════════════════════════
   Schnitt Glied 3 (A448, U2-ADR-161) — Prüftermine für die mehrwertigen
   Korb-1-Felder (ausweis/aufenthaltstitel/krankenkassenkarte/
   schwerbehindertenausweis/elefand)
   ────────────────────────────────────────────────────────────────────────
   `feldGueltigkeit[sektorId][feldId]` kennt nur EINEN Wert je Feld — für
   eine mehrwertige Liste reicht das nicht (Prüfstein 3: zwei Nummern
   nebeneinander verlangen zwei Termine nebeneinander). `prueftermineFelder()`
   liest darum für genau diese fünf Gruppen direkt aus den Listen-Einträgen,
   ein Prüftermin je Eintrag mit gesetztem `gueltig`.
   ════════════════════════════════════════════════════════════════════════ */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');

const JETZT = new Date('2026-08-22T10:00:00Z');

test('[Korb1·Prüftermine] zwei Einträge derselben Gruppe erzeugen ZWEI Prüftermin-Zeilen', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.listenEintragHinzufuegen('identity', 'idDocuments', { system: 'DE', documentNumber: 'L01X00T47', validUntil: '2030-01-01' });
  V.listenEintragHinzufuegen('identity', 'idDocuments', { system: 'TR', documentNumber: '12345678901', validUntil: '2028-06-01' });
  const termine = V.prueftermineFelder(JETZT).filter((t) => t.sektorId === 'identity');
  assert.equal(termine.length, 2, 'ein Termin je Eintrag, nicht einer für das ganze Feld');
  assert.ok(termine.some((t) => t.name.includes('DE')));
  assert.ok(termine.some((t) => t.name.includes('TR')));
});

test('[Korb1·Prüftermine] ein Eintrag OHNE gueltig erzeugt KEINEN Termin — Zusicherung bleibt', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.listenEintragHinzufuegen('finance', 'taxIdsTaxNumbers', { system: 'DE', taxNumber: '12345678901' });   // kein gueltig-Unterfeld
  assert.equal(V.prueftermineFelder(JETZT).filter((t) => t.sektorId === 'finance').length, 0,
    'steuerid hat gar kein gueltig-Unterfeld — Prüfstein 4 der Familie, keine Termine erfunden');
});

test('[Korb1·Prüftermine] ein abgelaufener Eintrag meldet Stufe/Text wie ein Skalarfeld', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.listenEintragHinzufuegen('socialInsurance', 'severeDisabilityCards', { system: '', storageLocation: 'x', validUntil: '2020-01-01' });
  const termin = V.prueftermineFelder(JETZT).find((t) => t.sektorId === 'socialInsurance');
  assert.ok(termin, 'ein abgelaufenes Datum erzeugt trotzdem eine Zeile — sonst verschwände die Mahnung');
  assert.ok(termin.tageBis < 0, 'die Zeile weiß, dass der Termin in der Vergangenheit liegt');
});

test('[Korb1·Prüftermine] „abgehakt" sitzt am Eintrag selbst, nicht an einer zweiten Ablage', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  V.listenEintragHinzufuegen('mobility', 'elefandRegistrations', { system: '', registrationNo: 'x', validUntil: '2030-01-01' });
  const vorher = V.prueftermineFelder(JETZT).filter((t) => t.sektorId === 'mobility');
  assert.equal(vorher.length, 1);
  const eintrag = V.getData().sektoren.mobility.elefandRegistrations[0];
  eintrag.geprueftAm = '2026-08-22';
  eintrag.geprueftFuer = '2030-01-01';
  const nachher = V.prueftermineFelder(JETZT).filter((t) => t.sektorId === 'mobility');
  assert.equal(nachher.length, 0, 'abgehakt UND unverändert → still, wie beim Skalarfeld-Pendant');
});

test('[Korb1·Prüftermine·Gegenprobe] ein Depot ohne jeden Korb-1-Eintrag liefert keine Phantom-Termine', async () => {
  const { V } = ladeKern();
  await V.depotAnlegen('pw');
  V.akteurSelbstErklaeren('Tester');
  const korb1Sektoren = new Set(['identity', 'mobility', 'finance', 'health', 'socialInsurance', 'administration']);
  const termine = V.prueftermineFelder(JETZT).filter((t) => korb1Sektoren.has(t.sektorId));
  assert.deepEqual(termine, [], 'ohne Angabe kein Termin — dieselbe Zusicherung wie beim Skalarfeld');
});
