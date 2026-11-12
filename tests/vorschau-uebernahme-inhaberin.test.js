'use strict';
/* Vorschau → echtes Depot: Name und Inhaberin bleiben (31.10.2026, Befund VORSCHAU-UEBERNAHME-INHABERIN, HOCH).
   Wer in der Vorschau etwas einträgt und dann im Anlege-Dialog Vor- und Nachname nennt, verlor beides: _depotAusPasswortFinalisieren
   setzte Inhaberin und Namen und ersetzte danach die Sammlungen des frischen Depots (sektoren, menschen, urheberschaft) als Ganzes
   durch die der Vorschau. Der Name war weg, die Inhaberin stand nicht mehr im Register, inhaberPersonId und der Sitzungs-Akteur
   zeigten ins Leere.
   Geprüft: nach dem Anlegen aus einer Vorschau mit Eintrag stehen der Name aus dem Dialog in Identität (mit Urheberschaft), die
   Inhaberin im Register (inhaberPersonId und Akteur zeigen auf sie) und alle Eintragungen der Vorschau (Person, Feld). Gegenprobe:
   ohne Namen im Dialog bleibt der Vorname aus der Vorschau. Die Probe ist auf dem Stand vor dem Fix rot. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ladeKern } = require('./load-kern.js');
const { createIdbMock } = require('./idb-mock.js');

const PW = 'Vorschau-Inhaberin-Probe-2026!';
function kernMitVorschau() {
  const k = ladeKern({ indexedDB: createIdbMock(), location: { protocol: 'https:', href: 'https://vivodepot.example/app' } });
  k.V.flowVorschauBetreten();
  const d = k.V.getData();
  d.sektoren.health = Object.assign({}, d.sektoren.health || {}, { bloodType: 'A+' });
  d.menschen.push({ id: 'p-vorschau', name: 'Mutter Probe' });
  assert.equal(k.V.vorschauHatDaten(d), true, 'Vorbedingung: die Vorschau hat Eintragungen');
  return k;
}

test('[Vorschau·Inhaberin] nach dem Anlegen aus der Vorschau stehen Name, Inhaberin und alle Vorschau-Eintragungen im Depot', async () => {
  const { V } = kernMitVorschau();
  const uebernommen = await V._depotAusPasswortFinalisieren(PW, 'Anna Muster', 'Anna', 'Muster', undefined);
  assert.equal(uebernommen, true, 'die Vorschau ist übernommen');
  const d = V.getData();
  assert.equal((d.sektoren.identity || {}).givenName, 'Anna', 'Vorname aus dem Dialog');
  assert.equal((d.sektoren.identity || {}).familyName, 'Muster', 'Nachname aus dem Dialog');
  assert.ok(Object.keys((d.urheberschaft || {}).identity || {}).length > 0, 'die Namen tragen ihre Urheberschaft');
  assert.ok(d.inhaberPersonId && d.menschen.some((m) => m.id === d.inhaberPersonId), 'die Inhaberin steht im Register');
  const ak = V.aktuellerSitzungsAkteur();
  assert.ok(ak && d.menschen.some((m) => m.id === ak.personId), 'der Sitzungs-Akteur zeigt auf eine Person im Register');
  assert.ok(d.menschen.some((m) => m.id === 'p-vorschau'), 'die Person aus der Vorschau bleibt');
  assert.equal((d.sektoren.health || {}).bloodType, 'A+', 'das Feld aus der Vorschau bleibt');
  assert.equal(V.imVorschau(), false, 'kein Vorschau-Marker mehr');
});

test('[Vorschau·Inhaberin·Gegenprobe] ohne Namen im Dialog bleibt der Vorname aus der Vorschau', async () => {
  const { V } = kernMitVorschau();
  V.getData().sektoren.identity = { givenName: 'Lena' };
  await V._depotAusPasswortFinalisieren(PW, '', '', '', undefined);
  const d = V.getData();
  assert.equal(d.sektoren.identity.givenName, 'Lena');
  assert.ok(d.inhaberPersonId && d.menschen.some((m) => m.id === d.inhaberPersonId), 'die Inhaberin steht im Register');
});
